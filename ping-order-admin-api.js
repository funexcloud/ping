'use strict';

const admin = require('firebase-admin');
const { getPingFirestoreAdmin } = require('./ping-firebase-admin');
const { buildSmsConfigFromEnv, triggerOrderDispatch } = require('./ping-order-finalize');
const {
    resolveAdminAuth,
    verifyAdminApiKey,
    getAdminApiKeySecret,
} = require('./ping-admin-auth');

/** @deprecated PING_ADMIN_API_KEY 사용 — UI PIN 과 분리됨 */
function getAdminSecret() {
    return getAdminApiKeySecret();
}

function verifyAdminKey(provided) {
    return verifyAdminApiKey(provided);
}

/**
 * 무통장 입금 확인 → paid + 발송 트리거
 * @param {Record<string, unknown>} body
 */
/**
 * @param {Record<string, unknown>} body
 * @param {{ cookieHeader?: string, headers?: Record<string, string | string[] | undefined> }} [authOpts]
 */
async function apiConfirmBankDeposit(body, authOpts = {}) {
    try {
        const { orderId, adminKey } = body || {};
        const auth = resolveAdminAuth({
            adminKey,
            cookieHeader: authOpts.cookieHeader,
            headers: authOpts.headers,
        });
        if (!auth.ok) {
            return { status: 401, body: { ok: false, error: '관리자 인증에 실패했습니다.' } };
        }

        const oid = String(orderId || '').trim();
        if (!oid) {
            return { status: 400, body: { ok: false, error: 'orderId가 필요합니다.' } };
        }

        let db;
        try {
            db = getPingFirestoreAdmin();
        } catch (e) {
            return {
                status: 503,
                body: {
                    ok: false,
                    error:
                        'Firestore Admin을 사용할 수 없습니다. 서비스 계정(PING_FIREBASE_SERVICE_ACCOUNT_PATH)을 설정해 주세요.',
                },
            };
        }

        const ref = db.collection('ping_orders').doc(oid);
        const snap = await ref.get();
        if (!snap.exists) {
            return { status: 404, body: { ok: false, error: '주문을 찾을 수 없습니다.' } };
        }

        const d = snap.data() || {};
        const st = String(d.status || '').trim();

        const retryDispatchOnly = st === 'paid' && d.smsStatus === 'failed';

        if (st === 'paid') {
            if (d.smsStatus === 'sent' || d.smsStatus === 'sending') {
                return {
                    status: 200,
                    body: {
                        ok: true,
                        alreadyConfirmed: true,
                        smsStatus: d.smsStatus,
                        message: '이미 입금 확인·발송 처리된 주문입니다.',
                    },
                };
            }
            if (!retryDispatchOnly) {
                return {
                    status: 400,
                    body: {
                        ok: false,
                        error: `입금 확인할 수 없는 상태입니다. (현재: ${st}, 발송: ${d.smsStatus || '-'})`,
                    },
                };
            }
        } else if (st !== 'waiting_bank_transfer') {
            return {
                status: 400,
                body: {
                    ok: false,
                    error: `입금 확인할 수 없는 상태입니다. (현재: ${st || 'unknown'})`,
                },
            };
        }

        if (st !== 'paid') {
            await ref.set(
                {
                    status: 'paid',
                    paidAt: new Date(),
                    paymentMethod: d.paymentMethod || 'bank_transfer',
                    depositConfirmedAt: new Date(),
                    depositConfirmedBy: 'admin',
                },
                { merge: true }
            );
        } else if (retryDispatchOnly) {
            await ref.set(
                {
                    smsStatus: admin.firestore.FieldValue.delete(),
                    smsError: admin.firestore.FieldValue.delete(),
                },
                { merge: true }
            );
        }

        const dispatchResult = await triggerOrderDispatch(oid);
        if (!dispatchResult.ok) {
            return {
                status: 500,
                body: {
                    ok: false,
                    error: dispatchResult.error || '발송 처리에 실패했습니다.',
                    paid: true,
                },
            };
        }
        const dispatch = dispatchResult.result;

        return {
            status: 200,
            body: {
                ok: true,
                orderId: oid,
                status: 'paid',
                dispatchSkipped: !!dispatchResult.skipped,
                dispatch: dispatch || null,
            },
        };
    } catch (err) {
        console.error('apiConfirmBankDeposit', err);
        return { status: 500, body: { ok: false, error: err.message || 'server' } };
    }
}

module.exports = {
    apiConfirmBankDeposit,
    verifyAdminKey,
    getAdminSecret,
};
