'use strict';

const admin = require('firebase-admin');
const { acquireSmsDispatchLock, commitSmsDispatchResult } = require('../ping-sms-dispatch-lock');
const { scheduleRecipientPurgeAfterSend } = require('../ping-order-purge');
const { loadDispatchConfigFromEnv, solapiCredentialsReady, kakaoTemplateReady } = require('./config');
const { normalizeKRPhone } = require('./normalizePhone');
const { buildKakaoVariables, buildSolapiMessagesForPhones } = require('./buildMessages');
const { sendInChunks } = require('./solapiChunks');

function skippedDispatchResult(lock) {
    return {
        success: false,
        skipped: true,
        message: '이미 발송 중이거나 발송 완료된 주문입니다.',
        smsStatus: lock.smsStatus,
    };
}

/**
 * 결제 완료 주문에 대해 Solapi로 알림톡(기본) 또는 LMS 발송.
 * @param {string} orderId
 * @param {{ convertAddressBookToContacts: (orderData: object) => Promise<string[]> }} deps
 * @returns {Promise<{ success: boolean, service?: string, sentCount?: number, error?: string, result?: object, skipped?: boolean, message?: string }>}
 */
async function dispatchPaidOrder(orderId, deps) {
    const { convertAddressBookToContacts } = deps;
    const cfg = loadDispatchConfigFromEnv();

    if (!cfg.useSolapi || !solapiCredentialsReady(cfg)) {
        return { success: false, error: 'Solapi dispatch 미설정(PING_DISPATCH_USE_SOLAPI=1 및 키 필요)' };
    }

    const db = admin.firestore();
    const orderRef = db.collection('ping_orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
        throw new Error('주문을 찾을 수 없습니다.');
    }

    const preflight = orderSnap.data() || {};

    if (preflight.status !== 'paid') {
        throw new Error('결제가 완료되지 않은 주문입니다.');
    }

    /** 주문 CX에서 선택한 채널이 있으면 우선(없으면 환경변수 기본값) */
    let channel = cfg.primaryChannel;
    const pref = preflight.preferredSendChannel;
    if (pref === 'sms' || pref === 'kakao_alimtalk') {
        channel = pref;
    }

    if (channel === 'kakao_alimtalk' && !kakaoTemplateReady(cfg)) {
        throw new Error('알림톡용 SOLAPI_KAKAO_PF_ID / SOLAPI_KAKAO_TEMPLATE_ID 가 필요합니다.');
    }

    const lock = await acquireSmsDispatchLock(orderRef, {
        smsProvider: 'solapi',
        smsPrimaryChannel: channel,
    });

    if (!lock.acquired) {
        if (lock.reason === 'already_dispatching') {
            return skippedDispatchResult(lock);
        }
        if (lock.reason === 'not_paid') {
            throw new Error('결제가 완료되지 않은 주문입니다.');
        }
        throw new Error('주문을 찾을 수 없습니다.');
    }

    const dispatchAttemptId = lock.dispatchAttemptId;
    const orderData = lock.orderData || {};

    try {
        const rawContacts = await convertAddressBookToContacts(orderData);
        const phones = [];
        const seen = new Set();
        for (const c of rawContacts) {
            const n = normalizeKRPhone(c);
            if (n && !seen.has(n)) {
                seen.add(n);
                phones.push(n);
            }
        }

        if (phones.length === 0) {
            throw new Error('발송할 연락처가 없습니다.');
        }

        const applicantName = orderData.name || '고객';
        const defaultMessage = `${applicantName}님의 요청으로 대량으로 부고를 전송해드렸어요. 결제가 완료되었습니다.`;
        const message = orderData.message || defaultMessage;
        const kakaoVariables = buildKakaoVariables(orderData.templateData || {}, orderData);
        if (orderData.obituaryPageUrl && kakaoVariables.obit_link == null && kakaoVariables['부고링크'] == null) {
            kakaoVariables.obit_link = String(orderData.obituaryPageUrl);
        }

        let messages = buildSolapiMessagesForPhones(phones, cfg, message, kakaoVariables, channel);

        let { responses, aggregatedFailed, acceptedTotal } = await sendInChunks(cfg, messages);

        if (channel === 'kakao_alimtalk' && cfg.fallbackSms && aggregatedFailed.length > 0) {
            const kakaoFailedList = aggregatedFailed;
            const retryPhones = [
                ...new Set(kakaoFailedList.map((f) => normalizeKRPhone(f.to) || String(f.to))),
            ].filter(Boolean);
            if (retryPhones.length > 0) {
                const fallbackMsgs = buildSolapiMessagesForPhones(retryPhones, cfg, message, kakaoVariables, 'sms');
                const fb = await sendInChunks(cfg, fallbackMsgs);
                responses = responses.concat(fb.responses);
                acceptedTotal += fb.acceptedTotal;
                const smsStillFailed = new Set(
                    (fb.aggregatedFailed || []).map((f) => normalizeKRPhone(f.to) || String(f.to))
                );
                aggregatedFailed = kakaoFailedList.filter((f) => {
                    const p = normalizeKRPhone(f.to) || String(f.to);
                    return smsStillFailed.has(p);
                });
            }
        }

        const success = acceptedTotal > 0;
        const result = {
            service: 'solapi',
            primaryChannel: channel,
            sentCount: acceptedTotal,
            targetCount: phones.length,
            failedCount: aggregatedFailed.length,
            failedMessageList: aggregatedFailed,
            dispatchAttemptId,
            responses: responses.map((r) => ({
                groupId: r.groupInfo && r.groupInfo.groupId,
                status: r.groupInfo && r.groupInfo.status,
            })),
        };

        if (success) {
            await commitSmsDispatchResult(orderRef, dispatchAttemptId, 'sent', {
                smsSentAt: admin.firestore.FieldValue.serverTimestamp(),
                smsSentCount: acceptedTotal,
                smsResult: result,
                targetCount: phones.length,
                failedCount: aggregatedFailed.length,
            });
            await scheduleRecipientPurgeAfterSend(orderRef).catch((purgeErr) => {
                console.error('[dispatchPaidOrder] scheduleRecipientPurge', orderId, purgeErr);
            });
            return { success: true, service: 'solapi', sentCount: acceptedTotal, result };
        }

        await commitSmsDispatchResult(orderRef, dispatchAttemptId, 'failed', {
            smsError: 'Solapi 접수 실패(전 건 거절)',
            smsFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            smsResult: result,
            targetCount: phones.length,
            failedCount: aggregatedFailed.length,
        });
        return { success: false, service: 'solapi', error: 'Solapi 발송 접수 실패', result };
    } catch (error) {
        const message = error && error.message ? error.message : '발송 처리에 실패했습니다.';
        await commitSmsDispatchResult(orderRef, dispatchAttemptId, 'failed', {
            smsError: message,
            smsFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch((commitErr) => {
            console.error('[dispatchPaidOrder] commit failed state', orderId, commitErr);
        });
        return { success: false, error: message };
    }
}

module.exports = { dispatchPaidOrder };
