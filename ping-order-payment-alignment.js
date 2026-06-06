'use strict';

const { deriveFulfillmentPhase } = require('./ping-order-fulfillment');

/**
 * 결제(paid) ↔ 발송(smsStatus·집계) 정합성
 * @param {Record<string, unknown>} order
 */
function derivePaymentDispatchAlignment(order) {
    const d = order && typeof order === 'object' ? order : {};
    const st = String(d.status || '').trim();
    const refundStatus = String(d.refundStatus || '').trim();
    const fulfillment = deriveFulfillmentPhase(d);
    const phase = fulfillment.phase;

    if (refundStatus === 'refunded') {
        return {
            paymentDispatchAligned: true,
            canRetryDispatch: false,
            refundEligible: false,
            mismatchReason: null,
            fulfillmentPhase: phase,
            refundStatus,
            canRequestRefund: false,
        };
    }

    if (st !== 'paid') {
        return {
            paymentDispatchAligned: true,
            canRetryDispatch: false,
            refundEligible: false,
            mismatchReason: null,
            refundStatus: refundStatus || null,
            canRequestRefund: false,
        };
    }

    const aligned =
        phase === 'complete' ||
        phase === 'dispatching' ||
        phase === 'partial';

    const canRetryDispatch = phase === 'failed' && refundStatus !== 'processing';
    const sent = fulfillment.sentCount;
    const refundEligible =
        phase === 'failed' && (sent == null || sent === 0) && refundStatus !== 'refunded';
    const canRequestRefund =
        refundEligible && refundStatus !== 'processing' && refundStatus !== 'refunded';

    let mismatchReason = null;
    if (!aligned) {
        if (phase === 'failed') {
            mismatchReason = 'paid_dispatch_failed';
        } else if (phase === 'received') {
            mismatchReason = 'paid_awaiting_dispatch';
        }
    } else if (phase === 'partial') {
        mismatchReason = 'paid_dispatch_partial';
    }

    return {
        paymentDispatchAligned: aligned,
        canRetryDispatch,
        refundEligible,
        canRequestRefund,
        mismatchReason,
        fulfillmentPhase: phase,
        refundStatus: refundStatus || null,
    };
}

module.exports = { derivePaymentDispatchAlignment };
