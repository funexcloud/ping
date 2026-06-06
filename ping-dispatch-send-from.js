'use strict';

/**
 * 발신번호 표시용 — SOLAPI_FROM / SMS_SENDER 또는 PING_SEND_FROM_LABEL
 * (비밀·API 키는 노출하지 않음)
 */

/**
 * @param {string} digits
 * @returns {string}
 */
function formatKrPhoneDisplay(digits) {
    const d = String(digits || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 11 && d.startsWith('010')) {
        return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    }
    if (d.length === 10 && d.startsWith('02')) {
        return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
    }
    if (d.length >= 9 && d.startsWith('0')) {
        return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
    }
    return d;
}

/**
 * @returns {{ label: string, digits: string }}
 */
function loadSendFromDisplay() {
    const custom = String(process.env.PING_SEND_FROM_LABEL || '').trim();
    if (custom) {
        const digits = custom.replace(/\D/g, '');
        return {
            label: custom,
            digits: digits || '',
        };
    }

    const raw = String(process.env.SOLAPI_FROM || process.env.SMS_SENDER || '').trim();
    const digits = raw.replace(/\D/g, '');
    const formatted = formatKrPhoneDisplay(digits);
    return {
        label: formatted || 'PING 대표번호',
        digits,
    };
}

module.exports = {
    formatKrPhoneDisplay,
    loadSendFromDisplay,
};
