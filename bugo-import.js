/**
 * 외부 부고 연동 — fetch·URL 검증·메시지 조립.
 * HTML/모두부고 API 파싱은 `lib/bugo-funeral-parse.cjs` (`src/lib/bugo-funeral-parse.ts` 소스).
 */

const { buildBugoFuneralMessage, buildBugoFuneralMessageFormal } = require('./bugo-message-template');
const {
    parseFuneralPageHtml,
    parseModubugoApiBody,
} = require('./lib/bugo-funeral-parse.cjs');
const {
    isModubugoHost,
    isSupportedFuneralImportUrl,
    extractModubugoUuidFromPathname,
} = require('./lib/bugo-import-url.cjs');

/** @deprecated 응답의 `provider` 필드는 경로별 값을 쓴다. */
const PROVIDER_ID = 'bugo-html-v1';
const PROVIDER_ID_WOORIBUGO = 'bugo-html-v1';
const PROVIDER_ID_MODUBUGO = 'bugo-modubugo-api-v1';

/** cheerio 파서가 허용하는 부고 view 호스트 — `lib/bugo-import-url-rules.json` */
const ALLOWED_HOSTS = new Set(require('./lib/bugo-import-url-rules.json').allowedHosts);

const MODUBUGO_PUBLIC_API = 'https://kbugo-dev.daqda.kr/api/v1/bugo/';

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHttpGet(url, opts) {
    const {
        headers = {},
        timeout = 25000,
        maxBytes = 3 * 1024 * 1024,
        validateStatus = (status) => status >= 200 && status < 300,
        parseJson = false,
    } = opts || {};

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal,
            redirect: 'follow',
        });
        if (!validateStatus(res.status)) {
            return { status: res.status, data: null };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > maxBytes) {
            throw new Error('Response too large');
        }
        const text = buf.toString('utf8');
        const data = parseJson ? JSON.parse(text) : text;
        return { status: res.status, data };
    } catch (e) {
        if (e && e.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

async function importModubugoFuneralFromPageUrl(safePageUrl) {
    const u = new URL(safePageUrl);
    const uuid = extractModubugoUuidFromPathname(u.pathname);
    if (!uuid) {
        throw new Error('모두부고 부고 페이지 주소 형식이 올바르지 않습니다.');
    }
    const apiUrl = MODUBUGO_PUBLIC_API + uuid;
    let res;
    try {
        res = await fetchHttpGet(apiUrl, {
            headers: {
                'User-Agent': UA,
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 25000,
            maxBytes: 2 * 1024 * 1024,
            validateStatus: function () {
                return true;
            },
            parseJson: true,
        });
    } catch (e) {
        throw new Error(
            '모두부고 정보를 불러오지 못했습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요.'
        );
    }
    if (res.status !== 200) {
        throw new Error(
            '모두부고 정보를 불러오지 못했습니다. 주소가 맞는지, 공개 중인 부고인지 확인해 주세요.'
        );
    }
    const parsed = parseModubugoApiBody(res.data);
    const messageBody = buildBugoFuneralMessage(parsed, { linkToken: safePageUrl });
    const messageBodyTemplate2 = buildBugoFuneralMessageFormal(parsed, { linkUrl: safePageUrl });
    return {
        provider: PROVIDER_ID_MODUBUGO,
        url: safePageUrl,
        parsed: parsed,
        messageBody: messageBody,
        messageBodyTemplate2: messageBodyTemplate2
    };
}

function assertSafeFuneralImportUrl(url) {
    let u;
    try {
        u = new URL(String(url).trim());
    } catch (e) {
        throw new Error('URL 형식이 올바르지 않습니다.');
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        throw new Error('허용되지 않는 주소입니다.');
    }
    const host = u.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) {
        throw new Error('지원하는 부고 페이지 주소만 가져올 수 있습니다.');
    }
    if (!isSupportedFuneralImportUrl(u.toString())) {
        throw new Error('지원하는 부고 페이지 주소 형식이 아닙니다. 우리부고·모두부고 공개 부고 링크인지 확인해 주세요.');
    }
    return u.toString();
}

/** @deprecated {@link buildBugoFuneralMessage} 사용 */
function buildBulkSmsFromFuneralData(data, opts) {
    return buildBugoFuneralMessage(data, opts);
}

async function importWooribugoFuneralHtmlFromUrl(safeUrl) {
    const res = await fetchHttpGet(safeUrl, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
        timeout: 25000,
        maxBytes: 3 * 1024 * 1024,
        validateStatus: function (s) {
            return s >= 200 && s < 400;
        },
    });
    const html = typeof res.data === 'string' ? res.data : String(res.data || '');
    if (!html) {
        throw new Error('부고 페이지를 불러오지 못했습니다.');
    }
    if (/발인 되어 더이상 확인 불가능|더이상 확인 불가능한 페이지/i.test(html)) {
        throw new Error(
            '이 부고 페이지는 발인이 끝나 더 이상 열리지 않습니다. 우리부고에서 최신 view 주소를 확인하거나, 문자 본문을 직접 입력해 주세요.'
        );
    }
    if (html.length < 200) {
        throw new Error('부고 페이지를 불러오지 못했습니다. 주소가 맞는지, 공개 중인 부고인지 확인해 주세요.');
    }
    const parsed = parseFuneralPageHtml(html);
    const messageBody = buildBugoFuneralMessage(parsed, { linkToken: safeUrl });
    const messageBodyTemplate2 = buildBugoFuneralMessageFormal(parsed, { linkUrl: safeUrl });
    return {
        provider: PROVIDER_ID_WOORIBUGO,
        url: safeUrl,
        parsed: parsed,
        messageBody: messageBody,
        messageBodyTemplate2: messageBodyTemplate2
    };
}

async function importFuneralPageFromUrl(url) {
    const safeUrl = assertSafeFuneralImportUrl(url);
    const u = new URL(safeUrl);
    const host = u.hostname.toLowerCase();
    if (isModubugoHost(host)) {
        return importModubugoFuneralFromPageUrl(safeUrl);
    }
    return importWooribugoFuneralHtmlFromUrl(safeUrl);
}

module.exports = {
    PROVIDER_ID,
    PROVIDER_ID_WOORIBUGO,
    PROVIDER_ID_MODUBUGO,
    ALLOWED_HOSTS,
    isSupportedFuneralImportUrl,
    assertSafeFuneralImportUrl,
    parseFuneralPageHtml,
    parseModubugoApiBody,
    buildBulkSmsFromFuneralData,
    buildBugoFuneralMessage,
    importFuneralPageFromUrl
};
