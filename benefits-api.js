/**
 * 참여 카운트다운 적립 · 친구 초대 배치(최대 3명) · 요약 API
 * 실서비스 시 회원 DB와 통합하세요.
 */
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'user-benefits.local.json');
/** 체류(참여 카운트다운) 완료 시 1일 1회 적립 금액(원 단위 포인트). 리워드 정책 변경 시 수정. */
const ENGAGE_POINTS_PER_DAY = 5000;
/** 회원 로그인 후 checkout 최초 1회 (1P=1원, 50건 발송 분) */
const MEMBER_WELCOME_POINTS = 50;
const MAX_INVITE_PER_BATCH = 3;

function readStore() {
    try {
        const j = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        if (j && typeof j === 'object' && j.byDevice && typeof j.byDevice === 'object') return j;
    } catch (e) {
        if (e.code !== 'ENOENT') console.warn('benefits readStore:', e.message);
    }
    return { byDevice: {}, byMember: {} };
}

function writeStore(data) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function todayKst() {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    } catch (e) {
        return new Date().toISOString().slice(0, 10);
    }
}

function ensureUser(s, deviceId) {
    if (!s.byDevice) s.byDevice = {};
    if (!s.byDevice[deviceId]) {
        s.byDevice[deviceId] = {
            engagePoints: 0,
            lastEngageDate: null,
            inviteLog: [],
            batches: {},
            coupon5000Issued: false,
        };
    }
    return s.byDevice[deviceId];
}

function ensureMember(s, memberId) {
    if (!s.byMember) s.byMember = {};
    if (!s.byMember[memberId]) {
        s.byMember[memberId] = { welcomeBonusClaimed: false };
    }
    return s.byMember[memberId];
}

function memberWelcomeHandler(req, res) {
    try {
        const memberId = String((req.body && req.body.memberId) || '').trim().slice(0, 128);
        const deviceId = String((req.body && req.body.deviceId) || '').trim().slice(0, 128);
        if (!memberId || !deviceId) {
            res.status(400).json({ ok: false, error: 'memberId_deviceId' });
            return;
        }
        const s = readStore();
        const m = ensureMember(s, memberId);
        if (m.welcomeBonusClaimed) {
            res.json({
                ok: true,
                alreadyClaimed: true,
                added: 0,
                points: MEMBER_WELCOME_POINTS,
                engagePoints: (ensureUser(s, deviceId).engagePoints || 0),
                message: '이미 웰컴 포인트를 받으셨어요.',
            });
            return;
        }
        const u = ensureUser(s, deviceId);
        u.engagePoints = (Number(u.engagePoints) || 0) + MEMBER_WELCOME_POINTS;
        m.welcomeBonusClaimed = true;
        writeStore(s);
        res.json({
            ok: true,
            alreadyClaimed: false,
            added: MEMBER_WELCOME_POINTS,
            points: MEMBER_WELCOME_POINTS,
            engagePoints: u.engagePoints,
            giftValueWon: 5500,
            message: MEMBER_WELCOME_POINTS + 'P 지급 완료',
        });
    } catch (err) {
        console.error('memberWelcome', err);
        res.status(500).json({ ok: false, error: 'server' });
    }
}

function engageCountdownHandler(req, res) {
    try {
        const deviceId = String((req.body && req.body.deviceId) || '').trim().slice(0, 128);
        if (!deviceId) {
            res.status(400).json({ ok: false, error: 'deviceId' });
            return;
        }
        const s = readStore();
        const u = ensureUser(s, deviceId);
        const today = todayKst();
        if (u.lastEngageDate === today) {
            res.json({
                ok: true,
                alreadyClaimed: true,
                added: 0,
                engagePoints: u.engagePoints,
                message: '오늘은 이미 참여 적립을 받으셨어요.',
            });
            return;
        }
        u.engagePoints = (u.engagePoints || 0) + ENGAGE_POINTS_PER_DAY;
        u.lastEngageDate = today;
        writeStore(s);
        res.json({
            ok: true,
            alreadyClaimed: false,
            added: ENGAGE_POINTS_PER_DAY,
            engagePoints: u.engagePoints,
            message: ENGAGE_POINTS_PER_DAY + '원 적립 완료',
        });
    } catch (err) {
        console.error('engageCountdown', err);
        res.status(500).json({ ok: false, error: 'server' });
    }
}

function friendSubmitHandler(req, res) {
    try {
        const deviceId = String((req.body && req.body.deviceId) || '').trim().slice(0, 128);
        const batchId = String((req.body && req.body.batchId) || '').trim().slice(0, 80);
        const name = String((req.body && req.body.name) || '').trim().slice(0, 48);
        let phone = String((req.body && req.body.phone) || '').replace(/\D/g, '').slice(0, 11);
        if (!deviceId || !batchId || !name || phone.length < 10) {
            res.status(400).json({ ok: false, error: 'invalid' });
            return;
        }
        const s = readStore();
        const u = ensureUser(s, deviceId);
        if (!u.batches) u.batches = {};
        if (!u.batches[batchId]) u.batches[batchId] = [];
        const arr = u.batches[batchId];
        if (arr.length >= MAX_INVITE_PER_BATCH) {
            res.status(400).json({
                ok: false,
                error: 'max_reached',
                sentInBatch: arr.length,
                max: MAX_INVITE_PER_BATCH,
            });
            return;
        }
        const row = { name, phone, at: new Date().toISOString(), batchId };
        arr.push(row);
        if (!u.inviteLog) u.inviteLog = [];
        u.inviteLog.push(row);
        const sentInBatch = arr.length;
        if (sentInBatch >= MAX_INVITE_PER_BATCH && !u.coupon5000Issued) {
            u.coupon5000Issued = true;
        }
        writeStore(s);
        res.json({
            ok: true,
            sentInBatch,
            max: MAX_INVITE_PER_BATCH,
            coupon5000Unlocked: !!u.coupon5000Issued,
        });
    } catch (err) {
        console.error('friendSubmit', err);
        res.status(500).json({ ok: false, error: 'server' });
    }
}

function summaryHandler(req, res) {
    try {
        const deviceId = String((req.query && req.query.deviceId) || '').trim().slice(0, 128);
        if (!deviceId) {
            res.status(400).json({ ok: false, error: 'deviceId' });
            return;
        }
        const s = readStore();
        const u = s.byDevice[deviceId] || {
            engagePoints: 0,
            lastEngageDate: null,
            inviteLog: [],
            batches: {},
            coupon5000Issued: false,
        };
        const inviteTotalCount = Array.isArray(u.inviteLog) ? u.inviteLog.length : 0;
        res.json({
            ok: true,
            engagePoints: u.engagePoints || 0,
            inviteTotalCount,
            coupon5000Issued: !!u.coupon5000Issued,
            lastEngageDate: u.lastEngageDate || null,
        });
    } catch (err) {
        console.error('benefits summary', err);
        res.status(500).json({ ok: false, error: 'server' });
    }
}

/** 결제 연동: 참여 적립분 차감·복구 (1P = 1원 가정) */
function deductEngagePoints(deviceId, deduct) {
    const n = Math.max(0, Math.floor(Number(deduct) || 0));
    if (!n) return 0;
    const did = String(deviceId || '').trim().slice(0, 128);
    if (!did) return 0;
    const s = readStore();
    const u = ensureUser(s, did);
    const have = Number(u.engagePoints) || 0;
    const take = Math.min(have, n);
    u.engagePoints = have - take;
    writeStore(s);
    return take;
}

function creditEngagePoints(deviceId, add) {
    const n = Math.max(0, Math.floor(Number(add) || 0));
    if (!n) return;
    const did = String(deviceId || '').trim().slice(0, 128);
    if (!did) return;
    const s = readStore();
    const u = ensureUser(s, did);
    u.engagePoints = (Number(u.engagePoints) || 0) + n;
    writeStore(s);
}

module.exports = {
    engageCountdownHandler,
    memberWelcomeHandler,
    friendSubmitHandler,
    summaryHandler,
    ENGAGE_POINTS_PER_DAY,
    MEMBER_WELCOME_POINTS,
    MAX_INVITE_PER_BATCH,
    deductEngagePoints,
    creditEngagePoints,
};
