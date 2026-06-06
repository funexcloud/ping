const { formatSixDigitCodeDisplay, normalizeSixDigitCode } = require('./six-digit-code');

/**
 * Resend API (https://resend.com) — 이메일 인증 발송
 * 환경 변수: RESEND_API_KEY, RESEND_FROM_EMAIL, PING_PUBLIC_ORIGIN
 *
 * Resend 대시보드: funexcloud.com 도메인 추가 → SPF·DKIM DNS → Verified 후
 * RESEND_FROM_EMAIL 의 @ 뒤 도메인과 일치해야 함 (예: auth@funexcloud.com)
 */
const BRAND_PRIMARY = '#4a72ff';
const BRAND_TEXT = '#111827';
const BRAND_MUTED = '#6b7280';

function getPublicOrigin() {
    const raw =
        process.env.PING_PUBLIC_ORIGIN ||
        process.env.APP_BASE_URL ||
        `http://127.0.0.1:${Number(process.env.PORT) || 3000}`;
    let origin = String(raw).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(origin)) {
        const hostOnly = origin.split('/')[0] || origin;
        const isLocal =
            hostOnly === 'localhost' ||
            hostOnly.startsWith('localhost:') ||
            hostOnly === '127.0.0.1' ||
            hostOnly.startsWith('127.0.0.1:') ||
            hostOnly === '[::1]' ||
            hostOnly.startsWith('[::1]:');
        origin = `${isLocal ? 'http' : 'https'}://${origin}`;
    }
    return origin;
}

/**
 * @param {{ toEmail: string, code: string, displayName?: string }} opts
 */
async function sendVerificationEmail(opts) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || typeof apiKey !== 'string') {
        const err = new Error('RESEND_API_KEY가 설정되지 않았습니다.');
        err.code = 'RESEND_NOT_CONFIGURED';
        throw err;
    }

    const from =
        process.env.RESEND_FROM_EMAIL ||
        'PING <onboarding@resend.dev>';

    const origin = getPublicOrigin();
    const verifyPageUrl = `${origin}/obituary-verify-email?email=${encodeURIComponent(opts.toEmail)}`;
    const name = (opts.displayName && String(opts.displayName).trim()) || '회원';
    const codeShown = normalizeSixDigitCode(opts.code) || '------';
    const codeSpaced = formatSixDigitCodeDisplay(opts.code);

    const subject = `[PING] 이메일 인증 코드 ${codeSpaced}`;
    const html = buildVerificationEmailHtml({
        name,
        codeShown,
        codeSpaced,
        verifyPageUrl,
    });
    const text = buildVerificationEmailText({
        name,
        codeShown,
        verifyPageUrl,
    });

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: [opts.toEmail],
            subject,
            html,
            text,
        }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(formatResendApiError(body, res.status));
        err.code = 'RESEND_HTTP_ERROR';
        err.details = body;
        err.statusCode = res.status;
        throw err;
    }
    return body;
}

/**
 * @param {{ name: string, codeShown: string, codeSpaced: string, verifyPageUrl: string }} p
 */
function buildVerificationEmailHtml(p) {
    const { name, codeShown, codeSpaced, verifyPageUrl } = p;
    return (
        '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>PING 이메일 인증</title></head>' +
        '<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Noto Sans KR\',sans-serif;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">' +
        '<tr><td align="center">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">' +
        '<tr><td style="padding:28px 28px 8px;text-align:center;">' +
        '<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.12em;color:' +
        BRAND_PRIMARY +
        ';">PING</p>' +
        '<h1 style="margin:12px 0 0;font-size:20px;font-weight:700;color:' +
        BRAND_TEXT +
        ';">이메일 인증</h1>' +
        '</td></tr>' +
        '<tr><td style="padding:8px 28px 0;">' +
        '<p style="margin:0;font-size:15px;line-height:1.6;color:' +
        BRAND_TEXT +
        ';">' +
        escapeHtml(name) +
        '님, 가입해 주셔서 감사합니다.</p>' +
        '<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:' +
        BRAND_MUTED +
        ';">아래 6자리 코드를 인증 페이지에 입력해 주세요. 코드는 <strong style="color:' +
        BRAND_TEXT +
        ';">발송 후 15분</strong>간 유효합니다.</p>' +
        '</td></tr>' +
        '<tr><td style="padding:24px 28px 8px;text-align:center;">' +
        '<div style="display:inline-block;padding:18px 28px;background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;">' +
        '<span style="font-size:32px;font-weight:700;letter-spacing:0.28em;color:' +
        BRAND_TEXT +
        ';font-variant-numeric:tabular-nums;">' +
        escapeHtml(codeSpaced) +
        '</span></div>' +
        '<p style="margin:12px 0 0;font-size:12px;color:' +
        BRAND_MUTED +
        ';">숫자만 입력해도 됩니다 (' +
        escapeHtml(codeShown) +
        ')</p>' +
        '</td></tr>' +
        '<tr><td style="padding:16px 28px 28px;text-align:center;">' +
        '<a href="' +
        escapeHtml(verifyPageUrl) +
        '" style="display:inline-block;padding:14px 32px;background:' +
        BRAND_PRIMARY +
        ';color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;">인증 페이지 열기</a>' +
        '</td></tr>' +
        '<tr><td style="padding:0 28px 24px;">' +
        '<p style="margin:0;font-size:12px;line-height:1.5;color:' +
        BRAND_MUTED +
        ';">버튼이 보이지 않으면 아래 링크를 브라우저에 붙여 넣어 주세요.</p>' +
        '<p style="margin:8px 0 0;font-size:12px;line-height:1.5;word-break:break-all;">' +
        '<a href="' +
        escapeHtml(verifyPageUrl) +
        '" style="color:' +
        BRAND_PRIMARY +
        ';">' +
        escapeHtml(verifyPageUrl) +
        '</a></p>' +
        '<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">링크만으로 인증이 완료되지 않습니다. 반드시 코드를 입력해 주세요. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>' +
        '</td></tr>' +
        '</table>' +
        '<p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center;">© PING · 발신 전용 메일</p>' +
        '</td></tr></table></body></html>'
    );
}

/**
 * @param {{ name: string, codeShown: string, verifyPageUrl: string }} p
 */
function buildVerificationEmailText(p) {
    const { name, codeShown, verifyPageUrl } = p;
    return (
        `${name}님, PING 가입을 환영합니다.\n\n` +
        `이메일 인증 코드: ${codeShown}\n` +
        `(발송 후 15분간 유효)\n\n` +
        `인증 페이지에서 위 코드를 입력해 주세요.\n` +
        `${verifyPageUrl}\n\n` +
        `링크만으로는 인증이 완료되지 않습니다.\n` +
        `본인이 요청하지 않았다면 이 메일을 무시해 주세요.`
    );
}

/**
 * Resend API 오류 → 사용자/로그용 한글 메시지
 * @param {Record<string, unknown>} body
 * @param {number} status
 */
function formatResendApiError(body, status) {
    const raw = String((body && body.message) || '').trim();
    if (
        status === 403 &&
        /only send testing emails to your own email address/i.test(raw)
    ) {
        return (
            '테스트 발신 주소(onboarding@resend.dev)는 Resend에 가입한 이메일로만 발송됩니다. ' +
            '다른 수신자에게 내려면 resend.com/domains 에서 도메인을 인증한 뒤 ' +
            'RESEND_FROM_EMAIL 을 해당 도메인 주소(예: noreply@yourdomain.com)로 바꿔 주세요.'
        );
    }
    if (/domain.*not verified|not verified/i.test(raw)) {
        return (
            '발신 도메인이 Resend에서 아직 인증되지 않았습니다. ' +
            'Resend 대시보드 → Domains 에서 funexcloud.com DNS(SPF·DKIM)를 Verified 로 만든 뒤 다시 시도해 주세요.'
        );
    }
    if (status === 401 || status === 403) {
        return raw || 'Resend API 키 또는 발신 설정을 확인해 주세요.';
    }
    return raw || `Resend 오류 (HTTP ${status})`;
}

/** @param {unknown} e */
function resendErrorFromException(e) {
    if (!e || typeof e !== 'object') return '';
    const msg = String(e.message || '').trim();
    if (msg) return msg;
    const body =
        e.details && typeof e.details === 'object' ? e.details : {};
    const status = Number(e.statusCode) || Number(body.statusCode) || 0;
    return formatResendApiError(body, status);
}

function defaultResendFailHint() {
    const from =
        process.env.RESEND_FROM_EMAIL || 'PING <auth@funexcloud.com>';
    return (
        '메일을 발송하지 못했습니다. .env 의 RESEND_API_KEY·RESEND_FROM_EMAIL(' +
        from +
        ')과 Resend Domains(funexcloud.com Verified)를 확인한 뒤 `npm run dev`를 재시작해 주세요.'
    );
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = {
    sendVerificationEmail,
    getPublicOrigin,
    formatResendApiError,
    resendErrorFromException,
    defaultResendFailHint,
    buildVerificationEmailHtml,
    buildVerificationEmailText,
};
