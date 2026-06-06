/**
 * 전역 참여 카운트다운: 활동 중일 때만 MM:SS 카운트 감소.
 * 가로 중앙 고정(left 50% + translateX -50%). 세로는 헤더 아래·본문 텍스트와 겹치지 않는 상단에 두고,
 * 스크롤 시 본문/헤더 기준으로 top을 갱신하며, 추가로 스크롤 깊이에 따라 중앙 쪽으로 살짝 이동(translateY).
 *
 * sessionStorage(ping_gcc_state_v1)로 남은 시간·마지막 상호작용 시각을 저장해
 * 리로드·페이지 이동(마이페이지 등)·적립 플로 복귀 후에도 이어서 진행됩니다.
 * checkout.html에는 스크립트가 없음(결제 화면 비표시). 결제 완료 페이지에서 상태 정리.
 */
(function () {
    /**
     * 체류 초(기본 15초) 카운트다운 포인트 — 사용 중지.
     * 회원 로그인 후 /checkout 최초 1회 50P·5,500원 증정 시트로 대체(checkout-member-welcome-sheet).
     */
    function clearEngageSessionStub() {
        try {
            sessionStorage.removeItem('ping_gcc_state_v1');
            sessionStorage.removeItem('ping_gcc_event_sent_v1');
            sessionStorage.removeItem('ping_gcc_complete_pending_v1');
        } catch (e4) {}
    }
    window.PingEngageCountdown = window.PingEngageCountdown || {};
    window.PingEngageCountdown.clearSession = clearEngageSessionStub;
    window.__pingGlobalEngageCountdownInstalled = true;
    return;

    /* —— LEGACY: 체류 초 카운트다운(비활성) ——
    // var PING_GCC_TOTAL_SEC = 15;
    // requestAnimationFrame(tick) … 활동 중일 때만 remaining -= dt
    —— */

    if (window.__pingGlobalEngageCountdownInstalled) return;

    var LS_PROMO_SEEN = 'ping_engage_promo_seen_v1';
    var SS_STATE = 'ping_gcc_state_v1';
    var SS_EVENT_SENT = 'ping_gcc_event_sent_v1';
    var SS_COMPLETE_PENDING = 'ping_gcc_complete_pending_v1';
    var STATE_VER = 1;

    var promoSeen = false;
    try {
        promoSeen = localStorage.getItem(LS_PROMO_SEEN) === '1';
    } catch (e0) {}

    function loadState() {
        try {
            var raw = sessionStorage.getItem(SS_STATE);
            if (!raw) return null;
            var o = JSON.parse(raw);
            if (!o || Number(o.v) !== STATE_VER) return null;
            return o;
        } catch (e1) {
            return null;
        }
    }

    function saveStateObj(obj) {
        try {
            sessionStorage.setItem(SS_STATE, JSON.stringify(obj));
        } catch (e2) {}
    }

    function markCompleteEventSent() {
        try {
            sessionStorage.setItem(SS_EVENT_SENT, '1');
        } catch (e3) {}
    }

    function clearEngageSession() {
        try {
            sessionStorage.removeItem(SS_STATE);
            sessionStorage.removeItem(SS_EVENT_SENT);
            sessionStorage.removeItem(SS_COMPLETE_PENDING);
        } catch (e4) {}
    }

    window.PingEngageCountdown = window.PingEngageCountdown || {};
    window.PingEngageCountdown.clearSession = clearEngageSession;

    /** 이미 리워드·적립 시트까지 본 경우 — 카운트다운 미표시 */
    if (promoSeen) {
        window.__pingGlobalEngageCountdownInstalled = true;
        return;
    }

    /** 운영에서 조정: 사이트 체류·활동 조건 요구 시간(초). 추후 정책 변경 시 수정. */
    var PING_GCC_TOTAL_SEC = typeof window.__PING_GCC_TOTAL_SEC === 'number' && window.__PING_GCC_TOTAL_SEC > 0
        ? Math.min(3600, Math.floor(window.__PING_GCC_TOTAL_SEC))
        : 15;
    var TOTAL_SEC = PING_GCC_TOTAL_SEC;
    /** 상호작용 간 최대 허용 공백(ms) — 초과 시 카운트 정지 */
    var ACTIVE_MS = 280;
    var gccDeltaMax = 0;
    var NAV_GAP_PX = 10;
    var CONTENT_GAP_PX = 12;
    var HEADER_TOP_IGNORE = 180;
    var SAFE_FALLBACK_TOP_PX = 64;

    var st = loadState();
    var remaining =
        st && typeof st.rem === 'number' && !isNaN(st.rem)
            ? Math.max(0, Math.min(TOTAL_SEC, Number(st.rem)))
            : TOTAL_SEC;
    var lastInteractionWall =
        st && typeof st.li === 'number' && !isNaN(st.li) ? Number(st.li) : 0;
    var finishedSaved = !!(st && st.f);
    var eventSent = false;
    try {
        eventSent = sessionStorage.getItem(SS_EVENT_SENT) === '1';
    } catch (e5) {}
    if (remaining <= 0) finishedSaved = true;

    /** 카운트가 끝난 뒤 리로드·이동: UI 없이 적립 시트만 이어가기 */
    if (finishedSaved || remaining <= 0) {
        window.__pingGlobalEngageCountdownInstalled = true;
        var completePending = false;
        try {
            completePending = sessionStorage.getItem(SS_COMPLETE_PENDING) === '1';
        } catch (e5b) {}
        if (!eventSent && (finishedSaved || completePending)) {
            try {
                sessionStorage.removeItem(SS_COMPLETE_PENDING);
            } catch (e5c) {}
            markCompleteEventSent();
            saveStateObj({
                v: STATE_VER,
                rem: 0,
                li: Date.now(),
                f: true,
            });
            setTimeout(function () {
                try {
                    window.dispatchEvent(new CustomEvent('ping:engage-countdown-complete'));
                } catch (e6) {}
            }, 0);
        }
        return;
    }

    window.__pingGlobalEngageCountdownInstalled = true;

    var lastSavePerf = 0;
    var SAVE_THROTTLE_MS = 320;

    function persistStatePartial() {
        saveStateObj({
            v: STATE_VER,
            rem: remaining,
            li: lastInteractionWall,
            f: false,
        });
    }

    function persistOnHide() {
        persistStatePartial();
    }

    function findHeaderBottomPx(mount) {
        var selectors = [
            '.index-header-sticky',
            '.mypage-head',
            '.header-container',
            '.ping-top-nav',
            'body > header',
            '[role="banner"]',
            'header',
        ];
        var bestBottom = 0;
        for (var s = 0; s < selectors.length; s++) {
            try {
                var nodes = document.querySelectorAll(selectors[s]);
                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[i];
                    if (!node || node === mount || (mount && mount.contains(node))) continue;
                    if (typeof node.getBoundingClientRect !== 'function') continue;
                    var cs = window.getComputedStyle(node);
                    if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) continue;
                    var r = node.getBoundingClientRect();
                    if (r.height < 12) continue;
                    if (r.top < -6) continue;
                    if (r.top > HEADER_TOP_IGNORE) continue;
                    if (r.width < 20 && r.height < 24) continue;
                    if (r.bottom > bestBottom) bestBottom = r.bottom;
                }
            } catch (eSel) {}
        }
        return bestBottom;
    }

    function findMainTopPx(mount) {
        var selectors = [
            'main',
            '[role="main"]',
            '.ping-main',
            '.mypage-main',
            '.ob-flow-main',
            '.overview-main',
        ];
        for (var i = 0; i < selectors.length; i++) {
            try {
                var el = document.querySelector(selectors[i]);
                if (!el || !el.isConnected || (mount && mount.contains(el))) continue;
                var r = el.getBoundingClientRect();
                if (r.height < 20 && r.width < 20) continue;
                return r.top;
            } catch (eM) {}
        }
        return null;
    }

    function syncGccTopBelowNav(mount) {
        if (!mount || !mount.isConnected) return;
        var headerBottom = findHeaderBottomPx(mount);
        var minTop = headerBottom >= 12 ? Math.round(headerBottom + NAV_GAP_PX) : SAFE_FALLBACK_TOP_PX;
        var h = Math.round(mount.offsetHeight || mount.getBoundingClientRect().height || 44);
        var mainTop = findMainTopPx(mount);
        var topPx = minTop;
        if (mainTop !== null && Number.isFinite(mainTop)) {
            var limitTop = Math.round(mainTop - h - CONTENT_GAP_PX);
            if (limitTop >= minTop) {
                topPx = minTop;
            } else {
                topPx = minTop;
            }
        }
        mount.style.top = topPx + 'px';
    }

    function fmtMMSS(remainingSec) {
        var sec = Math.max(0, Math.floor(Number(remainingSec) + 1e-9));
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    var style = document.createElement('style');
    style.id = 'ping-global-countdown-styles';
    style.textContent =
        '#ping-global-countdown-mount{' +
        'position:fixed;left:50%;z-index:1200;' +
        'top:calc(env(safe-area-inset-top,0px) + 64px);' +
        'transform:translate(-50%,0);' +
        'width:max-content;max-width:calc(100vw - 32px);' +
        'pointer-events:none;' +
        '}' +
        '#ping-global-countdown-mount *{pointer-events:none;}' +
        '#ping-global-countdown-mount .ping-gcc-inner{' +
        'font-family:var(--font-ping-ui),Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;' +
        'background:rgba(255,255,255,.92);backdrop-filter:saturate(180%) blur(20px);' +
        '-webkit-backdrop-filter:saturate(180%) blur(20px);' +
        'border:1px solid rgba(0,27,55,.08);border-radius:999px;' +
        'box-shadow:0 4px 24px rgba(25,31,40,.1),0 0 0 1px rgba(255,255,255,.6) inset;' +
        'padding:6px 12px;' +
        'text-align:center;' +
        '}' +
        '#ping-global-countdown-mount .ping-gcc-time{' +
        'font-size:16px;' +
        'font-weight:800;line-height:1.15;' +
        'font-variant-numeric:tabular-nums lining-nums;' +
        'font-feature-settings:"tnum" 1,"lnum" 1;' +
        'letter-spacing:-.02em;' +
        'color:#191f28;' +
        '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;' +
        'text-rendering:geometricPrecision;' +
        'filter:drop-shadow(0 2px 10px rgba(0,0,0,.08));' +
        '}' +
        '#ping-global-countdown-mount .ping-gcc-inner--earn{' +
        'display:flex;flex-direction:row;align-items:center;gap:10px;' +
        'padding:8px 14px 8px 10px;min-width:0;' +
        '}' +
        '#ping-global-countdown-mount .ping-gcc-earn{' +
        'display:flex;flex-direction:row;align-items:center;gap:10px;' +
        'animation:pingGccEarnPop .55s cubic-bezier(.2,.9,.2,1) both;' +
        '}' +
        '@keyframes pingGccEarnPop{' +
        '0%{transform:scale(.88);opacity:0}' +
        '55%{transform:scale(1.05)}' +
        '100%{transform:scale(1);opacity:1}' +
        '}' +
        '#ping-global-countdown-mount .ping-gcc-earn-p{' +
        'flex-shrink:0;width:32px;height:32px;border-radius:50%;' +
        'background:linear-gradient(145deg,#00a8bc,#0097A9);' +
        'color:#fff;font-size:15px;font-weight:900;line-height:32px;text-align:center;' +
        'box-shadow:0 2px 8px rgba(0,151,169,.35);' +
        '}' +
        '#ping-global-countdown-mount .ping-gcc-earn-msg{' +
        'font-size:15px;font-weight:800;color:#191f28;letter-spacing:-.03em;' +
        'white-space:nowrap;' +
        '}';
    document.head.appendChild(style);

    var mount = document.createElement('div');
    mount.id = 'ping-global-countdown-mount';
    mount.setAttribute('role', 'timer');
    mount.setAttribute('aria-live', 'off');
    mount.setAttribute('aria-label', '참여 참고용 카운트다운');
    mount.innerHTML =
        '<div class="ping-gcc-inner">' +
        '<div id="ping-gcc-display" class="ping-gcc-time">' +
        fmtMMSS(remaining) +
        '</div>' +
        '</div>';
    document.body.appendChild(mount);

    function remeasureGccTravel() {
        if (!mount.isConnected) return;
        mount.style.transform = 'translate(-50%, 0px)';
        var rect = mount.getBoundingClientRect();
        var innerH = window.innerHeight || 0;
        if (innerH < 48) {
            gccDeltaMax = 0;
            return;
        }
        gccDeltaMax = Math.max(0, innerH * 0.5 - (rect.top + rect.height * 0.5));
    }

    function updateGccScrollPosition() {
        if (!mount.isConnected) return;
        var innerH = window.innerHeight || 600;
        var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        var thresh = Math.max(72, Math.min(innerH * 0.5, 400));
        var p = Math.min(1, scrollY / thresh);
        var ty = Math.round(p * gccDeltaMax * 100) / 100;
        mount.style.transform = 'translate(-50%, ' + ty + 'px)';
    }

    var el = document.getElementById('ping-gcc-display');
    var done = false;
    var completeEventFired = false;

    function showCountdownEarnToast() {
        var inner = mount.querySelector('.ping-gcc-inner');
        if (!inner) return;
        try {
            sessionStorage.setItem(SS_COMPLETE_PENDING, '1');
        } catch (ePend) {}
        el = null;
        inner.className = 'ping-gcc-inner ping-gcc-inner--earn';
        inner.innerHTML =
            '<div class="ping-gcc-earn" role="status">' +
            '<span class="ping-gcc-earn-p" aria-hidden="true">P</span>' +
            '<span class="ping-gcc-earn-msg">5,000원 받았어요!</span>' +
            '</div>';
        mount.setAttribute('aria-label', '포인트 적립');
        mount.style.opacity = '1';
        saveStateObj({ v: STATE_VER, rem: 0, li: Date.now(), f: true });
        setTimeout(function () {
            try {
                sessionStorage.removeItem(SS_COMPLETE_PENDING);
            } catch (eRem) {}
            try {
                markCompleteEventSent();
                window.dispatchEvent(new CustomEvent('ping:engage-countdown-complete'));
            } catch (e1) {}
        }, 900);
        setTimeout(function () {
            if (!mount.isConnected) return;
            mount.style.transition = 'opacity .4s ease';
            mount.style.opacity = '0';
            setTimeout(function () {
                if (mount.isConnected && mount.parentNode) {
                    mount.parentNode.removeChild(mount);
                }
            }, 420);
        }, 2400);
    }

    function onEngage() {
        if (done) return;
        lastInteractionWall = Date.now();
    }

    function onScroll() {
        syncGccTopBelowNav(mount);
        remeasureGccTravel();
        updateGccScrollPosition();
        onEngage();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'pointermove'].forEach(function (t) {
        window.addEventListener(t, onEngage, { passive: true });
    });
    window.addEventListener(
        'resize',
        function () {
            syncGccTopBelowNav(mount);
            remeasureGccTravel();
            updateGccScrollPosition();
        },
        { passive: true }
    );

    window.addEventListener('pagehide', persistOnHide);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') persistOnHide();
    });

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            syncGccTopBelowNav(mount);
            remeasureGccTravel();
            updateGccScrollPosition();
        });
    });

    var lastTick = performance.now();

    function tick(now) {
        var dt = Math.min((now - lastTick) / 1000, 0.12);
        lastTick = now;
        var active = lastInteractionWall > 0 && Date.now() - lastInteractionWall < ACTIVE_MS;
        if (!done && remaining > 0 && active) {
            remaining -= dt;
            if (remaining <= 0) {
                remaining = 0;
                done = true;
                if (!completeEventFired) {
                    completeEventFired = true;
                    showCountdownEarnToast();
                }
            }
        }
        if (el) el.textContent = fmtMMSS(remaining);
        if (!done && now - lastSavePerf >= SAVE_THROTTLE_MS) {
            lastSavePerf = now;
            persistStatePartial();
        }
        requestAnimationFrame(tick);
    }

    persistStatePartial();
    requestAnimationFrame(tick);
})();
