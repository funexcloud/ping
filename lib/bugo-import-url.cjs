'use strict';

/** 부고 URL 지원 규칙 — `lib/bugo-import-url-rules.json` 단일 출처 (서버·클라이언트 공유) */
const rules = require('./bugo-import-url-rules.json');

function normalizeHost(host) {
    return String(host || '').toLowerCase();
}

function isWooribugoHost(host) {
    const h = normalizeHost(host);
    return (rules.wooribugo.hosts || []).some(function (x) {
        return normalizeHost(x) === h;
    });
}

function isModubugoHost(host) {
    const h = normalizeHost(host);
    return (rules.modubugo.hosts || []).some(function (x) {
        return normalizeHost(x) === h;
    });
}

function isSupportedFuneralImportUrl(url) {
    if (!url || typeof url !== 'string') return false;
    let u;
    try {
        u = new URL(url.trim());
    } catch (e) {
        return false;
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = normalizeHost(u.hostname);
    const allowed = new Set((rules.allowedHosts || []).map(normalizeHost));
    if (!allowed.has(host)) return false;
    if (isWooribugoHost(host)) {
        const path = u.pathname.toLowerCase();
        return (rules.wooribugo.pathIncludes || []).some(function (frag) {
            return path.includes(String(frag).toLowerCase());
        });
    }
    if (isModubugoHost(host)) {
        return new RegExp(rules.modubugo.pathPattern, 'i').test(u.pathname);
    }
    return false;
}

function extractModubugoUuidFromPathname(pathname) {
    const m = String(pathname || '').match(
        new RegExp(rules.modubugo.pathPattern, 'i')
    );
    return m && m[1] ? String(m[1]).toLowerCase() : null;
}

module.exports = {
    rules: rules,
    isWooribugoHost: isWooribugoHost,
    isModubugoHost: isModubugoHost,
    isSupportedFuneralImportUrl: isSupportedFuneralImportUrl,
    extractModubugoUuidFromPathname: extractModubugoUuidFromPathname,
};
