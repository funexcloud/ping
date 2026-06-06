/**
 * checkout.html 토스 결제위젯 복귀 후 승인·체크아웃 세션·포인트 전액 결제.
 * Express(server.js)와 Next App Router(API route)에서 공통 사용.
 *
 * @see https://docs.tosspayments.com/guides/v2/payment-widget/integration
 */
'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const paymentPoints = require('./payment-points');
const { finalizeOrderPaidAndDispatch } = require('./ping-order-finalize');

const CHECKOUT_SESSION_STORE = path.join(__dirname, 'checkout-sessions.local.json');

/** 가이드 샘플 시크릿 — https://docs.tosspayments.com/guides/v2/payment-widget/integration */
const TOSS_PAYMENTS_DOCS_WIDGET_SECRET_KEY = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

function pingEnvTruthy(name) {
    const v = String(process.env[name] ?? '').trim();
    return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function readCheckoutSessions() {
    try {
        const j = JSON.parse(fs.readFileSync(CHECKOUT_SESSION_STORE, 'utf8'));
        if (j && typeof j === 'object' && j.sessions && typeof j.sessions === 'object') return j;
    } catch (e) {
        if (e.code !== 'ENOENT') console.warn('checkout-sessions read:', e.message);
    }
    return { sessions: {} };
}

function writeCheckoutSessions(data) {
    fs.writeFileSync(CHECKOUT_SESSION_STORE, JSON.stringify(data, null, 2), 'utf8');
}

function getCheckoutSessionOrderTotal(orderId) {
    const oid = String(orderId || '').trim();
    if (!oid) return null;
    const data = readCheckoutSessions();
    const row = data.sessions[oid];
    if (!row || typeof row.totalAmount !== 'number') return null;
    const age = Date.now() - Number(row.ts || 0);
    if (!Number.isFinite(age) || age > 48 * 60 * 60 * 1000) return null;
    return Math.floor(row.totalAmount);
}

function setCheckoutSession(orderId, totalAmount) {
    const oid = String(orderId || '').trim();
    if (!oid) return;
    const data = readCheckoutSessions();
    data.sessions[oid] = { totalAmount: Math.floor(Number(totalAmount) || 0), ts: Date.now() };
    writeCheckoutSessions(data);
}

function clearCheckoutSession(orderId) {
    const oid = String(orderId || '').trim();
    if (!oid) return;
    const data = readCheckoutSessions();
    if (data.sessions[oid]) {
        delete data.sessions[oid];
        writeCheckoutSessions(data);
    }
}

function getTossSecretKey() {
    if (pingEnvTruthy('PING_USE_TOSS_DOCS_TEST_KEYS')) {
        return TOSS_PAYMENTS_DOCS_WIDGET_SECRET_KEY;
    }
    return (
        process.env.TOSS_PAYMENTS_SECRET_KEY ||
        process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY ||
        process.env.TOSS_SECRET_KEY ||
        process.env.PORTONE_SECRET_KEY ||
        ''
    );
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ status: number, body: Record<string, unknown> }}
 */
function apiRegisterCheckoutSession(body) {
    try {
        const { orderId, totalAmount } = body || {};
        const oid = String(orderId || '').trim();
        const ta = Math.floor(Number(totalAmount));
        if (!oid || !Number.isFinite(ta) || ta <= 0) {
            return { status: 400, body: { ok: false, error: 'orderId, totalAmount가 필요합니다.' } };
        }
        setCheckoutSession(oid, ta);
        return { status: 200, body: { ok: true } };
    } catch (e) {
        console.error('apiRegisterCheckoutSession', e);
        return { status: 500, body: { ok: false, error: 'server' } };
    }
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
async function apiPointsOnlyPayment(body) {
    try {
        const { orderId, orderTotal, pointsUsed, deviceId, referralCode } = body || {};
        const oid = String(orderId || '').trim();
        const ot = Math.floor(Number(orderTotal));
        const pu = Math.max(0, Math.floor(Number(pointsUsed) || 0));
        const did = String(deviceId || '').trim().slice(0, 128);
        if (!oid || !Number.isFinite(ot) || ot <= 0 || pu !== ot || !did) {
            return { status: 400, body: { error: '주문·포인트 정보가 올바르지 않습니다.' } };
        }
        const verified = getCheckoutSessionOrderTotal(oid);
        if (verified == null || verified !== ot) {
            return {
                status: 400,
                body: {
                    error: '결제 세션이 없거나 주문 금액이 일치하지 않습니다. 처음부터 다시 시도해 주세요.',
                },
            };
        }
        try {
            paymentPoints.spendForOrder({ deviceId: did, referralCode, points: pu });
        } catch (pe) {
            const code = pe && pe.code ? pe.code : '';
            const status = code === 'insufficient_points' ? 400 : 500;
            return { status, body: { error: pe.message || '포인트 차감에 실패했습니다.' } };
        }
        const paymentPayload = {
            paymentKey: `points_only_${oid}_${Date.now()}`,
            orderId: oid,
            totalAmount: ot,
            status: 'DONE',
            method: '포인트',
            approvedAt: new Date().toISOString(),
            pointsUsed: pu,
        };
        let finalize;
        try {
            finalize = await finalizeOrderPaidAndDispatch(oid, {
                paymentPayload,
                paymentId: paymentPayload.paymentKey,
                paymentMethod: 'points',
                pointsUsed: pu,
                deviceId: did,
            });
        } catch (fe) {
            console.error('[PING] 포인트 결제 후 주문 확정 실패', oid, fe);
            return {
                status: 500,
                body: {
                    error:
                        fe.message ||
                        '포인트는 차감되었으나 주문 확정에 실패했습니다. 고객센터로 문의해 주세요.',
                },
            };
        }
        clearCheckoutSession(oid);
        return {
            status: 200,
            body: {
                success: true,
                payment: paymentPayload,
                finalize,
            },
        };
    } catch (err) {
        console.error('apiPointsOnlyPayment', err);
        return { status: 500, body: { error: err.message || 'server' } };
    }
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
async function apiConfirmTossPayment(body) {
    try {
        const { paymentKey, orderId, amount, orderTotal, pointsUsed, deviceId, referralCode } =
            body || {};
        const oid = String(orderId || '').trim();
        const pkey = String(paymentKey || '').trim();
        const amt = Number(amount);
        const pu = Math.max(0, Math.floor(Number(pointsUsed) || 0));
        const did = String(deviceId || '').trim().slice(0, 128);
        if (!pkey || !oid || !Number.isFinite(amt) || amt <= 0) {
            return {
                status: 400,
                body: { error: 'paymentKey, orderId, amount가 필요합니다.' },
            };
        }

        if (pu > 0) {
            if (!did) {
                return { status: 400, body: { error: '포인트 사용 시 deviceId가 필요합니다.' } };
            }
            const verified = getCheckoutSessionOrderTotal(oid);
            const otBody = Math.floor(Number(orderTotal));
            if (verified == null || !Number.isFinite(verified)) {
                return {
                    status: 400,
                    body: {
                        error: '결제 세션이 없거나 만료되었습니다. 신청 화면에서 다시 진행해 주세요.',
                    },
                };
            }
            if (!Number.isFinite(otBody) || otBody !== verified) {
                return { status: 400, body: { error: '주문 금액이 서버 기록과 일치하지 않습니다.' } };
            }
            if (Math.floor(amt) + pu !== verified) {
                return {
                    status: 400,
                    body: { error: '카드 결제액과 포인트 합계가 주문 금액과 맞지 않습니다.' },
                };
            }
        }

        if (pingEnvTruthy('PING_TOSS_CONFIRM_MOCK')) {
            console.warn('[PING] PING_TOSS_CONFIRM_MOCK: Toss /v1/payments/confirm 미호출 — 목 승인 응답');
            try {
                if (pu > 0) {
                    paymentPoints.spendForOrder({ deviceId: did, referralCode, points: pu });
                }
            } catch (pe) {
                console.error('[PING] 목 승인 후 포인트 차감 실패', pe);
                return {
                    status: 500,
                    body: {
                        error: pe.message || '포인트 처리에 실패했습니다. 고객센터로 문의해 주세요.',
                    },
                };
            }
            const mockPayment = {
                paymentKey: pkey,
                orderId: oid,
                totalAmount: amt,
                status: 'DONE',
                method: '카드',
                approvedAt: new Date().toISOString(),
                mock: true,
                pointsUsed: pu || 0,
            };
            let finalize;
            try {
                finalize = await finalizeOrderPaidAndDispatch(oid, {
                    paymentPayload: mockPayment,
                    paymentId: pkey,
                    paymentMethod: 'card',
                    pointsUsed: pu,
                    deviceId: did,
                });
            } catch (fe) {
                console.error('[PING] 목 승인 후 주문 확정 실패', oid, fe);
                return {
                    status: 500,
                    body: {
                        error:
                            fe.message ||
                            '결제는 승인되었으나 주문 확정에 실패했습니다. 고객센터로 문의해 주세요.',
                    },
                };
            }
            clearCheckoutSession(oid);
            return {
                status: 200,
                body: {
                    success: true,
                    payment: mockPayment,
                    finalize,
                },
            };
        }

        const secret = getTossSecretKey();
        if (!secret) {
            return {
                status: 503,
                body: {
                    error:
                        'TOSS_PAYMENTS_SECRET_KEY가 없습니다. 가이드 샌드박스 키는 PING_USE_TOSS_DOCS_TEST_KEYS=1, 또는 PING_TOSS_CONFIRM_MOCK=1(목 승인)',
                },
            };
        }

        const auth = Buffer.from(`${secret}:`, 'utf8').toString('base64');
        const tossRes = await axios.post(
            'https://api.tosspayments.com/v1/payments/confirm',
            {
                paymentKey: pkey,
                orderId: oid,
                amount: amt,
            },
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        try {
            if (pu > 0) {
                paymentPoints.spendForOrder({ deviceId: did, referralCode, points: pu });
            }
        } catch (pe) {
            console.error('[PING] Toss 승인 성공 후 포인트 차감 실패 — 수동 정산 필요', oid, pe);
            return {
                status: 500,
                body: {
                    error: pe.message || '포인트 처리에 실패했습니다. 고객센터로 문의해 주세요.',
                },
            };
        }

        const payload = tossRes.data && typeof tossRes.data === 'object' ? tossRes.data : {};
        if (pu > 0) payload.pointsUsed = pu;

        let finalize;
        try {
            finalize = await finalizeOrderPaidAndDispatch(oid, {
                paymentPayload: payload,
                paymentId: String(payload.paymentKey || pkey).trim(),
                paymentMethod: 'card',
                pointsUsed: pu,
                deviceId: did,
            });
        } catch (fe) {
            console.error('[PING] Toss 승인 후 주문 확정 실패', oid, fe);
            return {
                status: 500,
                body: {
                    error:
                        fe.message ||
                        '결제는 승인되었으나 주문 확정에 실패했습니다. 고객센터로 문의해 주세요.',
                    toss: payload,
                },
            };
        }
        clearCheckoutSession(oid);
        return { status: 200, body: { success: true, payment: payload, finalize } };
    } catch (err) {
        const status = err.response?.status || 500;
        const data = err.response?.data;
        console.error('apiConfirmTossPayment', status, data || err.message);
        return {
            status: status >= 400 && status < 600 ? status : 500,
            body: {
                error: data?.message || err.message || '결제 승인에 실패했습니다.',
                code: data?.code,
                toss: data || null,
            },
        };
    }
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
const pingCashReceipt = require('./ping-cash-receipt');

/** `src/lib/ping-bank-transfer-checkout.ts` 와 동기 */
const PING_BANK_TRANSFER = {
    bankName: '토스뱅크',
    accountNumber: '1000-8536-9246',
    holder: '송지훈',
};

async function applyBankTransferOrderInFirestore(
    orderId,
    bankTransferAmount,
    pointsUsed,
    paymentPayload,
    cashReceiptType,
    cashReceiptNumber,
    cashReceiptVoluntary,
) {
    const { getPingFirestoreAdmin } = require('./ping-firebase-admin');
    const db = getPingFirestoreAdmin();
    const oid = String(orderId || '').trim();
    await db.collection('ping_orders').doc(oid).update({
        status: 'waiting_bank_transfer',
        paymentMethod: 'bank_transfer',
        bankTransferAmount: Math.max(0, Math.floor(Number(bankTransferAmount) || 0)),
        pointsUsed: Math.max(0, Math.floor(Number(pointsUsed) || 0)),
        bankAccount: {
            bankName: PING_BANK_TRANSFER.bankName,
            accountNumber: PING_BANK_TRANSFER.accountNumber,
            holder: PING_BANK_TRANSFER.holder,
        },
        cashReceiptType,
        cashReceiptNumber,
        cashReceiptVoluntary: !!cashReceiptVoluntary,
        cashReceiptStatus: 'pending',
        paymentData: paymentPayload,
        bankTransferRequestedAt: new Date(),
    });
}

async function apiBankTransferPayment(body) {
    try {
        const {
            orderId,
            orderTotal,
            pointsUsed,
            bankTransferAmount,
            deviceId,
            referralCode,
            cashReceiptType,
            cashReceiptNumber,
            cashReceiptVoluntary,
        } = body || {};
        const oid = String(orderId || '').trim();
        const ot = Math.floor(Number(orderTotal));
        const pu = Math.max(0, Math.floor(Number(pointsUsed) || 0));
        const bt = Math.floor(Number(bankTransferAmount) || 0);
        const did = String(deviceId || '').trim().slice(0, 128);
        if (!oid || !Number.isFinite(ot) || ot <= 0 || bt <= 0 || pu + bt !== ot) {
            return {
                status: 400,
                body: { error: '주문·입금 금액 정보가 올바르지 않습니다.' },
            };
        }
        const crt = String(cashReceiptType || '').trim();
        if (!pingCashReceipt.CASH_RECEIPT_TYPES.has(crt)) {
            return { status: 400, body: { error: '현금영수증 유형(소득공제/지출증빙)을 선택해 주세요.' } };
        }
        const crVoluntary = cashReceiptVoluntary === true || cashReceiptVoluntary === 'true';
        const crErr = pingCashReceipt.validateCashReceiptNumber(crt, cashReceiptNumber, crVoluntary);
        if (crErr) {
            return { status: 400, body: { error: crErr } };
        }
        const crNorm = pingCashReceipt.resolveCashReceiptNumber(crt, cashReceiptNumber, crVoluntary);
        const verified = getCheckoutSessionOrderTotal(oid);
        if (verified == null || verified !== ot) {
            return {
                status: 400,
                body: {
                    error: '결제 세션이 없거나 주문 금액이 일치하지 않습니다. 처음부터 다시 시도해 주세요.',
                },
            };
        }
        if (pu > 0) {
            if (!did) {
                return { status: 400, body: { error: '포인트 사용 시 deviceId가 필요합니다.' } };
            }
            try {
                paymentPoints.spendForOrder({ deviceId: did, referralCode, points: pu });
            } catch (pe) {
                const code = pe && pe.code ? pe.code : '';
                const status = code === 'insufficient_points' ? 400 : 500;
                return { status, body: { error: pe.message || '포인트 차감에 실패했습니다.' } };
            }
        }
        clearCheckoutSession(oid);
        const paymentKey = `bank_transfer_${oid}_${Date.now()}`;
        const paymentPayload = {
            paymentKey,
            orderId: oid,
            totalAmount: ot,
            bankTransferAmount: bt,
            pointsUsed: pu,
            cashReceiptType: crt,
            cashReceiptNumber: crNorm,
            cashReceiptVoluntary: crVoluntary,
            status: 'WAITING_FOR_DEPOSIT',
            method: '무통장입금',
            requestedAt: new Date().toISOString(),
        };
        try {
            await applyBankTransferOrderInFirestore(
                oid,
                bt,
                pu,
                paymentPayload,
                crt,
                crNorm,
                crVoluntary,
            );
        } catch (dbErr) {
            console.error('[PING] bank transfer Firestore update failed', oid, dbErr);
            return {
                status: 503,
                body: {
                    error:
                        '입금 안내는 접수되었으나 주문 상태 저장에 실패했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
                },
            };
        }
        return {
            status: 200,
            body: {
                success: true,
                payment: paymentPayload,
                cashReceiptType: crt,
                cashReceiptNumber: crNorm,
                cashReceiptVoluntary: crVoluntary,
            },
        };
    } catch (err) {
        console.error('apiBankTransferPayment', err);
        return { status: 500, body: { error: err.message || 'server' } };
    }
}

module.exports = {
    apiRegisterCheckoutSession,
    apiConfirmTossPayment,
    apiPointsOnlyPayment,
    apiBankTransferPayment,
    getCheckoutSessionOrderTotal,
    setCheckoutSession,
    clearCheckoutSession,
    getTossSecretKey,
    pingEnvTruthy,
};
