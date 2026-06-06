/**
 * 로컬 개발용 회원가입·로그인 (members.local.json + auth-sessions.local.json)
 * 배포 시 Firebase Auth 등으로 교체 가능한 Express 핸들러 모듈.
 * Vercel(`VERCEL=1`): JSON 저장 경로는 `os.tmpdir()/ping-member-auth` (번들 디렉터리는 읽기 전용).
 * 고정 경로: `PING_MEMBER_DATA_DIR`. 이메일 인증: Resend (`RESEND_API_KEY`). 로컬 스모크는 `PING_SKIP_EMAIL_VERIFICATION=1`.
 * 인증 코드: 6자리 숫자(해시 저장·약 15분 만료); POST `/api/auth/verify-email` 에 `email`+`code`.
 * 과거 발송 분만 `token` 바디 지원(레거시 행의 emailVerifyExpiresAt 으로 만료 판단).
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    sendVerificationEmail,
    resendErrorFromException,
    defaultResendFailHint,
} = require('./email-resend');
const {
    generateSixDigitCode,
    normalizeSixDigitCode,
    isValidSixDigitCode,
} = require('./six-digit-code');

/**
 * Vercel 등 서버리스: 배포 번들 디렉터리는 쓰기 불가 → /tmp(또는 os.tmpdir)만 사용 가능.
 * `PING_MEMBER_DATA_DIR` 로 고정 경로를 지정할 수 있음.
 */
function getMemberAuthStoreDir() {
    const explicit = String(process.env.PING_MEMBER_DATA_DIR || '').trim();
    if (explicit) return explicit;
    if (String(process.env.VERCEL || '') === '1') {
        return path.join(os.tmpdir(), 'ping-member-auth');
    }
    return __dirname;
}

const MEMBER_AUTH_STORE_DIR = getMemberAuthStoreDir();
const MEMBERS_PATH = path.join(MEMBER_AUTH_STORE_DIR, 'members.local.json');
const SESSIONS_PATH = path.join(MEMBER_AUTH_STORE_DIR, 'auth-sessions.local.json');
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFY_CODE_MAX_AGE_MS = 15 * 60 * 1000;
/** 첫 재발송: 30초, 이후: 45초. 발송 실패 시 쿨다운 없음(즉시 재시도 가능) */
const RESEND_COOLDOWN_FIRST_MS = 30 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const RESEND_MAX_PER_WINDOW = 8;
/** 코드 추측 방지: 15분에 최대 시도 횟수 */
const VERIFY_CODE_MAX_ATTEMPTS = 10;
const JOIN_TYPES = new Set(['general', 'group', 'admin']);

function skipEmailVerification() {
    return String(process.env.PING_SKIP_EMAIL_VERIFICATION || '') === '1';
}

/** 기존 members.local.json 행에 `emailVerifiedAt` 필드가 없으면 인증 생략(구 데이터)으로 간주 */
function isEmailVerified(m) {
    if (!m) return false;
    if (!Object.prototype.hasOwnProperty.call(m, 'emailVerifiedAt')) return true;
    return m.emailVerifiedAt != null && String(m.emailVerifiedAt).length > 0;
}

function timingSafeEqualStr(a, b) {
    const x = Buffer.from(String(a || ''), 'utf8');
    const y = Buffer.from(String(b || ''), 'utf8');
    if (x.length !== y.length) return false;
    try {
        return crypto.timingSafeEqual(x, y);
    } catch (_) {
        return false;
    }
}

function createUserId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `u_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function createSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase().slice(0, 320);
}

function normalizeLoginKey(value) {
    return String(value || '').trim().toLowerCase().slice(0, 320);
}

function normalizePhone(value) {
    return String(value || '').replace(/\s/g, '').replace(/[^0-9+]/g, '').slice(0, 32);
}

function isValidEmail(email) {
    if (!email || email.length > 320) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 영문 + 숫자 + 허용 기호(!@#$%*_+-?) 포함, 8자 이상 — 코드와 헷갈리는 기호 제외 */
const PASSWORD_ALLOWED_SPECIAL_RE = /[!@#$%*_+\-?]/;
const PASSWORD_CHAR_RE = /^[A-Za-z0-9!@#$%*_+\-?]*$/;
const PASSWORD_SPECIALS_DISPLAY = '! @ # $ % * _ + - ?';

function getPasswordPolicyError(password) {
    const p = String(password || '');
    if (!PASSWORD_CHAR_RE.test(p)) {
        return '사용할 수 없는 문자가 포함되어 있습니다. 사용 가능 기호: ' + PASSWORD_SPECIALS_DISPLAY;
    }
    if (p.length < 8) {
        return '비밀번호는 8자 이상이어야 합니다.';
    }
    if (!/[A-Za-z]/.test(p)) {
        return '비밀번호에 영문 문자를 포함해 주세요.';
    }
    if (!/[0-9]/.test(p)) {
        return '비밀번호에 숫자를 포함해 주세요.';
    }
    if (!PASSWORD_ALLOWED_SPECIAL_RE.test(p)) {
        return '비밀번호에 기호를 한 글자 이상 포함해 주세요. (기호: ' + PASSWORD_SPECIALS_DISPLAY + ')';
    }
    return null;
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(Buffer.from(String(password), 'utf8'), salt, 64);
    return { salt: salt.toString('base64'), hash: hash.toString('base64') };
}

function verifyPassword(password, saltB64, hashB64) {
    try {
        const salt = Buffer.from(saltB64, 'base64');
        const expected = Buffer.from(hashB64, 'base64');
        const derived = crypto.scryptSync(Buffer.from(String(password), 'utf8'), salt, 64);
        if (derived.length !== expected.length) return false;
        return crypto.timingSafeEqual(derived, expected);
    } catch (_) {
        return false;
    }
}

function hashSixDigitVerificationCode(codeSix) {
    if (!isValidSixDigitCode(codeSix)) {
        throw new Error('invalid_verification_code');
    }
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(Buffer.from(codeSix, 'utf8'), salt, 64);
    return { salt: salt.toString('base64'), hash: hash.toString('base64') };
}

function verifySixDigitCodeHash(codeSix, saltB64, hashB64) {
    try {
        const salt = Buffer.from(saltB64, 'base64');
        const expected = Buffer.from(hashB64, 'base64');
        const derived = crypto.scryptSync(Buffer.from(String(codeSix), 'utf8'), salt, 64);
        if (derived.length !== expected.length) return false;
        return crypto.timingSafeEqual(derived, expected);
    } catch (_) {
        return false;
    }
}

function stripEmailVerificationSecrets(m) {
    delete m.emailVerifyToken;
    delete m.emailVerifyExpiresAt;
    delete m.emailVerifyCodeSalt;
    delete m.emailVerifyCodeHash;
    delete m.emailVerifyCodeExpiresAt;
    delete m.emailVerifyAttemptCount;
    delete m.emailVerifyAttemptWindowStart;
}

function recordVerifyAttemptFail(member) {
    const now = Date.now();
    const windowStart = Number(member.emailVerifyAttemptWindowStart) || 0;
    if (!windowStart || now - windowStart >= VERIFY_CODE_MAX_AGE_MS) {
        member.emailVerifyAttemptWindowStart = now;
        member.emailVerifyAttemptCount = 1;
        return 1;
    }
    member.emailVerifyAttemptCount = (Number(member.emailVerifyAttemptCount) || 0) + 1;
    return member.emailVerifyAttemptCount;
}

function isVerifyAttemptBlocked(member) {
    const now = Date.now();
    const windowStart = Number(member.emailVerifyAttemptWindowStart) || 0;
    const count = Number(member.emailVerifyAttemptCount) || 0;
    return (
        windowStart > 0 &&
        count >= VERIFY_CODE_MAX_ATTEMPTS &&
        now - windowStart < VERIFY_CODE_MAX_AGE_MS
    );
}

function assignEmailVerificationCode(member, plainCodeSix, nowMs) {
    const code = normalizeSixDigitCode(plainCodeSix);
    if (!isValidSixDigitCode(code)) {
        throw new Error('invalid_verification_code');
    }
    const { salt, hash } = hashSixDigitVerificationCode(code);
    stripEmailVerificationSecrets(member);
    member.emailVerifyCodeSalt = salt;
    member.emailVerifyCodeHash = hash;
    member.emailVerifyCodeExpiresAt = nowMs + VERIFY_CODE_MAX_AGE_MS;
}

function markEmailVerifySent(member, sentAtMs) {
    member.emailVerifyLastSentAt = sentAtMs;
    const windowStart = Number(member.emailVerifyResendWindowStart) || 0;
    if (!windowStart || sentAtMs - windowStart >= VERIFY_CODE_MAX_AGE_MS) {
        member.emailVerifyResendWindowStart = sentAtMs;
        member.emailVerifyResendCount = 1;
        return;
    }
    member.emailVerifyResendCount = (Number(member.emailVerifyResendCount) || 0) + 1;
}

function getResendCooldownMs(member) {
    const sentCount = Number(member.emailVerifyResendCount) || 0;
    if (!Number(member.emailVerifyLastSentAt)) return 0;
    if (sentCount <= 1) return RESEND_COOLDOWN_FIRST_MS;
    return RESEND_COOLDOWN_MS;
}

function nextResendAfterSec(member) {
    return Math.max(1, Math.ceil(getResendCooldownMs(member) / 1000));
}

/**
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number, error: string }}
 */
function checkResendRateLimit(member) {
    const now = Date.now();
    const windowStart = Number(member.emailVerifyResendWindowStart) || 0;
    const count = Number(member.emailVerifyResendCount) || 0;
    if (windowStart && count >= RESEND_MAX_PER_WINDOW && now - windowStart < VERIFY_CODE_MAX_AGE_MS) {
        const retryAfterSec = Math.max(1, Math.ceil((windowStart + VERIFY_CODE_MAX_AGE_MS - now) / 1000));
        return {
            ok: false,
            retryAfterSec,
            error: `인증 메일 요청이 많습니다. ${retryAfterSec}초 후에 다시 시도해 주세요.`,
        };
    }
    const last = Number(member.emailVerifyLastSentAt) || 0;
    if (!last) return { ok: true };
    const cooldown = getResendCooldownMs(member);
    const elapsed = now - last;
    if (elapsed < cooldown) {
        const retryAfterSec = Math.max(1, Math.ceil((cooldown - elapsed) / 1000));
        return {
            ok: false,
            retryAfterSec,
            error: `${retryAfterSec}초 후에 다시 보낼 수 있어요. 스팸함도 확인해 주세요.`,
        };
    }
    return { ok: true };
}

const memberStore = require('./lib/ping-member-store.cjs');

function readMembers() {
    const rows = memberStore.getStore('members');
    return Array.isArray(rows) ? rows : [];
}

function writeMembers(rows) {
    memberStore.setStore('members', rows);
}

function readSessions() {
    const rows = memberStore.getStore('sessions');
    return Array.isArray(rows) ? rows : [];
}

function writeSessions(rows) {
    memberStore.setStore('sessions', rows);
}

function pruneExpiredSessions(sessions) {
    const now = Date.now();
    return sessions.filter(s => s && s.expiresAt > now);
}

function publicUser(m) {
    return {
        id: m.id,
        email: m.email,
        displayName: m.displayName || '',
        phone: m.phone || '',
        joinType: m.joinType || 'general',
        createdAt: m.createdAt || null,
        emailVerified: isEmailVerified(m),
    };
}

function findMemberByEmail(members, email) {
    const key = normalizeEmail(email);
    return members.find(u => u.email === key);
}

function findMemberForLogin(members, loginKey) {
    const key = normalizeLoginKey(loginKey);
    if (!key) return null;
    const byEmail = members.find(u => u.email === key);
    if (byEmail) return byEmail;
    return members.find(u => u.loginId && normalizeLoginKey(u.loginId) === key);
}

function parseBearer(req) {
    const h = req.headers.authorization;
    if (h && typeof h === 'string' && h.startsWith('Bearer ')) {
        return h.slice(7).trim();
    }
    const cookies = req.headers.cookie;
    if (!cookies) return '';
    const m = cookies.match(/(?:^|;\s*)ping_auth_token=([^;]+)/);
    if (!m) return '';
    try {
        return decodeURIComponent(m[1]).trim();
    } catch (_) {
        return m[1].trim();
    }
}

function createSessionForUser(userId) {
    let sessions = pruneExpiredSessions(readSessions());
    const token = createSessionToken();
    const now = Date.now();
    sessions.unshift({
        token,
        userId,
        createdAt: now,
        expiresAt: now + SESSION_MAX_AGE_MS,
    });
    const maxKeep = 20000;
    if (sessions.length > maxKeep) sessions = sessions.slice(0, maxKeep);
    writeSessions(sessions);
    return token;
}

function revokeToken(token) {
    if (!token) return;
    const sessions = readSessions().filter(s => s.token !== token);
    writeSessions(sessions);
}

function getUserIdFromToken(token) {
    if (!token) return null;
    const sessions = pruneExpiredSessions(readSessions());
    writeSessions(sessions);
    const row = sessions.find(s => s.token === token);
    return row ? row.userId : null;
}

async function registerHandler(req, res) {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const email = normalizeEmail(body.email || body.memberId);
        const password = body.password != null ? String(body.password) : '';
        const displayName = String(body.displayName || body.name || '').trim().slice(0, 120);
        const phone = normalizePhone(body.phone);
        let joinType = String(body.joinType || 'general').trim();
        if (!JOIN_TYPES.has(joinType)) joinType = 'general';

        if (!isValidEmail(email)) {
            res.status(400).json({ ok: false, error: '올바른 이메일 주소를 입력해 주세요.' });
            return;
        }
        const pwdErr = getPasswordPolicyError(password);
        if (pwdErr) {
            res.status(400).json({ ok: false, error: pwdErr });
            return;
        }
        if (!displayName) {
            res.status(400).json({ ok: false, error: '이름을 입력해 주세요.' });
            return;
        }

        const members = readMembers();
        if (findMemberByEmail(members, email)) {
            res.status(409).json({ ok: false, error: '이미 가입된 이메일입니다.' });
            return;
        }

        const { salt, hash } = hashPassword(password);
        const id = createUserId();
        const now = new Date().toISOString();
        const row = {
            id,
            email,
            passwordSalt: salt,
            passwordHash: hash,
            displayName,
            phone: phone || '',
            joinType,
            createdAt: now,
            updatedAt: now,
        };

        const skipVerify = skipEmailVerification();
        let verificationPlainCode = '';
        if (skipVerify) {
            row.emailVerifiedAt = now;
        } else {
            row.emailVerifiedAt = null;
            verificationPlainCode = generateSixDigitCode();
            assignEmailVerificationCode(row, verificationPlainCode, Date.now());
        }

        members.unshift(row);
        writeMembers(members);

        if (skipVerify) {
            const token = createSessionForUser(id);
            res.status(201).json({
                ok: true,
                token,
                user: publicUser(row),
            });
            return;
        }

        let emailSent = false;
        let registerEmailError = '';
        try {
            await sendVerificationEmail({
                toEmail: email,
                code: verificationPlainCode,
                displayName,
            });
            emailSent = true;
            markEmailVerifySent(row, Date.now());
            writeMembers(members);
        } catch (e) {
            console.error('registerHandler sendVerificationEmail:', e.message || e);
            registerEmailError = resendErrorFromException(e) || defaultResendFailHint();
        }

        res.status(201).json({
            ok: true,
            needsVerification: true,
            email,
            emailSent,
            nextResendAfterSec: emailSent ? nextResendAfterSec(row) : 0,
            warning: emailSent
                ? undefined
                : registerEmailError ||
                  '인증 메일을 보내지 못했습니다. 아래 「다시 보내기」로 바로 재시도할 수 있습니다.',
        });
    } catch (e) {
        console.error('registerHandler:', e);
        res.status(500).json({ ok: false, error: '회원가입 처리 중 오류가 발생했습니다.' });
    }
}

function loginHandler(req, res) {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const loginKey = body.memberId || body.loginId || body.email || '';
        const password = body.password != null ? String(body.password) : '';
        const key = normalizeLoginKey(loginKey);

        if (!key || !password) {
            res.status(400).json({ ok: false, error: '아이디(이메일)와 비밀번호를 입력해 주세요.' });
            return;
        }

        const members = readMembers();
        const member = findMemberForLogin(members, key);
        if (!member || !verifyPassword(password, member.passwordSalt, member.passwordHash)) {
            res.status(401).json({ ok: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
            return;
        }

        if (!isEmailVerified(member)) {
            res.status(403).json({
                ok: false,
                code: 'email_not_verified',
                error:
                    '이메일 인증이 완료되지 않았습니다. 메일에 있는 6자리 코드를 입력하거나, 부고 회원 「이메일 인증」 페이지에서 코드를 확인해 주세요. 코드를 받지 못했다면 인증 메일 다시 보내기를 이용해 주세요.',
            });
            return;
        }

        const token = createSessionForUser(member.id);
        res.status(200).json({
            ok: true,
            token,
            user: publicUser(member),
        });
    } catch (e) {
        console.error('loginHandler:', e);
        res.status(500).json({ ok: false, error: '로그인 처리 중 오류가 발생했습니다.' });
    }
}

function meHandler(req, res) {
    try {
        const token = parseBearer(req);
        const userId = getUserIdFromToken(token);
        if (!userId) {
            res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
            return;
        }
        const members = readMembers();
        const member = members.find(u => u.id === userId);
        if (!member) {
            res.status(401).json({ ok: false, error: '계정을 찾을 수 없습니다.' });
            return;
        }
        res.status(200).json({ ok: true, user: publicUser(member) });
    } catch (e) {
        console.error('meHandler:', e);
        res.status(500).json({ ok: false, error: '사용자 정보를 불러오지 못했습니다.' });
    }
}

function logoutHandler(req, res) {
    try {
        const token = parseBearer(req) || (req.body && req.body.token) || '';
        if (token) revokeToken(token);
        res.status(200).json({ ok: true });
    } catch (e) {
        console.error('logoutHandler:', e);
        res.status(500).json({ ok: false, error: '로그아웃 처리 중 오류가 발생했습니다.' });
    }
}

function verifyEmailHandler(req, res) {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const email = normalizeEmail(body.email || '');
        const code = normalizeSixDigitCode(body.code);
        const legacyTokenRaw = String(body.token || '').trim();

        let members = readMembers();
        let member;

        function finishVerifySuccess(m) {
            const verifiedAt = new Date().toISOString();
            m.emailVerifiedAt = verifiedAt;
            m.updatedAt = verifiedAt;
            stripEmailVerificationSecrets(m);
            writeMembers(members);
            res.status(200).json({ ok: true, message: '이메일 인증이 완료되었습니다.' });
        }

        if (legacyTokenRaw.length >= 64 && /^[a-fA-F0-9]+$/.test(legacyTokenRaw)) {
            member = members.find(m => m.emailVerifyToken && timingSafeEqualStr(m.emailVerifyToken, legacyTokenRaw));
            if (!member) {
                res.status(400).json({ ok: false, error: '유효하지 않거나 이미 사용된 인증 링크입니다.' });
                return;
            }
            if (member.emailVerifyExpiresAt && Date.now() > Number(member.emailVerifyExpiresAt)) {
                res.status(400).json({ ok: false, error: '인증 링크가 만료되었습니다. 인증 메일을 다시 요청해 주세요.' });
                return;
            }
            finishVerifySuccess(member);
            return;
        }

        if (!isValidEmail(email) || !code) {
            res.status(400).json({
                ok: false,
                error: '인증 메일 주소와 6자리 숫자 코드를 입력해 주세요.',
            });
            return;
        }

        member = findMemberByEmail(members, email);
        if (!member || isEmailVerified(member)) {
            res.status(400).json({ ok: false, error: '인증 코드가 올바르지 않거나 이미 만료되었습니다.' });
            return;
        }

        if (
            member.emailVerifyCodeHash &&
            member.emailVerifyCodeSalt &&
            Number(member.emailVerifyCodeExpiresAt) > 0
        ) {
            if (Date.now() > Number(member.emailVerifyCodeExpiresAt)) {
                res.status(400).json({ ok: false, error: '인증 코드가 만료되었습니다. 인증 메일을 다시 요청해 주세요.' });
                return;
            }
            if (isVerifyAttemptBlocked(member)) {
                res.status(429).json({
                    ok: false,
                    error: '인증 시도 횟수가 많습니다. 잠시 후 다시 하거나 인증 메일을 다시 요청해 주세요.',
                });
                return;
            }
            const okHash = verifySixDigitCodeHash(code, member.emailVerifyCodeSalt, member.emailVerifyCodeHash);
            if (!okHash) {
                const attempts = recordVerifyAttemptFail(member);
                member.updatedAt = new Date().toISOString();
                writeMembers(members);
                if (attempts >= VERIFY_CODE_MAX_ATTEMPTS) {
                    res.status(429).json({
                        ok: false,
                        error: '인증 시도 횟수가 많습니다. 인증 메일을 다시 요청해 주세요.',
                    });
                    return;
                }
                res.status(400).json({ ok: false, error: '인증 코드가 올바르지 않습니다.' });
                return;
            }
            finishVerifySuccess(member);
            return;
        }

        /* 남아 있는 레거시: 토큰만 있는 계정은 코드 입력으로는 검증하지 않음 */
        res.status(400).json({
            ok: false,
            error: '등록된 인증 코드가 없습니다. 새 코드를 받으려면 「인증 메일 다시 보내기」를 눌러 주세요.',
        });
    } catch (e) {
        console.error('verifyEmailHandler:', e);
        res.status(500).json({ ok: false, error: '인증 처리 중 오류가 발생했습니다.' });
    }
}

/**
 * 카카오싱크 로그인 — 기존 회원(이메일)과 kakaoId 연동 또는 신규 생성
 */
function upsertMemberFromKakaoSync(payload) {
    const kakaoId = String((payload && payload.kakaoId) || '').trim();
    if (!kakaoId) {
        throw new Error('missing_kakao_id');
    }

    const members = readMembers();
    const now = new Date().toISOString();
    const email = payload.email ? normalizeEmail(payload.email) : '';
    const phone = normalizePhone(payload.phone || '');
    const displayName =
        String((payload && payload.displayName) || '')
            .trim()
            .slice(0, 80) || '카카오 회원';

    let member = members.find(u => u && String(u.kakaoId || '') === kakaoId);
    if (!member && email) {
        member = findMemberByEmail(members, email);
    }

    if (member) {
        member.kakaoId = kakaoId;
        if (displayName) member.displayName = displayName;
        if (phone) member.phone = phone;
        if (email && isValidEmail(email)) member.email = email;
        if (payload.emailVerified && !isEmailVerified(member)) {
            member.emailVerifiedAt = now;
        }
        member.authProvider = member.authProvider || 'kakao';
        member.updatedAt = now;
    } else {
        let joinType = 'general';
        const requestedJoin = String((payload && payload.joinType) || '').trim();
        if (JOIN_TYPES.has(requestedJoin)) joinType = requestedJoin;

        const id = createUserId();
        member = {
            id,
            kakaoId,
            email: email && isValidEmail(email) ? email : `kakao_${kakaoId}@kakao.local`,
            displayName,
            phone,
            joinType,
            authProvider: 'kakao',
            createdAt: now,
            updatedAt: now,
            emailVerifiedAt:
                payload.emailVerified || skipEmailVerification() ? now : null,
        };
        members.unshift(member);
    }

    writeMembers(members);
    const token = createSessionForUser(member.id);
    return { token, user: publicUser(member) };
}

async function resendVerificationHandler(req, res) {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const email = normalizeEmail(body.email || '');
        if (!isValidEmail(email)) {
            res.status(400).json({ ok: false, error: '이메일 주소를 입력해 주세요.' });
            return;
        }

        const members = readMembers();
        const member = findMemberByEmail(members, email);
        if (!member || isEmailVerified(member)) {
            res.status(200).json({ ok: true, queued: true });
            return;
        }

        const limit = checkResendRateLimit(member);
        if (!limit.ok) {
            res.status(429).json({
                ok: false,
                error: limit.error,
                retryAfterSec: limit.retryAfterSec,
            });
            return;
        }

        let plainCode;
        try {
            plainCode = generateSixDigitCode();
        } catch (genErr) {
            console.error('resendVerificationHandler generateSixDigitCode:', genErr);
            res.status(500).json({ ok: false, error: '인증 코드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' });
            return;
        }

        try {
            await sendVerificationEmail({
                toEmail: member.email,
                code: plainCode,
                displayName: member.displayName,
            });
            assignEmailVerificationCode(member, plainCode, Date.now());
            markEmailVerifySent(member, Date.now());
            member.updatedAt = new Date().toISOString();
            writeMembers(members);
            res.status(200).json({
                ok: true,
                sent: true,
                nextResendAfterSec: nextResendAfterSec(member),
            });
        } catch (e) {
            console.error('resendVerificationHandler:', e.message || e);
            res.status(503).json({
                ok: false,
                error: resendErrorFromException(e) || defaultResendFailHint(),
            });
        }
    } catch (e) {
        console.error('resendVerificationHandler:', e);
        res.status(500).json({ ok: false, error: '요청 처리 중 오류가 발생했습니다.' });
    }
}

module.exports = {
    getPasswordPolicyError,
    registerHandler,
    loginHandler,
    meHandler,
    logoutHandler,
    verifyEmailHandler,
    resendVerificationHandler,
    parseBearer,
    getUserIdFromToken,
    publicUser,
    readMembers,
    isEmailVerified,
    skipEmailVerification,
    upsertMemberFromKakaoSync,
};
