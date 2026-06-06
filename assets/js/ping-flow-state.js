/**
 * 발송/부고 멀티 플로우 — 세션 기반 상태 (Route A 직행 vs Route B 부고 후 합류).
 * 각 화면에서 PingFlowState.* 만으로 읽기/쓰기해 동일 결제·주소록 모듈에 합류합니다.
 * 발송 수단(문자 / 카카오톡)은 두 경로 모두에서 선택 가능. ROUTE는 진입 경로만 구분한다.
 */
(function (global) {
    var KEY_ROUTE = 'ping_flow_route';
    var KEY_STARTED = 'ping_flow_started';
    var KEY_OBITUARY_URL = 'ping_obituary_public_url';

    var ROUTE_BULK_DIRECT = 'bulk_direct';
    var ROUTE_OBITUARY_THEN_BULK = 'obituary_then_bulk';

    var PingFlowState = {
        KEY_ROUTE: KEY_ROUTE,
        KEY_STARTED: KEY_STARTED,
        KEY_OBITUARY_URL: KEY_OBITUARY_URL,
        ROUTE_BULK_DIRECT: ROUTE_BULK_DIRECT,
        ROUTE_OBITUARY_THEN_BULK: ROUTE_OBITUARY_THEN_BULK,

        setRoute: function (route) {
            try {
                sessionStorage.setItem(KEY_ROUTE, String(route || ''));
            } catch (e) {}
        },
        getRoute: function () {
            try {
                return String(sessionStorage.getItem(KEY_ROUTE) || '').trim();
            } catch (e) {
                return '';
            }
        },
        markStarted: function () {
            try {
                sessionStorage.setItem(KEY_STARTED, '1');
            } catch (e) {}
        },
        hasStarted: function () {
            try {
                return sessionStorage.getItem(KEY_STARTED) === '1';
            } catch (e) {
                return false;
            }
        },
        /**
         * 부고 공개 URL·발송용 URL 등 저장 (index 외부 모듈이 합류 전에 호출).
         * @param {string} url
         */
        setObituaryPublicUrl: function (url) {
            if (!url) return;
            try {
                sessionStorage.setItem(KEY_OBITUARY_URL, String(url).trim());
            } catch (e) {}
        },
        getObituaryPublicUrl: function () {
            try {
                return String(sessionStorage.getItem(KEY_OBITUARY_URL) || '').trim();
            } catch (e) {
                return '';
            }
        },
        /**
         * 대량발송 신청 단계(processOrder 직후) 저장된 수신 명단이 있으면 참.
         * 본인확인 후에는 index 의 resumeBulk 흐름과 동일 기준으로 맞춘다(ping_bulk_recipients).
         */
        hasPendingBulkRecipients: function () {
            try {
                var raw = sessionStorage.getItem('ping_bulk_recipients');
                if (!raw) return false;
                var arr = JSON.parse(raw);
                return Array.isArray(arr) && arr.length > 0;
            } catch (e) {
                return false;
            }
        },
        /**
         * 부고 제작 완료 후 문자 발송(주소록) 단계로 합류.
         * @param {{ obituaryPublicUrl?: string }} opts
         */
        mergeToBulkFlow: function (opts) {
            opts = opts || {};
            try {
                sessionStorage.removeItem('ping_react_bulk_review_return');
                sessionStorage.removeItem('ping_react_bulk_pending_review');
                sessionStorage.removeItem('ping_compose_image_data');
            } catch (e) {}
            if (opts.obituaryPublicUrl) {
                PingFlowState.setObituaryPublicUrl(opts.obituaryPublicUrl);
            }
            PingFlowState.setRoute(ROUTE_OBITUARY_THEN_BULK);
            PingFlowState.markStarted();
            global.location.href = '/start?mergeBulk=1';
        },
    };

    global.PingFlowState = PingFlowState;
})(typeof window !== 'undefined' ? window : this);
