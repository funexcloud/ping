'use strict';

const { getPingFirestoreAdmin } = require('./ping-firebase-admin');
const { deriveFulfillmentPhase } = require('./ping-order-fulfillment');
const { derivePaymentDispatchAlignment } = require('./ping-order-payment-alignment');
const { loadSendFromDisplay } = require('./ping-dispatch-send-from');

/**
 * 주문 진행 상태 조회 (결제완료 화면 폴링용)
 * @param {string} orderId
 * @param {number|null} amount
 */
async function apiGetOrderPublicStatus(orderId, amount) {
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
        const snap = await db.collection('ping_orders').doc(oid).get();
        if (!snap.exists) {
            return { status: 404, body: { ok: false, error: 'missing' } };
        }
        const d = snap.data() || {};
        const total = Math.floor(Number(d.totalAmount));
        const want = amount != null ? Math.floor(Number(amount)) : null;
        if (want != null && Number.isFinite(want) && want !== total) {
            return { status: 400, body: { ok: false, error: 'amount_mismatch' } };
        }

        const fulfillment = deriveFulfillmentPhase(d);
        const alignment = derivePaymentDispatchAlignment(d);
        const sendFrom =
            String(d.dispatchSendFromLabel || '').trim() || loadSendFromDisplay().label;

        return {
            status: 200,
            body: {
                ok: true,
                orderId: oid,
                status: String(d.status || ''),
                paymentMethod: String(d.paymentMethod || ''),
                smsStatus: String(d.smsStatus || ''),
                cashReceiptType: String(d.cashReceiptType || ''),
                cashReceiptVoluntary: d.cashReceiptVoluntary === true,
                cashReceiptStatus: String(d.cashReceiptStatus || ''),
                cashReceiptApprovalNo: d.cashReceiptApprovalNo || null,
                totalAmount: total,
                successCount: d.successCount != null ? Number(d.successCount) : null,
                smsSentCount: d.smsSentCount != null ? Number(d.smsSentCount) : null,
                targetCount: fulfillment.targetCount,
                failedCount: fulfillment.failedCount,
                fulfillmentPhase: fulfillment.phase,
                fulfillmentLabel: fulfillment.label,
                fulfillmentChipLabel: fulfillment.chipLabel,
                sendFromLabel: sendFrom,
                paymentDispatchAligned: alignment.paymentDispatchAligned,
                canRetryDispatch: alignment.canRetryDispatch,
                refundEligible: alignment.refundEligible,
                canRequestRefund: alignment.canRequestRefund,
                refundStatus: alignment.refundStatus,
                paymentDispatchMismatch: alignment.mismatchReason,
            },
        };
    } catch (err) {
        console.error('apiGetOrderPublicStatus', err);
        return { status: 500, body: { ok: false, error: 'error' } };
    }
}

module.exports = { apiGetOrderPublicStatus };
