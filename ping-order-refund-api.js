'use strict';

const admin = require('firebase-admin');
const { getPingFirestoreAdmin } = require('./ping-firebase-admin');
const { derivePaymentDispatchAlignment } = require('./ping-order-payment-alignment');
const { verifyOrderAmount } = require('./ping-order-dispatch-retry');
const { cancelTossPayment } = require('./ping-toss-refund-api');
const paymentPoints = require('./payment-points');

const REFUND_REASON = '발송 실패(전액 미발송) — 결제 취소';

/**
 * @param {Record<string, unknown>} order
 */
function resolvePaymentKey(order) {
    const pay = order.paymentData && typeof order.paymentData === 'object' ? order.paymentData : {};
    return (
        String(order.paymentId || '').trim() ||
        String(pay.paymentKey || '').trim() ||
        ''
    );
}

/**
 * @param {string} paymentKey
 */
function isTossPaymentKey(paymentKey) {
    const k = String(paymentKey || '').trim();
    if (!k) return false;
    if (k.startsWith('points_only_')) return false;
    if (k.startsWith('bank_transfer_')) return false;
    if (k.startsWith('paid_')) return false;
    return true;
}

/**
 * @param {string} orderId
 * @param {number|null} amount
 * @param {{ deviceId?: string, referralCode?: string }} [body]
 */
async function apiRequestOrderRefund(orderId, amount, body = {}) {
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

    const ref = db.collection('ping_orders').doc(oid);

    try {
        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) {
                return { status: 404, body: { ok: false, error: 'missing' } };
            }

            const d = snap.data() || {};
            const amtCheck = verifyOrderAmount(d, amount);
            if (!amtCheck.ok) {
                return { status: 400, body: { ok: false, error: amtCheck.error } };
            }

            const refundStatus = String(d.refundStatus || '').trim();
            if (refundStatus === 'refunded' || refundStatus === 'processing') {
                return {
                    status: 200,
                    body: {
                        ok: true,
                        alreadyRefunded: true,
                        refundStatus,
                        message: '이미 환불 처리된 주문입니다.',
                    },
                };
            }

            const alignment = derivePaymentDispatchAlignment(d);
            if (!alignment.refundEligible) {
                return {
                    status: 400,
                    body: {
                        ok: false,
                        error: '전액 미발송 상태에서만 자동 환불을 요청할 수 있습니다.',
                        fulfillmentPhase: alignment.fulfillmentPhase,
                    },
                };
            }

            const paymentMethod = String(d.paymentMethod || 'card').trim();
            if (paymentMethod === 'bank_transfer') {
                return {
                    status: 400,
                    body: {
                        ok: false,
                        error: 'manual_refund_required',
                        message:
                            '무통장 입금 주문은 고객센터를 통해 환불해 주세요. 입금 확인 전이면 별도 입금 없이 취소됩니다.',
                    },
                };
            }

            tx.set(
                ref,
                {
                    refundStatus: 'processing',
                    refundRequestedAt: new Date(),
                },
                { merge: true }
            );

            return {
                status: 202,
                body: {
                    ok: true,
                    processing: true,
                    orderId: oid,
                    paymentMethod,
                },
                order: d,
            };
        });

        if (result.status !== 202 || !result.order) {
            return { status: result.status, body: result.body };
        }

        const d = result.order;
        const paymentMethod = String(d.paymentMethod || 'card').trim();
        const paymentKey = resolvePaymentKey(d);
        const pay =
            d.paymentData && typeof d.paymentData === 'object' ? d.paymentData : {};
        const totalAmount = Math.floor(Number(d.totalAmount));
        const pointsUsed = Math.max(0, Math.floor(Number(d.pointsUsed) || 0));
        const deviceId =
            String(d.paymentDeviceId || body.deviceId || '').trim().slice(0, 128) || '';
        const referralCode = String(body.referralCode || '').trim();

        const refundPayload = {
            reason: REFUND_REASON,
            at: new Date().toISOString(),
            paymentMethod,
        };
        let pointsRefund = null;
        let tossRefund = null;

        try {
            if (paymentMethod === 'points') {
                if (!deviceId) {
                    throw new Error('포인트 결제 환불에 deviceId가 필요합니다. 고객센터로 문의해 주세요.');
                }
                pointsRefund = paymentPoints.refundForOrder({
                    deviceId,
                    referralCode,
                    points: pointsUsed || totalAmount,
                });
                refundPayload.pointsRefund = pointsRefund;
            } else {
                const cardAmount = Math.max(
                    0,
                    Math.floor(Number(pay.totalAmount)) ||
                        Math.max(0, totalAmount - pointsUsed)
                );

                if (cardAmount > 0 && isTossPaymentKey(paymentKey)) {
                    tossRefund = await cancelTossPayment({
                        paymentKey,
                        cancelReason: REFUND_REASON,
                        cancelAmount: cardAmount,
                        idempotencyKey: `ping-refund-${oid}`,
                    });
                    refundPayload.toss = tossRefund;
                }

                if (pointsUsed > 0) {
                    if (!deviceId) {
                        throw new Error(
                            '포인트 사용분 환불에 deviceId가 필요합니다. 고객센터로 문의해 주세요.'
                        );
                    }
                    pointsRefund = paymentPoints.refundForOrder({
                        deviceId,
                        referralCode,
                        points: pointsUsed,
                    });
                    refundPayload.pointsRefund = pointsRefund;
                }
            }

            await ref.set(
                {
                    refundStatus: 'refunded',
                    refundedAt: new Date(),
                    refundPayload,
                    paymentDispatchAligned: true,
                    paymentDispatchMismatch: admin.firestore.FieldValue.delete(),
                    refundEligible: false,
                },
                { merge: true }
            );

            return {
                status: 200,
                body: {
                    ok: true,
                    orderId: oid,
                    refundStatus: 'refunded',
                    paymentMethod,
                    pointsRefunded: pointsRefund,
                    tossCanceled: !!tossRefund,
                },
            };
        } catch (err) {
            console.error('apiRequestOrderRefund execute', oid, err);
            await ref.set(
                {
                    refundStatus: 'failed',
                    refundError: err && err.message ? err.message : 'refund_failed',
                    refundFailedAt: new Date(),
                },
                { merge: true }
            );
            return {
                status: 500,
                body: {
                    ok: false,
                    error: err && err.message ? err.message : '환불 처리에 실패했습니다.',
                },
            };
        }
    } catch (err) {
        console.error('apiRequestOrderRefund', err);
        return { status: 500, body: { ok: false, error: 'error' } };
    }
}

module.exports = { apiRequestOrderRefund };
