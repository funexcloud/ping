#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');

function installMocks(mocks) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    const base = path.basename(String(request)).replace(/\.js$/i, '');
    const dotted = `./${base}`;
    if (Object.prototype.hasOwnProperty.call(mocks, dotted)) return mocks[dotted];
    return originalLoad.call(this, request, parent, isMain);
  };
  return () => {
    Module._load = originalLoad;
  };
}

function compileModule(relativePath) {
  const filename = path.join(root, relativePath);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename);
  return loaded.exports;
}

const MOCKS = {
  axios: { post: async () => { throw new Error('toss_must_not_be_called'); } },
  './payment-points': { spendForOrder: () => { throw new Error('points_must_not_be_called'); } },
  './ping-order-finalize': {
    finalizeOrderPaidAndDispatch: async () => { throw new Error('finalize_must_not_be_called'); },
  },
  './ping-cash-receipt': {
    CASH_RECEIPT_TYPES: new Set(['income_deduction']),
    validateCashReceiptNumber: () => null,
    resolveCashReceiptNumber: () => '',
  },
  './ping-checkout-registry': {
    CheckoutRegistryError: class CheckoutRegistryError extends Error {},
    consumeCheckoutSession: async () => ({}),
    getCheckoutSessionOrderTotal: async () => 220,
    releaseCheckoutSession: async () => ({}),
    reserveCheckoutSession: async () => ({ amount: 220 }),
    registerCheckoutSession: async () => ({}),
  },
  './ping-firebase-admin': {
    getPingFirestoreAdmin: () => ({
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ status: 'waiting_payment', totalAmount: 220, count: 2 }),
          }),
          set: async () => { throw new Error('must_not_write_paid'); },
        }),
      }),
    }),
  },
  './ping-dispatch-send-from': { loadSendFromDisplay: () => ({ label: 'PING' }) },
  './ping-order-payment-alignment': {
    derivePaymentDispatchAlignment: () => ({
      paymentDispatchAligned: true,
      mismatchReason: null,
      refundEligible: false,
    }),
  },
  './sms-service': { sendSMSAutomation: async () => ({ success: true }) },
};

async function main() {
  const restore = installMocks(MOCKS);
  try {
    const toss = compileModule('ping-toss-checkout-api.js');
    const tampered = await toss.apiConfirmTossPayment({
      paymentKey: 'test-payment',
      orderId: 'ord_tamper',
      amount: 1,
      orderTotal: 220,
      pointsUsed: 0,
    });
    assert.equal(tampered.status, 400);
    assert.match(
      String(tampered.body.error || tampered.body.code || ''),
      /order_amount_mismatch/,
    );

    const matched = await toss.apiConfirmTossPayment({
      paymentKey: 'test-payment',
      orderId: 'ord_tamper',
      amount: 220,
      orderTotal: 220,
      pointsUsed: 0,
    });
    assert.notEqual(matched.body.code, 'order_amount_mismatch');
    assert.ok(matched.status === 503 || matched.status === 200 || matched.status === 400);

    const finalize = compileModule('ping-order-finalize.js');
    await assert.rejects(
      () => finalize.finalizeOrderPaidAndDispatch('ord_tamper', {
        paymentPayload: { paymentKey: 'pk', totalAmount: 1 },
        paymentId: 'pk',
        paymentMethod: 'card',
      }),
      (error) => error.message === 'order_amount_mismatch',
    );
  } finally {
    restore();
  }

  console.log('Checkout amount guard tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
