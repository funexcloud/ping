'use strict';

const crypto = require('crypto');
const { getPingFirestoreAdmin } = require('./ping-firebase-admin');

const CASH_RECEIPT_TYPES = new Set(['income_deduction', 'expense_proof']);

/** 현금영수증 자진발급 식별번호 */
const VOLUNTARY_NUMBER = {
    income_deduction: '0100001234',
    expense_proof: '0000000000',
};

function resolveCashReceiptNumber(type, raw, voluntary) {
    if (voluntary) return VOLUNTARY_NUMBER[type] || '';
    return normalizeCashReceiptNumber(type, raw);
}

function normalizeDigits(raw) {
    return String(raw || '').replace(/\D/g, '');
}

function normalizeCashReceiptNumber(type, raw) {
    let d = normalizeDigits(raw);
    if (type === 'income_deduction') {
        if (d.startsWith('82') && d.length >= 10) d = '0' + d.slice(2);
        return d;
    }
    return d;
}

function validateCashReceiptNumber(type, raw, voluntary) {
    if (voluntary) return null;
    const n = normalizeCashReceiptNumber(type, raw);
    if (type === 'income_deduction') {
        if (!/^01[016789]\d{7,8}$/.test(n)) {
            return '소득공제용은 휴대폰 번호(010 등)를 입력해 주세요.';
        }
        return null;
    }
    if (!/^\d{10}$/.test(n)) {
        return '지출증빙용은 사업자등록번호 10자리를 입력해 주세요.';
    }
    return null;
}

function buildApprovalNo(orderId) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tail = crypto.createHash('sha256').update(String(orderId)).digest('hex').slice(0, 8).toUpperCase();
    return `PING-${day}-${tail}`;
}

/**
 * 발송 완료(smsStatus sent) 후 사용자 자가 발급.
 * @param {string} orderId
 * @param {{ amount?: number }} opts
 */
async function issueCashReceiptForOrder(orderId, opts = {}) {
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
                    '서버 Firestore Admin을 사용할 수 없습니다. PING_FIREBASE_SERVICE_ACCOUNT_PATH 또는 GOOGLE_APPLICATION_CREDENTIALS를 설정해 주세요.',
            },
        };
    }

    const ref = db.collection('ping_orders').doc(oid);
    const snap = await ref.get();
    if (!snap.exists) {
        return { status: 404, body: { ok: false, error: '주문을 찾을 수 없습니다.' } };
    }

    const d = snap.data() || {};
    const wantAmt = opts.amount != null ? Math.floor(Number(opts.amount)) : null;
    const dbAmt = Math.floor(Number(d.totalAmount));
    if (wantAmt != null && Number.isFinite(wantAmt) && wantAmt !== dbAmt) {
        return { status: 400, body: { ok: false, error: '주문 금액이 일치하지 않습니다.' } };
    }

    if (d.paymentMethod !== 'bank_transfer') {
        return { status: 400, body: { ok: false, error: '무통장 입금 주문만 현금영수증을 발급할 수 있습니다.' } };
    }

    if (d.status !== 'paid') {
        return { status: 400, body: { ok: false, error: '입금 확인·결제 완료 후에 발급할 수 있습니다.' } };
    }

    if (d.smsStatus !== 'sent') {
        return {
            status: 400,
            body: { ok: false, error: '발송이 완료된 뒤에 현금영수증을 발급할 수 있습니다.' },
        };
    }

    const type = String(d.cashReceiptType || '').trim();
    const number = String(d.cashReceiptNumber || '').trim();
    if (!CASH_RECEIPT_TYPES.has(type) || !number) {
        return {
            status: 400,
            body: { ok: false, error: '현금영수증 유형·번호가 주문에 없습니다. 체크아웃에서 다시 신청해 주세요.' },
        };
    }

    const voluntary =
        d.cashReceiptVoluntary === true ||
        number === VOLUNTARY_NUMBER.income_deduction ||
        number === VOLUNTARY_NUMBER.expense_proof;
    const vErr = validateCashReceiptNumber(type, number, voluntary);
    if (vErr) {
        return { status: 400, body: { ok: false, error: vErr } };
    }

    if (d.cashReceiptStatus === 'issued') {
        return {
            status: 200,
            body: {
                ok: true,
                alreadyIssued: true,
                approvalNo: d.cashReceiptApprovalNo || null,
                cashReceiptType: type,
                cashReceiptNumber: normalizeCashReceiptNumber(type, number),
            },
        };
    }

    const approvalNo = buildApprovalNo(oid);
    const issuedAt = new Date();
    const tradeUsage = type === 'income_deduction' ? '소득공제' : '지출증빙';
    const issueAmount = Number.isFinite(dbAmt) ? dbAmt : Math.floor(Number(d.bankTransferAmount) || 0);

    await ref.set(
        {
            cashReceiptStatus: 'issued',
            cashReceiptApprovalNo: approvalNo,
            cashReceiptIssuedAt: issuedAt,
            cashReceiptTradeUsage: tradeUsage,
            cashReceiptIssueAmount: issueAmount,
        },
        { merge: true }
    );

    return {
        status: 200,
        body: {
            ok: true,
            approvalNo,
            cashReceiptType: type,
            cashReceiptNumber: normalizeCashReceiptNumber(type, number),
            tradeUsage,
            amount: issueAmount,
            issuedAt: issuedAt.toISOString(),
        },
    };
}

module.exports = {
    issueCashReceiptForOrder,
    validateCashReceiptNumber,
    normalizeCashReceiptNumber,
    resolveCashReceiptNumber,
    VOLUNTARY_NUMBER,
    CASH_RECEIPT_TYPES,
};
