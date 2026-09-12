#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadTypeScript(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(output, filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

function loadCommonJs(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(fs.readFileSync(filename, 'utf8'), filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

class FakeSnapshot {
  constructor(value) {
    this.value = value;
    this.exists = value !== undefined;
  }
  data() {
    return this.value;
  }
}

class FakeFirestore {
  constructor() {
    this.rows = new Map();
    this.failRegistryFinalize = false;
  }
  collection(name) {
    return {
      doc: (id) => ({ collection: name, id, key: `${name}/${id}` }),
    };
  }
  async runTransaction(callback) {
    const writes = [];
    const tx = {
      get: async (ref) => new FakeSnapshot(this.rows.get(ref.key)),
      set: (ref, value, options) => writes.push({ type: 'set', ref, value, options }),
      update: (ref, value) => writes.push({ type: 'update', ref, value }),
    };
    const result = await callback(tx);
    if (
      this.failRegistryFinalize &&
      writes.some((write) => write.ref.collection === 'ping_checkout_sessions')
    ) {
      this.failRegistryFinalize = false;
      throw Object.assign(new Error('forced_finalize_failure'), { code: 'forced_finalize_failure' });
    }
    for (const write of writes) {
      const previous = this.rows.get(write.ref.key) || {};
      if (write.type === 'update' || write.options?.merge) {
        this.rows.set(write.ref.key, { ...previous, ...write.value });
      } else {
        this.rows.set(write.ref.key, { ...write.value });
      }
    }
    return result;
  }
  row(collection, id) {
    return this.rows.get(`${collection}/${id}`);
  }
}

const sms = loadTypeScript('src/lib/ping-bulk-sms.ts');
const pricing = loadTypeScript('src/lib/ping-bulk-pricing.ts');
const recipientsModule = loadTypeScript('src/lib/ping-bulk-recipients.ts');
const domain = loadTypeScript('src/lib/ping-server-order-domain.ts', {
  '@/lib/ping-bulk-sms': sms,
  '@/lib/ping-bulk-pricing': pricing,
});
const registry = require('../ping-checkout-registry');
const store = require('../lib/ping-server-order-store.cjs');

function baseRequest(overrides = {}) {
  return {
    recipients: [
      { name: '첫째', phone: '010-1111-2222', label: '첫째' },
      { name: '중복', phone: '+82 10 1111 2222', label: '중복' },
      { name: '둘째', phone: '01033334444', label: '둘째' },
      { name: '무효', phone: '1234', label: '무효' },
    ],
    applicant: { name: '신청자', phone: '010-9999-8888', email: 'sender@example.com' },
    source: { sourceObituaryUrl: 'https://example.com/obituary/123', safeLinkRequested: true },
    message: { title: '부고', body: '부고 안내\n{{LINK}}', templateId: '1' },
    flowType: 'obituary',
    clientRequestId: 'phase2-test-request-0001',
    ...overrides,
  };
}

async function main() {
  const checkoutPrepSource = fs.readFileSync(
    path.join(root, 'src/lib/ping-bulk-checkout-prep.ts'),
    'utf8',
  );
  assert.ok(checkoutPrepSource.includes('fetch("/api/orders/create"'));
  assert.ok(!/\bsetDoc\s*\(/.test(checkoutPrepSource));
  assert.ok(!/\buploadBytes\s*\(/.test(checkoutPrepSource));
  assert.ok(!checkoutPrepSource.includes('serverOrderCreateEnabled'));
  const configSource = fs.readFileSync(
    path.join(root, 'src/lib/ping-inject-config-scripts.ts'),
    'utf8',
  );
  assert.ok(configSource.includes('PING_SERVER_ORDER_CREATE'));

  const prepared = domain.prepareServerOrderRequest(baseRequest());
  assert.equal(prepared.recipientCount, 2);
  assert.equal(prepared.rawRecipientCount, 4);
  assert.equal(prepared.droppedRecipientCount, 2);
  assert.equal(prepared.totalAmount, 220);
  assert.equal(prepared.sourceObituaryUrl, 'https://example.com/obituary/123');
  assert.equal(prepared.deliveryUrl, prepared.sourceObituaryUrl);
  assert.ok(prepared.messageBody.includes(prepared.sourceObituaryUrl));
  assert.ok(!prepared.messageBody.includes('{{LINK}}'));
  assert.throws(
    () => domain.prepareServerOrderRequest(baseRequest({ recipients: [] })),
    (error) => error.code === 'NO_VALID_RECIPIENT',
  );
  assert.throws(
    () => domain.prepareServerOrderRequest(baseRequest({ totalAmount: 1 })),
    (error) => error.code === 'UNTRUSTED_CANONICAL_FIELD',
  );
  assert.throws(
    () => domain.prepareServerOrderRequest(baseRequest({ source: { sourceObituaryUrl: 'http://example.com/x' } })),
    (error) => error.code === 'INVALID_SOURCE_URL',
  );

  // Option A/B parity: client contact engine이 이미 정규화·중복 제거한 동일 fixture 기준.
  const parityRecipients = [
    { phone: '01011112222', label: '첫째', name: '첫째' },
    { phone: '01033334444', label: '둘째', name: '둘째' },
  ];
  const parityPrepared = domain.prepareServerOrderRequest(
    baseRequest({ recipients: parityRecipients, clientRequestId: 'phase2-parity-request-01' }),
  );
  const optionAPrice = pricing.computeBulkOrderTotals(parityRecipients.length);
  assert.equal(parityPrepared.recipientCount, optionAPrice.recipientCount);
  assert.equal(parityPrepared.totalAmount, optionAPrice.total);
  assert.equal(
    parityPrepared.messageBody,
    sms.resolveBulkSmsOrderBody({
      draft: '부고 안내\n{{LINK}}',
      templateId: '1',
      obituaryPageUrl: 'https://example.com/obituary/123',
      isThankYou: false,
    }),
  );
  assert.equal(
    recipientsModule.buildBulkAddressbookCsvContent(parityPrepared.recipients),
    recipientsModule.buildBulkAddressbookCsvContent(parityRecipients),
  );

  const db = new FakeFirestore();
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(domain.canonicalServerOrderPayload(prepared)))
    .digest('hex');
  const idempotencyHash = crypto.createHash('sha256').update(prepared.clientRequestId).digest('hex');
  const checkoutSecret = 'c'.repeat(64);
  const checkoutSecretHash = registry.hashCheckoutSecret(checkoutSecret);
  const checkoutExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  let uploadCount = 0;
  const createInput = {
    prepared,
    payloadHash,
    idempotencyHash,
    checkoutSecretHash,
    checkoutExpiresAt,
    csvBuffer: Buffer.from('csv'),
  };
  const result = await store.createServerOrder(createInput, {
    db,
    attemptId: 'attempt-success',
    uploadArtifact: async (orderId, attemptId, fileName) => {
      uploadCount += 1;
      return {
        storagePath: `orders/${orderId}/preparations/${attemptId}/${fileName}`,
        delete: async () => {},
      };
    },
  });
  assert.equal(result.totalAmount, 220);
  assert.equal(result.recipientCount, 2);
  assert.equal(uploadCount, 1);
  const order = db.row('ping_orders', result.orderId);
  assert.equal(order.status, 'waiting_payment');
  assert.equal(order.preparationStatus, 'READY_FOR_PAYMENT');
  assert.equal(order.sourceObituaryUrl, prepared.sourceObituaryUrl);
  assert.equal(order.deliveryUrl, prepared.sourceObituaryUrl);
  assert.equal(order.obituaryOriginalUrl, prepared.sourceObituaryUrl);
  assert.equal(order.obituaryPageUrl, prepared.sourceObituaryUrl);
  assert.equal(order.safeLinkUrl, null);
  assert.equal(order.message, prepared.messageBody);
  const registryRow = db.row('ping_checkout_sessions', result.orderId);
  assert.equal(registryRow.amount, 220);
  assert.equal(registryRow.recipientCount, 2);
  assert.equal(registryRow.status, 'ACTIVE');

  const replay = await store.createServerOrder(createInput, {
    db,
    attemptId: 'attempt-replay',
    uploadArtifact: async () => {
      uploadCount += 1;
      throw new Error('must_not_upload');
    },
  });
  assert.equal(replay.reused, true);
  assert.equal(replay.orderId, result.orderId);
  assert.equal(uploadCount, 1);
  await assert.rejects(
    () => store.createServerOrder({ ...createInput, payloadHash: 'd'.repeat(64) }, { db }),
    (error) => error.code === 'idempotency_payload_conflict',
  );

  const validated = await registry.getCheckoutSession(result.orderId, checkoutSecret, { db });
  assert.equal(validated.amount, 220);
  await assert.rejects(
    () => registry.getCheckoutSession(result.orderId, 'x'.repeat(64), { db }),
    (error) => error.code === 'checkout_session_invalid',
  );
  const reservationKey = 'toss:test-payment-phase2';
  const reserved = await registry.reserveCheckoutSession(result.orderId, checkoutSecret, reservationKey, { db });
  assert.equal(reserved.alreadyReserved, false);
  const sameReservation = await registry.reserveCheckoutSession(result.orderId, checkoutSecret, reservationKey, { db });
  assert.equal(sameReservation.alreadyReserved, true);
  await assert.rejects(
    () => registry.reserveCheckoutSession(result.orderId, checkoutSecret, 'toss:concurrent-payment', { db }),
    (error) => error.code === 'checkout_session_in_progress',
  );
  const consumed = await registry.consumeCheckoutSession(result.orderId, checkoutSecret, { db, reservationKey });
  assert.equal(consumed.alreadyConsumed, false);
  const consumedAgain = await registry.consumeCheckoutSession(result.orderId, checkoutSecret, { db });
  assert.equal(consumedAgain.alreadyConsumed, true);
  assert.equal(await registry.getCheckoutSessionOrderTotal(result.orderId, checkoutSecret, { db }), null);

  const expiredDb = new FakeFirestore();
  await registry.registerCheckoutSession(
    { orderId: 'EXPIRED-ORDER', totalAmount: 110, recipientCount: 1, checkoutSecret },
    { db: expiredDb, now: 1_000 },
  );
  await assert.rejects(
    () => registry.getCheckoutSession('EXPIRED-ORDER', checkoutSecret, {
      db: expiredDb,
      now: 1_000 + 73 * 60 * 60 * 1000,
    }),
    (error) => error.code === 'checkout_session_expired',
  );

  const cleanupDb = new FakeFirestore();
  cleanupDb.failRegistryFinalize = true;
  const cleanupPrepared = domain.prepareServerOrderRequest(
    baseRequest({ clientRequestId: 'phase2-cleanup-request-1' }),
  );
  const cleanupInput = {
    ...createInput,
    prepared: cleanupPrepared,
    idempotencyHash: crypto.createHash('sha256').update(cleanupPrepared.clientRequestId).digest('hex'),
    payloadHash: crypto
      .createHash('sha256')
      .update(JSON.stringify(domain.canonicalServerOrderPayload(cleanupPrepared)))
      .digest('hex'),
  };
  let artifactDeleted = false;
  await assert.rejects(() => store.createServerOrder(cleanupInput, {
    db: cleanupDb,
    attemptId: 'attempt-cleanup',
    uploadArtifact: async () => ({
      storagePath: 'orders/cleanup/preparations/attempt-cleanup/file.csv',
      delete: async () => { artifactDeleted = true; },
    }),
  }));
  assert.equal(artifactDeleted, true);
  const cleanupOrderId = store.orderIdForIdempotencyHash(cleanupInput.idempotencyHash);
  assert.equal(cleanupDb.row('ping_orders', cleanupOrderId).preparationStatus, 'FAILED_PREPARATION');
  assert.equal(cleanupDb.row('ping_checkout_sessions', cleanupOrderId), undefined);

  // Toss confirm regression: server amount mismatch 차단, 성공 후 registry consume, replay 거부.
  let checkoutActive = true;
  let finalized = 0;
  let consumedCount = 0;
  let reservationActive = false;
  let registerCount = 0;
  class MockRegistryError extends Error {}
  const tossApi = loadCommonJs('ping-toss-checkout-api.js', {
    './payment-points': { spendForOrder: () => {} },
    './ping-order-finalize': {
      finalizeOrderPaidAndDispatch: async () => {
        finalized += 1;
        return { paid: true, dispatch: { ok: true } };
      },
    },
    './ping-checkout-registry': {
      CheckoutRegistryError: MockRegistryError,
      registerCheckoutSession: async () => {
        registerCount += 1;
        return { expiresAt: Date.now() + 60_000 };
      },
      getCheckoutSessionOrderTotal: async () => (checkoutActive ? 220 : null),
      reserveCheckoutSession: async () => {
        if (!checkoutActive) throw new MockRegistryError('consumed');
        reservationActive = true;
        return { amount: 220 };
      },
      releaseCheckoutSession: async () => {
        reservationActive = false;
        return { released: true };
      },
      consumeCheckoutSession: async () => {
        checkoutActive = false;
        reservationActive = false;
        consumedCount += 1;
        return { consumed: true, alreadyConsumed: false };
      },
    },
    './ping-firebase-admin': {
      getPingFirestoreAdmin: () => ({
        collection: () => ({
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ status: 'waiting_payment', totalAmount: 220, count: 2 }),
            }),
          }),
        }),
      }),
    },
    './ping-cash-receipt': {
      validateCashReceiptNumber: () => null,
      resolveCashReceiptNumber: () => '',
    },
  });
  const previousMock = process.env.PING_TOSS_CONFIRM_MOCK;
  process.env.PING_TOSS_CONFIRM_MOCK = '1';
  try {
    const invalidRegistration = await tossApi.apiRegisterCheckoutSession({
      orderId: result.orderId,
      totalAmount: 110,
      recipientCount: 2,
      checkoutSecret,
    });
    assert.equal(invalidRegistration.status, 409);
    assert.equal(invalidRegistration.body.error, 'checkout_order_mismatch');
    assert.equal(registerCount, 0);
    const validRegistration = await tossApi.apiRegisterCheckoutSession({
      orderId: result.orderId,
      totalAmount: 220,
      recipientCount: 2,
      checkoutSecret,
    });
    assert.equal(validRegistration.status, 200);
    assert.equal(registerCount, 1);

    const tampered = await tossApi.apiConfirmTossPayment({
      paymentKey: 'test-payment',
      orderId: result.orderId,
      amount: 1,
      orderTotal: 220,
      pointsUsed: 0,
      checkoutSecret,
    });
    assert.equal(tampered.status, 400);
    assert.equal(tampered.body.error, 'order_amount_mismatch');
    assert.equal(reservationActive, false);
    assert.equal(finalized, 0);

    const confirmed = await tossApi.apiConfirmTossPayment({
      paymentKey: 'test-payment',
      orderId: result.orderId,
      amount: 220,
      orderTotal: 220,
      pointsUsed: 0,
      checkoutSecret,
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.success, true);
    assert.equal(finalized, 1);
    assert.equal(consumedCount, 1);

    const replayConfirm = await tossApi.apiConfirmTossPayment({
      paymentKey: 'test-payment',
      orderId: result.orderId,
      amount: 220,
      orderTotal: 220,
      pointsUsed: 0,
      checkoutSecret,
    });
    assert.equal(replayConfirm.status, 400);
    assert.equal(replayConfirm.body.error, 'checkout_session_invalid');
    assert.equal(finalized, 1);
  } finally {
    if (previousMock == null) delete process.env.PING_TOSS_CONFIRM_MOCK;
    else process.env.PING_TOSS_CONFIRM_MOCK = previousMock;
  }

  console.log('Server order Phase 2 tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
