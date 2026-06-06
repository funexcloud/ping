/**
 * 추천인 포인트 (로컬 server.js 전용). 친구 첫 방문당 추천인 +100P.
 * E: visitorId 원문 대신 HMAC 해시만 저장 (익명 dedup).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'referral-ledger.local.json');
const REWARD_POINTS = 100;

function referralHashSalt() {
    return String(
        process.env.PING_REFERRAL_HASH_SALT ||
            process.env.PING_ADMIN_SESSION_SECRET ||
            'ping-referral-dev-salt'
    );
}

function hashVisitorId(visitorId) {
    return crypto
        .createHmac('sha256', referralHashSalt())
        .update(String(visitorId || ''))
        .digest('hex')
        .slice(0, 32);
}

function readStore() {
    try {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const j = JSON.parse(raw);
        if (j && typeof j === 'object' && j.codes && typeof j.codes === 'object') return j;
    } catch (e) {
        if (e.code !== 'ENOENT') console.warn('referral readStore:', e.message);
    }
    return { codes: {} };
}

function writeStore(data) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeCode(v) {
    return String(v || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 32);
}

function ensureCodeBucket(s, code) {
    if (!s.codes[code]) {
        s.codes[code] = { visitorHashes: [], points: 0 };
    }
    const b = s.codes[code];
    if (Array.isArray(b.visitors) && b.visitors.length) {
        for (const vid of b.visitors) {
            const h = hashVisitorId(vid);
            if (!b.visitorHashes.includes(h)) b.visitorHashes.push(h);
        }
        delete b.visitors;
    }
    if (!Array.isArray(b.visitorHashes)) b.visitorHashes = [];
    return b;
}

function registerHandler(req, res) {
    try {
        const code = normalizeCode(req.body && req.body.code);
        if (code.length < 4) {
            res.status(400).json({ ok: false, error: 'invalid_code' });
            return;
        }
        const s = readStore();
        const b = ensureCodeBucket(s, code);
        writeStore(s);
        res.json({ ok: true, code, points: b.points, friendCount: b.visitorHashes.length });
    } catch (err) {
        console.error('referral register', err);
        res.status(500).json({ ok: false, error: 'server' });
    }
}

function friendVisitHandler(req, res) {
    try {
        const refCode = normalizeCode(req.body && req.body.refCode);
        const visitorId = String((req.body && req.body.visitorId) || '').trim().slice(0, 128);
        if (refCode.length < 4 || !visitorId) {
            res.status(400).json({ ok: false, error: 'bad_request' });
            return;
        }
        const visitorHash = hashVisitorId(visitorId);
        const s = readStore();
        const b = ensureCodeBucket(s, refCode);
        if (b.visitorHashes.includes(visitorHash)) {
            res.json({ ok: true, already: true, points: b.points, rewardPoints: REWARD_POINTS });
            return;
        }
        b.visitorHashes.push(visitorHash);
        b.points += REWARD_POINTS;
        writeStore(s);
        res.json({
            ok: true,
            credited: true,
            points: b.points,
            rewardPoints: REWARD_POINTS,
            friendCount: b.visitorHashes.length,
        });
    } catch (err) {
        console.error('referral friendVisit', err);
        res.status(500).json({ ok: false, error: 'server' });
    }
}

function balanceHandler(req, res) {
    try {
        const code = normalizeCode(req.query && req.query.code);
        if (code.length < 4) {
            res.status(400).json({ ok: false, error: 'invalid_code' });
            return;
        }
        const s = readStore();
        const b = s.codes[code] ? ensureCodeBucket(s, code) : { visitorHashes: [], points: 0 };
        res.json({
            ok: true,
            code,
            points: b.points,
            friendCount: b.visitorHashes.length,
            rewardPerFriend: REWARD_POINTS,
        });
    } catch (err) {
        console.error('referral balance', err);
        res.status(500).json({ ok: false, error: 'server' });
    }
}

function deductReferralPoints(codeRaw, deduct) {
    const c = normalizeCode(codeRaw);
    const n = Math.max(0, Math.floor(Number(deduct) || 0));
    if (!n || c.length < 4) return 0;
    const s = readStore();
    if (!s.codes[c]) return 0;
    const b = ensureCodeBucket(s, c);
    const have = Number(b.points) || 0;
    const take = Math.min(have, n);
    b.points = have - take;
    writeStore(s);
    return take;
}

function creditReferralPoints(codeRaw, add) {
    const c = normalizeCode(codeRaw);
    const n = Math.max(0, Math.floor(Number(add) || 0));
    if (!n || c.length < 4) return;
    const s = readStore();
    const b = ensureCodeBucket(s, c);
    b.points = (Number(b.points) || 0) + n;
    writeStore(s);
}

module.exports = {
    registerHandler,
    friendVisitHandler,
    balanceHandler,
    deductReferralPoints,
    creditReferralPoints,
    hashVisitorId,
};
