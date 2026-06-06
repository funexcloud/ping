#!/usr/bin/env node
'use strict';

/**
 * Phase 1 카드(mock) 확정 + 발송 트리거 스모크
 * 사용: node scripts/verify-phase1-mock-card.cjs <orderId> <orderTotal>
 *
 * 1) checkout-sessions.local.json 에 세션 등록
 * 2) PING_TOSS_CONFIRM_MOCK=1 로 confirm 호출
 * 3) verify-order-status 로 paid / smsStatus 확인
 */
require('../scripts/load-local-env.js');

const pingToss = require('../ping-toss-checkout-api');
const { apiGetOrderPublicStatus } = require('../ping-order-public-api');

const oid = String(process.argv[2] || '').trim();
const total = Math.floor(Number(process.argv[3]));

if (!oid || !Number.isFinite(total) || total <= 0) {
  console.error('Usage: node scripts/verify-phase1-mock-card.cjs <orderId> <orderTotal>');
  process.exit(1);
}

process.env.PING_TOSS_CONFIRM_MOCK = '1';

void (async () => {
  pingToss.setCheckoutSession(oid, total);
  console.log('checkout session registered', oid, total);

  const confirm = await pingToss.apiConfirmTossPayment({
    paymentKey: `mock_verify_${oid}`,
    orderId: oid,
    amount: total,
    orderTotal: total,
    pointsUsed: 0,
    deviceId: '',
    referralCode: '',
  });

  console.log('confirm', JSON.stringify(confirm, null, 2));
  if (confirm.status !== 200) process.exit(1);

  const fin = confirm.body && confirm.body.finalize;
  if (fin && fin.dispatch && !fin.dispatch.ok) {
    console.warn('WARN: paid 되었을 수 있으나 dispatch 실패:', fin.dispatch.error);
  }

  const st = await apiGetOrderPublicStatus(oid, total);
  console.log('status after', JSON.stringify(st, null, 2));
})();
