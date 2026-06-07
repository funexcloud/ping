'use strict';

const crypto = require('crypto');

const SESSION_COOKIE = 'ping_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function timingSafeEqualStrings(expected, provided) {
    const a = Buffer.from(String(expected || ''));
    const b = Buffer.from(String(provided || ''));
    if (a.length !== b.length) return false;
    try {
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

/** UI 로그인 PIN — 서버 env 전용 (클라이언트·하드코드 금지) */
function getAdminUiPassword() {
    return String(process.env.PING_ADMIN_UI_PASSWORD || process.env.PING_ADMIN_PASSWORD || '').trim();
}

/** 입금확인·발송 트리거 API 키 — UI PIN 과 분리 */
function getAdminApiKeySecret() {
    return String(
        process.env.PING_ADMIN_API_KEY ||
            process.env.PING_COUPON_ADMIN_SECRET ||
            process.env.PING_ADMIN_SETTINGS_SECRET ||
            ''
    ).trim();
}

function getSessionSigningSecret() {
    const explicit = String(process.env.PING_ADMIN_SESSION_SECRET || '').trim();
    if (explicit) return explicit;
    return getAdminApiKeySecret();
}

function verifyAdminUiPassword(provided) {
    const secret = getAdminUiPassword();
    if (!secret) {
        return { ok: false, reason: 'ui_password_unconfigured' };
    }
    if (!timingSafeEqualStrings(secret, provided)) {
        return { ok: false, reason: 'invalid_password' };
    }
    return { ok: true };
}

function verifyAdminApiKey(provided) {
    const secret = getAdminApiKeySecret();
    if (!secret) return false;
    return timingSafeEqualStrings(secret, String(provided || ''));
}

function createAdminSessionToken() {
    const signing = getSessionSigningSecret();
    if (!signing) {
        throw new Error('PING_ADMIN_SESSION_SECRET 또는 PING_ADMIN_API_KEY 가 필요합니다.');
    }
    const exp = Date.now() + SESSION_TTL_MS;
    const payload = Buffer.from(JSON.stringify({ exp, v: 1 })).toString('base64url');
    const sig = crypto.createHmac('sha256', signing).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

function verifyAdminSessionToken(token) {
    const signing = getSessionSigningSecret();
    if (!signing || !token) return false;
    const parts = String(token).split('.');
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    const expected = crypto.createHmac('sha256', signing).update(payload).digest('base64url');
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length) return false;
    try {
        if (!crypto.timingSafeEqual(a, b)) return false;
    } catch {
        return false;
    }
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!data || typeof data.exp !== 'number') return false;
        return Date.now() < data.exp;
    } catch {
        return false;
    }
}

function readCookieHeader(cookieHeader, name) {
    if (!cookieHeader) return '';
    const parts = String(cookieHeader).split(';');
    for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx < 0) continue;
        const key = part.slice(0, idx).trim();
        if (key !== name) continue;
        return decodeURIComponent(part.slice(idx + 1).trim());
    }
    return '';
}

/**
 * @param {{
 *   adminKey?: unknown,
 *   sessionToken?: unknown,
 *   cookieHeader?: string,
 *   headers?: Record<string, string | string[] | undefined>,
 * }} input
 */
function resolveAdminAuth(input = {}) {
    const headers = input.headers || {};
    const headerVal = (name) => {
        const v = headers[name] || headers[name.toLowerCase()];
        return Array.isArray(v) ? v[0] : v;
    };

    const sessionToken =
        String(input.sessionToken || '').trim() ||
        String(headerVal('x-ping-admin-session') || '').trim() ||
        readCookieHeader(input.cookieHeader, SESSION_COOKIE);

    if (sessionToken && verifyAdminSessionToken(sessionToken)) {
        return { ok: true, via: 'session' };
    }

    const adminKey =
        String(input.adminKey || '').trim() ||
        String(headerVal('x-ping-admin-key') || '').trim() ||
        String(headerVal('x-ping-admin-secret') || '').trim();

    if (adminKey && verifyAdminApiKey(adminKey)) {
        return { ok: true, via: 'api_key' };
    }

    return { ok: false, via: null };
}

/**
 * @param {{ password?: unknown }} body
 */
function apiAdminLogin(body) {
    const password = String((body && body.password) || '');
    if (!password) {
        return { status: 400, body: { ok: false, error: 'password_required' } };
    }

    const check = verifyAdminUiPassword(password);
    if (!check.ok) {
        if (check.reason === 'ui_password_unconfigured') {
            return {
                status: 503,
                body: {
                    ok: false,
                    error: 'ui_password_unconfigured',
                    message: '서버에 PING_ADMIN_UI_PASSWORD 가 설정되지 않았습니다.',
                },
            };
        }
        return { status: 401, body: { ok: false, error: 'invalid_password' } };
    }

    try {
        const token = createAdminSessionToken();
        return {
            status: 200,
            body: { ok: true },
            sessionToken: token,
        };
    } catch (err) {
        return {
            status: 503,
            body: {
                ok: false,
                error: 'session_unavailable',
                message: err && err.message ? err.message : 'session',
            },
        };
    }
}

/**
 * @param {string} [cookieHeader]
 */
function apiAdminSession(cookieHeader) {
    const token = readCookieHeader(cookieHeader, SESSION_COOKIE);
    if (token && verifyAdminSessionToken(token)) {
        return { status: 200, body: { ok: true, authenticated: true } };
    }
    return { status: 401, body: { ok: false, authenticated: false } };
}

function sessionCookieOptions() {
    const secure = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(SESSION_TTL_MS / 1000),
    };
}

module.exports = {
    SESSION_COOKIE,
    SESSION_TTL_MS,
    getAdminUiPassword,
    getAdminApiKeySecret,
    verifyAdminUiPassword,
    verifyAdminApiKey,
    createAdminSessionToken,
    verifyAdminSessionToken,
    readCookieHeader,
    resolveAdminAuth,
    apiAdminLogin,
    apiAdminSession,
    sessionCookieOptions,
};
