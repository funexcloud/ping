/**
 * 친구 추천: 공유 링크 ?ref=코드 로 첫 방문 시 추천인에게 서버에 +100P 기록.
 * 정적 호스팅만 할 때는 API 실패 시 조용히 무시.
 */
(function () {
    var LS_CODE = 'ping_my_referral_code';
    var LS_VISITOR = 'ping_referral_visitor_id';
    var LS_LOCAL_PTS = 'ping_user_points_balance';

    function normCode(v) {
        return String(v || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 32);
    }

    function genCode() {
        try {
            var a = new Uint8Array(8);
            crypto.getRandomValues(a);
            var s = '';
            for (var i = 0; i < a.length; i++) {
                s += (a[i] % 36).toString(36);
            }
            return s;
        } catch (e) {
            return 'r' + Math.random().toString(36).slice(2, 10);
        }
    }

    function genVisitorId() {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        } catch (e1) {}
        return 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
    }

    function getOrCreateVisitorId() {
        try {
            var v = localStorage.getItem(LS_VISITOR);
            if (v && v.length > 8) return v;
            v = genVisitorId();
            localStorage.setItem(LS_VISITOR, v);
            return v;
        } catch (e) {
            return genVisitorId();
        }
    }

    function getOrCreateMyCode() {
        try {
            var c = normCode(localStorage.getItem(LS_CODE));
            if (c.length >= 4) return c;
            c = genCode();
            while (c.length < 4) c += genCode();
            c = c.slice(0, 10);
            localStorage.setItem(LS_CODE, c);
            return c;
        } catch (e2) {
            return genCode().slice(0, 10);
        }
    }

    function shareUrlForCode(code) {
        try {
            var u = new URL('/start', window.location.origin);
            u.searchParams.set('ref', code);
            return u.href;
        } catch (e) {
            return '/start?ref=' + encodeURIComponent(code);
        }
    }

    function stripRefFromUrl() {
        try {
            var u = new URL(window.location.href);
            if (!u.searchParams.get('ref')) return;
            u.searchParams.delete('ref');
            var qs = u.searchParams.toString();
            var path = u.pathname + u.hash + (qs ? '?' + qs : '');
            window.history.replaceState({}, document.title, path);
        } catch (e) {}
    }

    function apiBase() {
        return '';
    }

    async function postJson(path, body) {
        var r = await fetch(apiBase() + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error('http_' + r.status);
        return r.json();
    }

    async function getJson(path) {
        var r = await fetch(apiBase() + path);
        if (!r.ok) throw new Error('http_' + r.status);
        return r.json();
    }

    window.PingReferral = {
        getDeviceId: getOrCreateVisitorId,
        getMyCode: getOrCreateMyCode,
        getShareUrl: function () {
            return shareUrlForCode(getOrCreateMyCode());
        },
        /** 진입 페이지에서 호출: ?ref= 처리 */
        consumeRefFromUrlIfAny: async function () {
            try {
                var u = new URL(window.location.href);
                var refRaw = u.searchParams.get('ref') || u.searchParams.get('r') || '';
                var ref = normCode(refRaw);
                if (ref.length < 4) return;

                var mine = normCode(localStorage.getItem(LS_CODE) || '');
                if (mine && ref === mine) {
                    stripRefFromUrl();
                    return;
                }

                var visitorId = getOrCreateVisitorId();
                var data = await postJson('/api/referral/friend-visit', {
                    refCode: ref,
                    visitorId: visitorId,
                });
                stripRefFromUrl();
                if (data && data.credited) {
                    try {
                        window.dispatchEvent(new CustomEvent('ping:referral-credited', { detail: data }));
                    } catch (e) {}
                }
            } catch (err) {
                /* 서버 없음·네트워크 오류 시 ?ref 유지 → 재접속 시 재시도 */
            }
        },
        registerMyCode: async function () {
            var code = getOrCreateMyCode();
            try {
                await postJson('/api/referral/register', { code: code });
            } catch (e) {}
            return code;
        },
        fetchBalance: async function () {
            var code = getOrCreateMyCode();
            try {
                var j = await getJson('/api/referral/balance?code=' + encodeURIComponent(code));
                if (j && j.ok) return j;
            } catch (e) {}
            return { ok: false, points: 0, friendCount: 0, rewardPerFriend: 100 };
        },
        readLocalMiscPoints: function () {
            try {
                var n = parseInt(localStorage.getItem(LS_LOCAL_PTS) || '0', 10);
                return isNaN(n) ? 0 : n;
            } catch (e) {
                return 0;
            }
        },
    };

    function runMypage() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('mypage') === -1) return;

        var elCode = document.getElementById('mypage-referral-code');
        var elLink = document.getElementById('mypage-referral-link');
        var elRefPts = document.getElementById('mypage-referral-points');
        var elFriends = document.getElementById('mypage-referral-friends');
        var elLocalPts = document.getElementById('mypage-local-points');
        var elTotalPts = document.getElementById('mypage-total-points');
        var elSyncHint = document.getElementById('mypage-referral-sync-hint');
        var btn = document.getElementById('mypage-referral-copy-btn');

        async function refresh() {
            var code = await PingReferral.registerMyCode();
            if (elCode) elCode.textContent = code;
            var url = PingReferral.getShareUrl();
            if (elLink) {
                elLink.textContent = url;
                elLink.setAttribute('href', url);
            }
            var bal = await PingReferral.fetchBalance();
            var refPts = bal && bal.ok ? Number(bal.points) || 0 : 0;
            var friends = bal && bal.ok ? Number(bal.friendCount) || 0 : 0;
            var localMisc = PingReferral.readLocalMiscPoints();
            if (elRefPts) elRefPts.textContent = refPts.toLocaleString('ko-KR');
            if (elFriends) elFriends.textContent = String(friends);
            if (elLocalPts) elLocalPts.textContent = localMisc.toLocaleString('ko-KR');
            if (elTotalPts) elTotalPts.textContent = (refPts + localMisc).toLocaleString('ko-KR');
            if (elSyncHint) {
                elSyncHint.textContent = bal && bal.ok ? '' : '추천 포인트는 서버 연결 시 집계됩니다.';
            }
        }

        if (btn) {
            btn.addEventListener('click', async function () {
                var url = PingReferral.getShareUrl();
                try {
                    await navigator.clipboard.writeText(url);
                    btn.textContent = '복사됨';
                    setTimeout(function () {
                        btn.textContent = '링크 복사';
                    }, 2000);
                } catch (e) {
                    window.prompt('링크를 복사하세요', url);
                }
            });
        }

        refresh();
        setTimeout(function () {
            if (window.PingEngageReward && typeof PingEngageReward.refreshMypageCards === 'function') {
                void PingEngageReward.refreshMypageCards();
            }
        }, 350);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            void PingReferral.consumeRefFromUrlIfAny();
            runMypage();
        });
    } else {
        void PingReferral.consumeRefFromUrlIfAny();
        runMypage();
    }
})();
