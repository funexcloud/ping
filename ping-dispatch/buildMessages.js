'use strict';

/**
 * Firestore templateData → Solapi 카카오 변수(값은 모두 문자열).
 * @param {Record<string, unknown>} templateData
 * @param {Record<string, unknown>} orderData
 * @returns {Record<string, string>}
 */
function buildKakaoVariables(templateData, orderData) {
    const out = {};
    const src =
        templateData && typeof templateData === 'object' && !Array.isArray(templateData) ? templateData : {};
    for (const [k, v] of Object.entries(src)) {
        if (v == null) out[k] = '';
        else if (typeof v === 'object') out[k] = JSON.stringify(v);
        else out[k] = String(v);
    }
    if (orderData.name != null && out.name === undefined && out['고객명'] === undefined) {
        out.name = String(orderData.name);
    }
    return out;
}

/**
 * @param {string[]} phones 정규화된 수신번호
 * @param {import('./config').PingDispatchConfig} cfg
 * @param {string} text LMS/SMS 본문
 * @param {Record<string, string>} kakaoVariables
 * @param {'kakao_alimtalk'|'sms'} channel
 * @returns {object[]}
 */
function buildSolapiMessagesForPhones(phones, cfg, text, kakaoVariables, channel) {
    return phones.map((to) => {
        if (channel === 'sms') {
            return {
                to,
                from: cfg.from,
                text,
                type: 'LMS',
                autoTypeDetect: false,
            };
        }
        return {
            to,
            from: cfg.from,
            text: text || '(알림톡)',
            type: 'ATA',
            autoTypeDetect: false,
            kakaoOptions: {
                pfId: cfg.kakaoPfId,
                templateId: cfg.kakaoTemplateId,
                variables: kakaoVariables,
                disableSms: true,
            },
        };
    });
}

module.exports = { buildKakaoVariables, buildSolapiMessagesForPhones };
