(function () {
    'use strict';
    /**
     * 회원 로그인 등 firebase.json 에 리라이트가 없는 /api/* 라우트용.
     * `PING_BACKEND_API_ORIGIN` 은 서버 `/api/portone-config.js` → `backendApiOrigin` 과 동일 (index/checkout 규약).
     */
    function pingLoopbackHostname(hostname) {
        var h = String(hostname || '');
        return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    }

    /**
     * /api/auth/* · /api/guest-auth/* · 관리자 앱 설정 — Next API (Vercel·로컬 Next dev 동일 출처).
     */
    function pingUsesCheckoutSessionApi(path) {
        var p = String(path || '');
        return (
            p.indexOf('/api/checkout/') === 0 ||
            p.indexOf('/api/toss/') === 0 ||
            p.indexOf('/api/payment/') === 0
        );
    }

    function pingBackendOnlyApiPath(path) {
        var p = String(path || '').charAt(0) === '/' ? String(path) : '/' + String(path);
        var h = window.location.hostname;
        var loopback = pingLoopbackHostname(h);
        var port = String(window.location.port || '');
        try {
            var pc = window.__PING_PORTONE_CONFIG__ || {};
            /** register-session·bank-transfer 등 checkout 세션은 UI와 동일 출처에 있어야 함 */
            if (pingUsesCheckoutSessionApi(p)) {
                return p;
            }
            if (
                p.indexOf('/api/auth/') === 0 ||
                p.indexOf('/api/guest-auth/') === 0 ||
                p.indexOf('/api/admin/app-settings') === 0
            ) {
                return p;
            }
            var bo = String(pc.backendApiOrigin || '').trim().replace(/\/+$/, '');
            if (bo) {
                return bo + p;
            }
        } catch (e) {}
        var isLocal = loopback;
        if (isLocal) {
            return 'http://localhost:3000' + p;
        }
        return p;
    }

    window.pingBackendOnlyApiPath = pingBackendOnlyApiPath;
})();
