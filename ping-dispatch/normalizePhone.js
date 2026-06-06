'use strict';

/**
 * Solapi 수신번호용: 국내 010XXXXXXXX 형태(하이픈 없음).
 * @param {string} raw
 * @returns {string|null}
 */
function normalizeKRPhone(raw) {
    if (raw == null || raw === '') return null;
    let d = String(raw).replace(/\D/g, '');
    if (d.startsWith('82') && d.length >= 10) d = '0' + d.slice(2);
    if (d.length < 10 || d.length > 11) return null;
    if (!d.startsWith('0')) return null;
    return d;
}

module.exports = { normalizeKRPhone };
