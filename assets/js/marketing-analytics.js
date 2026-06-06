/**
 * GA4 / Meta Pixel 초기화 + UTM 세션 저장 + 공통 이벤트 헬퍼
 * head에서 먼저 실행:
 *   window.__PING_ANALYTICS__ = { ga4MeasurementId: 'G-XXXX', metaPixelId: '1234567890' };
 * ID가 비어 있으면 해당 태그는 로드하지 않습니다.
 */
(function () {
    var cfg = window.__PING_ANALYTICS__ || {};

    function captureUtmFromUrl() {
        try {
            var p = new URLSearchParams(window.location.search);
            var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
            var utm = {};
            keys.forEach(function (k) {
                var v = p.get(k);
                if (v) utm[k] = String(v).slice(0, 512);
            });
            if (Object.keys(utm).length) {
                sessionStorage.setItem('ping_utm', JSON.stringify(utm));
            }
        } catch (e) {}
    }

    window.pingGetUtm = function pingGetUtm() {
        try {
            var raw = sessionStorage.getItem('ping_utm');
            return raw ? JSON.parse(raw) : {};
        } catch (_) {
            return {};
        }
    };

    window.pingTrack = function pingTrack(name, params) {
        var p = params && typeof params === 'object' ? params : {};
        if (typeof gtag === 'function' && cfg.ga4MeasurementId) {
            gtag('event', name, p);
        }
        if (typeof fbq === 'function' && cfg.metaPixelId) {
            try {
                fbq('trackCustom', name, p);
            } catch (_) {}
        }
    };

    function getCookie(name) {
        try {
            var re = new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)');
            var m = document.cookie.match(re);
            return m ? decodeURIComponent(m[1]) : '';
        } catch (_) {
            return '';
        }
    }

    window.pingGetVisitorId = function pingGetVisitorId() {
        return getCookie('ping_vid') || '';
    };

    function collectMarketingCookiesForSync() {
        return {
            _ga: getCookie('_ga'),
            _gid: getCookie('_gid'),
            _gcl_au: getCookie('_gcl_au'),
            _fbp: getCookie('_fbp'),
            _fbc: getCookie('_fbc'),
        };
    }

    window.pingGetMarketingCookies = collectMarketingCookiesForSync;

    function postMarketingCookieSync(phase) {
        if (cfg.cookieSync === false) return;
        var payload = {
            path: location.pathname + location.search,
            referrer: document.referrer || '',
            title: document.title || '',
            phase: phase || 'immediate',
            utm: pingGetUtm(),
            cookies: collectMarketingCookiesForSync(),
        };
        if (cfg.consentAnalytics === true) {
            payload.consent = { analytics: true };
        }
        fetch('/api/marketing/cookie-sync', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).catch(function () {});
    }

    captureUtmFromUrl();

    if (cfg.ga4MeasurementId) {
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            window.dataLayer.push(arguments);
        }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', cfg.ga4MeasurementId, { send_page_view: true });
        var g = document.createElement('script');
        g.async = true;
        g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4MeasurementId);
        document.head.appendChild(g);
    }

    if (cfg.metaPixelId) {
        !(function (f, b, e, v, n, t, s) {
            if (f.fbq) return;
            n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = 'https://connect.facebook.net/en_US/fbevents.js';
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
        })(window, document, 'script');
        fbq('init', cfg.metaPixelId);
        fbq('track', 'PageView');
    }

    postMarketingCookieSync('immediate');
    setTimeout(function () {
        postMarketingCookieSync('deferred');
    }, 2500);
})();
