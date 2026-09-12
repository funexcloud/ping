#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadTypeScriptModule(relativePath) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(output, filename);
  return loaded.exports;
}

function compileTypeScriptModule(relativePath, mocks) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
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

function assertIncludes(source, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(source.includes(fragment), `${label}: ${fragment} 계약이 없습니다.`);
  }
}

const pricing = loadTypeScriptModule('src/lib/ping-bulk-pricing.ts');
assert.deepEqual(pricing.computeBulkOrderTotals(3), {
  recipientCount: 3,
  baseFee: 0,
  sendCost: 330,
  total: 330,
});
assert.equal(pricing.computeBulkOrderTotals(0).total, 0);

const recipients = loadTypeScriptModule('src/lib/ping-bulk-recipients.ts');
assert.equal(recipients.normalizeKoreanPhoneForSms('+82 10-1234-5678'), '01012345678');
assert.equal(recipients.normalizeKoreanPhoneForSms('1234'), null);
const vcardRows = recipients.parseVcardTextToRows(
  [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:홍길동',
    'TEL;TYPE=CELL:010-1234-5678',
    'TEL;TYPE=CELL:+82 10-1234-5678',
    'END:VCARD',
  ].join('\r\n'),
);
assert.deepEqual(vcardRows, [{ phone: '01012345678', label: '홍길동 · 01012345678' }]);
const csv = recipients.buildBulkAddressbookCsvContent(vcardRows);
assert.ok(csv.includes('홍길동'));
assert.ok(csv.includes('01012345678'));

const prep = read('src/lib/ping-bulk-checkout-prep.ts');
assert.doesNotMatch(prep, /amount:\s*0[,\n]/, '0원 checkout placeholder가 남아 있습니다.');
assert.doesNotMatch(prep, /recipientCount:\s*0[}\n,]/, '0명 checkout placeholder가 남아 있습니다.');
assertIncludes(
  prep,
  [
    'ping_bulk_identity_ok',
    'ping_bulk_recipients',
    'normalizeBulkRecipient',
    'fetch("/api/orders/create"',
    'checkoutCapability',
    'recipientCount',
    'checkoutSecret:',
  ],
  'checkout prep',
);
assert.doesNotMatch(prep, /\bsetDoc\s*\(/, 'checkout prep must not write Firestore from the client');
assert.doesNotMatch(prep, /\buploadBytes\s*\(/, 'checkout prep must not upload Storage from the client');

const checkoutApi = read('ping-toss-checkout-api.js');
const checkoutRegistry = read('ping-checkout-registry.js');
assertIncludes(
  checkoutApi,
  [
    'getCheckoutSessionOrderTotal',
    'finalizeOrderPaidAndDispatch',
    'order_amount_mismatch',
  ],
  'payment backend',
);

const registerRoute = read('src/app/api/checkout/register-session/route.ts');
assertIncludes(
  registerRoute,
  [
    'enforceSpikeProtection',
    'enforcePublicRequestSecurity',
    'apiRegisterCheckoutSession(body)',
  ],
  'checkout register route',
);
assertIncludes(
  checkoutRegistry,
  [
    'checkoutSecretMatches',
    "status: 'ACTIVE'",
    "status: 'CONSUMED'",
    'recipientCount',
  ],
  'checkout registry',
);

const finalize = read('ping-order-finalize.js');
assertIncludes(
  finalize,
  [
    "status === 'paid'",
    "smsStatus === 'sent' || smsStatus === 'sending'",
    "reason: 'already_dispatched'",
    'sendSMSAutomation',
  ],
  'payment finalize',
);

const dispatch = read('ping-dispatch/dispatchPaidOrder.js');
assertIncludes(
  dispatch,
  [
    "lock.reason === 'already_dispatching'",
    'targetCount',
    'sentCount',
    'failedCount',
    'failedMessageList',
  ],
  'SMS dispatch',
);

async function testCheckoutPrepIntegration() {
  const originalWindow = global.window;
  const originalSessionStorage = global.sessionStorage;
  const originalFetch = global.fetch;
  const values = new Map([
    ['ping_bulk_identity_ok', '1'],
    [
      'ping_bulk_recipients',
      JSON.stringify([
        { phone: '01011112222', label: '첫째' },
        { phone: '01033334444', label: '둘째' },
      ]),
    ],
    [
      'ping_checkout_session',
      JSON.stringify({ orderId: 'PLACEHOLDER', amount: 0, recipientCount: 0 }),
    ],
  ]);
  const sessionStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  const events = [];
  const sourceUrl = 'https://example.com/obituary/123';

  global.window = { location: { href: '' } };
  global.sessionStorage = sessionStorage;
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    if (url === '/api/orders/create') {
      events.push('orders-create');
      assert.equal(body.applicant.name, '신청자');
      assert.equal(body.applicant.phone, '01099998888');
      assert.equal(body.source.sourceObituaryUrl, sourceUrl);
      assert.ok(String(body.clientRequestId).length >= 16);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          orderId: 'ORDER-1',
          amount: 220,
          recipientCount: 2,
          rawRecipientCount: 2,
          droppedRecipientCount: 0,
          checkoutCapability: 'a'.repeat(64),
        }),
      };
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  try {
    const prepModule = compileTypeScriptModule('src/lib/ping-bulk-checkout-prep.ts', {
      '@/lib/ping-bulk-recipients': recipients,
      '@/lib/ping-bulk-sms': {},
      '@/lib/ping-bulk-session': {
        hydratePingFromIndexFromUser: () => {},
        loadPingBulkFlags: () => ({ bulkFlowKind: 'obituary' }),
        loadPingFromIndexSnapshot: () => ({
          name: '신청자',
          phone: '01099998888',
          email: 'sender@example.com',
          obituaryPageUrl: sourceUrl,
          bulkSmsMessageDraft: `부고 안내 ${sourceUrl}`,
          bulkSmsTitle: '부고',
          smsTemplateId: '1',
        }),
      },
      '@/lib/ping-member-welcome-bonus': {
        markCheckoutWelcomePending: () => {},
        readMemberIdFromSession: () => null,
      },
    });

    const checkoutSession = await prepModule.prepareBulkCheckoutAfterIdentity();
    assert.deepEqual(events, ['orders-create']);
    assert.equal(checkoutSession.orderId, 'ORDER-1');
    assert.equal(checkoutSession.amount, 220);
    assert.equal(checkoutSession.recipientCount, 2);
    assert.ok(String(checkoutSession.checkoutSecret).length >= 32);
    assert.deepEqual(JSON.parse(values.get('ping_checkout_session')), checkoutSession);

    values.delete('ping_checkout_session');
    values.set('ping_bulk_recipients', '[]');
    await assert.rejects(
      () => prepModule.prepareBulkCheckoutAfterIdentity(),
      /주소록 정보가 없습니다/,
    );
  } finally {
    global.window = originalWindow;
    global.sessionStorage = originalSessionStorage;
    global.fetch = originalFetch;
  }
}

testCheckoutPrepIntegration()
  .then(() => console.log('Backend stabilization regression checks passed.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
