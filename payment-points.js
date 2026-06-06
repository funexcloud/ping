/**
 * 결제 시 포인트 차감: 참여 적립(디바이스) 우선, 부족분은 추천 코드 잔액에서.
 * 실서비스에서는 동일 사용자 기준으로 DB 트랜잭션 처리 권장.
 */
const benefitsApi = require('./benefits-api');
const referralApi = require('./referral-api');

function normalizeReferralCode(v) {
    return String(v || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 32);
}

/**
 * @param {{ deviceId: string, referralCode?: string, points: number }} opts
 * @returns {{ engage: number, referral: number }}
 */
function spendForOrder(opts) {
    const need = Math.max(0, Math.floor(Number(opts.points) || 0));
    if (need === 0) return { engage: 0, referral: 0 };
    const did = String(opts.deviceId || '').trim().slice(0, 128);
    if (!did) {
        const err = new Error('deviceId가 필요합니다.');
        err.code = 'bad_request';
        throw err;
    }

    const e1 = benefitsApi.deductEngagePoints(did, need);
    let left = need - e1;
    if (left <= 0) {
        return { engage: e1, referral: 0 };
    }

    const code = normalizeReferralCode(opts.referralCode);
    const r1 = code.length >= 4 ? referralApi.deductReferralPoints(code, left) : 0;
    left -= r1;

    if (left > 0) {
        benefitsApi.creditEngagePoints(did, e1);
        if (r1 > 0 && code.length >= 4) referralApi.creditReferralPoints(code, r1);
        const err = new Error('사용 가능한 포인트가 부족합니다.');
        err.code = 'insufficient_points';
        throw err;
    }

    return { engage: e1, referral: r1 };
}

/**
 * 환불 시 포인트 복원 — 차감 breakdown 이 없으면 engage 에 전액 복원
 * @param {{ deviceId?: string, referralCode?: string, points: number, engage?: number, referral?: number }} opts
 */
function refundForOrder(opts) {
    const total = Math.max(0, Math.floor(Number(opts.points) || 0));
    if (total === 0) return { engage: 0, referral: 0 };

    const engage = Math.max(0, Math.floor(Number(opts.engage) || 0));
    const referral = Math.max(0, Math.floor(Number(opts.referral) || 0));
    const did = String(opts.deviceId || '').trim().slice(0, 128);
    const code = normalizeReferralCode(opts.referralCode);

    if (engage > 0 || referral > 0) {
        if (engage > 0 && did) benefitsApi.creditEngagePoints(did, engage);
        if (referral > 0 && code.length >= 4) referralApi.creditReferralPoints(code, referral);
        return { engage, referral };
    }

    if (!did) {
        const err = new Error('포인트 환불에 deviceId가 필요합니다.');
        err.code = 'device_id_required';
        throw err;
    }
    benefitsApi.creditEngagePoints(did, total);
    return { engage: total, referral: 0 };
}

module.exports = {
    spendForOrder,
    refundForOrder,
    normalizeReferralCode,
};
