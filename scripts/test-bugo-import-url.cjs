#!/usr/bin/env node
'use strict';

/** 부고 URL 규칙 스모크 테스트 — `node scripts/test-bugo-import-url.cjs` */
const { isSupportedFuneralImportUrl } = require('../lib/bugo-import-url.cjs');

const cases = [
  { url: 'https://www.wooribugo4.com/page/funeral/view/12345', want: true },
  { url: 'https://www.wooribugo4.com/page/funeral/view.php?id=1', want: true },
  {
    url: 'https://modubugo.com/bugo/550e8400-e29b-41d4-a716-446655440000',
    want: true,
  },
  { url: 'https://example.com/obituary/1', want: false },
];

let failed = 0;
for (const c of cases) {
  const got = isSupportedFuneralImportUrl(c.url);
  if (got !== c.want) {
    failed += 1;
    console.error('FAIL', c.url, 'expected', c.want, 'got', got);
  } else {
    console.log('ok', c.url);
  }
}

if (failed) process.exit(1);
console.log('All URL rule checks passed.');

const { extractModubugoUuidFromPathname } = require('../lib/bugo-import-url.cjs');
const uuid = extractModubugoUuidFromPathname(
  '/bugo/550e8400-e29b-41d4-a716-446655440000',
);
if (uuid !== '550e8400-e29b-41d4-a716-446655440000') {
  console.error('FAIL modubugo uuid extract', uuid);
  process.exit(1);
}
console.log('ok modubugo uuid extract');
