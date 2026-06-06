'use strict';

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'marketing-aggregate.local.json');
const MAX_BUCKETS = 2000;

function readStore() {
    try {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const j = JSON.parse(raw);
        if (j && typeof j === 'object' && j.buckets && typeof j.buckets === 'object') return j;
    } catch (e) {
        if (e.code !== 'ENOENT') console.warn('[marketing-aggregate] read', e.message);
    }
    return { buckets: {}, updatedAt: null };
}

function writeStore(data) {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function normalizePath(p) {
    const s = String(p || '/').trim().slice(0, 200) || '/';
    return s.split('?')[0];
}

function bucketKey(pathValue, utm, phase) {
    const pathNorm = normalizePath(pathValue);
    const campaign = String((utm && utm.utm_campaign) || '').trim().slice(0, 80) || '-';
    const source = String((utm && utm.utm_source) || '').trim().slice(0, 80) || '-';
    const day = new Date().toISOString().slice(0, 10);
    const ph = String(phase || 'immediate').slice(0, 32);
    return `${day}|${pathNorm}|${source}|${campaign}|${ph}`;
}

/**
 * 개인 식별자 없이 일·경로·UTM 단위 집계만 기록한다.
 * @param {{ path?: string, utm?: object, phase?: string, consentAnalytics?: boolean }} input
 */
function recordMarketingPageView(input) {
    const key = bucketKey(input.path, input.utm, input.phase);
    const store = readStore();
    if (!store.buckets[key]) {
        store.buckets[key] = { views: 0, consentViews: 0 };
    }
    store.buckets[key].views += 1;
    if (input.consentAnalytics) store.buckets[key].consentViews += 1;

    const keys = Object.keys(store.buckets);
    if (keys.length > MAX_BUCKETS) {
        const sorted = keys.sort();
        for (let i = 0; i < keys.length - MAX_BUCKETS; i++) {
            delete store.buckets[sorted[i]];
        }
    }
    writeStore(store);
    return { ok: true };
}

module.exports = {
    recordMarketingPageView,
    bucketKey,
    readStore,
};
