'use strict';

const crypto = require('crypto');
const dateFns = require('date-fns');

/** @param {{ apiKey: string, apiSecret: string }} creds */
function buildSolapiAuthorizationHeader(creds) {
    const { apiKey, apiSecret } = creds;
    const salt = crypto.randomBytes(16).toString('hex').slice(0, 32);
    const date = dateFns.formatISO(new Date());
    const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
    return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 등록된 발신번호 목록 (Solapi REST)
 * @param {{ apiKey: string, apiSecret: string }} creds
 * @returns {Promise<{ senderIds: Array<{ phoneNumber: string, status: string }> }>}
 */
async function fetchSenderIds(creds) {
    const auth = buildSolapiAuthorizationHeader(creds);
    const res = await fetch('https://api.solapi.com/senderid/v1/numbers', {
        headers: { Authorization: auth },
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`senderid/v1/numbers HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    return JSON.parse(text);
}

/**
 * @param {{ apiKey: string, apiSecret: string }} creds
 * @returns {Promise<string|null>} ACTIVE 이면서 01로 시작하는 번호 우선
 */
async function pickDefaultFromNumber(creds) {
    const data = await fetchSenderIds(creds);
    const list = data.senderIds || [];
    const act = list.filter((s) => s.status === 'ACTIVE');
    const mobile = act.find((s) => /^01\d{8,9}$/.test(String(s.phoneNumber || '').replace(/\D/g, '')));
    if (mobile) return String(mobile.phoneNumber).replace(/\D/g, '');
    if (act[0] && act[0].phoneNumber) return String(act[0].phoneNumber).replace(/\D/g, '');
    return null;
}

module.exports = { buildSolapiAuthorizationHeader, fetchSenderIds, pickDefaultFromNumber };
