const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const LOCAL_FILES = [
    path.join(ROOT_DIR, 'obituary-drafts.local.json'),
    path.join(ROOT_DIR, 'payment-orders.local.json'),
    path.join(ROOT_DIR, 'obituary-sales.local.json'),
    path.join(ROOT_DIR, 'mortuary-message-logs.local.json'),
    path.join(ROOT_DIR, 'members.local.json'),
    path.join(ROOT_DIR, 'auth-sessions.local.json')
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 10000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return;
            }
        } catch (error) {
            // Keep polling until timeout.
        }

        await sleep(250);
    }

    throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function getJson(url) {
    const response = await fetch(url);
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(`GET ${url} failed: ${JSON.stringify(body)}`);
    }

    return body;
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`POST ${url} failed: ${JSON.stringify(body)}`);
    }

    return body;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function extractToken(url) {
    const parsed = new URL(url);
    return parsed.searchParams.get('token');
}

async function verifyStaticPages() {
    const pages = [
        '/start',
        '/obituary-create',
        '/obituary/review',
        '/obituary/public',
        '/obituary/send',
        '/obituary/sales',
        '/obituary/mortuary',
        '/legal/terms-of-service',
        '/admin/monitoring',
        '/memorial/list',
        '/mourner-info',
    ];

    for (const page of pages) {
        const response = await fetch(`${BASE_URL}${page}`);
        assert(response.ok, `${page} did not load successfully`);
    }
}

async function verifyAuthFlow() {
    const email = `smoke-auth-${Date.now()}@example.com`;
    const reg = await postJson(`${BASE_URL}/api/auth/register`, {
        email,
        password: 'Smokepass12!',
        displayName: 'Smoke',
        joinType: 'general'
    });
    assert(reg.ok === true, 'register should succeed');
    assert(typeof reg.token === 'string' && reg.user?.email === email, 'register should return token and user');

    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${reg.token}` }
    });
    const me = await meRes.json();
    assert(meRes.ok && me.ok && me.user?.email === email, '/api/auth/me should work with Bearer token');

    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: 'Otherpass12!',
            displayName: 'Dup',
            joinType: 'general'
        })
    });
    assert(dupRes.status === 409, 'duplicate register should return 409');

    const login = await postJson(`${BASE_URL}/api/auth/login`, {
        memberId: email,
        password: 'Smokepass12!'
    });
    assert(login.ok && login.token, 'login should succeed');

    const badRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: email, password: 'wrongpass' })
    });
    assert(badRes.status === 401, 'bad password should return 401');
}

async function verifyPaymentFlow() {
    const orderId = `smoke-order-${Date.now()}`;
    const paymentId = `smoke-payment-${Date.now()}`;
    const approved = await postJson(`${BASE_URL}/api/approvePayment`, {
        paymentId,
        merchant_uid: orderId,
        orderId,
        amount: 2200,
        count: 20
    });

    assert(approved.success === true, 'Local payment approval did not succeed');
    assert(approved.paymentData?.mock === true, 'Local payment mock flag missing');
    assert(approved.paymentId === paymentId, 'Local paymentId should round-trip through approvePayment');

    const status = await getJson(`${BASE_URL}/api/getOrderStatus?orderId=${encodeURIComponent(orderId)}`);
    assert(status.status === 'paid', 'Order status should be paid after approval');
    assert(Number(status.totalAmount) === 2200, 'Order amount mismatch after approval');
    assert(Number(status.count) === 20, 'Order count mismatch after approval');
    assert(status.paymentId === paymentId, 'Order status should retain paymentId');

    const webhook = await postJson(`${BASE_URL}/api/webhookHandler`, {
        orderId,
        paymentId,
        merchant_uid: orderId,
        imp_uid: approved.imp_uid,
        status: 'paid',
        amount: 2200,
        count: 20
    });

    assert(webhook.success === true, 'Local webhook did not return success');

    const statusAfterWebhook = await getJson(`${BASE_URL}/api/getOrderStatus?orderId=${encodeURIComponent(orderId)}`);
    assert(statusAfterWebhook.status === 'paid', 'Order status should remain paid after webhook');
    assert(statusAfterWebhook.paymentId === paymentId, 'Webhook should preserve paymentId');
}

function startNextProductionServer(port = 3002) {
    const nextBin = path.join(ROOT_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
    if (!fs.existsSync(nextBin)) {
        throw new Error('Next CLI missing — run npm install');
    }
    return spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(port)], {
        cwd: ROOT_DIR,
        env: { ...process.env },
        stdio: 'pipe',
    });
}

async function verifyNextAppRoutes(port = 3002) {
    const base = `http://127.0.0.1:${port}`;
    await waitForServer(`${base}/send/url`, 90000);
        const home = await fetch(`${base}/`);
        assert(home.ok, 'Next / should return 200');
        const homeBody = await home.text();
        assert(
            homeBody.includes('PING') || homeBody.includes('intro') || homeBody.includes('bulk'),
            'Next / should include home shell'
        );
        const startEntry = await fetch(`${base}/start`);
        assert(startEntry.ok, 'Next /start should return 200');
        const startBody = await startEntry.text();
        assert(
            startBody.includes('bulk-entry') || startBody.includes('bulk') || startBody.includes('PING'),
            'Next /start should include bulk entry shell'
        );
        const bulkRedirect = await fetch(`${base}/bulk`, { redirect: 'manual' });
        assert(
            bulkRedirect.status === 308 || bulkRedirect.status === 301 || bulkRedirect.status === 307,
            'Next /bulk should redirect to /start'
        );
        const send = await fetch(`${base}/send/url`);
        assert(send.ok, 'Next /send/url should return 200');
        const sendBody = await send.text();
        assert(
            sendBody.includes('부고 주소') || sendBody.includes('send-url'),
            'Next /send/url should include 부고 주소 UI'
        );
        const intro = await fetch(`${base}/intro`);
        assert(intro.ok, 'Next /intro should return 200');
        const loginPage = await fetch(`${base}/login`);
        assert(loginPage.ok, 'Next /login should return 200');
        const loginBody = await loginPage.text();
        assert(
            loginBody.includes('login') || loginBody.includes('PING') || loginBody.includes('로그인'),
            'Next /login should serve login shell'
        );
        const memberLogin = await fetch(`${base}/member-login`);
        assert(memberLogin.ok, 'Next /member-login should return 200');
        const memberLoginBody = await memberLogin.text();
        assert(
            memberLoginBody.includes('member-login') ||
                memberLoginBody.includes('PING') ||
                memberLoginBody.includes('로그인'),
            'Next /member-login should serve shell'
        );
        const pay = await fetch(`${base}/send/payments`);
        assert(pay.ok, 'Next /send/payments');
        const checkout = await fetch(`${base}/checkout`);
        assert(checkout.ok, 'Next /checkout');
        const guestVerify = await fetch(`${base}/obituary-guest-verify`);
        assert(guestVerify.ok, 'Next /obituary-guest-verify should return 200');
        const checkoutHtml = await fetch(`${base}/checkout.html`, { redirect: 'manual' });
        assert(
            checkoutHtml.status === 308 || checkoutHtml.status === 301 || checkoutHtml.status === 307,
            'Next /checkout.html should redirect'
        );
        const checkoutHtmlLoc = checkoutHtml.headers.get('location') || '';
        assert(checkoutHtmlLoc.includes('/checkout'), '/checkout.html should redirect to /checkout');
        const sendDyn = await fetch(`${base}/obituary/send/smoke-id`);
        assert(sendDyn.ok, 'Next /obituary/send/:id should return 200');
        const sales = await fetch(`${base}/obituary/sales`);
        assert(sales.ok, 'Next /obituary/sales');
        const mort = await fetch(`${base}/obituary/mortuary/smoke-id`);
        assert(mort.ok, 'Next /obituary/mortuary/:id');
        const mortBody = await mort.text();
        assert(
            mortBody.includes('장례 메시지') || mortBody.includes('장례'),
            'Next mortuary page should include title copy'
        );
}

async function verifyLegacyHtmlRedirects() {
    const pairs = [
        ['/index.html', '/start'],
        ['/overview.html', '/products/ping'],
        ['/overview', '/products/ping'],
        ['/intro.html', '/intro'],
        ['/saas-landing.html', '/saas'],
    ];
    for (const [from, to] of pairs) {
        const response = await fetch(`${BASE_URL}${from}`, { redirect: 'manual' });
        assert(
            response.status === 301 || response.status === 308 || response.status === 307,
            `${from} should redirect (got ${response.status})`
        );
        const loc = response.headers.get('location') || '';
        assert(loc.includes(to), `${from} should redirect toward ${to}, got ${loc}`);
    }
}

async function verifyObituaryFlow() {
    const created = await postJson(`${BASE_URL}/api/createObituaryDraft`, {
        deceasedName: '스모크 테스트 고인',
        funeralHall: '스모크 테스트 장례식장',
        chiefMourner: '스모크 테스트 상주',
        familyPrimaryContact: {
            name: '홍길동',
            phone: '01012345678',
            channel: 'kakao'
        },
        mourners: [{ name: '김상주', relation: '맏아들', phone: '01099998888' }],
        notifyFamilyFirst: true
    });

    assert(created.success === true, 'Obituary draft creation failed');
    assert(created.status === 'family_review_pending', 'Unexpected obituary initial status');

    const reviewToken = extractToken(created.reviewUrl);
    const publicToken = extractToken(created.publicUrl);
    assert(reviewToken, 'Missing review token');
    assert(publicToken, 'Missing public token');
    assert(created.sendUrl, 'Missing sendUrl');
    assert(
        created.sendUrl.includes(`/obituary/send/${created.obituaryId}`),
        'sendUrl should include /obituary/send/:obituaryId'
    );

    const sendPage = await fetch(`${BASE_URL}/obituary/send/${created.obituaryId}`);
    assert(sendPage.ok, 'Pretty send path should serve obituary-send page');
    const sendHtml = await sendPage.text();
    assert(sendHtml.includes('부고 보내기'), 'Send page should contain title copy');

    const familyView = await getJson(`${BASE_URL}/api/getObituaryEntry?mode=family&token=${encodeURIComponent(reviewToken)}`);
    assert(familyView.canViewFull === true, 'Family view should show full obituary');
    assert(familyView.sendUrl, 'Family getObituaryEntry should include sendUrl');
    assert(familyView.salesUrl, 'Family getObituaryEntry should include salesUrl');
    assert(familyView.mortuaryUrl, 'Family getObituaryEntry should include mortuaryUrl');

    const mortuaryPage = await fetch(`${BASE_URL}/obituary/mortuary/${created.obituaryId}`);
    assert(mortuaryPage.ok, 'Mortuary path should serve HTML');
    const mortuaryHtml = await mortuaryPage.text();
    assert(mortuaryHtml.includes('장례 메시지'), 'Mortuary page should include title');

    const mortuaryTpl = await getJson(`${BASE_URL}/api/getMortuaryMessages`);
    assert(mortuaryTpl.templates?.during?.length >= 1, 'getMortuaryMessages should include during templates');

    await postJson(`${BASE_URL}/api/sendMortuaryMessage`, {
        bugoCode: created.obituaryId,
        token: reviewToken,
        phase: 'during',
        templateId: 'd_thanks',
        sendToAllMourners: true
    });
    const mortuaryLogs = await getJson(
        `${BASE_URL}/api/getMortuaryMessageLogs?bugoCode=${encodeURIComponent(created.obituaryId)}&token=${encodeURIComponent(reviewToken)}`
    );
    assert(mortuaryLogs.logs?.length >= 1, 'Mortuary send should create a log row');

    const salesPage = await fetch(`${BASE_URL}/obituary/sales`);
    assert(salesPage.ok, 'Obituary sales path should serve HTML');

    let salesData = await getJson(
        `${BASE_URL}/api/getObituarySales?bugoCode=${encodeURIComponent(created.obituaryId)}&token=${encodeURIComponent(reviewToken)}`
    );
    assert(salesData.success === true, 'getObituarySales should succeed');
    assert(salesData.canManage === true, 'Family token should allow manage');
    assert(Array.isArray(salesData.items), 'Sales items should be an array');

    await postJson(`${BASE_URL}/api/postObituarySale`, {
        bugoCode: created.obituaryId,
        token: reviewToken,
        amount: 50000,
        title: '스모크 부의 테스트'
    });
    salesData = await getJson(
        `${BASE_URL}/api/getObituarySales?bugoCode=${encodeURIComponent(created.obituaryId)}&token=${encodeURIComponent(reviewToken)}`
    );
    assert(salesData.items.length >= 1, 'Manual sale should appear in list');
    assert(Number(salesData.summary.totalAmount) >= 50000, 'Summary should include manual amount');
    assert(familyView.familyPrimaryContact?.phone === '01012345678', 'Family contact should be exposed in family mode');

    const publicBefore = await getJson(`${BASE_URL}/api/getObituaryEntry?mode=public&token=${encodeURIComponent(publicToken)}`);
    assert(publicBefore.canViewFull === false, 'Public view should be hidden before approval');
    assert(publicBefore.obituary === null, 'Public obituary should be null before approval');
    assert(publicBefore.familyPrimaryContact === null, 'Public family contact should be hidden');

    const approved = await postJson(`${BASE_URL}/api/approveObituaryEntry`, {
        token: reviewToken,
        reviewerName: '홍길동',
        reviewNote: '스모크 테스트 승인'
    });
    assert(approved.obituaryId === created.obituaryId, 'Approved obituary id mismatch');
    assert(approved.status === 'published', 'Obituary status should become published');

    const publicAfter = await getJson(`${BASE_URL}/api/getObituaryEntry?mode=public&token=${encodeURIComponent(publicToken)}`);
    assert(publicAfter.canViewFull === true, 'Public view should open after approval');
    assert(publicAfter.obituary?.deceasedName, 'Public obituary should be present after approval');
    assert(publicAfter.familyPrimaryContact === null, 'Public family contact should remain hidden');
}

function cleanupLocalFiles() {
    for (const target of LOCAL_FILES) {
        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
        }
    }
}

async function stopServer(child) {
    if (!child || child.killed) {
        return;
    }

    child.kill();
    await sleep(500);
}

async function main() {
    cleanupLocalFiles();

    const nextProcess = startNextProductionServer(3002);
    const serverProcess = spawn(process.execPath, ['server.js'], {
        cwd: ROOT_DIR,
        env: {
            ...process.env,
            PORT: String(PORT),
            NEXT_DEV_PORT: '3002',
            PING_SKIP_EMAIL_VERIFICATION: '1',
        },
        stdio: 'inherit',
    });

    try {
        await waitForServer(`${BASE_URL}/api/ping-health`);
        await verifyStaticPages();
        await verifyLegacyHtmlRedirects();
        await verifyAuthFlow();
        await verifyPaymentFlow();
        await verifyObituaryFlow();
        await verifyNextAppRoutes(3002);
        console.log('Smoke test passed');
    } finally {
        await stopServer(serverProcess);
        await stopServer(nextProcess);
        cleanupLocalFiles();
    }
}

main().catch(error => {
    console.error('Smoke test failed');
    console.error(error);
    process.exitCode = 1;
});
