'use strict';

/**
 * 비회원 본인확인 — Solapi LMS 6자리 인증번호 발송·검증
 *
 * - 관리자 설정: admin-app-settings.local.json (guestSmsVerificationEnabled 등)
 * - 진행 중 코드: guest-sms-codes.local.json (해시만 저장, 평문 코드 미보관)
 *
 * 향후 본인확인 인증서비스(NICE / PASS / 카카오 인증 등)로 개편 시:
 * - 관리자에서 guestIdentityProvider 를 official 로 전환하고
 * - 아래 주석 블록의 스텁을 실제 업체 SDK/REST에 맞게 구현한 뒤
 *   sendCodeHandler / verifyCodeHandler 분기에서 호출하면 됨.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadDispatchConfigFromEnv } = require('./ping-dispatch/config');
const { buildSolapiMessagesForPhones } = require('./ping-dispatch/buildMessages');
const { sendSolapiMessageBatch } = require('./ping-dispatch/solapiChunks');
const { pickDefaultFromNumber } = require('./scripts/solapi-auth-fetch');

const memberStore = require('./lib/ping-member-store.cjs');

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 8;

function getAdminSecret() {
    return String(process.env.PING_COUPON_ADMIN_SECRET || process.env.PING_ADMIN_SETTINGS_SECRET || '').trim();
}

function defaultSettings() {
    return {
        guestSmsVerificationEnabled: true,
        /** @type {'solapi_sms'|'official'} official 은 향후 본인확인 서비스 연동용 */
        guestIdentityProvider: 'solapi_sms',
    };
}

function readSettings() {
    const j = memberStore.getStore('guestSettings');
    return { ...defaultSettings(), ...(j && typeof j === 'object' ? j : {}) };
}

function writeSettings(s) {
    memberStore.setStore('guestSettings', s);
}

function readCodeStore() {
    let j = memberStore.getStore('guestCodes');
    if (!j || typeof j !== 'object' || Array.isArray(j)) {
        j = { pending: {}, audit: [] };
    }
    if (!j.pending || typeof j.pending !== 'object') j.pending = {};
    if (!Array.isArray(j.audit)) j.audit = [];
    return j;
}

function writeCodeStore(store) {
    memberStore.setStore('guestCodes', store);
}

function normalizePhoneKr(value) {
    let d = String(value || '').replace(/\D/g, '');
    if (d.startsWith('82') && d.length >= 10) d = '0' + d.slice(2);
    return d;
}

function isValidKrMobile(d) {
    return /^01[016789]\d{7,8}$/.test(d);
}

function pepper() {
    return String(process.env.PING_GUEST_SMS_PEPPER || 'ping-guest-sms-local-pepper');
}

function hashCode(phone, code) {
    return crypto.createHmac('sha256', pepper()).update(`${phone}|${code}`).digest('hex');
}

const { generateSixDigitCode: generateSixDigit } = require('./six-digit-code');

function buildSmsBody(code) {
    return `[PING 문자인증서비스]\n\n인증번호 ${code}\n\n번호를 복사해 인증을 완료해주세요`;
}

function maskPhone(p) {
    if (!p || p.length < 10) return '***';
    return `${p.slice(0, 3)}****${p.slice(-4)}`;
}

async function resolveSolapiFrom(cfg) {
    let from = String(cfg.from || '').replace(/\D/g, '');
    if (from) return from;
    if (!cfg.apiKey || !cfg.apiSecret) return '';
    try {
        return (await pickDefaultFromNumber({ apiKey: cfg.apiKey, apiSecret: cfg.apiSecret })) || '';
    } catch (_) {
        return '';
    }
}

/**
 * --------------------------------------------------------------------------
 * 향후 본인확인 인증서비스 — 아래를 구현·활성화하면 Solapi 문자 대신 사용.
 * 관리자 설정 guestIdentityProvider === 'official' 일 때
 *
 * async function startOfficialIdentityVerification({ name, phone, returnUrl }) {
 *     const provider = process.env.PING_OFFICIAL_ID_PROVIDER || 'nice';
 *     const base = process.env.PING_OFFICIAL_ID_API_BASE || 'https://api.example.com';
 *     const res = await fetch(`${base}/v1/verify/session`, {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PING_OFFICIAL_ID_API_KEY}` },
 *         body: JSON.stringify({ name, phone, returnUrl }),
 *     });
 *     const data = await res.json();
 *     return { ok: data.ok, transactionId: data.transactionId, redirectUrl: data.redirectUrl, error: data.error };
 * }
 *
 * async function completeOfficialIdentityVerification({ transactionId, token }) {
 *     const base = process.env.PING_OFFICIAL_ID_API_BASE || 'https://api.example.com';
 *     const res = await fetch(`${base}/v1/verify/confirm`, {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PING_OFFICIAL_ID_API_KEY}` },
 *         body: JSON.stringify({ transactionId, token }),
 *     });
 *     const data = await res.json();
 *     return { ok: data.ok, verifiedName: data.name, verifiedPhone: data.phone, error: data.error };
 * }
 * --------------------------------------------------------------------------
 */

async function sendGuestVerificationSms(phoneDigits, code) {
    const cfg = loadDispatchConfigFromEnv();
    if (!cfg.apiKey || !cfg.apiSecret) {
        return { ok: false, error: 'Solapi API 키가 설정되지 않았습니다.(.env SOLAPI_API_KEY / SOLAPI_API_SECRET)' };
    }
    const from = await resolveSolapiFrom(cfg);
    if (!from) {
        return {
            ok: false,
            error: '발신번호가 필요합니다. SOLAPI_FROM을 설정하거나 Solapi에 등록된 발신번호가 있어야 합니다.',
        };
    }
    const cfgWithFrom = { ...cfg, from };
    const text = buildSmsBody(code);
    const messages = buildSolapiMessagesForPhones([phoneDigits], cfgWithFrom, text, {}, 'sms');
    try {
        const result = await sendSolapiMessageBatch(cfgWithFrom, messages);
        const failed = result.failedMessageList || [];
        if (failed.length) {
            return { ok: false, error: '문자 발송이 거절되었습니다.', detail: failed[0] };
        }
        return { ok: true, result };
    } catch (e) {
        return { ok: false, error: (e && e.message) ? e.message : 'Solapi 발송 오류' };
    }
}

function prunePending(store) {
    const now = Date.now();
    const { pending } = store;
    for (const k of Object.keys(pending)) {
        if (pending[k].expiresAt < now) delete pending[k];
    }
}

function timingSafeEqualHex(a, b) {
    try {
        const ba = Buffer.from(String(a), 'hex');
        const bb = Buffer.from(String(b), 'hex');
        if (ba.length !== bb.length) return false;
        return crypto.timingSafeEqual(ba, bb);
    } catch (_) {
        return false;
    }
}

function assertAdmin(req) {
    const secret = getAdminSecret();
    if (!secret) {
        const e = new Error('서버에 PING_COUPON_ADMIN_SECRET(또는 PING_ADMIN_SETTINGS_SECRET)이 없습니다.');
        e.status = 503;
        throw e;
    }
    const h = String(req.headers['x-ping-admin-secret'] || '').trim();
    if (h !== secret) {
        const e = new Error('Unauthorized');
        e.status = 401;
        throw e;
    }
}

function guestAuthPublicConfigHandler(req, res) {
    try {
        const s = readSettings();
        res.set('Cache-Control', 'no-store');
        res.json({
            ok: true,
            guestSmsVerificationEnabled: !!s.guestSmsVerificationEnabled,
            guestIdentityProvider: s.guestIdentityProvider === 'official' ? 'official' : 'solapi_sms',
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: '설정을 읽지 못했습니다.' });
    }
}

async function sendCodeHandler(req, res) {
    try {
        const settings = readSettings();
        if (settings.guestIdentityProvider === 'official') {
            return res.status(501).json({
                ok: false,
                error: '본인확인 인증서비스 연동 전입니다. 관리자 설정에서 문자 인증(solapi_sms)을 사용해 주세요.',
            });
        }
        if (!settings.guestSmsVerificationEnabled) {
            return res.status(400).json({ ok: false, error: '문자 인증이 비활성화되어 있습니다.' });
        }

        const body = req.body || {};
        const phone = normalizePhoneKr(body.phone);
        const name = String(body.name || '')
            .trim()
            .slice(0, 80);
        if (!isValidKrMobile(phone)) {
            return res.status(400).json({ ok: false, error: '유효한 휴대폰 번호를 입력해 주세요.' });
        }

        const store = readCodeStore();
        prunePending(store);
        const now = Date.now();
        const existing = store.pending[phone];
        if (existing && existing.lastSentAt && now - existing.lastSentAt < RESEND_MS) {
            const wait = Math.ceil((RESEND_MS - (now - existing.lastSentAt)) / 1000);
            return res.status(429).json({ ok: false, error: `잠시 후 다시 요청해 주세요. (${wait}초)` });
        }

        const code = generateSixDigit();
        const sendResult = await sendGuestVerificationSms(phone, code);
        if (!sendResult.ok) {
            return res.status(502).json({ ok: false, error: sendResult.error });
        }

        store.pending[phone] = {
            codeHash: hashCode(phone, code),
            expiresAt: now + CODE_TTL_MS,
            lastSentAt: now,
            attempts: 0,
            name: name || undefined,
        };
        writeCodeStore(store);
        return res.json({ ok: true, message: '인증번호를 발송했습니다.' });
    } catch (e) {
        console.error('guest-auth send-code', e);
        if (!res.headersSent) res.status(500).json({ ok: false, error: '요청 처리 중 오류가 발생했습니다.' });
    }
}

function verifyCodeHandler(req, res) {
    try {
        const settings = readSettings();
        if (settings.guestIdentityProvider === 'official') {
            return res.status(501).json({
                ok: false,
                error: '본인확인 인증서비스 연동 전입니다.',
            });
        }
        if (!settings.guestSmsVerificationEnabled) {
            return res.status(400).json({ ok: false, error: '문자 인증이 비활성화되어 있습니다.' });
        }

        const body = req.body || {};
        const phone = normalizePhoneKr(body.phone);
        const code = String(body.code || '').replace(/\D/g, '');
        if (!isValidKrMobile(phone) || code.length !== 6) {
            return res.status(400).json({ ok: false, error: '휴대폰 번호와 6자리 인증번호를 확인해 주세요.' });
        }

        const store = readCodeStore();
        prunePending(store);
        const entry = store.pending[phone];
        if (!entry) {
            return res.status(400).json({ ok: false, error: '인증 요청이 없거나 만료되었습니다. 다시 받아 주세요.' });
        }
        if (Date.now() > entry.expiresAt) {
            delete store.pending[phone];
            writeCodeStore(store);
            return res.status(400).json({ ok: false, error: '인증번호가 만료되었습니다. 다시 요청해 주세요.' });
        }
        if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
            delete store.pending[phone];
            writeCodeStore(store);
            return res.status(429).json({
                ok: false,
                error: '시도 횟수를 초과했습니다. 다시 인증 문자를 받아 주세요.',
            });
        }
        entry.attempts += 1;

        const expected = entry.codeHash;
        const actual = hashCode(phone, code);
        if (!timingSafeEqualHex(expected, actual)) {
            writeCodeStore(store);
            return res.status(400).json({ ok: false, error: '인증번호가 일치하지 않습니다.' });
        }

        delete store.pending[phone];
        store.audit = store.audit || [];
        store.audit.push({
            phoneMasked: maskPhone(phone),
            verifiedAt: new Date().toISOString(),
            purpose: 'guest_obituary_or_bulk',
            name: entry.name || null,
        });
        if (store.audit.length > 500) store.audit = store.audit.slice(-500);
        writeCodeStore(store);
        return res.json({ ok: true, verified: true });
    } catch (e) {
        console.error('guest-auth verify-code', e);
        if (!res.headersSent) res.status(500).json({ ok: false, error: '요청 처리 중 오류가 발생했습니다.' });
    }
}

function adminAppSettingsGetHandler(req, res) {
    try {
        assertAdmin(req);
        res.set('Cache-Control', 'no-store');
        res.json({ ok: true, settings: readSettings() });
    } catch (e) {
        res.status(e.status || 500).json({ ok: false, error: e.message });
    }
}

function adminAppSettingsPatchHandler(req, res) {
    try {
        assertAdmin(req);
        const cur = readSettings();
        const b = req.body || {};
        if (typeof b.guestSmsVerificationEnabled === 'boolean') {
            cur.guestSmsVerificationEnabled = b.guestSmsVerificationEnabled;
        }
        if (b.guestIdentityProvider === 'solapi_sms' || b.guestIdentityProvider === 'official') {
            cur.guestIdentityProvider = b.guestIdentityProvider;
        }
        writeSettings(cur);
        res.json({ ok: true, settings: cur });
    } catch (e) {
        res.status(e.status || 500).json({ ok: false, error: e.message });
    }
}

module.exports = {
    guestAuthPublicConfigHandler,
    sendCodeHandler,
    verifyCodeHandler,
    adminAppSettingsGetHandler,
    adminAppSettingsPatchHandler,
    readSettings,
};
