'use strict';

/**
 * 민감 데이터 자동 파기 — 발송 후 24h 주소록·장례 종료 후 주문 PII 경량화.
 * condolence(부의금 장부)는 별도 도메인 — 이 모듈은 ping_orders·Storage 대상.
 */

const admin = require('firebase-admin');
const { getPingFirestoreAdmin } = require('./ping-firebase-admin');

const RECIPIENT_PURGE_HOURS = Math.max(
    1,
    Math.floor(Number(process.env.PING_RECIPIENT_PURGE_HOURS || 24))
);
const PURGE_DAYS_AFTER_DEPARTURE = Math.max(
    1,
    Math.floor(Number(process.env.PING_PURGE_DAYS_AFTER_DEPARTURE || 30))
);

function parseDepartureToDate(departureAt) {
    const raw = String(departureAt || '').trim();
    if (!raw) return null;
    const dm = raw.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
    if (!dm) return null;
    const y = Number(dm[1]);
    const mo = Number(dm[2]);
    const d = Number(dm[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    return new Date(y, mo - 1, d, 12, 0, 0);
}

function computePurgeAfterDate(departureAt) {
    const base = parseDepartureToDate(departureAt);
    if (!base) return null;
    const out = new Date(base.getTime());
    out.setDate(out.getDate() + PURGE_DAYS_AFTER_DEPARTURE);
    return out;
}

function recipientPurgeAfterFromNow() {
    return new Date(Date.now() + RECIPIENT_PURGE_HOURS * 60 * 60 * 1000);
}

async function deleteStorageObject(storagePath) {
    const p = String(storagePath || '').trim();
    if (!p) return false;
    try {
        const bucket = admin.storage().bucket();
        await bucket.file(p).delete({ ignoreNotFound: true });
        return true;
    } catch (err) {
        console.warn('[ping-order-purge] storage delete', p, err.message);
        return false;
    }
}

/**
 * @param {FirebaseFirestore.DocumentReference} ref
 * @param {Record<string, unknown>} data
 */
async function redactOrderRecipientData(ref, data) {
    const storagePath = data.storagePath;
    if (storagePath) {
        await deleteStorageObject(String(storagePath));
    }

    await ref.set(
        {
            storagePath: admin.firestore.FieldValue.delete(),
            fileUrl: admin.firestore.FieldValue.delete(),
            fileName: admin.firestore.FieldValue.delete(),
            message: '[recipient data purged]',
            templateData: admin.firestore.FieldValue.delete(),
            obituaryOriginalUrl: admin.firestore.FieldValue.delete(),
            recipientDataPurgedAt: admin.firestore.FieldValue.serverTimestamp(),
            recipientPurgeAfter: admin.firestore.FieldValue.delete(),
        },
        { merge: true }
    );
}

/**
 * @param {FirebaseFirestore.DocumentReference} ref
 */
async function redactOrderFullPii(ref) {
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, reason: 'not_found' };
    const data = snap.data() || {};
    await redactOrderRecipientData(ref, data);
    await ref.set(
        {
            name: '[redacted]',
            phone: admin.firestore.FieldValue.delete(),
            obituaryPageUrl: admin.firestore.FieldValue.delete(),
            safeLinkUrl: admin.firestore.FieldValue.delete(),
            orderPurgeAt: admin.firestore.FieldValue.serverTimestamp(),
            purgeAfter: admin.firestore.FieldValue.delete(),
        },
        { merge: true }
    );
    return { ok: true };
}

/**
 * 발송 완료 시 24h 뒤 주소록 파기 예약 필드 설정.
 */
async function scheduleRecipientPurgeAfterSend(orderRef) {
    const at = recipientPurgeAfterFromNow();
    await orderRef.set(
        {
            recipientPurgeAfter: admin.firestore.Timestamp.fromDate(at),
        },
        { merge: true }
    );
}

/**
 * @param {number} [limit]
 */
async function runScheduledPurge(limit = 50) {
    let db;
    try {
        db = getPingFirestoreAdmin();
    } catch (err) {
        return { ok: false, error: err.message, purgedRecipient: 0, purgedOrders: 0 };
    }

    const now = admin.firestore.Timestamp.now();
    let purgedRecipient = 0;
    let purgedOrders = 0;

    const recipientSnap = await db
        .collection('ping_orders')
        .where('recipientPurgeAfter', '<=', now)
        .limit(limit)
        .get();

    for (const doc of recipientSnap.docs) {
        const d = doc.data() || {};
        if (d.recipientDataPurgedAt) continue;
        await redactOrderRecipientData(doc.ref, d);
        purgedRecipient += 1;
    }

    const orderSnap = await db
        .collection('ping_orders')
        .where('purgeAfter', '<=', now)
        .limit(limit)
        .get();

    for (const doc of orderSnap.docs) {
        const d = doc.data() || {};
        if (d.orderPurgeAt) continue;
        await redactOrderFullPii(doc.ref);
        purgedOrders += 1;
    }

    return { ok: true, purgedRecipient, purgedOrders };
}

module.exports = {
    RECIPIENT_PURGE_HOURS,
    PURGE_DAYS_AFTER_DEPARTURE,
    computePurgeAfterDate,
    recipientPurgeAfterFromNow,
    scheduleRecipientPurgeAfterSend,
    redactOrderRecipientData,
    redactOrderFullPii,
    runScheduledPurge,
};
