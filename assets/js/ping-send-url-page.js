/**
 * /send/url.html — 부고 https 주소 입력 + 자동 파싱(Phase 5A).
 * 본문 편집기는 index.html 로 이어감(?bulkAfterUrl=1).
 * index.html 의 getBugoImportApiUrlCandidates / fetch / URL 규칙과 동기 유지(추후 공통 모듈로 합칠 수 있음).
 */
;(function (global) {
    'use strict';

    function getBugoImportApiUrlCandidates() {
        var paths = ['/api/import/bugo-funeral', '/api/import/wooribugo-funeral'];
        var seen = {};
        var out = [];
        function addBase(base) {
            if (!base) return;
            base = String(base).trim().replace(/\/+$/, '');
            if (!base) return;
            for (var pi = 0; pi < paths.length; pi++) {
                var full = base + paths[pi];
                if (!seen[full]) {
                    seen[full] = 1;
                    out.push(full);
                }
            }
        }
        try {
            var pc = global.__PING_PORTONE_CONFIG__ || {};
            var cfgBo = String(pc.backendApiOrigin || '')
                .trim()
                .replace(/\/+$/, '');
            if (cfgBo) addBase(cfgBo);
        } catch (eCfg) {}
        try {
            if (global.location.protocol === 'file:') {
                addBase('http://localhost:3000');
                addBase('http://127.0.0.1:3000');
                return out;
            }
            addBase(global.location.origin);
            addBase('http://localhost:3000');
            addBase('http://127.0.0.1:3000');
        } catch (eOrig) {
            addBase('http://localhost:3000');
        }
        return out;
    }

    function fetchBugoImportWithFallback(normalized) {
        var urls = getBugoImportApiUrlCandidates();
        function step(i) {
            if (i >= urls.length) {
                return Promise.reject(
                    new Error(
                        '부고 가져오기 API에 연결하지 못했습니다. `npm run dev`로 서버(기본 3000)를 실행했는지 확인하거나, 정적 사이트만 쓰는 경우 서버 .env에 PING_BACKEND_API_ORIGIN을 넣어 주세요.'
                    )
                );
            }
            var apiUrl = urls[i];
            return fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: normalized }),
            }).then(
                function (res) {
                    return res.text().then(function (text) {
                        var data;
                        try {
                            data = JSON.parse(text);
                        } catch (parseErr) {
                            var looksHtml =
                                /^\s*</.test(text) ||
                                text.indexOf('<!DOCTYPE') !== -1 ||
                                text.indexOf('<!doctype') !== -1;
                            if (looksHtml && i + 1 < urls.length) {
                                return step(i + 1);
                            }
                            throw new Error(
                                '서버가 JSON 대신 웹 페이지를 돌려줬습니다. 같은 PC에서 `npm run dev`(기본 포트 3000)로 열었는지 확인해 주세요.'
                            );
                        }
                        return { res: res, data: data };
                    });
                },
                function (fetchErr) {
                    if (i + 1 < urls.length) return step(i + 1);
                    return Promise.reject(fetchErr);
                }
            );
        }
        return step(0);
    }

    function extractFirstHttpsUrl(raw) {
        if (raw == null || raw === '') return null;
        var m = String(raw).match(/https:\/\/[^\s<>"')\]}]+/i);
        if (!m) return null;
        return m[0].replace(/[.,;]+$/g, '');
    }

    function normalizeExternalObituaryUrl(raw) {
        var extracted = extractFirstHttpsUrl(raw);
        if (extracted) return extracted;
        return String(raw == null ? '' : raw).replace(/\s/g, '').trim();
    }

    function isValidExternalObituaryUrl(s) {
        if (!s || /\s/.test(s)) return false;
        try {
            var u = new URL(s);
            return u.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    function isBugoFuneralImportUrl(raw) {
        if (!raw || typeof raw !== 'string') return false;
        try {
            var u = new URL(String(raw).trim());
            var h = u.hostname.toLowerCase();
            if (h === 'wooribugo4.com' || h === 'www.wooribugo4.com') {
                return u.pathname.toLowerCase().indexOf('/page/funeral/view') !== -1;
            }
            if (h === 'modubugo.com' || h === 'www.modubugo.com') {
                return /^\/bugo\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(
                    u.pathname
                );
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    function sanitizeBulkSmsBodyText(s) {
        var t = String(s || '');
        t = t.replace(/삼가\s*고인의\s*명복을\s*빕니다\.?/g, '삼가 명복을 빕니다.');
        t = t.replace(/(^|\r?\n)(\s*)고인\s+/gm, '$1$2');
        return t;
    }

    function readPingFromIndex() {
        try {
            var raw = sessionStorage.getItem('ping_from_index');
            return raw ? JSON.parse(raw) || {} : {};
        } catch (e) {
            return {};
        }
    }

    function writePingFromIndex(prev) {
        try {
            prev.ts = Date.now();
            sessionStorage.setItem('ping_from_index', JSON.stringify(prev));
        } catch (e) {
            console.warn('ping_from_index 저장 실패', e);
        }
    }

    function shouldSkipBugoImportForUrl(normalized, lastImportedUrl) {
        if (!normalized || !isBugoFuneralImportUrl(normalized)) return false;
        if (lastImportedUrl === normalized) return true;
        try {
            var prev = readPingFromIndex();
            var bi = prev.bugoImport;
            if (!bi || !bi.url) return false;
            if (normalizeExternalObituaryUrl(String(bi.url)) !== normalized) return false;
            var draft = prev.bulkSmsMessageDraft;
            if (draft != null && String(draft).trim().length > 0) return true;
        } catch (eSk) {}
        return false;
    }

    function computeBulkSmsTitleFromParsed(parsed, messageBody) {
        var dn = parsed && parsed.deceasedName ? String(parsed.deceasedName) : '';
        dn = dn.replace(/^故\s*/, '').trim();
        if (!dn && messageBody) {
            var mb = String(messageBody);
            var m1 = mb.match(/^故\s*([^(]+?)님(?:\(|(\r?\n)|$)/);
            if (m1) dn = String(m1[1] || '').replace(/^故\s*/, '').trim();
        }
        if (!dn && messageBody) {
            var mb2 = String(messageBody);
            var m2 = mb2.match(/故\s*([^\s\r\n(]+?)(?:님|\(|$|\r|\n)/);
            if (m2) dn = String(m2[1] || '').replace(/님$/, '').trim();
        }
        if (dn) {
            return ('故 ' + dn + '님의 부고를 전해드립니다.').slice(0, 40);
        }
        if (messageBody && String(messageBody).trim()) {
            var lines = String(messageBody).split(/\r?\n/);
            var first = '';
            for (var li = 0; li < lines.length; li++) {
                var t = String(lines[li] || '').trim();
                if (t.length) {
                    first = t;
                    break;
                }
            }
            if (first) {
                var clipped = first.replace(/\s+/g, ' ').slice(0, 22);
                var suffix = first.length > 22 ? '… ' : ' ';
                return (clipped + suffix + '부고 안내').slice(0, 40);
            }
        }
        return '삼가 부고를 전해드립니다.'.slice(0, 40);
    }

    function persistObituaryUrlOnly(prev, normalized) {
        prev.obituaryPageUrl = normalized;
        prev.bulkFlowKind = 'obituary';
        prev.smsTemplateId = prev.smsTemplateId || '1';
        writePingFromIndex(prev);
    }

    function applyBugoImportToSession(normalized, data) {
        var msgB = data.messageBody;
        if (msgB && normalized) msgB = String(msgB).replace(/\{\{LINK\}\}/g, normalized);
        var msgClean = msgB && String(msgB).trim() ? sanitizeBulkSmsBodyText(msgB) : '';
        var parsedB = data.parsed;
        var title = computeBulkSmsTitleFromParsed(parsedB, msgClean);
        var prev = readPingFromIndex();
        prev.obituaryPageUrl = normalized;
        prev.bugoImport = { url: data.url, at: Date.now(), parsed: data.parsed };
        prev.smsTemplateId = '1';
        if (msgClean) prev.bulkSmsTemplate1Snapshot = msgClean;
        var t2 = data.messageBodyTemplate2;
        if (t2 && normalized) t2 = String(t2).replace(/\{\{LINK\}\}/g, normalized);
        var t2Clean = t2 && String(t2).trim() ? sanitizeBulkSmsBodyText(String(t2)) : '';
        if (t2Clean) prev.bulkSmsTemplate2Snapshot = t2Clean;
        if (msgClean) prev.bulkSmsMessageDraft = msgClean;
        prev.bulkSmsTitle = title;
        prev.bulkFlowKind = 'obituary';
        writePingFromIndex(prev);
    }

    var __importInFlight = false;
    var __lastImportedUrl = '';

    function showOverlay(loadingEl, on) {
        if (!loadingEl) return;
        loadingEl.classList.toggle('hidden', !on);
    }

    function init() {
        var inp = document.getElementById('send-url-field');
        var hint = document.getElementById('send-url-hint');
        var loading = document.getElementById('send-url-loading');
        var status = document.getElementById('send-url-status');
        var btnNext = document.getElementById('send-url-next');
        var btnPrev = document.getElementById('send-url-prev');

        if (!inp || !btnNext) {
            console.error('PingSendUrlPage: 필수 DOM 없음');
            return;
        }

        try {
            var prev0 = readPingFromIndex();
            if (prev0.obituaryPageUrl && !prev0.bulkFlowKind) prev0.bulkFlowKind = 'obituary';
            if (prev0.obituaryPageUrl) {
                inp.value = String(prev0.obituaryPageUrl);
                __lastImportedUrl = normalizeExternalObituaryUrl(inp.value);
            }
        } catch (e0) {}

        function updateHint() {
            if (!hint) return;
            var raw = inp.value;
            if (!String(raw).trim()) {
                hint.classList.add('hidden');
                return;
            }
            var v = normalizeExternalObituaryUrl(raw);
            if (isValidExternalObituaryUrl(v)) {
                hint.classList.add('hidden');
                return;
            }
            hint.textContent =
                'https:// 로 시작하는 부고 페이지 주소만 사용할 수 있습니다. 긴 문자를 붙여넣어도 그 안의 https 링크만 남습니다.';
            hint.classList.remove('hidden');
        }

        function onInput() {
            var v = normalizeExternalObituaryUrl(inp.value);
            if (!isBugoFuneralImportUrl(v)) __lastImportedUrl = '';
            updateHint();
        }

        function tryImportFromField() {
            var normalized = normalizeExternalObituaryUrl(inp.value);
            if (!isBugoFuneralImportUrl(normalized)) return Promise.resolve();
            if (shouldSkipBugoImportForUrl(normalized, __lastImportedUrl)) {
                __lastImportedUrl = normalized;
                if (status) status.textContent = '이미 가져온 부고 링크입니다.';
                return Promise.resolve();
            }
            if (__importInFlight) return Promise.resolve();
            __importInFlight = true;
            showOverlay(loading, true);
            if (status) status.textContent = '부고 페이지에서 본문을 가져오는 중…';
            return fetchBugoImportWithFallback(normalized)
                .then(function (pair) {
                    if (!pair.res.ok || !pair.data.ok) {
                        throw new Error(pair.data.error || '가져오기에 실패했습니다.');
                    }
                    applyBugoImportToSession(normalized, pair.data);
                    __lastImportedUrl = normalized;
                    if (status) status.textContent = '본문을 반영했습니다. 다음에서 문자를 확인·수정하세요.';
                })
                .catch(function (err) {
                    console.warn('bugo import', err);
                    alert(err.message || '스크래핑 연동에 실패했습니다.');
                    return Promise.reject(err);
                })
                .finally(function () {
                    __importInFlight = false;
                    showOverlay(loading, false);
                });
        }

        function onBlur() {
            var v = normalizeExternalObituaryUrl(inp.value);
            inp.value = v;
            updateHint();
            setTimeout(function () {
                tryImportFromField();
            }, 0);
        }

        function onPaste(ev) {
            var dt = ev.clipboardData || global.clipboardData;
            var text = dt ? dt.getData('text') : '';
            if (!text) return;
            ev.preventDefault();
            var v = extractFirstHttpsUrl(text) || '';
            inp.value = v;
            onInput();
            if (String(text).trim() && !v && hint) {
                hint.textContent =
                    '붙여넣은 내용에 https:// 로 시작하는 주소가 없습니다. 부고 페이지의 https 링크를 복사해 주세요.';
                hint.classList.remove('hidden');
            }
            setTimeout(function () {
                tryImportFromField();
            }, 0);
        }

        inp.addEventListener('input', onInput);
        inp.addEventListener('blur', onBlur);
        inp.addEventListener('paste', onPaste);
        updateHint();

        btnNext.addEventListener('click', function () {
            var v = normalizeExternalObituaryUrl(inp.value);
            inp.value = v;
            updateHint();
            if (!isValidExternalObituaryUrl(v)) {
                alert('부고 주소(https)를 확인해 주세요.');
                return;
            }
            tryImportFromField()
                .then(function () {
                    var prev = readPingFromIndex();
                    persistObituaryUrlOnly(prev, v);
                    global.location.href = '/start?bulkAfterUrl=1';
                })
                .catch(function () {});
        });

        if (btnPrev) {
            btnPrev.addEventListener('click', function () {
                global.location.href = '/start';
            });
        }
    }

    global.PingSendUrlPage = { init: init };
})(typeof window !== 'undefined' ? window : this);
