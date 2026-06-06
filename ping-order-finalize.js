'use strict';

/**
 * 주문 결제 확정(Admin Firestore) + 문자 발송 트리거 — 단일 서버 파이프라인.
 * 토스 승인·포인트 전액 결제 후 호출. 무통장은 waiting_bank_transfer 만 (발송은 admin 입금 확인).
 */
const { getPingFirestoreAdmin } = require('./ping-firebase-admin');
const { loadSendFromDisplay } = require('./ping-dispatch-send-from');
const { derivePaymentDispatchAlignment } = require('./ping-order-payment-alignment');
const smsService = require('./sms-service');

function buildSmsConfigFromEnv() {
    return {
        service: process.env.SMS_SERVICE || 'aligo',
        apiKey: process.env.SMS_API_KEY,
        userId: process.env.SMS_USER_ID,
        sender: process.env.SMS_SENDER,
        senderKey: process.env.SMS_SENDER_KEY,
        testMode: process.env.SMS_TEST_MODE || 'N',
    };
}

/**
 * @param {string} orderId
 * @param {{
 *   paymentPayload?: unknown,
 *   paymentId?: string,
 *   paymentMethod?: string,
 *   pointsUsed?: number,
 *   deviceId?: string,
 * }} opts
 */
async function markOrderPaid(orderId, opts) {
    const oid = String(orderId || '').trim();
    if (!oid) throw new Error('orderId가 필요합니다.');

    const db = getPingFirestoreAdmin();
    const ref = db.collection('ping_orders').doc(oid);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new Error('주문을 찾을 수 없습니다.');
    }

    const d = snap.data() || {};
    const st = String(d.status || '').trim();

    if (st === 'paid') {
        return { alreadyPaid: true, order: d };
    }
    if (st === 'waiting_bank_transfer') {
        throw new Error('무통장 입금 대기 중인 주문입니다. 카드/포인트 결제로 확정할 수 없습니다.');
    }

    const pay = opts.paymentPayload && typeof opts.paymentPayload === 'object' ? opts.paymentPayload : {};
    const paymentId =
        String(opts.paymentId || '').trim() ||
        String(pay.paymentKey || pay.paymentId || '').trim() ||
        `paid_${oid}_${Date.now()}`;

    const patch = {
        status: 'paid',
        paidAt: new Date(),
        paymentId,
        paymentData: opts.paymentPayload != null ? opts.paymentPayload : pay,
        paymentMethod: String(opts.paymentMethod || 'card').trim() || 'card',
    };
    if (opts.pointsUsed != null && Number.isFinite(Number(opts.pointsUsed))) {
        patch.pointsUsed = Math.max(0, Math.floor(Number(opts.pointsUsed)));
    }
    const did = String(opts.deviceId || '').trim().slice(0, 128);
    if (did) {
        patch.paymentDeviceId = did;
    }

    await ref.set(patch, { merge: true });
    return { alreadyPaid: false, order: d };
}

/**
 * @param {string} orderId
 * @returns {Promise<{ ok: boolean, result?: unknown, error?: string, skipped?: boolean }>}
 */
/**
 * @param {string} orderId
 * @param {{ ok: boolean, skipped?: boolean, result?: unknown, error?: string }} dispatchResult
 */
async function recordPaymentDispatchAlignment(orderId, dispatchResult) {
    const oid = String(orderId || '').trim();
    if (!oid) return;

    let db;
    try {
        db = getPingFirestoreAdmin();
    } catch {
        return;
    }

    try {
        const ref = db.collection('ping_orders').doc(oid);
        const snap = await ref.get();
        if (!snap.exists) return;

        const d = snap.data() || {};
        const alignment = derivePaymentDispatchAlignment(d);
        const patch = {
            paymentDispatchAligned: alignment.paymentDispatchAligned,
            paymentDispatchMismatch: alignment.mismatchReason,
            refundEligible: alignment.refundEligible,
            dispatchSendFromLabel:
                String(d.dispatchSendFromLabel || '').trim() || loadSendFromDisplay().label,
        };

        if (!dispatchResult.ok && !dispatchResult.skipped) {
            patch.dispatchFailedAt = new Date();
        }

        await ref.set(patch, { merge: true });
    } catch (err) {
        console.error('[ping-order-finalize] recordPaymentDispatchAlignment', oid, err);
    }
}

async function triggerOrderDispatch(orderId) {
    const oid = String(orderId || '').trim();
    try {
        const result = await smsService.sendSMSAutomation(oid, buildSmsConfigFromEnv());
        if (result && result.skipped) {
            const out = { ok: true, skipped: true, result };
            await recordPaymentDispatchAlignment(oid, out);
            return out;
        }
        if (result && result.success === false) {
            const out = {
                ok: false,
                error: result.error || result.message || '발송 처리에 실패했습니다.',
                result,
            };
            await recordPaymentDispatchAlignment(oid, out);
            return out;
        }
        const out = { ok: true, result: result || null };
        await recordPaymentDispatchAlignment(oid, out);
        return out;
    } catch (err) {
        console.error('[ping-order-finalize] sendSMSAutomation', oid, err);
        const out = {
            ok: false,
            error: err && err.message ? err.message : '발송 처리에 실패했습니다.',
        };
        await recordPaymentDispatchAlignment(oid, out);
        return out;
    }
}

/**
 * 결제 승인 직후: paid 기록 + 발송 트리거 (실패해도 paid 는 유지).
 * @param {string} orderId
 * @param {Parameters<typeof markOrderPaid>[1]} opts
 */
async function finalizeOrderPaidAndDispatch(orderId, opts) {
    const paidResult = await markOrderPaid(orderId, opts);
    const oid = String(orderId || '').trim();
    const prev = paidResult.order || {};
    const sms = String(prev.smsStatus || '').trim();

    if (
        paidResult.alreadyPaid &&
        (sms === 'sent' || sms === 'sending')
    ) {
        return {
            paid: true,
            alreadyPaid: true,
            dispatch: { ok: true, skipped: true, reason: 'already_dispatched' },
        };
    }

    const dispatch = await triggerOrderDispatch(oid);
    return {
        paid: true,
        alreadyPaid: !!paidResult.alreadyPaid,
        dispatch,
    };
}

module.exports = {
    buildSmsConfigFromEnv,
    markOrderPaid,
    triggerOrderDispatch,
    finalizeOrderPaidAndDispatch,
};
