'use strict';

/**
 * @typedef {'received'|'dispatching'|'complete'|'partial'|'failed'} FulfillmentPhase
 */

function pickFiniteCount(value) {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
}

/**
 * @param {Record<string, unknown>|null|undefined} order
 * @returns {{ targetCount: number|null, sentCount: number|null, failedCount: number|null }}
 */
function resolveDispatchCounts(order) {
    if (!order || typeof order !== 'object') {
        return { targetCount: null, sentCount: null, failedCount: null };
    }

    const smsResult =
        order.smsResult && typeof order.smsResult === 'object' ? order.smsResult : null;

    const targetCount =
        pickFiniteCount(order.targetCount) ??
        pickFiniteCount(order.count) ??
        pickFiniteCount(order.totalCount) ??
        pickFiniteCount(smsResult && smsResult.targetCount);

    const sentCount =
        pickFiniteCount(order.smsSentCount) ??
        pickFiniteCount(order.successCount) ??
        pickFiniteCount(smsResult && smsResult.sentCount);

    let failedCount =
        pickFiniteCount(order.failedCount) ?? pickFiniteCount(smsResult && smsResult.failedCount);

    if (failedCount == null && targetCount != null && sentCount != null) {
        failedCount = Math.max(0, targetCount - sentCount);
    }

    return { targetCount, sentCount, failedCount };
}

/**
 * @param {{ targetCount: number|null, sentCount: number|null, failedCount: number|null }} counts
 */
function isDispatchPartial(counts) {
    const { targetCount, sentCount, failedCount } = counts;
    if (failedCount != null && failedCount > 0) return true;
    if (targetCount != null && sentCount != null && sentCount > 0 && sentCount < targetCount) {
        return true;
    }
    return false;
}

const PHASE_COPY = {
    received: { label: '접수', chipLabel: '접수' },
    dispatching: { label: '세팅중', chipLabel: '세팅중' },
    complete: { label: '발송완료', chipLabel: '발송완료' },
    partial: { label: '부분 실패', chipLabel: '부분실패' },
    failed: { label: '발송 실패', chipLabel: '발송실패' },
};

/**
 * @param {Record<string, unknown>|null|undefined} order
 */
function deriveFulfillmentPhase(order) {
    const counts = resolveDispatchCounts(order);
    const status = String((order && order.status) || '').trim();
    const smsStatus = String((order && order.smsStatus) || '').trim();

    let phase;
    if (status === 'waiting_bank_transfer') {
        phase = 'received';
    } else if (status !== 'paid') {
        phase = 'received';
    } else if (smsStatus === 'failed') {
        phase = 'failed';
    } else if (smsStatus === 'sending' || smsStatus === '') {
        phase = 'dispatching';
    } else if (smsStatus === 'sent') {
        phase = isDispatchPartial(counts) ? 'partial' : 'complete';
    } else {
        phase = 'dispatching';
    }

    const copy = PHASE_COPY[phase];
    return {
        phase,
        label: copy.label,
        chipLabel: copy.chipLabel,
        ...counts,
    };
}

module.exports = {
    pickFiniteCount,
    resolveDispatchCounts,
    deriveFulfillmentPhase,
};
