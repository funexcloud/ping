'use strict';

const crypto = require('crypto');
const admin = require('firebase-admin');

/**
 * smsStatus가 발송 대기(idle)인지 — null / unset / 빈 문자열만 true.
 * failed·sent·sending 은 idle 아님 (재시도는 admin이 필드 삭제 후 idle 로 만듦).
 * @param {unknown} smsStatus
 * @returns {boolean}
 */
function isSmsDispatchIdle(smsStatus) {
    if (smsStatus === null || smsStatus === undefined) return true;
    return String(smsStatus).trim() === '';
}

/**
 * Firestore transaction CAS: idle → sending + dispatchAttemptId
 * @param {import('firebase-admin/firestore').DocumentReference} orderRef
 * @param {Record<string, unknown>} [extraPatch]
 * @returns {Promise<{
 *   acquired: boolean,
 *   dispatchAttemptId?: string,
 *   orderData?: Record<string, unknown>,
 *   reason?: string,
 *   smsStatus?: string,
 * }>}
 */
async function acquireSmsDispatchLock(orderRef, extraPatch = {}) {
    const dispatchAttemptId = crypto.randomUUID();

    return orderRef.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) {
            return { acquired: false, reason: 'not_found' };
        }

        const data = snap.data() || {};

        if (String(data.status || '').trim() !== 'paid') {
            return { acquired: false, reason: 'not_paid', orderData: data };
        }

        if (!isSmsDispatchIdle(data.smsStatus)) {
            return {
                acquired: false,
                reason: 'already_dispatching',
                smsStatus: String(data.smsStatus || ''),
                dispatchAttemptId: data.dispatchAttemptId,
                orderData: data,
            };
        }

        tx.update(orderRef, {
            smsStatus: 'sending',
            dispatchAttemptId,
            smsStartedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...extraPatch,
        });

        return { acquired: true, dispatchAttemptId, orderData: data };
    });
}

/**
 * @param {import('firebase-admin/firestore').DocumentReference} orderRef
 * @param {string} dispatchAttemptId
 * @param {'sent' | 'failed'} outcome
 * @param {Record<string, unknown>} patch
 */
async function commitSmsDispatchResult(orderRef, dispatchAttemptId, outcome, patch) {
    return orderRef.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) {
            return { updated: false, reason: 'not_found' };
        }

        const data = snap.data() || {};
        if (data.dispatchAttemptId !== dispatchAttemptId) {
            return { updated: false, reason: 'stale_attempt' };
        }
        if (data.smsStatus !== 'sending') {
            return { updated: false, reason: 'not_sending' };
        }

        tx.update(orderRef, {
            smsStatus: outcome,
            ...patch,
        });
        return { updated: true };
    });
}

module.exports = {
    isSmsDispatchIdle,
    acquireSmsDispatchLock,
    commitSmsDispatchResult,
};
