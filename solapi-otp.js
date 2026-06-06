'use strict';

/**
 * Solapi SDK + 6자리 SMS OTP
 *
 * - 인증번호는 DB(기본: JSON 파일 영속 저장)에 **해시**로만 저장
 * - 유효 시간 기본 **3분** (옵션으로 변경 가능)
 * - 검증: 만료·시도 횟수·상수 시간 비교
 *
 * 다른 DB 사용 시: `createOtpHash` / `timingSafeEqualHex`는 그대로 쓰고
 * `JsonFileOtpStore` 대신 동일 인터페이스의 클래스를 주입하면 됨.
 *
 * @example
 * const { createSolapiOtpService, JsonFileOtpStore } = require('./solapi-otp');
 * const otp = createSolapiOtpService();
 * await otp.sendCode('010-1234-5678', { purpose: 'signup' });
 * const { ok, error } = await otp.verifyCode('01012345678', '123456');
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadDispatchConfigFromEnv } = require('./ping-dispatch/config');
const { buildSolapiMessagesForPhones } = require('./ping-dispatch/buildMessages');
const { sendSolapiMessageBatch } = require('./ping-dispatch/solapiChunks');
const { pickDefaultFromNumber } = require('./scripts/solapi-auth-fetch');
const { generateSixDigitCode } = require('./six-digit-code');

const DEFAULT_TTL_MS = 3 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 8;
const DEFAULT_STORE_PATH = path.join(__dirname, 'solapi-otp-store.local.json');

function pepper() {
    return String(process.env.PING_OTP_PEPPER || process.env.PING_GUEST_SMS_PEPPER || 'ping-otp-local-pepper-change-in-prod');
}

/** @param {string} phoneKey 정규화된 01… 휴대폰 */
function createOtpHash(phoneKey, code) {
    return crypto.createHmac('sha256', pepper()).update(`${phoneKey}|${code}`).digest('hex');
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

function normalizePhoneKr(value) {
    let d = String(value || '').replace(/\D/g, '');
    if (d.startsWith('82') && d.length >= 10) d = '0' + d.slice(2);
    return d;
}

function isValidKrMobile(d) {
    return /^01[016789]\d{7,8}$/.test(d);
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
 * @param {string} code
 * @param {{ title?: string }} [opts]
 */
function defaultSmsText(code, opts) {
    const title = (opts && opts.title) || '[PING 인증]';
    return `${title}\n\n인증번호 ${code}\n\n3분 이내에 입력해 주세요.`;
}

async function sendSolapiLms(phoneDigits, text) {
    const cfg = loadDispatchConfigFromEnv();
    if (!cfg.apiKey || !cfg.apiSecret) {
        return { ok: false, error: 'SOLAPI_API_KEY / SOLAPI_API_SECRET 이 필요합니다.' };
    }
    const from = await resolveSolapiFrom(cfg);
    if (!from) {
        return {
            ok: false,
            error: '발신번호(SOLAPI_FROM) 또는 등록된 발신번호가 필요합니다.',
        };
    }
    const cfgWithFrom = { ...cfg, from };
    const messages = buildSolapiMessagesForPhones([phoneDigits], cfgWithFrom, text, {}, 'sms');
    try {
        const result = await sendSolapiMessageBatch(cfgWithFrom, messages);
        const failed = result.failedMessageList || [];
        if (failed.length) {
            return { ok: false, error: 'Solapi 발송 거절', detail: failed[0] };
        }
        return { ok: true, result };
    } catch (e) {
        return { ok: false, error: (e && e.message) || 'Solapi 오류' };
    }
}

/**
 * JSON 파일 기반 영속 저장 (단일 프로세스 로컬·스테이징용 “DB”)
 */
class JsonFileOtpStore {
    /**
     * @param {string} filePath
     */
    constructor(filePath = DEFAULT_STORE_PATH) {
        this.filePath = filePath;
    }

    _read() {
        try {
            const raw = fs.readFileSync(this.filePath, 'utf8');
            const j = JSON.parse(raw);
            if (!j.records || typeof j.records !== 'object') j.records = {};
            return j;
        } catch (_) {
            return { records: {} };
        }
    }

    _write(data) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    /**
     * @param {string} phoneKey
     * @returns {null | { phoneKey: string, codeHash: string, expiresAt: number, createdAt: number, attempts: number, meta?: object }}
     */
    get(phoneKey) {
        const db = this._read();
        const r = db.records[phoneKey];
        return r && typeof r === 'object' ? { ...r } : null;
    }

    /**
     * @param {OtpRecord} record
     */
    put(record) {
        const db = this._read();
        db.records[record.phoneKey] = {
            phoneKey: record.phoneKey,
            codeHash: record.codeHash,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
            attempts: record.attempts,
            meta: record.meta && typeof record.meta === 'object' ? record.meta : undefined,
        };
        this._write(db);
    }

    /** @param {string} phoneKey */
    delete(phoneKey) {
        const db = this._read();
        delete db.records[phoneKey];
        this._write(db);
    }
}

/**
 * @typedef {object} OtpRecord
 * @property {string} phoneKey
 * @property {string} codeHash
 * @property {number} expiresAt
 * @property {number} createdAt
 * @property {number} attempts
 * @property {Record<string, unknown>} [meta]
 */

class SolapiOtpService {
    /**
     * @param {object} [options]
     * @param {number} [options.ttlMs]
     * @param {number} [options.maxAttempts]
     * @param {InstanceType<typeof JsonFileOtpStore>} [options.store]
     * @param {(code: string, opts: { title?: string }) => string} [options.formatSms]
     * @param {{ title?: string }} [options.smsOptions]
     */
    constructor(options = {}) {
        this.ttlMs = options.ttlMs != null ? Number(options.ttlMs) : DEFAULT_TTL_MS;
        this.maxAttempts = options.maxAttempts != null ? Number(options.maxAttempts) : DEFAULT_MAX_ATTEMPTS;
        this.store = options.store || new JsonFileOtpStore(options.storePath);
        this.formatSms = options.formatSms || defaultSmsText;
        this.smsOptions = options.smsOptions || {};
    }

    /**
     * 6자리 생성 → DB 저장 → Solapi LMS 발송
     * @param {string} phoneRaw 하이픈 포함 가능
     * @param {Record<string, unknown>} [meta] 저장소에만 메타데이터(평문 코드 저장 금지)
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    async sendCode(phoneRaw, meta) {
        const phoneKey = normalizePhoneKr(phoneRaw);
        if (!isValidKrMobile(phoneKey)) {
            return { ok: false, error: '유효한 휴대폰 번호가 아닙니다.' };
        }
        const code = generateSixDigitCode();
        const codeHash = createOtpHash(phoneKey, code);
        const now = Date.now();
        const record = {
            phoneKey,
            codeHash,
            expiresAt: now + this.ttlMs,
            createdAt: now,
            attempts: 0,
            meta: meta && typeof meta === 'object' ? { ...meta } : undefined,
        };
        this.store.put(record);

        const text = this.formatSms(code, this.smsOptions);
        const send = await sendSolapiLms(phoneKey, text);
        if (!send.ok) {
            this.store.delete(phoneKey);
            return { ok: false, error: send.error };
        }
        return { ok: true };
    }

    /**
     * 3분(또는 ttlMs) 이내 & 시도 횟수 이내 & 코드 일치 시 성공, 레코드 삭제
     * @param {string} phoneRaw
     * @param {string} codeInput
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    async verifyCode(phoneRaw, codeInput) {
        const phoneKey = normalizePhoneKr(phoneRaw);
        const code = String(codeInput || '').replace(/\D/g, '');
        if (!isValidKrMobile(phoneKey) || code.length !== 6) {
            return { ok: false, error: '휴대폰 번호와 6자리 인증번호를 확인해 주세요.' };
        }

        const rec = this.store.get(phoneKey);
        if (!rec) {
            return { ok: false, error: '인증 요청이 없거나 이미 만료되었습니다.' };
        }
        const now = Date.now();
        if (now > rec.expiresAt) {
            this.store.delete(phoneKey);
            return { ok: false, error: '인증 시간이 만료되었습니다. 다시 요청해 주세요.' };
        }
        if (rec.attempts >= this.maxAttempts) {
            this.store.delete(phoneKey);
            return { ok: false, error: '시도 횟수를 초과했습니다. 인증을 다시 요청해 주세요.' };
        }

        rec.attempts += 1;
        const expected = rec.codeHash;
        const actual = createOtpHash(phoneKey, code);
        if (!timingSafeEqualHex(expected, actual)) {
            this.store.put(rec);
            return { ok: false, error: '인증번호가 일치하지 않습니다.' };
        }

        this.store.delete(phoneKey);
        return { ok: true };
    }

    remainingSeconds(phoneRaw) {
        const phoneKey = normalizePhoneKr(phoneRaw);
        const rec = this.store.get(phoneKey);
        if (!rec) return 0;
        return Math.max(0, Math.ceil((rec.expiresAt - Date.now()) / 1000));
    }
}

/**
 * @param {ConstructorParameters<typeof SolapiOtpService>[0]} [options]
 */
function createSolapiOtpService(options) {
    return new SolapiOtpService(options);
}

module.exports = {
    SolapiOtpService,
    createSolapiOtpService,
    JsonFileOtpStore,
    DEFAULT_TTL_MS,
    normalizePhoneKr,
    isValidKrMobile,
    generateSixDigitCode,
    createOtpHash,
    timingSafeEqualHex,
    sendSolapiLms,
};
