const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseStringPromise } = require('xml2js');
const { loadPingLocalEnv } = require('./scripts/load-local-env');
const { execFileSync } = require('child_process');

/** 프로젝트 루트 `.env` — Google, Solapi, 토스 등 (기존에 비어 있을 때만 주입) */
loadPingLocalEnv();

/** 이관 완료 HTML 정리 + Google 검증 파일만 전개 (개발 시 생략 — public 변경이 Next HMR 과 충돌) */
const PING_DEV_LIGHT = process.env.PING_DEV_LIGHT === '1';
if (!PING_DEV_LIGHT) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'scripts', 'prune-legacy-html-copies.mjs')], {
      cwd: __dirname,
      stdio: 'inherit',
    });
    execFileSync(process.execPath, [path.join(__dirname, 'scripts', 'materialize-legacy-html.mjs')], {
      cwd: __dirname,
      stdio: 'inherit',
    });
  } catch {
    console.error('[server] prune/materialize failed — fix scripts or repo-root verification HTML');
    process.exit(1);
  }
}

const { LEGACY_HTML_REDIRECTS } = require('./scripts/ping-legacy-html-redirects.cjs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NEXT_DEV_PROXY_PORT = Number(process.env.NEXT_DEV_PORT) || 3002;
/** Cloud Run 프로덕션 API — Next 프록시·정적 HTML 미사용 */
const PING_EXPRESS_API_ONLY = process.env.PING_EXPRESS_API_ONLY === "1";

/** Next.js(App Router) 프록시 — `npm run dev` 시 Express(:PORT) → Next(:NEXT_DEV_PROXY_PORT) */
function proxyToNextDevServer(req, res) {
  const http = require('http');
  const pathWithQuery = req.originalUrl || req.url;
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: NEXT_DEV_PROXY_PORT,
      path: pathWithQuery,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${NEXT_DEV_PROXY_PORT}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', () => {
    if (res.headersSent) return;
    res.status(502)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .end(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>Next.js 대기</title></head><body style="font-family:Pretendard,system-ui,sans-serif;padding:24px;max-width:480px;line-height:1.5">
<h1 style="font-size:18px">Next.js 개발 서버가 꺼져 있습니다</h1>
<p>화면은 App Router(Next)로 이관되었습니다. 루트에서 다음을 실행하세요:</p>
<pre style="background:#f2f4f6;padding:12px;border-radius:8px">npm run dev</pre>
<p>Express: <code>:${PORT}</code> → Next: <code>:${NEXT_DEV_PROXY_PORT}</code></p>
</body></html>`);
  });
  req.pipe(proxyReq);
}

function redirectWithQuery(req, res, destination, statusCode) {
  const raw = req.originalUrl || req.url || '';
  const q = raw.indexOf('?');
  const search = q >= 0 ? raw.slice(q) : '';
  res.redirect(statusCode || 301, destination + search);
}

(function registerLegacyHtml301Redirects() {
  for (const [from, to] of LEGACY_HTML_REDIRECTS) {
    app.get([from, from + '/'], (req, res) => redirectWithQuery(req, res, to, 301));
  }
  app.get(['/send/review', '/send/review/'], (req, res) => redirectWithQuery(req, res, '/send/payments', 302));
})();
const LOCAL_OBITUARY_STORE = path.join(__dirname, 'obituary-drafts.local.json');
const LOCAL_PAYMENT_STORE = path.join(__dirname, 'payment-orders.local.json');
const LOCAL_OBITUARY_SALES_STORE = path.join(__dirname, 'obituary-sales.local.json');
const LOCAL_MORTUARY_MESSAGE_LOGS_STORE = path.join(__dirname, 'mortuary-message-logs.local.json');
const LOCAL_MARKETING_LEADS_STORE = path.join(__dirname, 'marketing-leads.local.json');
const LOCAL_MARKETING_COOKIE_EVENTS_STORE = path.join(__dirname, 'marketing-cookie-events.local.json');
const LOCAL_SEND_COUPONS_STORE = path.join(__dirname, 'ping-send-coupons.local.json');
const sendCouponApi = require('./send-coupon-api');
const memberAuth = require('./member-auth');
const kakaoAuth = require('./ping-kakao-auth');
const guestSmsAuth = require('./guest-sms-auth');
const referralApi = require('./referral-api');
const benefitsApi = require('./benefits-api');
const bugoImport = require('./bugo-import');
const {
    FUNERAL_API_ENDPOINT,
    getFuneralApiServiceKey,
} = require('./funeral-odms-config');
const PING_VISITOR_COOKIE_NAME = 'ping_vid';
const ALLOWED_MARKETING_COOKIE_KEYS = ['_ga', '_gid', '_gcl_au', '_fbp', '_fbc'];

/**
 * PortOne V1(구 아임포트) 예금주 조회용 은행코드 (금융결제원)
 * @see https://portone.gitbook.io/docs/api/api-9/api-3 — GET /vbanks/holder
 * 가맹점에서 해당 API 사용 계약이 되어 있어야 하며, 일부 은행·저축은행은 조회가 제한될 수 있습니다.
 */
const BANK_NAME_TO_IAMPORT_CODE = {
    KB국민은행: '004',
    SC제일은행: '023',
    경남은행: '039',
    광주은행: '034',
    부산은행: '032',
    'iM뱅크(대구)': '031',
    KDB산업은행: '002',
    한국산업은행: '002',
    수협은행: '007',
    신한은행: '088',
    우리은행: '020',
    한국씨티은행: '027',
    우체국: '071',
    하나은행: '081',
    NH농협은행: '011',
    IBK기업은행: '003',
    제주은행: '035',
    전북은행: '037',
    새마을금고: '045',
    신협: '048',
    산림조합중앙회: '064',
    케이뱅크: '089',
    카카오뱅크: '090',
    토스뱅크: '092',
    한국수출입은행: '008',
    /** 저축·기타는 PG/포트원 정책에 따라 조회 실패할 수 있음 */
    SBI저축은행: '050',
    애큐온저축은행: '050',
    상호저축은행: '050',
};

function getImpCredentialsForLocal() {
    return {
        apiKey: process.env.IMP_API_KEY || '',
        apiSecret: process.env.IMP_API_SECRET || '',
    };
}

async function getIamportAccessToken() {
    const { apiKey, apiSecret } = getImpCredentialsForLocal();
    if (!apiKey || !apiSecret) {
        const err = new Error('IMP_API_KEY / IMP_API_SECRET 미설정');
        err.code = 'NOT_CONFIGURED';
        throw err;
    }
    const tokenResponse = await axios.post(
        'https://api.iamport.kr/users/getToken',
        { imp_key: apiKey, imp_secret: apiSecret },
        { headers: { 'Content-Type': 'application/json' } }
    );
    const accessToken = tokenResponse.data?.response?.access_token;
    if (!accessToken) {
        const err = new Error('아임포트 토큰 발급 실패');
        err.details = tokenResponse.data;
        throw err;
    }
    return accessToken;
}

app.use(cors());
app.use(express.json());

const memberAuthStore = require('./lib/ping-member-store.cjs');
app.use(async (req, res, next) => {
    const pathOnly = String(req.originalUrl || req.url || '').split('?')[0];
    const needsStore =
        pathOnly.startsWith('/api/auth') ||
        pathOnly.startsWith('/api/guest-auth') ||
        pathOnly.startsWith('/api/admin/app-settings');
    if (!needsStore) return next();
    try {
        await memberAuthStore.beginRequest();
        res.on('finish', () => {
            void memberAuthStore.endRequest().catch((e) => {
                console.error('memberAuthStore.endRequest:', e);
            });
        });
        next();
    } catch (e) {
        next(e);
    }
});

/** 
 * [멀티테넌시 라우팅 미들웨어] 
 * 접속 도메인(Host)을 분석하여 와일드카드 서브도메인을 추출하고, req.tenantId 에 저장합니다.
 */
app.use((req, res, next) => {
    const host = req.get('host') || ''; // 예: ulsanjs.funexcloud.com
    const subdomain = host.split('.')[0]; 

    // 예약된 도메인(www, funexcloud 등), 로컬호스트 등은 테넌트로 처리하지 않음
    const reserved = ['www', 'funexcloud', 'localhost', '127'];
    if (subdomain && !reserved.some(r => subdomain.toLowerCase().includes(r))) {
        req.tenantId = subdomain.toLowerCase(); // 예: 'ulsanjs'
    }
    next();
});

/**
 * 공개 진입(루트) — App Router 홈 게이트(`/intro`·`/start`). 테넌트 서브도메인 포함.
 */
if (PING_EXPRESS_API_ONLY) {
  app.get("/", (req, res) => {
    res.json({ ok: true, service: "ping-express-api", health: "/api/ping-health" });
  });
} else {
  app.get("/", (req, res) => {
    proxyToNextDevServer(req, res);
  });
}

/**
 * `/api/google-oauth-config.js` — Google People API (React `/start` 연락처 가져오기)
 * - OAuth 클라이언트 ID·브라우저용 API 키는 제한 두면 프런트에 둬도 됨 (클라이언트 시크릿 금지)
 * - 로컬: 루트 `.env`의 GOOGLE_OAUTH_CLIENT_ID, GOOGLE_API_KEY
 * - Firebase Hosting 정적만 쓰면 이 URL은 404 → 클라이언트 env 폴백
 */
app.get('/api/google-oauth-config.js', (req, res) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    const apiKey = process.env.GOOGLE_API_KEY || '';
    res.type('application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(`window.__PING_GOOGLE_CONFIG__=${JSON.stringify({ clientId, apiKey })};`);
});

/**
 * checkout·React 결제 화면용 Portone/토스 공개 설정 주입
 * - 포트원 콘솔에서 결제대행사가 토스페이먼츠인 채널만 사용 (storeId + channelKey)
 * - PORTONE_SECRET_KEY / CLIENT_KEY는 클라이언트에 넣지 않음
 */
function pingEnvTruthy(name) {
    const v = String(process.env[name] ?? '').trim();
    return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

/** 가이드 공개 샘플 키 — https://docs.tosspayments.com/guides/v2/payment-widget/integration */
const TOSS_PAYMENTS_DOCS_WIDGET_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
const TOSS_PAYMENTS_DOCS_WIDGET_SECRET_KEY = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

app.get('/api/portone-config.js', (req, res) => {
    const storeId = process.env.PORTONE_STORE_ID || '';
    const channelKey = process.env.PORTONE_CHANNEL_KEY || '';
    /**
     * 결제위젯 v2는 _gck_ 결제위젯 연동 키 권장. PORTONE_CLIENT_KEY(test_ck_) 폴백은 React checkout에서 검증 시 안내함.
     */
    let tossPaymentsClientKey =
        process.env.TOSS_PAYMENTS_WIDGET_CLIENT_KEY ||
        process.env.TOSS_PAYMENTS_CLIENT_KEY ||
        process.env.TOSS_WIDGET_CLIENT_KEY ||
        process.env.PORTONE_CLIENT_KEY ||
        '';
    const useTossDocsTestKeys = pingEnvTruthy('PING_USE_TOSS_DOCS_TEST_KEYS');
    if (useTossDocsTestKeys) {
        tossPaymentsClientKey = TOSS_PAYMENTS_DOCS_WIDGET_CLIENT_KEY;
    }
    const tossConfirmMock = pingEnvTruthy('PING_TOSS_CONFIRM_MOCK');
    const tossAllowCkWidgetTry = pingEnvTruthy('PING_ALLOW_CK_WIDGET_TRY');
    const skipFirebaseStorageUpload = pingEnvTruthy('PING_SKIP_FIREBASE_STORAGE_UPLOAD');
    /** 정적 프론트만 둘 때: 부고 스크래핑 등 POST /api 가 HTML(SPA)로 떨어지는 것을 막기 위해 API 서버 루트(https://api.example.com, 끝 슬래시 없음) */
    const backendApiOrigin = String(process.env.PING_BACKEND_API_ORIGIN || '')
        .trim()
        .replace(/\/+$/, '');
    res.type('application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const portonePayload = {
        storeId,
        channelKey,
        tossPaymentsClientKey,
        tossConfirmMock,
        tossAllowCkWidgetTry,
        tossUseDocsTestKeys: useTossDocsTestKeys,
        skipFirebaseStorageUpload,
        pingNextDevPort: Number(process.env.NEXT_DEV_PORT || '3002') || 3002,
    };
    if (backendApiOrigin) portonePayload.backendApiOrigin = backendApiOrigin;
    res.send(`window.__PING_PORTONE_CONFIG__=${JSON.stringify(portonePayload)};`);
});

/** 로컬 Express·프록시 자가 점검용(비밀 없음). Firebase 미러링 없음 — 배포 시 Functions에 별도 추가가 필요하면 문서를 참고하세요. */
app.get('/api/ping-health', (req, res) => {
    res.type('application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(JSON.stringify({ ok: true, where: 'ping-express-local' }));
});

const pingTossCheckout = require('./ping-toss-checkout-api');

function registerCheckoutSessionApi(req, res) {
    const r = pingTossCheckout.apiRegisterCheckoutSession(req.body || {});
    res.status(r.status).json(r.body);
}

async function pointsOnlyPaymentApi(req, res) {
    const r = await pingTossCheckout.apiPointsOnlyPayment(req.body || {});
    res.status(r.status).json(r.body);
}

async function confirmTossPaymentApi(req, res) {
    const r = await pingTossCheckout.apiConfirmTossPayment(req.body || {});
    res.status(r.status).json(r.body);
}

async function bankTransferCheckoutApi(req, res) {
    const r = await pingTossCheckout.apiBankTransferPayment(req.body || {});
    res.status(r.status).json(r.body);
}

const pingOrderAdmin = require('./ping-order-admin-api');
const pingOrderPublic = require('./ping-order-public-api');
const pingOrderDispatchRetry = require('./ping-order-dispatch-retry');
const pingOrderRefund = require('./ping-order-refund-api');
const { loadSendFromDisplay } = require('./ping-dispatch-send-from');
const pingCashReceipt = require('./ping-cash-receipt');
const pingOrderPurge = require('./ping-order-purge');

function isCronAuthorized(req) {
    const secret = String(process.env.CRON_SECRET || process.env.PING_CRON_SECRET || '').trim();
    if (!secret) return process.env.NODE_ENV !== 'production';
    const auth = String(req.headers.authorization || '');
    return auth === `Bearer ${secret}` || req.headers['x-cron-secret'] === secret;
}

async function purgeSensitiveDataCronApi(req, res) {
    if (!isCronAuthorized(req)) {
        res.status(401).json({ ok: false, error: 'unauthorized' });
        return;
    }
    try {
        const r = await pingOrderPurge.runScheduledPurge(80);
        res.status(r.ok ? 200 : 500).json(r);
    } catch (err) {
        console.error('purgeSensitiveDataCronApi', err);
        res.status(500).json({ ok: false, error: err.message || 'purge_failed' });
    }
}

async function confirmBankDepositApi(req, res) {
    const r = await pingOrderAdmin.apiConfirmBankDeposit(req.body || {}, {
        cookieHeader: req.headers.cookie || '',
        headers: req.headers,
    });
    res.status(r.status).json(r.body);
}

async function getOrderPublicStatusApi(req, res) {
    const oid = String(req.params.orderId || '').trim();
    const amountRaw = req.query.amount;
    const amount =
        amountRaw != null && amountRaw !== '' ? Math.floor(Number(amountRaw)) : null;
    const r = await pingOrderPublic.apiGetOrderPublicStatus(oid, amount);
    res.status(r.status).json(r.body);
}

async function retryOrderDispatchApi(req, res) {
    const oid = String(req.params.orderId || '').trim();
    const amountRaw = req.body && req.body.amount;
    const amount =
        amountRaw != null && amountRaw !== '' ? Math.floor(Number(amountRaw)) : null;
    const r = await pingOrderDispatchRetry.apiRetryOrderDispatch(oid, amount);
    res.status(r.status).json(r.body);
}

async function requestOrderRefundApi(req, res) {
    const oid = String(req.params.orderId || '').trim();
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const amountRaw = body.amount;
    const amount =
        amountRaw != null && amountRaw !== '' ? Math.floor(Number(amountRaw)) : null;
    const r = await pingOrderRefund.apiRequestOrderRefund(oid, amount, body);
    res.status(r.status).json(r.body);
}

function getPingSendFromConfigApi(_req, res) {
    const { label, digits } = loadSendFromDisplay();
    res.json({ ok: true, label, digits: digits || null });
}

async function issueCashReceiptApi(req, res) {
    const oid = String(req.params.orderId || '').trim();
    const r = await pingCashReceipt.issueCashReceiptForOrder(oid, req.body || {});
    res.status(r.status).json(r.body);
}


function normalizePhoneNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '');
}

function getFamilyNotificationLabel(status) {
    const labels = {
        sent: '발송 완료',
        failed: '발송 실패',
        skipped: '발송 건너뜀',
        requires_kakao_config: '카카오 연동 필요',
        requires_sms_config: '문자 연동 필요',
        saved_only: '저장 완료'
    };

    return labels[status] || '확인 필요';
}

function ensureLocalObituaryStore() {
    if (!fs.existsSync(LOCAL_OBITUARY_STORE)) {
        fs.writeFileSync(LOCAL_OBITUARY_STORE, '[]', 'utf8');
    }
}

function readLocalObituaryDrafts() {
    ensureLocalObituaryStore();

    try {
        const raw = fs.readFileSync(LOCAL_OBITUARY_STORE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to read local obituary drafts:', error);
        return [];
    }
}

function writeLocalObituaryDrafts(drafts) {
    ensureLocalObituaryStore();
    fs.writeFileSync(LOCAL_OBITUARY_STORE, JSON.stringify(drafts, null, 2), 'utf8');
}

function ensureLocalPaymentStore() {
    if (!fs.existsSync(LOCAL_PAYMENT_STORE)) {
        fs.writeFileSync(LOCAL_PAYMENT_STORE, '[]', 'utf8');
    }
}

function readLocalPaymentOrders() {
    ensureLocalPaymentStore();

    try {
        const raw = fs.readFileSync(LOCAL_PAYMENT_STORE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to read local payment orders:', error);
        return [];
    }
}

function writeLocalPaymentOrders(orders) {
    ensureLocalPaymentStore();
    fs.writeFileSync(LOCAL_PAYMENT_STORE, JSON.stringify(orders, null, 2), 'utf8');
}

function ensureLocalObituarySalesStore() {
    if (!fs.existsSync(LOCAL_OBITUARY_SALES_STORE)) {
        fs.writeFileSync(LOCAL_OBITUARY_SALES_STORE, '[]', 'utf8');
    }
}

function readLocalObituarySales() {
    ensureLocalObituarySalesStore();
    try {
        const raw = fs.readFileSync(LOCAL_OBITUARY_SALES_STORE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to read local obituary sales:', error);
        return [];
    }
}

function writeLocalObituarySales(rows) {
    ensureLocalObituarySalesStore();
    fs.writeFileSync(LOCAL_OBITUARY_SALES_STORE, JSON.stringify(rows, null, 2), 'utf8');
}

function ensureLocalMortuaryMessageLogsStore() {
    if (!fs.existsSync(LOCAL_MORTUARY_MESSAGE_LOGS_STORE)) {
        fs.writeFileSync(LOCAL_MORTUARY_MESSAGE_LOGS_STORE, '[]', 'utf8');
    }
}

function readLocalMortuaryMessageLogs() {
    ensureLocalMortuaryMessageLogsStore();
    try {
        const raw = fs.readFileSync(LOCAL_MORTUARY_MESSAGE_LOGS_STORE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to read mortuary message logs:', error);
        return [];
    }
}

function writeLocalMortuaryMessageLogs(rows) {
    ensureLocalMortuaryMessageLogsStore();
    fs.writeFileSync(LOCAL_MORTUARY_MESSAGE_LOGS_STORE, JSON.stringify(rows, null, 2), 'utf8');
}

function getMortuaryMessageTemplates() {
    return {
        during: [
            {
                id: 'd_thanks',
                label: '조문 감사',
                body: '바쁘신 와중 빈소를 찾아 주시고 위로의 말씀 전해 주셔서 진심으로 감사드립니다. 장례 진행 중 연락이 늦을 수 있어 양해 부탁드립니다.'
            },
            {
                id: 'd_guide',
                label: '빈소·동선 안내',
                body: '빈소 위치 및 주차 안내는 장례식장 로비 데스크에서 도와드리고 있습니다. 문의사항은 상주에게 부탁드립니다.'
            },
            {
                id: 'd_meal',
                label: '식사 안내',
                body: '근조 식사가 준비되어 있사오니 안내에 따라 편히 이용해 주시면 감사하겠습니다.'
            }
        ],
        after: [
            {
                id: 'a_thanks',
                label: '장례 후 감사',
                body: '장례 기간 동안 깊은 위로와 도움을 주신 모든 분께 진심으로 감사드립니다. 덕분에 마지막을 잘 모실 수 있었습니다.'
            },
            {
                id: 'a_followup',
                label: '추후 인사',
                body: '감사 인사와 정리된 내용은 순차적으로 연락드리겠습니다. 너그러이 양해 부탁드립니다.'
            },
            {
                id: 'a_memorial',
                label: '추모 부탁',
                body: '故인을 기리는 마음으로 조용한 추모 부탁드리며, 추후 기일·제사 일정은 상주를 통해 안내드리겠습니다.'
            }
        ]
    };
}

function resolveMortuaryMessageBody(phase, templateId, customBody) {
    const trimmedCustom = String(customBody || '').trim();
    if (trimmedCustom) {
        return trimmedCustom;
    }
    const tid = String(templateId || '').trim();
    if (!tid) {
        return '';
    }
    const tpl = getMortuaryMessageTemplates();
    const list = phase === 'after' ? tpl.after : tpl.during;
    const found = list.find(t => t.id === tid);
    return found ? found.body : '';
}

function verifyLocalObituaryBugoAccess(bugoCode, token) {
    const id = String(bugoCode || '').trim();
    const t = String(token || '').trim();
    if (!id || !t) return null;

    const drafts = readLocalObituaryDrafts();
    const draft = drafts.find(d => d.obituaryId === id);
    if (!draft) return null;
    if (draft.reviewToken === t) return { draft, access: 'family' };
    if (draft.publicToken === t) return { draft, access: 'public' };
    return null;
}

function recordLocalPaidOrderSale(order) {
    const obituaryId = String(order.obituaryId || order.bugoCode || '').trim();
    if (!obituaryId || String(order.status || '').toLowerCase() !== 'paid') return;

    const rows = readLocalObituarySales();
    const orderId = order.orderId;
    if (rows.some(s => s.kind === 'payment' && s.orderId === orderId && s.obituaryId === obituaryId)) {
        return;
    }

    const ts = order.paidAt || order.updatedAt || new Date().toISOString();
    rows.unshift({
        saleId: `pay_${crypto.randomBytes(8).toString('hex')}`,
        obituaryId,
        kind: 'payment',
        orderId,
        title: order.productTitle || order.saleTitle || '온라인 결제',
        amount: Number(order.totalAmount || 0),
        quantity: order.count != null ? Number(order.count) : 1,
        status: 'paid',
        payerName: order.payerName || null,
        note: null,
        createdAt: order.createdAt || ts,
        paidAt: ts
    });
    writeLocalObituarySales(rows);
}

function ensureLocalMarketingLeadsStore() {
    if (!fs.existsSync(LOCAL_MARKETING_LEADS_STORE)) {
        fs.writeFileSync(LOCAL_MARKETING_LEADS_STORE, '[]', 'utf8');
    }
}

function readLocalMarketingLeads() {
    ensureLocalMarketingLeadsStore();
    try {
        const raw = fs.readFileSync(LOCAL_MARKETING_LEADS_STORE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function appendLocalMarketingLead(entry) {
    const leads = readLocalMarketingLeads();
    leads.unshift(entry);
    fs.writeFileSync(LOCAL_MARKETING_LEADS_STORE, JSON.stringify(leads, null, 2), 'utf8');
}

function parseCookieHeader(header) {
    const out = {};
    if (!header || typeof header !== 'string') return out;
    header.split(';').forEach((part) => {
        const idx = part.indexOf('=');
        if (idx === -1) return;
        const key = part.slice(0, idx).trim();
        let val = part.slice(idx + 1).trim();
        try {
            val = decodeURIComponent(val);
        } catch (_) {
            /* keep raw */
        }
        out[key] = val;
    });
    return out;
}

function isValidPingVisitorId(v) {
    if (!v || typeof v !== 'string') return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
    if (/^local-\d+-[0-9a-f]{8}$/i.test(v)) return true;
    return false;
}

function ensureLocalMarketingCookieEventsStore() {
    if (!fs.existsSync(LOCAL_MARKETING_COOKIE_EVENTS_STORE)) {
        fs.writeFileSync(LOCAL_MARKETING_COOKIE_EVENTS_STORE, '[]', 'utf8');
    }
}

function readLocalMarketingCookieEvents() {
    ensureLocalMarketingCookieEventsStore();
    try {
        const raw = fs.readFileSync(LOCAL_MARKETING_COOKIE_EVENTS_STORE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

const { recordMarketingPageView } = require('./ping-marketing-aggregate');

/** @deprecated E: 개인 식별 이벤트 로그 — 집계 모듈로 대체됨 */
function appendMarketingCookieEvent(entry) {
    const rows = readLocalMarketingCookieEvents();
    rows.unshift(entry);
    const maxRows = 5000;
    const trimmed = rows.slice(0, maxRows);
    fs.writeFileSync(LOCAL_MARKETING_COOKIE_EVENTS_STORE, JSON.stringify(trimmed, null, 2), 'utf8');
}

function sanitizeMarketingCookiesFromBody(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    for (const k of ALLOWED_MARKETING_COOKIE_KEYS) {
        if (typeof raw[k] !== 'string') continue;
        const s = raw[k].trim().slice(0, 2048);
        if (s) out[k] = s;
    }
    return out;
}

function appendPingVisitorSetCookie(res, visitorId) {
    const maxAge = 60 * 60 * 24 * 730;
    const val = encodeURIComponent(visitorId);
    res.append('Set-Cookie', `${PING_VISITOR_COOKIE_NAME}=${val}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
}

/** 요청 쿠키에 없거나 형식이 이상하면 새 ID를 발급하고 Set-Cookie 반환 */
function getOrSetVisitorId(req, res) {
    const cookies = parseCookieHeader(req.headers.cookie);
    let vid = cookies[PING_VISITOR_COOKIE_NAME];
    if (!isValidPingVisitorId(vid)) {
        vid = createObituaryId();
    }
    if (cookies[PING_VISITOR_COOKIE_NAME] !== vid) {
        appendPingVisitorSetCookie(res, vid);
    }
    return vid;
}

function getVisitorIdFromRequest(req) {
    const cookies = parseCookieHeader(req.headers.cookie);
    return isValidPingVisitorId(cookies[PING_VISITOR_COOKIE_NAME]) ? cookies[PING_VISITOR_COOKIE_NAME] : null;
}

function postMarketingCookieSync(req, res) {
    // 추천인 등 레거시 dedup 용 — 마케팅 로그에는 저장하지 않음
    getOrSetVisitorId(req, res);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const consent = body.consent;
    const consentAnalytics =
        consent === true ||
        consent === 'true' ||
        (consent && typeof consent === 'object' && consent.analytics === true);

    recordMarketingPageView({
        path: String(body.path || '').slice(0, 800),
        phase: String(body.phase || 'immediate').slice(0, 32),
        utm:
            body.utm && typeof body.utm === 'object' && !Array.isArray(body.utm)
                ? body.utm
                : {},
        consentAnalytics,
    });

    res.status(200).json({ ok: true });
}

function postMarketingLead(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const source = String(body.source || 'unknown').trim().slice(0, 64);
    const email = String(body.email || '').trim().slice(0, 320);
    const phone = String(body.phone || '').replace(/\s/g, '').trim().slice(0, 32);
    if (!email && !phone) {
        res.status(400).json({ ok: false, error: '이메일 또는 연락처가 필요합니다.' });
        return;
    }
    const utm =
        body.utm && typeof body.utm === 'object' && !Array.isArray(body.utm)
            ? body.utm
            : {};
    const entry = {
        id: createObituaryId(),
        createdAt: new Date().toISOString(),
        source,
        partnershipType: String(body.partnershipType || '').slice(0, 32),
        companyName: String(body.companyName || '').slice(0, 200),
        contactName: String(body.contactName || '').slice(0, 120),
        email,
        phone,
        inquiry: String(body.inquiry || '').slice(0, 8000),
        utm,
        page: String(body.page || '').slice(0, 500),
    };
    appendLocalMarketingLead(entry);
    res.status(200).json({ ok: true, id: entry.id });
}

function createObituaryId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `local-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function createObituaryToken() {
    return crypto.randomBytes(16).toString('hex');
}

function getAppBaseUrl(req) {
    return (process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function buildObituaryLinks(req, obituaryData) {
    const baseUrl = getAppBaseUrl(req);
    const obituaryId = obituaryData.obituaryId || '';
    const reviewToken = obituaryData.reviewToken || '';
    const publicToken = obituaryData.publicToken || '';
    const sendUrl =
        obituaryId && reviewToken
            ? `${baseUrl}/obituary/send/${obituaryId}?token=${reviewToken}`
            : '';
    const salesUrl =
        obituaryId && reviewToken
            ? `${baseUrl}/obituary/sales?bugoCode=${encodeURIComponent(obituaryId)}&token=${encodeURIComponent(reviewToken)}`
            : '';
    const mortuaryUrl =
        obituaryId && reviewToken
            ? `${baseUrl}/obituary/mortuary/${encodeURIComponent(obituaryId)}?token=${encodeURIComponent(reviewToken)}`
            : '';

    return {
        reviewUrl: `${baseUrl}/obituary/review?mode=family&token=${encodeURIComponent(reviewToken)}`,
        publicUrl: `${baseUrl}/obituary/public?token=${encodeURIComponent(publicToken)}`,
        sendUrl: sendUrl || null,
        salesUrl: salesUrl || null,
        mortuaryUrl: mortuaryUrl || null
    };
}

function buildObituaryViewModel(obituaryData) {
    return {
        deceasedName: obituaryData.deceasedName || '',
        gender: obituaryData.gender || '',
        age: obituaryData.age || '',
        ageUnit: obituaryData.ageUnit || '',
        exposeGender: obituaryData.exposeGender || false,
        hideAge: obituaryData.hideAge || false,
        funeralHall: obituaryData.funeralHall || obituaryData.funeralSearch || '',
        funeralRoom: obituaryData.funeralRoom || '',
        deathDate: obituaryData.deathDate || '',
        deathHour: obituaryData.deathHour || '',
        deathMinute: obituaryData.deathMinute || '',
        entryDate: obituaryData.entryDate || '',
        entryHour: obituaryData.entryHour || '',
        entryMinute: obituaryData.entryMinute || '',
        viewingDate: obituaryData.viewingDate || '',
        viewingHour: obituaryData.viewingHour || '',
        viewingMinute: obituaryData.viewingMinute || '',
        departureDate: obituaryData.departureDate || '',
        departureHour: obituaryData.departureHour || '',
        departureMinute: obituaryData.departureMinute || '',
        burialPlace: obituaryData.burialPlace || obituaryData.burialPlaceDirect || '',
        bankName: obituaryData.bankName || '',
        accountNumber: obituaryData.accountNumber || '',
        accountHolder: obituaryData.accountHolder || '',
        accountInfo: obituaryData.accountInfo || '',
        hideAccountLastDigits: obituaryData.hideAccountLastDigits || false,
        mournerMessageText: obituaryData.mournerMessageText || '',
        notificationMessageText: obituaryData.notificationMessageText || '',
        hideMournerContact: obituaryData.hideMournerContact || false,
        designType: obituaryData.designType || 'general',
        mourners: Array.isArray(obituaryData.mourners) ? obituaryData.mourners : []
    };
}

function buildObituaryResponse(obituaryData, req, mode = 'family') {
    const links = buildObituaryLinks(req, obituaryData);
    const canViewFull = mode === 'family' || obituaryData.status === 'published';
    const exposeFamilyData = mode !== 'public';

    return {
        success: true,
        obituaryId: obituaryData.obituaryId,
        status: obituaryData.status,
        statusLabel: obituaryData.statusLabel,
        previewUrl: links.reviewUrl,
        reviewUrl: links.reviewUrl,
        publicUrl: links.publicUrl,
        sendUrl: exposeFamilyData ? links.sendUrl : null,
        salesUrl: exposeFamilyData ? links.salesUrl : null,
        mortuaryUrl: exposeFamilyData ? links.mortuaryUrl : null,
        canViewFull,
        notice: canViewFull ? '' : '유가족 확인 후 공개되는 부고입니다.',
        familyPrimaryContact: exposeFamilyData ? obituaryData.familyPrimaryContact || null : null,
        familyNotification: exposeFamilyData ? obituaryData.familyNotification || null : null,
        approvedAt: obituaryData.approvedAt || null,
        createdAt: obituaryData.createdAt || null,
        updatedAt: obituaryData.updatedAt || null,
        obituary: canViewFull ? buildObituaryViewModel(obituaryData) : null
    };
}

function findObituaryDraftByToken(drafts, token, mode = 'family') {
    const tokenKey = mode === 'public' ? 'publicToken' : 'reviewToken';
    return drafts.find(draft => draft[tokenKey] === token);
}

function buildLocalFamilyNotification(familyPrimaryContact, reviewUrl) {
    const channel = familyPrimaryContact.channel === 'sms' ? 'sms' : 'kakao';
    const status = channel === 'sms' ? 'requires_sms_config' : 'requires_kakao_config';
    const suffix = reviewUrl ? ` 확인 링크: ${reviewUrl}` : '';
    const message = channel === 'sms'
        ? `로컬 서버에서는 초안만 저장됩니다. 실제 가족 문자 발송은 배포 환경에서 연동됩니다.${suffix}`
        : `로컬 서버에서는 초안만 저장됩니다. 실제 가족 카카오 알림톡 발송은 배포 환경에서 연동됩니다.${suffix}`;

    return {
        channel,
        status,
        statusLabel: getFamilyNotificationLabel(status),
        message
    };
}

let globalFuneralHallsCache = null;

async function fetchAllFuneralHallsFromAPI() {
    console.log('Fetching ALL funeral halls from public API into memory cache...');
    const allHalls = [];
    const maxPages = 4; // 보통 3페이지(1500개)면 충분하나 여유있게 4페이지 설정
    const numOfRows = 500; // 공공데이터 강제 한도

    for(let pageNo = 1; pageNo <= maxPages; pageNo++) {
        const apiUrl = `${FUNERAL_API_ENDPOINT}?serviceKey=${encodeURIComponent(getFuneralApiServiceKey())}&pageNo=${pageNo}&numOfRows=${numOfRows}&apiType=JSON`;
        try {
            const response = await axios.get(apiUrl, {
                headers: { Accept: 'application/json' },
                timeout: 10000
            });
            const itemsData = response.data?.items;
            
            if (!itemsData || itemsData.length === 0) break; // 마지막 페이지 도달
            
            const items = Array.isArray(itemsData) ? itemsData : [itemsData];
            const parsedItems = items.filter(Boolean).map(item => ({
                name:
                    item?.fcltNm ||
                    item?.facltNm ||
                    item?.facilityName ||
                    item?.funeralHallName ||
                    item?.funeralHallNm ||
                    item?.name ||
                    '',
                address:
                    item?.rdnmadr ||
                    item?.lnmadr ||
                    item?.address ||
                    item?.addr ||
                    '',
                phone:
                    item?.telno ||
                    item?.phone ||
                    item?.tel ||
                    ''
            })).map(item => ({
                name: String(item.name).trim(),
                address: String(item.address).trim(),
                phone: String(item.phone).trim()
            })).filter(item => item.name);

            allHalls.push(...parsedItems);
        } catch (error) {
            console.error(`Error fetching page ${pageNo}:`, error.message);
            break;
        }
    }
    
    // 중복 제거 (이름+주소 기준)
    const uniqueHalls = Array.from(new Map(allHalls.map(item => [item.name + item.address, item])).values());
    console.log(`Cache populated strictly with ${uniqueHalls.length} funeral halls.`);
    return uniqueHalls;
}

// 서버 시작 시 백그라운드에서 캐시 로드 시작
fetchAllFuneralHallsFromAPI().then(halls => {
    globalFuneralHallsCache = halls;
}).catch(console.error);

async function getFuneralHalls(searchQuery = '') {
    if (!globalFuneralHallsCache || globalFuneralHallsCache.length === 0) {
        globalFuneralHallsCache = await fetchAllFuneralHallsFromAPI();
    }
    
    if (!searchQuery || searchQuery.length < 2) {
        return globalFuneralHallsCache.slice(0, 50); // 안전을 위해 기본 50개만 반환
    }

    const lowered = searchQuery.toLowerCase();
    const results = globalFuneralHallsCache.filter(item =>
        item.name.toLowerCase().includes(lowered) ||
        item.address.toLowerCase().includes(lowered)
    );
    
    // 성능을 위해 검색 결과 최대 100개로 제한
    return results.slice(0, 100);
}

async function handleFuneralHalls(req, res) {
    try {
        const searchQuery = String(req.query.searchQuery || '').trim();
        const funeralHalls = await getFuneralHalls(searchQuery);

        res.status(200).json({
            success: true,
            data: funeralHalls,
            totalCount: funeralHalls.length
        });
    } catch (error) {
        console.error('Funeral hall API error:', error);
        res.status(500).json({
            error: '장례식장 목록 호출에 실패했습니다.',
            message: error.message
        });
    }
}

function approveLocalPayment(req, res) {
    try {
        const { paymentId, imp_uid, merchant_uid, orderId, amount } = req.body || {};
        const finalOrderId = String(orderId || merchant_uid || paymentId || '').trim();
        const numericAmount = Number(amount);

        if (!finalOrderId) {
            res.status(400).json({ error: 'Missing required parameter: paymentId, merchant_uid, or orderId' });
            return;
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            res.status(400).json({ error: 'Missing or invalid amount' });
            return;
        }

        const timestamp = new Date().toISOString();
        const resolvedImpUid = String(imp_uid || `local_imp_${Date.now()}`).trim();
        const paymentOrders = readLocalPaymentOrders();
        const existingIndex = paymentOrders.findIndex(order => order.orderId === finalOrderId);
        const existingOrder = existingIndex >= 0 ? paymentOrders[existingIndex] : null;
        const resolvedPaymentId = String(paymentId || existingOrder?.paymentId || `local_payment_${Date.now()}`).trim();
        const linkedObituary =
            String(req.body?.obituaryId || req.body?.bugoCode || existingOrder?.obituaryId || '').trim() || null;
        const productTitle =
            String(req.body?.productTitle || req.body?.saleTitle || existingOrder?.productTitle || '').trim() || null;
        const paymentData = {
            paymentId: resolvedPaymentId,
            imp_uid: resolvedImpUid,
            merchant_uid: finalOrderId,
            status: 'paid',
            amount: numericAmount,
            paid_at: timestamp,
            pg_provider: 'tosspayments-portone',
            mock: true
        };

        const updatedOrder = {
            orderId: finalOrderId,
            paymentId: resolvedPaymentId,
            merchant_uid: finalOrderId,
            imp_uid: resolvedImpUid,
            status: 'paid',
            totalAmount: numericAmount,
            count: Number.isFinite(Number(req.body?.count)) ? Number(req.body.count) : existingOrder?.count || null,
            createdAt: existingOrder?.createdAt || timestamp,
            paidAt: timestamp,
            updatedAt: timestamp,
            paymentData,
            ...(linkedObituary ? { obituaryId: linkedObituary } : {}),
            ...(productTitle ? { productTitle } : {})
        };

        if (existingIndex >= 0) {
            paymentOrders[existingIndex] = updatedOrder;
        } else {
            paymentOrders.unshift(updatedOrder);
        }

        writeLocalPaymentOrders(paymentOrders);
        recordLocalPaidOrderSale(updatedOrder);

        res.status(200).json({
            success: true,
            message: 'Local payment approved',
            orderId: finalOrderId,
            paymentId: resolvedPaymentId,
            merchant_uid: finalOrderId,
            imp_uid: resolvedImpUid,
            amount: numericAmount,
            paymentData
        });
    } catch (error) {
        console.error('Local approvePayment error:', error);
        res.status(500).json({
            error: 'Local payment approval failed',
            message: error.message
        });
    }
}

function getLocalOrderStatus(req, res) {
    try {
        const orderId = String(req.query.orderId || '').trim();
        if (!orderId) {
            res.status(400).json({ error: 'orderId parameter is required' });
            return;
        }

        const paymentOrders = readLocalPaymentOrders();
        const order = paymentOrders.find(item => item.orderId === orderId);
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        res.status(200).json({
            orderId: order.orderId,
            paymentId: order.paymentId || null,
            merchant_uid: order.merchant_uid || order.orderId,
            imp_uid: order.imp_uid || null,
            status: order.status,
            totalAmount: order.totalAmount,
            count: order.count,
            createdAt: order.createdAt || null,
            paidAt: order.paidAt || null
        });
    } catch (error) {
        console.error('Local getOrderStatus error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

function handleLocalWebhook(req, res) {
    try {
        const payload = req.body || {};
        const orderId = String(payload.orderId || payload.merchant_uid || '').trim();
        const status = String(payload.status || '').trim() || 'received';

        if (!orderId) {
            res.status(400).json({ error: 'orderId or merchant_uid is required' });
            return;
        }

        const paymentOrders = readLocalPaymentOrders();
        const existingIndex = paymentOrders.findIndex(order => order.orderId === orderId);
        const existingOrder = existingIndex >= 0 ? paymentOrders[existingIndex] : {};
        const timestamp = new Date().toISOString();
        const linkedFromPayload =
            String(payload.obituaryId || payload.bugoCode || existingOrder.obituaryId || '').trim() || null;
        const titleFromPayload =
            String(payload.productTitle || payload.saleTitle || existingOrder.productTitle || '').trim() || null;
        const updatedOrder = {
            ...existingOrder,
            orderId,
            paymentId: String(payload.paymentId || existingOrder.paymentId || ''),
            merchant_uid: String(payload.merchant_uid || existingOrder.merchant_uid || orderId),
            imp_uid: String(payload.imp_uid || existingOrder.imp_uid || ''),
            status,
            totalAmount: Number.isFinite(Number(payload.amount)) ? Number(payload.amount) : existingOrder.totalAmount || null,
            count: Number.isFinite(Number(payload.count)) ? Number(payload.count) : existingOrder.count || null,
            createdAt: existingOrder.createdAt || timestamp,
            paidAt: status === 'paid' ? (existingOrder.paidAt || timestamp) : existingOrder.paidAt || null,
            updatedAt: timestamp,
            paymentData: {
                ...(existingOrder.paymentData || {}),
                ...payload,
                mock: true
            },
            ...(linkedFromPayload ? { obituaryId: linkedFromPayload } : {}),
            ...(titleFromPayload ? { productTitle: titleFromPayload } : {})
        };

        if (existingIndex >= 0) {
            paymentOrders[existingIndex] = updatedOrder;
        } else {
            paymentOrders.unshift(updatedOrder);
        }

        writeLocalPaymentOrders(paymentOrders);
        if (String(status).toLowerCase() === 'paid') {
            recordLocalPaidOrderSale(updatedOrder);
        }

        res.status(200).json({
            success: true,
            message: 'Local webhook received',
            orderId,
            status
        });
    } catch (error) {
        console.error('Local webhookHandler error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

function createLocalObituaryDraft(req, res) {
    try {
        const payload = req.body || {};
        const familyPrimaryContact = {
            name: String(payload.familyPrimaryContact?.name || payload.familyRecipientName || '').trim(),
            phone: normalizePhoneNumber(payload.familyPrimaryContact?.phone || payload.familyRecipientPhone || ''),
            channel: payload.familyPrimaryContact?.channel === 'sms' ? 'sms' : 'kakao'
        };

        if (!familyPrimaryContact.name || !familyPrimaryContact.phone) {
            res.status(400).json({ error: '대표 유가족 이름과 연락처를 입력해주세요.' });
            return;
        }

        const obituaryId = createObituaryId();
        const reviewToken = createObituaryToken();
        const publicToken = createObituaryToken();
        const links = buildObituaryLinks(req, { obituaryId, reviewToken, publicToken });
        const familyNotification = payload.notifyFamilyFirst === false
            ? {
                channel: familyPrimaryContact.channel,
                status: 'saved_only',
                statusLabel: getFamilyNotificationLabel('saved_only'),
                message: '초안만 저장하고 최초 안내는 보내지 않았습니다.'
            }
            : buildLocalFamilyNotification(familyPrimaryContact, links.reviewUrl);
        const timestamp = new Date().toISOString();
        const obituaryData = {
            ...payload,
            obituaryId,
            reviewToken,
            publicToken,
            familyPrimaryContact,
            mourners: Array.isArray(payload.mourners) ? payload.mourners : [],
            familyNotification,
            status: 'family_review_pending',
            statusLabel: '가족 확인 대기',
            savedFrom: 'local-server',
            createdAt: timestamp,
            updatedAt: timestamp,
            approvedAt: null
        };

        const drafts = readLocalObituaryDrafts();
        drafts.unshift(obituaryData);
        writeLocalObituaryDrafts(drafts);

        res.status(200).json(buildObituaryResponse(obituaryData, req, 'family'));
    } catch (error) {
        console.error('Local obituary draft save error:', error);
        res.status(500).json({
            error: '부고 초안 저장 중 오류가 발생했습니다.',
            message: error.message
        });
    }
}

function getLocalObituaryEntry(req, res) {
    try {
        const token = String(req.query.token || '').trim();
        const mode = req.query.mode === 'public' ? 'public' : 'family';

        if (!token) {
            res.status(400).json({ error: '확인 토큰이 필요합니다.' });
            return;
        }

        const drafts = readLocalObituaryDrafts();
        const obituaryData = findObituaryDraftByToken(drafts, token, mode);

        if (!obituaryData) {
            res.status(404).json({ error: '부고 초안을 찾을 수 없습니다.' });
            return;
        }

        res.status(200).json(buildObituaryResponse(obituaryData, req, mode));
    } catch (error) {
        console.error('Local obituary entry read error:', error);
        res.status(500).json({
            error: '부고 정보를 불러오지 못했습니다.',
            message: error.message
        });
    }
}

/**
 * POST /api/verify-account-holder
 * body: { bankName: string, accountNumber: string }
 * → PortOne V1 예금주 조회 (서버에서만 시크릿 사용)
 */
async function verifyAccountHolder(req, res) {
    try {
        const bankName = String(req.body?.bankName || '').trim();
        const accountNumber = String(req.body?.accountNumber || '').trim();
        if (!bankName || !accountNumber) {
            res.status(400).json({ ok: false, error: '은행과 계좌번호를 입력해 주세요.' });
            return;
        }
        if (bankName === '기타') {
            res.status(400).json({ ok: false, error: '「기타」 은행은 자동 예금주 확인을 할 수 없습니다.' });
            return;
        }
        const bankCode = BANK_NAME_TO_IAMPORT_CODE[bankName];
        if (!bankCode) {
            res.status(400).json({
                ok: false,
                error: '선택한 은행 코드가 서버에 등록되어 있지 않습니다. 목록에 있는 은행을 선택해 주세요.',
            });
            return;
        }

        let accessToken;
        try {
            accessToken = await getIamportAccessToken();
        } catch (e) {
            if (e.code === 'NOT_CONFIGURED') {
                res.status(200).json({
                    ok: false,
                    notConfigured: true,
                    message:
                        '로컬 서버에 IMP_API_KEY, IMP_API_SECRET 환경 변수가 없습니다. 포트원 대시보드 키를 설정하면 예금주 조회가 동작합니다.',
                });
                return;
            }
            throw e;
        }

        const bankNum = accountNumber.replace(/\s/g, '');
        const holderUrl = `https://api.iamport.kr/vbanks/holder?bank_code=${encodeURIComponent(bankCode)}&bank_num=${encodeURIComponent(bankNum)}`;
        const holderRes = await axios.get(holderUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const payload = holderRes.data;
        if (!payload || payload.code !== 0) {
            res.status(400).json({
                ok: false,
                error: payload?.message || '예금주 조회에 실패했습니다. 계좌번호와 은행을 다시 확인해 주세요.',
                iamportCode: payload?.code,
            });
            return;
        }

        const holderName = payload.response?.bank_holder;
        if (!holderName || !String(holderName).trim()) {
            res.status(400).json({ ok: false, error: '예금주명을 가져오지 못했습니다.' });
            return;
        }

        res.status(200).json({ ok: true, holderName: String(holderName).trim() });
    } catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        console.error('verifyAccountHolder error:', status || error.message, data || '');
        res.status(502).json({
            ok: false,
            error: data?.message || error.message || '예금주 조회 중 오류가 발생했습니다.',
        });
    }
}

function approveLocalObituaryEntry(req, res) {
    try {
        const token = String(req.body?.token || req.query.token || '').trim();

        if (!token) {
            res.status(400).json({ error: '확인 토큰이 필요합니다.' });
            return;
        }

        const drafts = readLocalObituaryDrafts();
        const draftIndex = drafts.findIndex(draft => draft.reviewToken === token);

        if (draftIndex === -1) {
            res.status(404).json({ error: '부고 초안을 찾을 수 없습니다.' });
            return;
        }

        const timestamp = new Date().toISOString();
        drafts[draftIndex] = {
            ...drafts[draftIndex],
            status: 'published',
            statusLabel: '공개 완료',
            approvedAt: drafts[draftIndex].approvedAt || timestamp,
            updatedAt: timestamp
        };

        writeLocalObituaryDrafts(drafts);
        res.status(200).json(buildObituaryResponse(drafts[draftIndex], req, 'family'));
    } catch (error) {
        console.error('Local obituary approval error:', error);
        res.status(500).json({
            error: '부고 승인 처리 중 오류가 발생했습니다.',
            message: error.message
        });
    }
}

function getLocalObituarySales(req, res) {
    try {
        const bugoCode = String(req.query.bugoCode || req.query.obituaryId || '').trim();
        const token = String(req.query.token || '').trim();
        const verified = verifyLocalObituaryBugoAccess(bugoCode, token);
        if (!verified) {
            res.status(403).json({ error: '접근 권한이 없습니다. 부고 코드와 링크 토큰을 확인해주세요.' });
            return;
        }

        const items = readLocalObituarySales()
            .filter(s => s.obituaryId === bugoCode)
            .sort((a, b) => String(b.paidAt || b.createdAt || '').localeCompare(String(a.paidAt || a.createdAt || '')));

        const totalAmount = items.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

        res.status(200).json({
            success: true,
            obituaryId: bugoCode,
            access: verified.access,
            canManage: verified.access === 'family',
            deceasedName: verified.draft.deceasedName || '',
            statusLabel: verified.draft.statusLabel || '',
            summary: {
                totalAmount,
                saleCount: items.length,
                paymentLinkedCount: items.filter(s => s.kind === 'payment').length,
                manualCount: items.filter(s => s.kind === 'manual').length
            },
            items
        });
    } catch (error) {
        console.error('getLocalObituarySales error:', error);
        res.status(500).json({ error: '판매 내역을 불러오지 못했습니다.', message: error.message });
    }
}

function postLocalObituarySale(req, res) {
    try {
        const bugoCode = String(req.body?.bugoCode || req.body?.obituaryId || '').trim();
        const token = String(req.body?.token || '').trim();
        const verified = verifyLocalObituaryBugoAccess(bugoCode, token);
        if (!verified || verified.access !== 'family') {
            res.status(403).json({ error: '내역 추가는 유가족 확인 링크(토큰)에서만 가능합니다.' });
            return;
        }

        const amount = Number(req.body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            res.status(400).json({ error: '금액을 올바르게 입력해주세요.' });
            return;
        }

        const title = String(req.body?.title || req.body?.productTitle || '장부 기록').trim() || '장부 기록';
        const payerName = String(req.body?.payerName || '').trim() || null;
        const note = String(req.body?.note || '').trim() || null;
        const timestamp = new Date().toISOString();

        const rows = readLocalObituarySales();
        rows.unshift({
            saleId: `man_${crypto.randomBytes(8).toString('hex')}`,
            obituaryId: bugoCode,
            kind: 'manual',
            orderId: null,
            title,
            amount,
            quantity: 1,
            status: 'recorded',
            payerName,
            note,
            createdAt: timestamp,
            paidAt: timestamp
        });
        writeLocalObituarySales(rows);

        res.status(200).json({ success: true, message: '내역이 추가되었습니다.' });
    } catch (error) {
        console.error('postLocalObituarySale error:', error);
        res.status(500).json({ error: '내역 추가 중 오류가 발생했습니다.', message: error.message });
    }
}

function getLocalMortuaryMessages(req, res) {
    try {
        res.status(200).json({
            success: true,
            templates: getMortuaryMessageTemplates()
        });
    } catch (error) {
        console.error('getLocalMortuaryMessages error:', error);
        res.status(500).json({ error: '메시지 목록을 불러오지 못했습니다.', message: error.message });
    }
}

function getLocalMortuaryMessageLogs(req, res) {
    try {
        const bugoCode = String(req.query.bugoCode || req.query.obituaryId || '').trim();
        const token = String(req.query.token || '').trim();
        const verified = verifyLocalObituaryBugoAccess(bugoCode, token);
        if (!verified || verified.access !== 'family') {
            res.status(403).json({ error: '발송 이력은 유가족 확인 링크로만 확인할 수 있습니다.' });
            return;
        }

        const logs = readLocalMortuaryMessageLogs()
            .filter(row => row.obituaryId === bugoCode)
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .slice(0, 50);

        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('getLocalMortuaryMessageLogs error:', error);
        res.status(500).json({ error: '이력을 불러오지 못했습니다.', message: error.message });
    }
}

function postLocalSendMortuaryMessage(req, res) {
    try {
        const bugoCode = String(req.body?.bugoCode || req.body?.obituaryId || '').trim();
        const token = String(req.body?.token || '').trim();
        const verified = verifyLocalObituaryBugoAccess(bugoCode, token);
        if (!verified || verified.access !== 'family') {
            res.status(403).json({ error: '메시지 발송은 유가족 확인 링크에서만 가능합니다.' });
            return;
        }

        const phase = String(req.body?.phase || '').toLowerCase() === 'after' ? 'after' : 'during';
        const templateId = String(req.body?.templateId || '').trim();
        const customBody = String(req.body?.customBody || '').trim();
        const messageBody = resolveMortuaryMessageBody(phase, templateId, customBody);

        if (!messageBody) {
            res.status(400).json({ error: '보낼 메시지를 선택하거나 직접 입력해주세요.' });
            return;
        }

        const drafts = readLocalObituaryDrafts();
        const draft = drafts.find(d => d.obituaryId === bugoCode);
        if (!draft) {
            res.status(404).json({ error: '부고 정보를 찾을 수 없습니다.' });
            return;
        }

        const mourners = Array.isArray(draft.mourners) ? draft.mourners : [];
        const sendToAll = req.body?.sendToAllMourners !== false;
        let selected = mourners;
        if (!sendToAll && Array.isArray(req.body?.mournerIndices)) {
            const idxSet = new Set(req.body.mournerIndices.map(n => Number(n)).filter(n => !Number.isNaN(n)));
            selected = mourners.filter((_, i) => idxSet.has(i));
        }

        if (!selected.length) {
            res.status(400).json({ error: '메시지를 보낼 상주를 선택해주세요.' });
            return;
        }

        const timestamp = new Date().toISOString();
        const logId = `mm_${crypto.randomBytes(8).toString('hex')}`;
        const preview = messageBody.length > 120 ? `${messageBody.slice(0, 120)}…` : messageBody;
        const rows = readLocalMortuaryMessageLogs();
        rows.unshift({
            logId,
            obituaryId: bugoCode,
            phase,
            templateId: templateId || null,
            messagePreview: preview,
            recipientCount: selected.length,
            recipientNames: selected.map(m => m.name || '상주').slice(0, 20),
            status: 'demo_simulated',
            createdAt: timestamp
        });
        writeLocalMortuaryMessageLogs(rows);

        res.status(200).json({
            success: true,
            message: '요청이 접수되었습니다. 실제 카카오·문자 발송은 알림 연동 후 전송됩니다.',
            logId,
            phase,
            recipientCount: selected.length,
            demoMode: true
        });
    } catch (error) {
        console.error('postLocalSendMortuaryMessage error:', error);
        res.status(500).json({ error: '메시지 처리 중 오류가 발생했습니다.', message: error.message });
    }
}

app.get('/api/funeral-halls', handleFuneralHalls);
app.get('/api/funeralHalls', handleFuneralHalls);
app.post('/api/checkout/register-session', registerCheckoutSessionApi);
app.post('/api/checkout/bank-transfer', bankTransferCheckoutApi);
app.post('/api/admin/orders/confirm-bank-deposit', confirmBankDepositApi);
app.get('/api/cron/purge-sensitive-data', purgeSensitiveDataCronApi);
app.get('/api/orders/:orderId/status', getOrderPublicStatusApi);
app.post('/api/orders/:orderId/retry-dispatch', retryOrderDispatchApi);
app.post('/api/orders/:orderId/request-refund', requestOrderRefundApi);
app.get('/api/ping-config-send-from', getPingSendFromConfigApi);
app.post('/api/orders/:orderId/issue-cash-receipt', issueCashReceiptApi);
app.post('/api/payment/points-only', pointsOnlyPaymentApi);
app.post('/api/toss/confirm-payment', confirmTossPaymentApi);
app.post('/api/approvePayment', approveLocalPayment);
app.get('/api/getOrderStatus', getLocalOrderStatus);
app.post('/api/obituaries', createLocalObituaryDraft);
app.post('/api/createObituaryDraft', createLocalObituaryDraft);
app.get('/api/obituary-entry', getLocalObituaryEntry);
app.get('/api/getObituaryEntry', getLocalObituaryEntry);
app.get('/api/getObituarySales', getLocalObituarySales);
app.post('/api/postObituarySale', postLocalObituarySale);
app.get('/api/getMortuaryMessages', getLocalMortuaryMessages);
app.get('/api/getMortuaryMessageLogs', getLocalMortuaryMessageLogs);
app.post('/api/sendMortuaryMessage', postLocalSendMortuaryMessage);
app.post('/api/obituary-entry/approve', approveLocalObituaryEntry);
app.post('/api/approveObituaryEntry', approveLocalObituaryEntry);
app.post('/api/webhookHandler', handleLocalWebhook);
app.post('/api/verify-account-holder', verifyAccountHolder);
app.post('/api/leads', postMarketingLead);
app.post('/api/marketing/cookie-sync', postMarketingCookieSync);

async function handleBugoFuneralImport(req, res) {
    try {
        const url = req.body && req.body.url;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ ok: false, error: 'url이 필요합니다.' });
        }
        const result = await bugoImport.importFuneralPageFromUrl(url);
        res.json({
            ok: true,
            provider: result.provider || bugoImport.PROVIDER_ID,
            url: result.url,
            parsed: result.parsed,
            messageBody: result.messageBody,
            messageBodyTemplate2: result.messageBodyTemplate2
        });
    } catch (e) {
        console.warn('부고 가져오기(bugo):', e && e.message ? e.message : e);
        res.status(400).json({
            ok: false,
            error: (e && e.message) || '부고 정보를 가져오지 못했습니다.'
        });
    }
}

/** 부고 가져오기 — 외부 부고 URL (`bugo-import.js`: 우리부고 HTML · 모두부고 JSON). */
app.post('/api/import/bugo-funeral', handleBugoFuneralImport);
/** 이전 경로 호환 */
app.post('/api/import/wooribugo-funeral', handleBugoFuneralImport);


app.post('/api/auth/register', (req, res) => {
    Promise.resolve(memberAuth.registerHandler(req, res)).catch(err => {
        console.error('register async error:', err);
        if (!res.headersSent) res.status(500).json({ ok: false, error: '회원가입 처리 중 오류가 발생했습니다.' });
    });
});
app.post('/api/auth/login', memberAuth.loginHandler);
app.get('/api/auth/me', memberAuth.meHandler);
app.post('/api/auth/logout', memberAuth.logoutHandler);
app.post('/api/auth/verify-email', memberAuth.verifyEmailHandler);
app.post('/api/auth/resend-verification', (req, res) => {
    Promise.resolve(memberAuth.resendVerificationHandler(req, res)).catch(err => {
        console.error('resend-verification async error:', err);
        if (!res.headersSent) res.status(500).json({ ok: false, error: '요청 처리 중 오류가 발생했습니다.' });
    });
});

/** 카카오 로그인 · 카카오싱크 OAuth */
app.get('/api/auth/kakao/config', kakaoAuth.configHandler);
app.get('/api/auth/kakao/authorize', kakaoAuth.authorizeHandler);
app.get('/api/auth/kakao/callback', kakaoAuth.callbackHandler);
app.get('/api/auth/kakao/business/callback', kakaoAuth.businessCallbackHandler);
app.post('/api/auth/kakao/exchange', kakaoAuth.exchangeHandler);

/** 비회원 본인확인(Solapi 문자 6자리) · 관리자 앱 설정 */
app.get('/api/guest-auth/config', guestSmsAuth.guestAuthPublicConfigHandler);
app.post('/api/guest-auth/send-code', guestSmsAuth.sendCodeHandler);
app.post('/api/guest-auth/verify-code', guestSmsAuth.verifyCodeHandler);
app.get('/api/admin/app-settings', guestSmsAuth.adminAppSettingsGetHandler);
app.patch('/api/admin/app-settings', guestSmsAuth.adminAppSettingsPatchHandler);

function getLocalCouponAdminSecret() {
    return process.env.PING_COUPON_ADMIN_SECRET || '';
}

const localSendCouponHandlers = sendCouponApi.createLocalJsonHandlers(
    LOCAL_SEND_COUPONS_STORE,
    fs,
    getLocalCouponAdminSecret
);

app.get('/api/sendCouponAdmin', (req, res) => localSendCouponHandlers.adminHandler(req, res));
app.post('/api/sendCouponAdmin', (req, res) => localSendCouponHandlers.adminHandler(req, res));
app.patch('/api/sendCouponAdmin', (req, res) => localSendCouponHandlers.adminHandler(req, res));
app.post('/api/validateSendCoupon', (req, res) => localSendCouponHandlers.validateHandler(req, res));
app.post('/api/consumeSendCoupon', (req, res) => localSendCouponHandlers.consumeHandler(req, res));

app.post('/api/referral/register', referralApi.registerHandler);
app.post('/api/referral/friend-visit', referralApi.friendVisitHandler);
app.get('/api/referral/balance', referralApi.balanceHandler);

app.post('/api/reward/engage-countdown', benefitsApi.engageCountdownHandler);
app.post('/api/reward/member-welcome', benefitsApi.memberWelcomeHandler);
app.post('/api/invite/friend-submit', benefitsApi.friendSubmitHandler);
app.get('/api/reward/summary', benefitsApi.summaryHandler);

if (!PING_EXPRESS_API_ONLY) {
app.use('/_next', proxyToNextDevServer);
app.use('/kakao-pay-code-send', proxyToNextDevServer);
app.use('/intro', proxyToNextDevServer);
app.use('/guide/naver-contacts', proxyToNextDevServer);
app.use('/checkout', proxyToNextDevServer);
app.use('/payment-success', proxyToNextDevServer);
app.use('/send/url', proxyToNextDevServer);
app.use('/send/payments', proxyToNextDevServer);
app.use('/member-login', proxyToNextDevServer);
app.use('/login', proxyToNextDevServer);
app.use('/mypage', proxyToNextDevServer);
app.use('/start', proxyToNextDevServer);
app.use('/obituary', proxyToNextDevServer);
app.use('/mourner-info', proxyToNextDevServer);
app.use('/memorial', proxyToNextDevServer);
app.use('/admin', proxyToNextDevServer);
app.use('/legal', proxyToNextDevServer);
app.use('/saas', proxyToNextDevServer);
app.use('/stitch-wave', proxyToNextDevServer);
app.use('/setup-finish', proxyToNextDevServer);
app.use('/ping-cx-flow', proxyToNextDevServer);
app.use('/overview', proxyToNextDevServer);
app.use('/products', proxyToNextDevServer);
app.use('/customer-center', proxyToNextDevServer);
app.use('/partnership', proxyToNextDevServer);
app.use('/pricing', proxyToNextDevServer);
app.use('/inquiry-board', proxyToNextDevServer);
app.use('/tech-blog', proxyToNextDevServer);
app.use('/obituary-create', proxyToNextDevServer);
app.use('/obituary-form', proxyToNextDevServer);
app.use('/obituary-signup-terms', proxyToNextDevServer);
app.use('/obituary-signup-register', proxyToNextDevServer);
app.use('/obituary-verify-email', proxyToNextDevServer);
app.use('/obituary-guest-verify', proxyToNextDevServer);
app.use('/api/condolence', proxyToNextDevServer);
app.use('/api/contacts', proxyToNextDevServer);
}

if (!PING_EXPRESS_API_ONLY) {
/** API 라우트 다음에 두어 POST /api/... 가 정적·폴백 HTML로 가지 않도록 함 */
app.use(express.static('.', {
    setHeaders: (res, filePath) => {
        if (String(filePath).endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
        }
    }
}));
}

/** Next HMR WebSocket — :3000(Express) 사용 시에도 새로고침/HMR 동작 */
function attachNextDevUpgradeProxy(httpServer) {
  const net = require('net');
  httpServer.on('upgrade', (req, clientSocket, head) => {
    const url = req.url || '';
    if (!url.startsWith('/_next')) {
      clientSocket.destroy();
      return;
    }
    const proxy = net.connect(
      { port: NEXT_DEV_PROXY_PORT, host: '127.0.0.1' },
      () => {
        const lines = Object.keys(req.headers || {})
          .filter((k) => req.headers[k] != null)
          .map((k) => `${k}: ${req.headers[k]}`);
        proxy.write(
          `${req.method || 'GET'} ${url} HTTP/1.1\r\n${lines.join('\r\n')}\r\n\r\n`,
        );
        if (head && head.length) proxy.write(head);
        proxy.pipe(clientSocket);
        clientSocket.pipe(proxy);
      },
    );
    proxy.on('error', () => clientSocket.destroy());
    clientSocket.on('error', () => proxy.destroy());
  });
}

const listenHost = PING_EXPRESS_API_ONLY ? "0.0.0.0" : undefined;
const server = app.listen(PORT, listenHost, () => {
    if (PING_EXPRESS_API_ONLY) {
        console.log(`PING Express API listening on :${PORT} (api-only)`);
        return;
    }
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Next dev UI: http://127.0.0.1:${NEXT_DEV_PROXY_PORT} (HMR 권장)`);
});
if (!PING_EXPRESS_API_ONLY) attachNextDevUpgradeProxy(server);
server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(
            `\n[PING] 포트 ${PORT} 사용 중입니다. 다른 터미널의 서버를 끄거나 해당 PID를 종료하세요.`
        );
        console.error(`  예: netstat -ano | findstr :${PORT}  →  taskkill /PID <PID> /F`);
        console.error(`  또는: set PORT=3001&& npm run dev (Windows CMD)\n`);
        process.exit(1);
        return;
    }
    throw err;
});
