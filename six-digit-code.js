'use strict';

const crypto = require('crypto');

const CODE_LENGTH = 6;
/** 0 … 999999 균등 분포 (crypto.randomInt) */
const CODE_SPACE = 1_000_000;

/**
 * 6자리 숫자 OTP (선행 0 포함, 예: 004281)
 * @returns {string}
 */
function generateSixDigitCode() {
    const n = crypto.randomInt(0, CODE_SPACE);
    return String(n).padStart(CODE_LENGTH, '0');
}

/**
 * 사용자 입력 → 6자리 숫자만 추출
 * @param {unknown} value
 * @returns {string} 유효 시 6자리, 아니면 ''
 */
function normalizeSixDigitCode(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === CODE_LENGTH ? digits : '';
}

/**
 * @param {unknown} code
 * @returns {boolean}
 */
function isValidSixDigitCode(code) {
    return /^[0-9]{6}$/.test(String(code || ''));
}

/**
 * 메일·UI 표시용 (123 456)
 * @param {unknown} code
 */
function formatSixDigitCodeDisplay(code) {
    const n = normalizeSixDigitCode(code);
    if (!n) return '------';
    return `${n.slice(0, 3)} ${n.slice(3)}`;
}

module.exports = {
    CODE_LENGTH,
    CODE_SPACE,
    generateSixDigitCode,
    normalizeSixDigitCode,
    isValidSixDigitCode,
    formatSixDigitCodeDisplay,
};
