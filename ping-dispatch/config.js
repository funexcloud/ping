'use strict';

/**
 * @typedef {Object} PingDispatchConfig
 * @property {boolean} useSolapi
 * @property {string} apiKey
 * @property {string} apiSecret
 * @property {string} from
 * @property {'kakao_alimtalk'|'sms'} primaryChannel
 * @property {string} kakaoPfId
 * @property {string} kakaoTemplateId
 * @property {number} batchSize
 * @property {boolean} fallbackSms
 */

/**
 * @returns {PingDispatchConfig}
 */
function loadDispatchConfigFromEnv() {
    const batch = parseInt(process.env.PING_DISPATCH_BATCH_SIZE || '1000', 10);
    return {
        useSolapi: String(process.env.PING_DISPATCH_USE_SOLAPI || '').trim() === '1',
        apiKey: String(process.env.SOLAPI_API_KEY || '').trim(),
        apiSecret: String(process.env.SOLAPI_API_SECRET || '').trim(),
        from: String(process.env.SOLAPI_FROM || '').trim(),
        primaryChannel: String(process.env.PING_DISPATCH_PRIMARY_CHANNEL || 'kakao_alimtalk').trim(),
        kakaoPfId: String(process.env.SOLAPI_KAKAO_PF_ID || '').trim(),
        kakaoTemplateId: String(process.env.SOLAPI_KAKAO_TEMPLATE_ID || '').trim(),
        batchSize: Number.isFinite(batch) ? Math.min(10000, Math.max(1, batch)) : 1000,
        fallbackSms: String(process.env.PING_DISPATCH_FALLBACK_SMS || '').trim() === '1',
    };
}

function solapiCredentialsReady(cfg) {
    return !!(cfg && cfg.apiKey && cfg.apiSecret && cfg.from);
}

function kakaoTemplateReady(cfg) {
    return !!(cfg.kakaoPfId && cfg.kakaoTemplateId);
}

module.exports = {
    loadDispatchConfigFromEnv,
    solapiCredentialsReady,
    kakaoTemplateReady,
};
