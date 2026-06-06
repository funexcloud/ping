(function () {
    'use strict';

    var LoginPhase = {
        idle: 'idle',
        submitting: 'submitting',
        success: 'success',
        error: 'error',
    };

    var MSG = {
        emptyFields: '아이디(이메일)와 비밀번호를 입력해 주세요.',
        network: '서버에 연결할 수 없습니다. 로컬에서는 npm run dev 로 서버를 실행해 주세요.',
        loginFail: '로그인에 실패했습니다.',
        badResponse: '서버 응답을 처리할 수 없습니다.',
        resendNeedId: '로그인 ID(이메일)를 입력한 뒤 다시 시도해 주세요.',
        resendNetwork: '서버에 연결할 수 없습니다.',
        resendFail: '발송에 실패했습니다.',
    };

    var phase = LoginPhase.idle;

    function resolveMemberAuthApiUrl(path) {
        if (typeof window.pingBackendOnlyApiPath === 'function') {
            return window.pingBackendOnlyApiPath(path);
        }
        var p = String(path || '').charAt(0) === '/' ? String(path) : '/' + String(path);
        var h = window.location.hostname;
        var loopback = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
        var port = String(window.location.port || '');
        if (p.indexOf('/api/auth/') === 0 && (loopback || port === '3002')) {
            return p;
        }
        if (loopback) {
            return 'http://localhost:3000' + p;
        }
        return p;
    }

    function isMypageNext(value) {
        if (value == null || value === '') return false;
        var v = String(value).trim();
        if (v === 'mypage' || v === 'mypage.html' || v === '/mypage.html') return true;
        if (v === '/mypage' || v === '/mypage/condolence') return true;
        if (v.indexOf('mypage/condolence') !== -1) return true;
        return false;
    }

    function goToRootPage(fileWithQuery) {
        var f = String(fileWithQuery || '').replace(/^\//, '');
        window.location.href = '../' + f;
    }

    function parseFetchJson(r) {
        return r.text().then(function (text) {
            var trimmed = typeof text === 'string' ? text.trim() : '';
            var data = {};
            if (!trimmed) {
                if (!r.ok) {
                    return {
                        httpOk: r.ok,
                        data: {
                            ok: false,
                            error: '서버에 연결할 수 없거나 응답이 비어 있습니다. (HTTP ' + r.status + ')',
                        },
                    };
                }
                return { httpOk: r.ok, data: data };
            }
            try {
                data = JSON.parse(trimmed);
            } catch (err) {
                var head = trimmed.slice(0, 480).toLowerCase();
                var hint = MSG.badResponse;
                if (head.indexOf('<!doctype') === 0 || head.indexOf('<html') !== -1) {
                    hint =
                        '회원 API가 같은 주소에 없습니다. `npm run dev`로 로컬 서버를 켜거나, API 서버 URL을 설정한 뒤 `PING_BACKEND_API_ORIGIN`/portone 설정을 불러오는지 확인해 주세요.';
                } else if (!r.ok) {
                    hint = '서버 응답을 해석하지 못했습니다. (HTTP ' + r.status + ')';
                }
                return { httpOk: false, data: { ok: false, error: hint } };
            }
            return { httpOk: r.ok, data: data };
        });
    }

    function applyContextualCopy() {
        try {
            if (sessionStorage.getItem('ping_from_index')) {
                var submitEl = document.getElementById('member-login-submit');
                if (submitEl) {
                    submitEl.textContent = '로그인';
                }
                document.title = 'PING · 발송 신청 계속';
            }
        } catch (e) {}

        var params = new URLSearchParams(window.location.search);
        if (isMypageNext(params.get('next'))) {
            try {
                var submitEl2 = document.getElementById('member-login-submit');
                if (submitEl2) {
                    submitEl2.textContent = '로그인';
                }
                document.title = 'PING · 로그인 (마이페이지)';
            } catch (e2) {}
        }
    }

    function augmentSignupLinkSearch() {
        try {
            var q = window.location.search || '';
            if (!q) {
                return;
            }
            document.querySelectorAll('main a[href="/obituary-signup-terms"], main a[href="obituary-signup-terms.html"]').forEach(function (a) {
                a.setAttribute('href', '/obituary-signup-terms' + q);
            });
        } catch (e) {}
    }

    function insertRegisteredBanner() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('registered') !== '1') {
            return;
        }
        var note = document.createElement('p');
        note.className = 'ping-callout--success';
        note.textContent = '회원가입이 완료되었습니다. 로그인해 주세요.';
        var main = document.querySelector('main');
        var form = document.getElementById('memberLoginForm');
        if (main && form) {
            main.insertBefore(note, form);
        }
    }

    function showError(msg) {
        var el = document.getElementById('formError');
        el.textContent = msg;
        el.classList.remove('ping-hidden');
    }

    function hideError() {
        document.getElementById('formError').classList.add('ping-hidden');
    }

    function hideVerifyResend() {
        document.getElementById('verify-resend-row').classList.add('ping-hidden');
    }

    function setSubmitEnabled(enabled) {
        var form = document.getElementById('memberLoginForm');
        var btn = form && form.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = !enabled;
        }
    }

    function afterLoginSuccess() {
        phase = LoginPhase.success;
        try {
            var afterParams = new URLSearchParams(window.location.search);
            if (isMypageNext(afterParams.get('next'))) {
                var raw = afterParams.get('next');
                var dest = 'mypage.html';
                if (raw) {
                    var nr = String(raw).trim();
                    if (
                        nr === '/mypage/condolence' ||
                        nr === 'mypage/condolence' ||
                        nr.indexOf('condolence') !== -1
                    ) {
                        dest = 'mypage/condolence';
                    } else if (nr === '/mypage' || nr === 'mypage') {
                        dest = 'mypage';
                    }
                }
                goToRootPage(dest);
                return;
            }
            /* 대량 발송 결제 플로우: React `/login` → auth-redirect.ts (레거시 bulk 분기 제거) */
        } catch (e) {}
        window.location.href = 'obituary-create.html';
    }

    function bindVerifyResend() {
        document.getElementById('verify-resend-btn').addEventListener('click', function () {
            var email = document.getElementById('memberId').value.trim();
            if (!email) {
                alert(MSG.resendNeedId);
                return;
            }
            var rb = document.getElementById('verify-resend-btn');
            rb.disabled = true;
            fetch(resolveMemberAuthApiUrl('/api/auth/resend-verification'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email }),
            })
                .then(parseFetchJson)
                .then(function (res) {
                    rb.disabled = false;
                    if (res.httpOk && res.data && res.data.ok) {
                        alert('인증 메일을 보냈습니다. 메일의 6자리 코드를 확인해 주세요.');
                        return;
                    }
                    alert((res.data && res.data.error) || MSG.resendFail);
                })
                .catch(function () {
                    rb.disabled = false;
                    alert(MSG.resendNetwork);
                });
        });
    }

    function bindForm() {
        var form = document.getElementById('memberLoginForm');
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (phase === LoginPhase.submitting) {
                return;
            }

            hideError();
            hideVerifyResend();

            var memberId = document.getElementById('memberId').value.trim();
            var password = document.getElementById('memberPw').value;

            if (!memberId || !password) {
                showError(MSG.emptyFields);
                return;
            }

            phase = LoginPhase.submitting;
            setSubmitEnabled(false);

            fetch(resolveMemberAuthApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId: memberId, password: password }),
            })
                .then(parseFetchJson)
                .then(function (res) {
                    var data = res.data || {};
                    var ok = res.httpOk && data.ok === true;
                    if (!ok) {
                        phase = LoginPhase.error;
                        var errShown = data.error || data.message || (typeof data.details === 'string' ? data.details : '');
                        showError(errShown || MSG.loginFail);
                        if (data.code === 'email_not_verified') {
                            document.getElementById('verify-resend-row').classList.remove('ping-hidden');
                        }
                        setSubmitEnabled(true);
                        return;
                    }
                    sessionStorage.setItem('ping_auth_token', data.token);
                    sessionStorage.setItem('ping_auth_user', JSON.stringify(data.user));
                    afterLoginSuccess();
                })
                .catch(function () {
                    phase = LoginPhase.error;
                    showError(MSG.network);
                    setSubmitEnabled(true);
                });
        });
    }

    function init() {
        applyContextualCopy();
        augmentSignupLinkSearch();
        insertRegisteredBanner();
        bindVerifyResend();
        bindForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
