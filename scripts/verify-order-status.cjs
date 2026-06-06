#!/usr/bin/env node
'use strict';

/**
 * Phase 1 점검 — Firestore 주문 상태 (Admin SDK)
 * 사용: node scripts/verify-order-status.cjs <orderId> [amount]
 *
 * 필요: PING_FIREBASE_SERVICE_ACCOUNT_PATH 또는 GOOGLE_APPLICATION_CREDENTIALS
 *       또는 FIREBASE_SERVICE_ACCOUNT_JSON (ensure-ping-local-env)
 */
const { loadPingLocalEnv } = require('./load-local-env.js');
loadPingLocalEnv();

const { apiGetOrderPublicStatus } = require('../ping-order-public-api');

const oid = String(process.argv[2] || '').trim();
const amountArg = process.argv[3];
const amount =
  amountArg != null && amountArg !== '' && Number.isFinite(Number(amountArg))
    ? Math.floor(Number(amountArg))
    : null;

if (!oid) {
  console.error('Usage: node scripts/verify-order-status.cjs <orderId> [amount]');
  process.exit(1);
}

void (async () => {
  const r = await apiGetOrderPublicStatus(oid, amount);
  console.log(JSON.stringify({ httpStatus: r.status, ...r.body }, null, 2));

  if (r.status === 503 && r.body && r.body.error === 'no_admin_db') {
    console.error(
      '\nFirestore Admin 미설정 — .env에 PING_FIREBASE_SERVICE_ACCOUNT_PATH 또는 FIREBASE_SERVICE_ACCOUNT_JSON 필요',
    );
    process.exit(2);
  }
  if (r.status !== 200) process.exit(1);

  const st = String(r.body.status || '');
  const pm = String(r.body.paymentMethod || '');
  const sms = String(r.body.smsStatus || '');

  console.log('\n--- 해석 ---');
  if (st === 'waiting_bank_transfer' || pm === 'bank_transfer') {
    console.log('무통장 입금 대기 주문 (정상)');
  } else if (st === 'paid') {
    console.log('결제 완료');
    if (sms === 'sent' || sms === 'sending') {
      console.log('발송:', sms, '(Phase 1 finalize·sendSMSAutomation 반영됨)');
    } else if (!sms) {
      console.log('발송 상태 없음 — 서버 로그에서 sendSMSAutomation / dispatch 확인');
    } else {
      console.log('발송:', sms);
    }
  } else if (st === 'waiting_payment') {
    console.log('아직 waiting_payment — 무통장 API 미반영 또는 카드 승인 전');
  } else {
    console.log('status:', st || '(empty)');
  }
})();
