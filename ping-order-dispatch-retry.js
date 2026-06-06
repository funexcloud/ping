'use strict';

const admin = require('firebase-admin');
const { getPingFirestoreAdmin } = require('./ping-firebase-admin');
const { triggerOrderDispatch } = require('./ping-order-finalize');
const { derivePaymentDispatchAlignment } = require('./ping-order-payment-alignment');

/**
 * 주문 금액 검증 (status API와 동일)
 * @param {Record<string, unknown>} order
 * @param {number|null} amount
 */
function verifyOrderAmount(order, amount) {
    const total = Math.floor(Number(order.totalAmount));
    const want = amount != null ? Math.floor(Number(amount)) : null;
    if (want != null && Number.isFinite(want) && want !== total) {
        return { ok: false, error: 'amount_mismatch' };
    }
    return { ok: true };
}

/**
 * 발송 실패 주문 재시도 — smsStatus 필드 초기화 후 dispatch
 * @param {string} orderId
 * @param {number|null} amount
 */
async function apiRetryOrderDispatch(orderId, amount) {
    const oid = String(orderId || '').trim();
    if (!oid) {
        return { status: 400, body: { ok: false, error: 'orderId가 필요합니다.' } };
    }

    let db;
    try {
        db = getPingFirestoreAdmin();
    } catch {
        return { status: 503, body: { ok: false, error: 'no_admin_db' } };
    }

    try {
        const ref = db.collection('ping_orders').doc(oid);
        const snap = await ref.get();
        if (!snap.exists) {
            return { status: 404, body: { ok: false, error: 'missing' } };
        }

        const d = snap.data() || {};
        const amtCheck = verifyOrderAmount(d, amount);
        if (!amtCheck.ok) {
            return { status: 400, body: { ok: false, error: amtCheck.error } };
        }

        const st = String(d.status || '').trim();
        if (st !== 'paid') {
            return {
                status: 400,
                body: { ok: false, error: '결제 완료된 주문만 재발송할 수 있습니다.' },
            };
        }

        const alignment = derivePaymentDispatchAlignment(d);
        if (!alignment.canRetryDispatch) {
            const sms = String(d.smsStatus || '').trim();
            if (sms === 'sent' || sms === 'sending') {
                return {
                    status: 200,
                    body: {
                        ok: true,
                        alreadyDispatched: true,
                        smsStatus: sms,
                        message: '이미 발송 처리 중이거나 완료된 주문입니다.',
                    },
                };
            }
            return {
                status: 400,
                body: {
                    ok: false,
                    error: '재발송할 수 없는 상태입니다.',
                    fulfillmentPhase: alignment.fulfillmentPhase,
                },
            };
        }

        await ref.set(
            {
                smsStatus: admin.firestore.FieldValue.delete(),
                smsError: admin.firestore.FieldValue.delete(),
                dispatchRetryAt: new Date(),
                dispatchRetryCount: admin.firestore.FieldValue.increment(1),
            },
            { merge: true }
        );

        const dispatchResult = await triggerOrderDispatch(oid);
        if (!dispatchResult.ok) {
            return {
                status: 500,
                body: {
                    ok: false,
                    error: dispatchResult.error || '발송 처리에 실패했습니다.',
                    dispatchSkipped: !!dispatchResult.skipped,
                },
            };
        }

        return {
            status: 200,
            body: {
                ok: true,
                orderId: oid,
                dispatchSkipped: !!dispatchResult.skipped,
                dispatch: dispatchResult.result || null,
            },
        };
    } catch (err) {
        console.error('apiRetryOrderDispatch', err);
        return { status: 500, body: { ok: false, error: 'error' } };
    }
}

module.exports = {
    apiRetryOrderDispatch,
    verifyOrderAmount,
};
