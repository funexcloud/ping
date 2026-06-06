#!/usr/bin/env node
'use strict';

/**
 * 부고 HTML 파싱 회귀 테스트 — UI 변경과 무관하게 파서 출력을 고정한다.
 * `node scripts/test-bugo-import-parse.cjs`
 */
const { parseFuneralPageHtml } = require('../lib/bugo-funeral-parse.cjs');
const { buildBulkSmsFromFuneralData } = require('../bugo-import.js');

const FIXTURE_HTML = `<!DOCTYPE html><html><body>
<ul class="item-wrap name-wrap">
  <li><p class="title">고인</p><b class="name">故 홍길동</b></li>
  <li><p class="title">상주</p><b class="name">홍철수</b></li>
</ul>
<ul class="item-wrap date-wrap">
  <li><p class="title">발인일</p><p class="date">2026년 5월 30일(금) 오전 11시</p></li>
</ul>
<ul class="item-wrap place-wrap">
  <li><p class="title">장례식장</p><p class="place">서울아산병원 장례식장</p></li>
</ul>
</body></html>`;

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  }
}

const parsed = parseFuneralPageHtml(FIXTURE_HTML);
assert(parsed.deceasedName === '故 홍길동', 'deceasedName');
assert(parsed.funeralHall === '서울아산병원 장례식장', 'funeralHall');
assert(parsed.bainil.includes('2026년 5월 30일'), 'bainil');
assert(parsed.mourners.length === 1 && parsed.mourners[0].role === '상주', 'mourners');

const link = 'https://www.wooribugo4.com/page/funeral/view/12345';
const msg = buildBulkSmsFromFuneralData(parsed, { linkToken: link });
assert(typeof msg === 'string' && msg.includes('홍길동'), 'messageBody contains deceased');
assert(msg.includes(link), 'messageBody contains link');

if (failed) process.exit(1);
console.log('Bugo import parse golden OK.');

const bugo = require('../bugo-import.js');
const moduUrl =
  'https://modubugo.com/bugo/0e328623-1c47-4e12-a453-a6f8b4e074ee?m=true';
bugo
  .importFuneralPageFromUrl(moduUrl)
  .then(function (r) {
    if (!r.parsed || !r.parsed.deceasedName) {
      console.error('FAIL modubugo live import: missing deceasedName');
      process.exit(1);
    }
    if (!r.messageBody || !String(r.messageBody).includes('김재순')) {
      console.error('FAIL modubugo live import: messageBody');
      process.exit(1);
    }
    console.log('ok modubugo live import', r.parsed.deceasedName);
  })
  .catch(function (e) {
    console.error('FAIL modubugo live import:', e.message);
    process.exit(1);
  });
