/**
 * 무료 발송(건) 쿠폰 — 생성·목록·수정·검증·차감
 * 컬렉션: ping_send_coupons (Firebase) / ping-send-coupons.local.json (로컬)
 */
'use strict';

const crypto = require('crypto');

const COUPON_PREFIX = 'PING';

function normalizeCouponCode(code) {
    return String(code || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[^A-Z0-9-]/g, '');
}

function generateCouponCode() {
    const hex = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${COUPON_PREFIX}-${hex.slice(0, 4)}-${hex.slice(4,12)}`;
}

function normalizePhone(value) {
    return String(value || '').replace(/[^0-9]/g, '');
}

function parseExpiresAtIso(iso, Timestamp) {
    if (!iso) return null;
    const d = new Date(String(iso));
    if (Number.isNaN(d.getTime())) return { error: 'expiresAt 형식이 올바르지 않습니다.' };
    if (Timestamp && typeof Timestamp.fromDate === 'function') {
        return { ts: Timestamp.fromDate(d) };
    }
    return { date: d.toISOString() };
}

function couponRemaining(data) {
    const total = Number(data.totalFreeSends) || 0;
    const used = Number(data.usedSends) || 0;
    return Math.max(0, total - used);
}

function isCouponExpired(data, nowDate) {
    const now = nowDate || new Date();
    const exp = data.expiresAt;
    if (!exp) return false;
    if (exp.toDate && typeof exp.toDate === 'function') {
        return exp.toDate().getTime() < now.getTime();
    }
    if (typeof exp === 'string') {
        const t = new Date(exp).getTime();
        return !Number.isNaN(t) && t < now.getTime();
    }
    return false;
}

function assertAdmin(req, getAdminSecret) {
    const secret = getAdminSecret();
    if (!secret) {
        const e = new Error('PING_COUPON_ADMIN_SECRET(또는 functions.config().coupon.admin_secret) 미설정');
        e.statusCode = 503;
        throw e;
    }
    const header =
        req.headers['x-ping-admin-secret'] ||
        String(req.headers.authorization || '')
            .replace(/^Bearer\s+/i, '')
            .trim();
    if (header !== secret) {
        const e = new Error('Unauthorized');
        e.statusCode = 401;
        throw e;
    }
}

function setCors(res, methods) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', methods || 'GET, POST, PATCH, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ping-admin-secret');
}

function serializeTs(v) {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v === 'string') return v;
    return null;
}

function serializeCouponDoc(id, data) {
    const exp = data.expiresAt;
    let expiresAtIso = null;
    if (exp && exp.toDate) expiresAtIso = exp.toDate().toISOString();
    else if (typeof exp === 'string') expiresAtIso = exp;

    return {
        code: id,
        type: data.type || 'free_sends',
        totalFreeSends: Number(data.totalFreeSends) || 0,
        usedSends: Number(data.usedSends) || 0,
        remainingSends: couponRemaining(data),
        status: data.status || 'active',
        expiresAt: expiresAtIso,
        bindPhone: data.bindPhone || '',
        recipientName: data.recipientName || '',
        recipientPhone: data.recipientPhone || '',
        recipientEmail: data.recipientEmail || '',
        note: data.note || '',
        createdAt: serializeTs(data.createdAt),
        updatedAt: serializeTs(data.updatedAt),
        lastConsumedAt: serializeTs(data.lastConsumedAt),
        lastConsumedOrderId: data.lastConsumedOrderId || null,
        lastConsumeReason: data.lastConsumeReason || null,
    };
}

/**
 * Firestore 스토어용 핸들러 팩토리
 */
function createFirestoreHandlers(db, admin, getAdminSecret) {
    const Timestamp = admin.firestore.Timestamp;
    const FieldValue = admin.firestore.FieldValue;

    const col = () => db.collection('ping_send_coupons');

    async function adminHandler(req, res) {
        setCors(res, 'GET, POST, PATCH, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        try {
            assertAdmin(req, getAdminSecret);

            if (req.method === 'GET') {
                const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
                const snap = await col().orderBy('createdAt', 'desc').limit(limit).get();
                const items = [];
                snap.forEach((doc) => items.push(serializeCouponDoc(doc.id, doc.data())));
                res.status(200).json({ ok: true, coupons: items });
                return;
            }

            if (req.method === 'POST') {
                const body = req.body || {};
                const totalFreeSends = Number(body.totalFreeSends);
                if (!Number.isFinite(totalFreeSends) || totalFreeSends < 1 || totalFreeSends > 10000000) {
                    res.status(400).json({ ok: false, error: 'totalFreeSends는 1~10,000,000 사이 숫자여야 합니다.' });
                    return;
                }

                let code = normalizeCouponCode(body.code);
                if (code) {
                    const exists = await col().doc(code).get();
                    if (exists.exists) {
                        res.status(409).json({ ok: false, error: '이미 사용 중인 코드입니다.' });
                        return;
                    }
                } else {
                    let tries = 0;
                    do {
                        code = generateCouponCode();
                        tries += 1;
                        if (tries > 25) {
                            res.status(500).json({ ok: false, error: '코드 생성에 실패했습니다.' });
                            return;
                        }
                    } while ((await col().doc(code).get()).exists);
                }

                const expParse = parseExpiresAtIso(body.expiresAt, Timestamp);
                if (expParse.error) {
                    res.status(400).json({ ok: false, error: expParse.error });
                    return;
                }

                const bindPhone = normalizePhone(body.bindPhone || '');
                const recipientPhone = normalizePhone(body.recipientPhone || '');

                const doc = {
                    type: 'free_sends',
                    totalFreeSends: Math.floor(totalFreeSends),
                    usedSends: 0,
                    status: 'active',
                    recipientName: String(body.recipientName || '').trim().slice(0, 120),
                    recipientPhone,
                    recipientEmail: String(body.recipientEmail || '').trim().slice(0, 320),
                    bindPhone,
                    note: String(body.note || '').trim().slice(0, 2000),
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                };
                if (expParse.ts) doc.expiresAt = expParse.ts;

                await col().doc(code).set(doc);
                const saved = await col().doc(code).get();
                res.status(201).json({
                    ok: true,
                    coupon: serializeCouponDoc(code, saved.data()),
                });
                return;
            }

            if (req.method === 'PATCH') {
                const body = req.body || {};
                const code = normalizeCouponCode(body.code);
                if (!code) {
                    res.status(400).json({ ok: false, error: 'code가 필요합니다.' });
                    return;
                }
                const ref = col().doc(code);
                const snap = await ref.get();
                if (!snap.exists) {
                    res.status(404).json({ ok: false, error: '쿠폰을 찾을 수 없습니다.' });
                    return;
                }

                const patch = { updatedAt: FieldValue.serverTimestamp() };
                if (body.status === 'active' || body.status === 'disabled') {
                    patch.status = body.status;
                }
                if (body.note !== undefined) {
                    patch.note = String(body.note || '').trim().slice(0, 2000);
                }
                if (body.totalFreeSends !== undefined) {
                    const t = Number(body.totalFreeSends);
                    if (!Number.isFinite(t) || t < 0 || t > 1e7) {
                        res.status(400).json({ ok: false, error: 'totalFreeSends가 올바르지 않습니다.' });
                        return;
                    }
                    const used = Number(snap.data().usedSends) || 0;
                    if (Math.floor(t) < used) {
                        res.status(400).json({
                            ok: false,
                            error: `totalFreeSends는 사용 건수(${used}) 이상이어야 합니다.`,
                        });
                        return;
                    }
                    patch.totalFreeSends = Math.floor(t);
                }
                if (body.usedSends !== undefined) {
                    const u = Number(body.usedSends);
                    const total = Number(snap.data().totalFreeSends) || 0;
                    if (!Number.isFinite(u) || u < 0 || u > total) {
                        res.status(400).json({ ok: false, error: 'usedSends가 올바르지 않습니다.' });
                        return;
                    }
                    patch.usedSends = Math.floor(u);
                }
                if (body.bindPhone !== undefined) {
                    patch.bindPhone = normalizePhone(body.bindPhone);
                }

                if (body.expiresAt !== undefined) {
                    if (body.expiresAt === null || body.expiresAt === '') {
                        patch.expiresAt = FieldValue.delete();
                    } else {
                        const ep = parseExpiresAtIso(body.expiresAt, Timestamp);
                        if (ep.error) {
                            res.status(400).json({ ok: false, error: ep.error });
                            return;
                        }
                        patch.expiresAt = ep.ts;
                    }
                }

                await ref.set(patch, { merge: true });
                const after = await ref.get();
                res.status(200).json({ ok: true, coupon: serializeCouponDoc(code, after.data()) });
                return;
            }

            res.status(405).json({ ok: false, error: 'Method not allowed' });
        } catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ ok: false, error: err.message });
                return;
            }
            console.error('sendCouponAdmin:', err);
            res.status(500).json({ ok: false, error: err.message || 'Internal error' });
        }
    }

    async function validateHandler(req, res) {
        setCors(res, 'POST, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ ok: false, error: 'Method not allowed' });
            return;
        }
        try {
            const body = req.body || {};
            const code = normalizeCouponCode(body.code);
            const phone = normalizePhone(body.phone || '');
            const sendCount = Math.max(0, Math.floor(Number(body.sendCount) || 0));

            if (!code) {
                res.status(400).json({ ok: false, valid: false, error: 'code가 필요합니다.' });
                return;
            }

            const snap = await col().doc(code).get();
            if (!snap.exists) {
                res.status(200).json({ ok: true, valid: false, error: '존재하지 않는 쿠폰입니다.' });
                return;
            }

            const data = snap.data();
            if (data.status === 'disabled') {
                res.status(200).json({ ok: true, valid: false, error: '비활성화된 쿠폰입니다.' });
                return;
            }
            if (isCouponExpired(data)) {
                res.status(200).json({ ok: true, valid: false, error: '만료된 쿠폰입니다.' });
                return;
            }

            const bind = normalizePhone(data.bindPhone || '');
            if (bind && phone && bind !== phone) {
                res.status(200).json({ ok: true, valid: false, error: '등록된 연락처와 일치하지 않습니다.' });
                return;
            }
            if (bind && !phone) {
                res.status(200).json({
                    ok: true,
                    valid: false,
                    error: '이 쿠폰은 신청 시 연락처 확인이 필요합니다.',
                    requiresPhone: true,
                });
                return;
            }

            const remaining = couponRemaining(data);
            const applicable = sendCount > 0 ? Math.min(remaining, sendCount) : remaining;

            res.status(200).json({
                ok: true,
                valid: true,
                code,
                remainingSends: remaining,
                applicableSends: applicable,
                bindPhoneRequired: Boolean(bind),
            });
        } catch (err) {
            console.error('validateSendCoupon:', err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }

    /** 결제 확정 후 등 — 관리자 시크릿 또는 내부 호출 시 사용 */
    async function consumeHandler(req, res) {
        setCors(res, 'POST, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ ok: false, error: 'Method not allowed' });
            return;
        }
        try {
            assertAdmin(req, getAdminSecret);
            const body = req.body || {};
            const code = normalizeCouponCode(body.code);
            const sendCount = Math.floor(Number(body.sendCount) || 0);
            const orderId = String(body.orderId || '').trim().slice(0, 200);
            const reason = String(body.reason || 'manual').trim().slice(0, 120);

            if (!code || sendCount < 1) {
                res.status(400).json({ ok: false, error: 'code와 sendCount(≥1)가 필요합니다.' });
                return;
            }

            await db.runTransaction(async (tx) => {
                const ref = col().doc(code);
                const snap = await tx.get(ref);
                if (!snap.exists) {
                    throw Object.assign(new Error('쿠폰 없음'), { code: 'NOT_FOUND' });
                }
                const data = snap.data();
                if (data.status === 'disabled') {
                    throw Object.assign(new Error('비활성 쿠폰'), { code: 'DISABLED' });
                }
                if (isCouponExpired(data)) {
                    throw Object.assign(new Error('만료된 쿠폰'), { code: 'EXPIRED' });
                }
                const remaining = couponRemaining(data);
                if (remaining < sendCount) {
                    throw Object.assign(new Error(`잔여 ${remaining}건 / 요청 ${sendCount}건`), { code: 'INSUFFICIENT' });
                }
                tx.update(ref, {
                    usedSends: FieldValue.increment(sendCount),
                    updatedAt: FieldValue.serverTimestamp(),
                    lastConsumedAt: FieldValue.serverTimestamp(),
                    lastConsumedOrderId: orderId || null,
                    lastConsumeReason: reason,
                });
            });

            const after = await col().doc(code).get();
            res.status(200).json({
                ok: true,
                coupon: serializeCouponDoc(code, after.data()),
            });
        } catch (err) {
            if (err.code === 'NOT_FOUND') {
                res.status(404).json({ ok: false, error: err.message });
                return;
            }
            if (err.code === 'DISABLED' || err.code === 'EXPIRED' || err.code === 'INSUFFICIENT') {
                res.status(409).json({ ok: false, error: err.message });
                return;
            }
            if (err.statusCode) {
                res.status(err.statusCode).json({ ok: false, error: err.message });
                return;
            }
            console.error('consumeSendCoupon:', err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }

    return { adminHandler, validateHandler, consumeHandler };
}

/**
 * 로컬 JSON 파일 스토어 (server.js)
 */
function createLocalJsonHandlers(filePath, fs, getAdminSecret) {
    function readAll() {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]', 'utf8');
        }
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (_) {
            return [];
        }
    }

    function writeAll(rows) {
        fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
    }

    function rowToDoc(row) {
        const { id, ...data } = row;
        return serializeCouponDoc(id, data);
    }

    async function adminHandler(req, res) {
        setCors(res, 'GET, POST, PATCH, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        try {
            assertAdmin(req, getAdminSecret);

            if (req.method === 'GET') {
                const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
                const rows = readAll().slice(0, limit);
                res.status(200).json({ ok: true, coupons: rows.map((r) => rowToDoc(r)) });
                return;
            }

            if (req.method === 'POST') {
                const body = req.body || {};
                const totalFreeSends = Number(body.totalFreeSends);
                if (!Number.isFinite(totalFreeSends) || totalFreeSends < 1 || totalFreeSends > 10000000) {
                    res.status(400).json({ ok: false, error: 'totalFreeSends는 1~10,000,000 사이 숫자여야 합니다.' });
                    return;
                }

                let code = normalizeCouponCode(body.code);
                const rows = readAll();
                if (code) {
                    if (rows.some((r) => r.id === code)) {
                        res.status(409).json({ ok: false, error: '이미 사용 중인 코드입니다.' });
                        return;
                    }
                } else {
                    let tries = 0;
                    do {
                        code = generateCouponCode();
                        tries += 1;
                    } while (rows.some((r) => r.id === code) && tries < 25);
                }

                const expParse = parseExpiresAtIso(body.expiresAt, null);
                if (expParse.error) {
                    res.status(400).json({ ok: false, error: expParse.error });
                    return;
                }

                const bindPhone = normalizePhone(body.bindPhone || '');
                const recipientPhone = normalizePhone(body.recipientPhone || '');
                const now = new Date().toISOString();

                const row = {
                    id: code,
                    type: 'free_sends',
                    totalFreeSends: Math.floor(totalFreeSends),
                    usedSends: 0,
                    status: 'active',
                    recipientName: String(body.recipientName || '').trim().slice(0, 120),
                    recipientPhone,
                    recipientEmail: String(body.recipientEmail || '').trim().slice(0, 320),
                    bindPhone,
                    note: String(body.note || '').trim().slice(0, 2000),
                    createdAt: now,
                    updatedAt: now,
                };
                if (expParse.date) row.expiresAt = expParse.date;

                rows.unshift(row);
                writeAll(rows);
                res.status(201).json({ ok: true, coupon: rowToDoc(row) });
                return;
            }

            if (req.method === 'PATCH') {
                const body = req.body || {};
                const code = normalizeCouponCode(body.code);
                if (!code) {
                    res.status(400).json({ ok: false, error: 'code가 필요합니다.' });
                    return;
                }
                const rows = readAll();
                const idx = rows.findIndex((r) => r.id === code);
                if (idx === -1) {
                    res.status(404).json({ ok: false, error: '쿠폰을 찾을 수 없습니다.' });
                    return;
                }
                const cur = { ...rows[idx] };
                if (body.status === 'active' || body.status === 'disabled') cur.status = body.status;
                if (body.note !== undefined) cur.note = String(body.note || '').trim().slice(0, 2000);
                if (body.totalFreeSends !== undefined) {
                    const t = Number(body.totalFreeSends);
                    const used = Number(cur.usedSends) || 0;
                    if (!Number.isFinite(t) || t < used) {
                        res.status(400).json({ ok: false, error: 'totalFreeSends가 올바르지 않습니다.' });
                        return;
                    }
                    cur.totalFreeSends = Math.floor(t);
                }
                if (body.usedSends !== undefined) {
                    const u = Number(body.usedSends);
                    const total = Number(cur.totalFreeSends) || 0;
                    if (!Number.isFinite(u) || u < 0 || u > total) {
                        res.status(400).json({ ok: false, error: 'usedSends가 올바르지 않습니다.' });
                        return;
                    }
                    cur.usedSends = Math.floor(u);
                }
                if (body.bindPhone !== undefined) cur.bindPhone = normalizePhone(body.bindPhone);
                if (body.expiresAt !== undefined) {
                    if (body.expiresAt === null || body.expiresAt === '') delete cur.expiresAt;
                    else {
                        const ep = parseExpiresAtIso(body.expiresAt, null);
                        if (ep.error) {
                            res.status(400).json({ ok: false, error: ep.error });
                            return;
                        }
                        cur.expiresAt = ep.date;
                    }
                }
                cur.updatedAt = new Date().toISOString();
                rows[idx] = cur;
                writeAll(rows);
                res.status(200).json({ ok: true, coupon: rowToDoc(cur) });
                return;
            }

            res.status(405).json({ ok: false, error: 'Method not allowed' });
        } catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ ok: false, error: err.message });
                return;
            }
            console.error('local sendCouponAdmin:', err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }

    async function validateHandler(req, res) {
        setCors(res, 'POST, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ ok: false, error: 'Method not allowed' });
            return;
        }
        try {
            const body = req.body || {};
            const code = normalizeCouponCode(body.code);
            const phone = normalizePhone(body.phone || '');
            const sendCount = Math.max(0, Math.floor(Number(body.sendCount) || 0));

            if (!code) {
                res.status(400).json({ ok: false, valid: false, error: 'code가 필요합니다.' });
                return;
            }

            const rows = readAll();
            const row = rows.find((r) => r.id === code);
            if (!row) {
                res.status(200).json({ ok: true, valid: false, error: '존재하지 않는 쿠폰입니다.' });
                return;
            }

            if (row.status === 'disabled') {
                res.status(200).json({ ok: true, valid: false, error: '비활성화된 쿠폰입니다.' });
                return;
            }
            if (isCouponExpired(row)) {
                res.status(200).json({ ok: true, valid: false, error: '만료된 쿠폰입니다.' });
                return;
            }

            const bind = normalizePhone(row.bindPhone || '');
            if (bind && phone && bind !== phone) {
                res.status(200).json({ ok: true, valid: false, error: '등록된 연락처와 일치하지 않습니다.' });
                return;
            }
            if (bind && !phone) {
                res.status(200).json({
                    ok: true,
                    valid: false,
                    error: '이 쿠폰은 신청 시 연락처 확인이 필요합니다.',
                    requiresPhone: true,
                });
                return;
            }

            const remaining = couponRemaining(row);
            const applicable = sendCount > 0 ? Math.min(remaining, sendCount) : remaining;

            res.status(200).json({
                ok: true,
                valid: true,
                code,
                remainingSends: remaining,
                applicableSends: applicable,
                bindPhoneRequired: Boolean(bind),
            });
        } catch (err) {
            console.error('local validateSendCoupon:', err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }

    async function consumeHandler(req, res) {
        setCors(res, 'POST, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ ok: false, error: 'Method not allowed' });
            return;
        }
        try {
            assertAdmin(req, getAdminSecret);
            const body = req.body || {};
            const code = normalizeCouponCode(body.code);
            const sendCount = Math.floor(Number(body.sendCount) || 0);
            if (!code || sendCount < 1) {
                res.status(400).json({ ok: false, error: 'code와 sendCount(≥1)가 필요합니다.' });
                return;
            }

            const rows = readAll();
            const idx = rows.findIndex((r) => r.id === code);
            if (idx === -1) {
                res.status(404).json({ ok: false, error: '쿠폰 없음' });
                return;
            }
            const cur = { ...rows[idx] };
            if (cur.status === 'disabled') {
                res.status(409).json({ ok: false, error: '비활성 쿠폰' });
                return;
            }
            if (isCouponExpired(cur)) {
                res.status(409).json({ ok: false, error: '만료된 쿠폰' });
                return;
            }
            const remaining = couponRemaining(cur);
            if (remaining < sendCount) {
                res.status(409).json({ ok: false, error: `잔여 ${remaining}건 / 요청 ${sendCount}건` });
                return;
            }
            cur.usedSends = (Number(cur.usedSends) || 0) + sendCount;
            cur.updatedAt = new Date().toISOString();
            cur.lastConsumedAt = cur.updatedAt;
            cur.lastConsumedOrderId = String(body.orderId || '').trim().slice(0, 200) || null;
            cur.lastConsumeReason = String(body.reason || 'manual').trim().slice(0, 120);
            rows[idx] = cur;
            writeAll(rows);

            res.status(200).json({ ok: true, coupon: rowToDoc(cur) });
        } catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ ok: false, error: err.message });
                return;
            }
            console.error('local consumeSendCoupon:', err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }

    return { adminHandler, validateHandler, consumeHandler };
}

module.exports = {
    normalizeCouponCode,
    generateCouponCode,
    createFirestoreHandlers,
    createLocalJsonHandlers,
    couponRemaining,
    isCouponExpired,
};
