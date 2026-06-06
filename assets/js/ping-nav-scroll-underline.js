/**
 * Sticky 네비 하단 보더: 스크롤이 조금이라도 내려가면 .ping-sticky-nav--scrolled 토글
 * 대상: .ping-top-nav, .index-header-sticky, header.ping-sticky-page-header
 */
(function () {
    'use strict';
    var CLS = 'ping-sticky-nav--scrolled';
    var THRESH = 2;

    function scrollTopOf(root) {
        if (!root) return 0;
        if (root === document.documentElement || root === document.body) {
            return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        }
        return root.scrollTop || 0;
    }

    /** index: 본문은 .index-main-scroll, 헤더는 형제 */
    function findScrollRoot(header) {
        if (!header) return document.scrollingElement || document.documentElement;
        if (header.classList.contains('index-header-sticky')) {
            var ix =
                document.querySelector('.index-page-shell .index-main-scroll') ||
                document.querySelector('.index-main-scroll');
            if (ix) return ix;
        }
        var parent = header.parentElement;
        if (parent) {
            var mainScroll = parent.querySelector(':scope > main.ping-main--scroll');
            if (mainScroll) return mainScroll;
        }
        var el = parent;
        while (el && el !== document.body) {
            try {
                var st = window.getComputedStyle(el);
                var oy = st.overflowY;
                if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
                    if (el.scrollHeight > el.clientHeight + THRESH) return el;
                }
            } catch (e) {}
            el = el.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    }

    function bindHeader(header) {
        if (!header || header.getAttribute('data-ping-nav-scroll') === '1') return;
        header.setAttribute('data-ping-nav-scroll', '1');
        var root = findScrollRoot(header);

        function update() {
            header.classList.toggle(CLS, scrollTopOf(root) > THRESH);
        }

        var docEl = document.documentElement;
        var docBody = document.body;
        if (root === docEl || root === docBody) {
            window.addEventListener('scroll', update, { passive: true });
        } else {
            root.addEventListener('scroll', update, { passive: true });
        }

        if (typeof ResizeObserver !== 'undefined') {
            try {
                var ro = new ResizeObserver(update);
                ro.observe(root);
            } catch (eR) {}
        }

        update();
    }

    function init() {
        if (window.__pingNavScrollUnderlineInstalled) return;
        if (!document.documentElement.classList.contains('ping-ui')) return;
        window.__pingNavScrollUnderlineInstalled = true;

        var sel = '.ping-top-nav, .index-header-sticky, header.ping-sticky-page-header';
        document.querySelectorAll(sel).forEach(bindHeader);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/**
 * 이미 뷰포트 안에 충분히 보이는 텍스트 필드에 포커스될 때, 브라우저가 스크롤 컨테이너를
 * 소폭 움직이는 현상 완화(체감되는 «바깥» 흔들림·잔류 스크롤 감소).
 */
(function () {
    'use strict';
    var THRESH = 2;
    var PAD = 14;
    var MAX_DELTA = 140;

    function textLikeTarget(t) {
        if (!t || t.disabled) return false;
        var tn = t.tagName;
        if (t.readOnly && tn === 'INPUT') return false;
        if (tn === 'TEXTAREA') return true;
        if (tn === 'SELECT') return true;
        if (tn !== 'INPUT') return false;
        var ty = (t.type || 'text').toLowerCase();
        switch (ty) {
            case 'hidden':
            case 'button':
            case 'submit':
            case 'reset':
            case 'image':
            case 'file':
            case 'checkbox':
            case 'radio':
                return false;
            default:
                return true;
        }
    }

    function findScrollableParent(el) {
        var p = el && el.parentElement;
        while (p && p !== document.body) {
            try {
                var st = window.getComputedStyle(p);
                var oy = st.overflowY;
                if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') {
                    if (p.scrollHeight > p.clientHeight + THRESH) return p;
                }
            } catch (e) {}
            p = p.parentElement;
        }
        return null;
    }

    function scrollRootForTarget(t) {
        var inner = findScrollableParent(t);
        return inner || document.scrollingElement || document.documentElement;
    }

    function comfortablyInViewport(r) {
        var vh = window.innerHeight || document.documentElement.clientHeight || 0;
        return r.top >= PAD && r.bottom <= vh - PAD;
    }

    function initDampen() {
        if (window.__pingFocusScrollDampenInstalled) return;
        if (!document.documentElement.classList.contains('ping-ui')) return;
        window.__pingFocusScrollDampenInstalled = true;

        document.addEventListener(
            'focusin',
            function (ev) {
                var t = ev.target;
                if (!textLikeTarget(t)) return;

                var root = scrollRootForTarget(t);
                var before = root.scrollTop || 0;
                var r0 = t.getBoundingClientRect();
                var vv = window.visualViewport;
                var vvH0 = vv ? vv.height : null;

                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        if (vv && vvH0 != null && Math.abs(vv.height - vvH0) > 52) return;

                        var after = root.scrollTop || 0;
                        var d = after - before;
                        if (!d) return;
                        if (!comfortablyInViewport(r0)) return;
                        if (Math.abs(d) <= MAX_DELTA) root.scrollTop = before;
                    });
                });
            },
            true
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDampen);
    } else {
        initDampen();
    }
})();
