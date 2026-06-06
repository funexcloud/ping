/**
 * 카카오 로그인 · 카카오싱크 OAuth (Express)
 * @see https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
 */
const crypto = require('crypto');
const memberAuth = require('./member-auth');
const { signPayload, verifySigned } = require('./lib/ping-oauth-signed.cjs');

const STATE_TTL_MS = 10 * 60 * 1000;
const EXCHANGE_TTL_MS = 60 * 1000;

/**
 * 카카오싱크 약관 태그 — 카카오 비즈니스 콘솔 «동의 항목 › 약관»에 등록한 고유 코드.
 * 이용약관(서비스 약관)은 `ping_service_terms`로 식별한다. (API·관리자 화면 구분용)
 * 여러 약관을 노출하려면 콤마로 구분: `ping_service_terms,ping_privacy_terms`.
 */
const KAKAO_SERVICE_TERMS_TAGS = 'ping_service_terms';
const KAKAO_JOIN_TYPES = new Set(['general', 'group', 'admin']);

function normalizeKakaoJoinType(value) {
    const j = String(value || 'general').trim();
    return KAKAO_JOIN_TYPES.has(j) ? j : 'general';
}

function stripEnvQuotes(value) {
    let v = String(value || '').trim();
    if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
    ) {
        v = v.slice(1, -1).trim();
    }
    return v;
}

function readKakaoEnv() {
    return {
        restApiKey: stripEnvQuotes(process.env.KAKAO_REST_API_KEY),
        clientSecret: stripEnvQuotes(process.env.KAKAO_CLIENT_SECRET),
        redirectUri: String(process.env.KAKAO_REDIRECT_URI || '').trim(),
        businessRedirectUri: String(process.env.KAKAO_BUSINESS_REDIRECT_URI || '').trim(),
        publicOrigin: String(
            process.env.KAKAO_LOGIN_RETURN_ORIGIN || process.env.PING_PUBLIC_ORIGIN || '',
        )
            .trim()
            .replace(/\/+$/, ''),
        serviceTermsTags: String(
            process.env.KAKAO_SERVICE_TERMS_TAGS || KAKAO_SERVICE_TERMS_TAGS,
        )
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
            .join(','),
    };
}

function requestOrigin(req) {
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || String(req.get('host') || '').trim();
    if (!host) return '';
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const proto =
        forwardedProto ||
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`.replace(/\/+$/, '');
}

function isLoopbackOrigin(origin) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(
        String(origin || '').trim(),
    );
}

function resolveRedirectUri(req, kind) {
    const env = readKakaoEnv();
    const origin = requestOrigin(req);
    const callbackPath =
        kind === 'business'
            ? '/api/auth/kakao/business/callback'
            : '/api/auth/kakao/callback';

    if (isLoopbackOrigin(origin)) {
        return `${origin.replace(/\/+$/, '')}${callbackPath}`;
    }

    if (kind === 'business') {
        if (env.businessRedirectUri) return env.businessRedirectUri;
        if (origin) return `${origin.replace(/\/+$/, '')}${callbackPath}`;
        return '';
    }
    if (env.redirectUri) return env.redirectUri;
    if (origin) return `${origin.replace(/\/+$/, '')}${callbackPath}`;
    return '';
}

function resolveReturnOrigin(req, queryReturnOrigin) {
    const explicit = String(queryReturnOrigin || '').trim().replace(/\/+$/, '');
    if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
    const env = readKakaoEnv();
    if (env.publicOrigin) return env.publicOrigin;
    return requestOrigin(req);
}

function kakaoSyncScopes() {
    return [
        'profile_nickname',
        'profile_image',
        'account_email',
        'phone_number',
        'name',
    ].join(',');
}

function createOAuthState(payload) {
    return signPayload({ t: 'oauth', ...payload }, STATE_TTL_MS);
}

function consumeOAuthState(state) {
    const row = verifySigned(state, 5000);
    if (!row || row.t !== 'oauth') return null;
    const { t: _t, exp: _exp, ...rest } = row;
    return rest;
}

function createExchangeCode(sessionPayload) {
    return signPayload({ t: 'ex', ...sessionPayload }, EXCHANGE_TTL_MS);
}

function consumeExchangeCode(code) {
    const row = verifySigned(code, 5000);
    if (!row || row.t !== 'ex') return null;
    const { t: _t, exp: _exp, token, user } = row;
    if (!token) return null;
    return { token, user };
}

function redirectWithError(res, returnOrigin, message, returnPath) {
    const base = String(returnOrigin || '').replace(/\/+$/, '') || '/';
    const path = String(returnPath || '/login').trim() || '/login';
    const url = new URL(path.startsWith('/') ? path : `/${path}`, base.endsWith('/') ? base : `${base}/`);
    url.searchParams.set('kakao_error', String(message || 'login_failed').slice(0, 240));
    res.redirect(302, url.toString());
}

async function fetchKakaoToken(code, redirectUri) {
    const { restApiKey, clientSecret } = readKakaoEnv();
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: restApiKey,
        redirect_uri: redirectUri,
        code: String(code || ''),
    });
    if (clientSecret) params.set('client_secret', clientSecret);

    const res = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(
            (data && (data.error_description || data.error)) || 'kakao_token_exchange_failed',
        );
        err.status = res.status;
        throw err;
    }
    return data;
}

async function fetchKakaoUser(accessToken) {
    const res = await fetch(
        'https://kapi.kakao.com/v2/user/me?property_keys=["kakao_account.email","kakao_account.profile"]',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
        },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error((data && data.msg) || 'kakao_user_fetch_failed');
        err.status = res.status;
        throw err;
    }
    return data;
}

function memberPayloadFromKakaoUser(kakaoUser) {
    const account = (kakaoUser && kakaoUser.kakao_account) || {};
    const profile = account.profile || (kakaoUser && kakaoUser.properties) || {};
    const phone =
        account.phone_number && account.phone_number.replace
            ? account.phone_number.replace(/-/g, '')
            : account.phone_number || '';
    return {
        kakaoId: kakaoUser && kakaoUser.id,
        email: account.email || '',
        displayName: profile.nickname || account.name || '',
        phone,
        emailVerified: account.is_email_verified === true || account.email_needs_agreement === false,
    };
}

function authorizeHandler(req, res) {
    try {
        const { restApiKey } = readKakaoEnv();
        if (!restApiKey) {
            res.status(503).json({
                ok: false,
                error: 'KAKAO_REST_API_KEY가 설정되지 않았습니다. .env를 확인해 주세요.',
            });
            return;
        }

        const kind = String(req.query.kind || 'login').trim() === 'business' ? 'business' : 'login';
        const redirectUri = resolveRedirectUri(req, kind);
        if (!redirectUri) {
            res.status(500).json({
                ok: false,
                error: '카카오 리다이렉트 URI를 확인할 수 없습니다. KAKAO_REDIRECT_URI를 설정해 주세요.',
            });
            return;
        }

        const returnOrigin = resolveReturnOrigin(req, req.query.return_origin);
        const next = String(req.query.next || '').trim();
        const returnPath = String(req.query.return_path || '/login').trim() || '/login';
        const joinType = normalizeKakaoJoinType(req.query.join_type);
        const state = createOAuthState({
            redirectUri,
            returnOrigin,
            next,
            returnPath,
            joinType,
            kind,
        });

        const params = new URLSearchParams({
            client_id: restApiKey,
            redirect_uri: redirectUri,
            response_type: 'code',
            state,
            scope: kakaoSyncScopes(),
        });

        const serviceTermsTags = String(readKakaoEnv().serviceTermsTags || '').trim();
        if (serviceTermsTags) params.set('service_terms', serviceTermsTags);

        res.redirect(302, `https://kauth.kakao.com/oauth/authorize?${params.toString()}`);
    } catch (e) {
        console.error('kakao authorizeHandler:', e);
        res.status(500).json({ ok: false, error: '카카오싱크를 시작하지 못했습니다.' });
    }
}

async function handleOAuthCallback(req, res, kind) {
    const fallbackOrigin = resolveReturnOrigin(req, '');
    const defaultReturnPath = '/login';
    try {
        const code = String(req.query.code || '').trim();
        const state = String(req.query.state || '').trim();
        const oauthError = String(req.query.error || '').trim();
        const oauthDesc = String(req.query.error_description || '').trim();

        if (oauthError) {
            redirectWithError(res, fallbackOrigin, oauthDesc || oauthError, defaultReturnPath);
            return;
        }
        if (!code || !state) {
            redirectWithError(res, fallbackOrigin, 'authorization_code_missing', defaultReturnPath);
            return;
        }

        const stateRow = consumeOAuthState(state);
        if (!stateRow || stateRow.kind !== kind) {
            redirectWithError(
                res,
                fallbackOrigin,
                'invalid_oauth_state',
                (stateRow && stateRow.returnPath) || defaultReturnPath,
            );
            return;
        }

        const tokenData = await fetchKakaoToken(code, stateRow.redirectUri);
        const kakaoUser = await fetchKakaoUser(tokenData.access_token);
        const memberPayload = memberPayloadFromKakaoUser(kakaoUser);
        const session = memberAuth.upsertMemberFromKakaoSync({
            ...memberPayload,
            joinType: stateRow.joinType || 'general',
        });
        const exchangeCode = createExchangeCode(session);

        const returnOrigin = String(stateRow.returnOrigin || fallbackOrigin).replace(/\/+$/, '');
        const returnPath = String(stateRow.returnPath || defaultReturnPath).trim() || defaultReturnPath;
        const url = new URL(
            returnPath.startsWith('/') ? returnPath : `/${returnPath}`,
            `${returnOrigin}/`,
        );
        if (stateRow.next) url.searchParams.set('next', stateRow.next);
        url.searchParams.set('kakao_code', exchangeCode);
        res.redirect(302, url.toString());
    } catch (e) {
        console.error('kakao callback:', e);
        redirectWithError(res, fallbackOrigin, e.message || 'kakao_login_failed', defaultReturnPath);
    }
}

function callbackHandler(req, res) {
    Promise.resolve(handleOAuthCallback(req, res, 'login')).catch(err => {
        console.error('kakao callbackHandler async:', err);
        if (!res.headersSent) redirectWithError(res, resolveReturnOrigin(req, ''), 'kakao_login_failed', '/login');
    });
}

function businessCallbackHandler(req, res) {
    Promise.resolve(handleOAuthCallback(req, res, 'business')).catch(err => {
        console.error('kakao businessCallbackHandler async:', err);
        if (!res.headersSent) redirectWithError(res, resolveReturnOrigin(req, ''), 'kakao_business_failed', '/login');
    });
}

function exchangeHandler(req, res) {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const code = String(body.code || req.query.code || '').trim();
        if (!code) {
            res.status(400).json({ ok: false, error: '교환 코드가 없습니다.' });
            return;
        }
        const row = consumeExchangeCode(code);
        if (!row || !row.token) {
            res.status(410).json({ ok: false, error: '로그인 코드가 만료되었거나 이미 사용되었습니다.' });
            return;
        }
        res.status(200).json({ ok: true, token: row.token, user: row.user });
    } catch (e) {
        console.error('kakao exchangeHandler:', e);
        res.status(500).json({ ok: false, error: '로그인 처리 중 오류가 발생했습니다.' });
    }
}

function configHandler(req, res) {
    const env = readKakaoEnv();
    const loginRedirect = resolveRedirectUri(req, 'login');
    const key = env.restApiKey;
    res.status(200).json({
        ok: true,
        enabled: Boolean(key),
        clientIdHint: key ? `${key.slice(0, 8)}…` : null,
        clientSecretConfigured: Boolean(env.clientSecret),
        redirectUri: loginRedirect || env.redirectUri || null,
        scopes: kakaoSyncScopes().split(','),
        serviceTermsTags: String(env.serviceTermsTags || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
    });
}

module.exports = {
    authorizeHandler,
    callbackHandler,
    businessCallbackHandler,
    exchangeHandler,
    configHandler,
    resolveRedirectUri,
    readKakaoEnv,
};
