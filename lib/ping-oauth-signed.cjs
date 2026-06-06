'use strict';

const crypto = require('crypto');

function oauthSecret() {
    const s =
        process.env.PING_OAUTH_STATE_SECRET ||
        process.env.KAKAO_CLIENT_SECRET ||
        process.env.KAKAO_REST_API_KEY ||
        '';
    return String(s).trim() || 'ping-dev-oauth-secret';
}

function signPayload(payload, ttlMs) {
    const exp = Date.now() + ttlMs;
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const sig = crypto.createHmac('sha256', oauthSecret()).update(body).digest('base64url');
    return `${body}.${sig}`;
}

function verifySigned(token, maxSkewMs) {
    const raw = String(token || '').trim();
    const dot = raw.lastIndexOf('.');
    if (dot < 1) return null;
    const body = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    const expect = crypto.createHmac('sha256', oauthSecret()).update(body).digest('base64url');
    try {
        const a = Buffer.from(sig);
        const b = Buffer.from(expect);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    } catch {
        return null;
    }
    let data;
    try {
        data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
    if (!data || typeof data.exp !== 'number' || data.exp < Date.now() - (maxSkewMs || 0)) {
        return null;
    }
    return data;
}

module.exports = { signPayload, verifySigned };
