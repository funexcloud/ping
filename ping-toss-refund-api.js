'use strict';

const crypto = require('crypto');
const axios = require('axios');
const { getTossSecretKey, pingEnvTruthy } = require('./ping-toss-checkout-api');

/**
 * @param {{
 *   paymentKey: string,
 *   cancelReason: string,
 *   cancelAmount?: number,
 *   idempotencyKey?: string,
 * }} opts
 */
async function cancelTossPayment(opts) {
    const paymentKey = String(opts.paymentKey || '').trim();
    const cancelReason = String(opts.cancelReason || '발송 실패로 인한 환불').trim();
    if (!paymentKey) {
        throw new Error('paymentKey가 필요합니다.');
    }

    if (pingEnvTruthy('PING_TOSS_CONFIRM_MOCK') || paymentKey.startsWith('mock_')) {
        return {
            mock: true,
            paymentKey,
            status: 'CANCELED',
            cancelReason,
            canceledAt: new Date().toISOString(),
        };
    }

    const secret = getTossSecretKey();
    if (!secret) {
        throw new Error(
            'TOSS_PAYMENTS_SECRET_KEY가 없습니다. 환불 처리를 위해 서버 시크릿 키가 필요합니다.'
        );
    }

    const auth = Buffer.from(`${secret}:`, 'utf8').toString('base64');
    const idempotencyKey =
        String(opts.idempotencyKey || '').trim() ||
        crypto.createHash('sha256').update(`ping-refund:${paymentKey}`).digest('hex').slice(0, 32);

    const body = { cancelReason };
    const cancelAmount = Math.floor(Number(opts.cancelAmount));
    if (Number.isFinite(cancelAmount) && cancelAmount > 0) {
        body.cancelAmount = cancelAmount;
    }

    const res = await axios.post(
        `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
        body,
        {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
            },
        }
    );

    return res.data && typeof res.data === 'object' ? res.data : { paymentKey, status: 'CANCELED' };
}

module.exports = { cancelTossPayment };
