/**
 * 카운트다운 종료 → 포인트 API · 하단 슬라이드 시트 · 친구 초대(동일 팝업 내 전환, 배치 최대 3명)
 * PingReferral.getDeviceId 필요. ping-global-engage-countdown 이후 로드.
 */
(function () {
    /** 체류 초 카운트다운 완료 시트(5,000원) — 사용 중지. checkout 회원 웰컴 50P 시트로 대체. */
    return;

    var MAX_INVITE = 3;
    var sheetBatchId = '';
    var sheetSent = 0;
    var embedBatchId = '';
    var embedSent = 0;

    function gid() {
        try {
            if (window.PingReferral && typeof PingReferral.getDeviceId === 'function') {
                return PingReferral.getDeviceId();
            }
        } catch (e) {}
        return 'anon_' + Date.now();
    }

    function postJson(path, body) {
        return fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).then(function (r) {
            return r.text().then(function (t) {
                var j = null;
                try {
                    j = t ? JSON.parse(t) : null;
                } catch (eJ) {}
                return { ok: r.ok, status: r.status, json: j };
            });
        });
    }

    function getSummary() {
        var id = gid();
        return fetch('/api/reward/summary?deviceId=' + encodeURIComponent(id))
            .then(function (r) {
                return r.json();
            })
            .catch(function () {
                return { ok: false };
            });
    }

    function getCurrentSection() {
        var path = String(window.location.pathname || '').toLowerCase();
        if (path.indexOf('/obituary/') !== -1) return 'obituary';
        if (path.indexOf('/legal/') !== -1) return 'legal';
        if (path.indexOf('/admin/') !== -1) return 'admin';
        return 'root';
    }

    function resolvePagePath(section, fileWithQuery) {
        var current = getCurrentSection();
        if (section === 'root') {
            return current === 'root' ? fileWithQuery : '../' + fileWithQuery;
        }
        if (section === 'obituary') {
            if (current === 'obituary') return fileWithQuery;
            return current === 'root' ? 'obituary/' + fileWithQuery : '../obituary/' + fileWithQuery;
        }
        if (section === 'legal') {
            if (current === 'legal') return fileWithQuery;
            return current === 'root' ? 'legal/' + fileWithQuery : '../legal/' + fileWithQuery;
        }
        if (section === 'admin') {
            if (current === 'admin') return fileWithQuery;
            return current === 'root' ? 'admin/' + fileWithQuery : '../admin/' + fileWithQuery;
        }
        return fileWithQuery;
    }

    function goToPage(section, fileWithQuery) {
        window.location.href = resolvePagePath(section, fileWithQuery);
    }

    function injectStyles() {
        if (document.getElementById('ping-ers-styles')) return;
        var st = document.createElement('style');
        st.id = 'ping-ers-styles';
        st.textContent =
            '#ping-ers-root{position:fixed;inset:0;z-index:1300;pointer-events:none;}' +
            '#ping-ers-root.is-active{pointer-events:auto;}' +
            '.ping-ers-overlay{position:absolute;inset:0;background:rgba(15,23,42,.5);opacity:0;transition:opacity .3s ease;}' +
            '#ping-ers-root.is-active .ping-ers-overlay{opacity:1;}' +
            '.ping-ers-sheet{position:absolute;left:0;right:0;bottom:0;max-height:88dvh;overflow-y:auto;' +
            'border-radius:20px 20px 0 0;box-shadow:0 -12px 48px rgba(0,0,0,.35);' +
            'transform:translateY(100%);transition:transform .38s cubic-bezier(.25,.82,.25,1);' +
            'font-family:var(--font-ping-ui),Pretendard,-apple-system,system-ui,sans-serif;' +
            'max-width:400px;margin:0 auto;}' +
            '.ping-ers-sheet--dark{background:#1c1c1e;color:#fff;' +
            'padding:10px 22px calc(22px + env(safe-area-inset-bottom,0));}' +
            '.ping-ers-sheet--invite{background:#fff;color:#191f28;' +
            'padding:20px 20px calc(24px + env(safe-area-inset-bottom,0));' +
            'box-shadow:0 -8px 40px rgba(0,0,0,.12);}' +
            '#ping-ers-root.is-open .ping-ers-sheet{transform:translateY(0);}' +
            '.ping-ers-handle{width:36px;height:4px;border-radius:2px;background:#3a3a3c;margin:4px auto 18px;flex-shrink:0;cursor:grab;touch-action:none;}' +
            '.ping-ers-api-hint{font-size:12px;color:#8e8e93;text-align:center;margin:-8px 0 12px;line-height:1.4;}' +
            '.ping-ers-dark-title{font-size:21px;font-weight:800;color:#fff;line-height:1.35;margin:0 0 10px;letter-spacing:-.035em;}' +
            '.ping-ers-dark-sub{font-size:14px;color:#8e8e93;margin:0 0 8px;line-height:1.45;font-weight:500;}' +
            '.ping-ers-illu{display:flex;justify-content:center;align-items:center;margin:12px 0 20px;min-height:140px;}' +
            '.ping-ers-illu-svg{width:min(220px,72vw);height:auto;overflow:visible;}' +
            '.ping-ers-dark-cta{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:16px;font-weight:800;' +
            'cursor:pointer;touch-action:manipulation;background:#3b82f6;color:#fff;box-shadow:0 4px 16px rgba(59,130,246,.35);}' +
            '.ping-ers-dark-cta:active{opacity:.92;}' +
            '.ping-ers-dark-secondary{display:block;width:100%;border:1px solid #3a3a3c;border-radius:14px;padding:14px;font-size:15px;font-weight:700;' +
            'cursor:pointer;touch-action:manipulation;margin-top:10px;background:transparent;color:#aeaeb2;}' +
            '.ping-ers-dark-secondary:active{background:rgba(255,255,255,.06);}' +
            '.ping-ers-dark-fine{font-size:12px;color:#636366;line-height:1.45;margin:14px 0 0;text-align:center;}' +
            '.ping-ers-title{font-size:18px;font-weight:800;color:#191f28;margin:0 0 6px;letter-spacing:-.03em;}' +
            '.ping-ers-sub{font-size:13px;color:#6b7684;line-height:1.5;margin:0 0 16px;}' +
            '.ping-ers-btn{display:block;width:100%;border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:800;' +
            'cursor:pointer;touch-action:manipulation;margin-top:8px;}' +
            '.ping-ers-btn-primary{background:#0097A9;color:#fff;}' +
            '.ping-ers-btn-secondary{background:#f2f4f6;color:#191f28;}' +
            '.ping-ers-btn-ghost{background:transparent;color:#6b7684;font-weight:700;}' +
            '.ping-ers-label{font-size:12px;font-weight:700;color:#191f28;margin:10px 0 6px;}' +
            '.ping-ers-input{width:100%;box-sizing:border-box;border:1px solid #e5e8eb;border-radius:12px;padding:12px 14px;font-size:15px;}' +
            '.ping-ers-actions-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}' +
            '.ping-ers-actions-row .ping-ers-btn{flex:1;min-width:120px;margin-top:0;}' +
            '.ping-ers-float{position:sticky;bottom:8px;left:0;right:0;margin:12px 0;text-align:center;' +
            'font-size:13px;font-weight:700;color:#0097A9;background:rgba(0,151,169,.1);padding:10px 12px;border-radius:12px;' +
            'animation:pingErsFloat .9s ease-in-out infinite alternate;opacity:0;transition:opacity .25s;pointer-events:none;}' +
            '.ping-ers-float.is-on{opacity:1;}' +
            '@keyframes pingErsFloat{from{transform:translateY(0)}to{transform:translateY(-4px)}}' +
            '.ping-ers-hide{display:none!important;}' +
            '.ping-ers-badge{display:inline-block;background:#10b981;color:#fff;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;margin-bottom:10px;}' +
            '#ping-ers-view-invite .ping-ers-back{text-align:left;margin-bottom:8px;font-size:13px;font-weight:700;color:#0097A9;background:none;border:none;cursor:pointer;padding:6px 0;}' +
            '.ping-ers-coupon-note{font-size:12px;color:#6b7684;margin-top:12px;line-height:1.45;}';
        document.head.appendChild(st);
    }

    function ensureRoot() {
        injectStyles();
        var root = document.getElementById('ping-ers-root');
        if (root) return root;
        root = document.createElement('div');
        root.id = 'ping-ers-root';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML =
            '<div class="ping-ers-overlay" id="ping-ers-overlay"></div>' +
            '<div class="ping-ers-sheet ping-ers-sheet--dark" role="dialog" aria-modal="true" aria-labelledby="ping-ers-title">' +
            '<div id="ping-ers-view-reward">' +
            '<div class="ping-ers-handle" aria-hidden="true"></div>' +
            '<p class="ping-ers-api-hint ping-ers-hide" id="ping-ers-api-hint"></p>' +
            '<h2 class="ping-ers-dark-title" id="ping-ers-title">문자 발송에 5,000원 쿠폰을 쓸 수 있어요.</h2>' +
            '<p class="ping-ers-dark-sub" id="ping-ers-sub-line">100원만 결제해도 쓸 수 있어요</p>' +
            '<div class="ping-ers-illu" aria-hidden="true">' +
            '<svg class="ping-ers-illu-svg" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M38 72 L120 132 L202 72 L202 148 L38 148 Z" fill="#e8eaef" stroke="#c7c9d1" stroke-width="1.2"/>' +
            '<rect x="72" y="52" width="96" height="62" rx="9" fill="#3b82f6" ' +
            'style="filter:drop-shadow(0 10px 20px rgba(59,130,246,.45))"/>' +
            '<text x="120" y="96" text-anchor="middle" fill="#fff" font-size="24" font-family="system-ui,sans-serif" font-weight="800">5,000</text>' +
            '<path d="M38 72 L120 128 L202 72 Z" fill="#f4f5f9" stroke="#c7c9d1" stroke-width="1.2"/>' +
            '</svg></div>' +
            '<button type="button" class="ping-ers-dark-cta" id="ping-ers-browse">적립금 확인하기</button>' +
            '<button type="button" class="ping-ers-dark-secondary" id="ping-ers-open-invite">친구 초대하기</button>' +
            '<p class="ping-ers-dark-fine">적립 포인트는 문자 발송 시 현금처럼 사용할 수 있어요.</p>' +
            '</div>' +
            '<div id="ping-ers-view-invite" class="ping-ers-hide">' +
            '<button type="button" class="ping-ers-back" id="ping-ers-back-reward">← 돌아가기</button>' +
            '<h2 class="ping-ers-title">친구 초대</h2>' +
            '<p class="ping-ers-sub">최대 3명까지 초대장을 보낼 수 있어요.</p>' +
            '<label class="ping-ers-label" for="ping-ers-name">성함</label>' +
            '<input type="text" id="ping-ers-name" class="ping-ers-input" placeholder="홍길동" autocomplete="name" maxlength="40">' +
            '<label class="ping-ers-label" for="ping-ers-phone">연락처</label>' +
            '<input type="tel" id="ping-ers-phone" class="ping-ers-input" placeholder="01012345678" inputmode="numeric" maxlength="11">' +
            '<button type="button" class="ping-ers-btn ping-ers-btn-primary" id="ping-ers-send-invite">보내기</button>' +
            '<div class="ping-ers-float" id="ping-ers-float-hint" aria-live="polite"></div>' +
            '<div id="ping-ers-after-send" class="ping-ers-hide">' +
            '<div class="ping-ers-actions-row" id="ping-ers-row-partial"></div>' +
            '<div class="ping-ers-actions-row ping-ers-hide" id="ping-ers-row-done"></div>' +
            '</div>' +
            '<p class="ping-ers-coupon-note" id="ping-ers-coupon-hint"></p>' +
            '</div></div>';
        document.body.appendChild(root);
        bindSheet(root);
        return root;
    }

    function showView(rewardVsInvite) {
        var sheet = document.querySelector('#ping-ers-root .ping-ers-sheet');
        var rv = document.getElementById('ping-ers-view-reward');
        var iv = document.getElementById('ping-ers-view-invite');
        if (rewardVsInvite === 'reward') {
            if (sheet) {
                sheet.classList.add('ping-ers-sheet--dark');
                sheet.classList.remove('ping-ers-sheet--invite');
            }
            rv.classList.remove('ping-ers-hide');
            iv.classList.add('ping-ers-hide');
        } else {
            if (sheet) {
                sheet.classList.remove('ping-ers-sheet--dark');
                sheet.classList.add('ping-ers-sheet--invite');
            }
            rv.classList.add('ping-ers-hide');
            iv.classList.remove('ping-ers-hide');
        }
    }

    function newBatchId() {
        try {
            if (crypto.randomUUID) return crypto.randomUUID();
        } catch (e) {}
        return 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    }

    function openSheet() {
        var root = ensureRoot();
        root.classList.add('is-active');
        requestAnimationFrame(function () {
            root.classList.add('is-open');
        });
        root.setAttribute('aria-hidden', 'false');
    }

    function closeSheet() {
        var root = document.getElementById('ping-ers-root');
        var sheet = root ? root.querySelector('.ping-ers-sheet') : null;
        if (!root) return;
        if (sheet) {
            sheet.style.transition = '';
            sheet.style.transform = '';
        }
        root.classList.remove('is-open');
        setTimeout(function () {
            root.classList.remove('is-active');
            root.setAttribute('aria-hidden', 'true');
        }, 380);
    }

    function resetInviteForm() {
        var n = document.getElementById('ping-ers-name');
        var p = document.getElementById('ping-ers-phone');
        if (n) n.value = '';
        if (p) p.value = '';
        var fh = document.getElementById('ping-ers-float-hint');
        if (fh) {
            fh.textContent = '';
            fh.classList.remove('is-on');
        }
        var as = document.getElementById('ping-ers-after-send');
        if (as) as.classList.add('ping-ers-hide');
        var rp = document.getElementById('ping-ers-row-partial');
        var rd = document.getElementById('ping-ers-row-done');
        if (rp) rp.innerHTML = '';
        if (rd) {
            rd.innerHTML = '';
            rd.classList.add('ping-ers-hide');
        }
        var ch = document.getElementById('ping-ers-coupon-hint');
        if (ch) ch.textContent = '';
    }

    function showFloatHint(text) {
        var fh = document.getElementById('ping-ers-float-hint');
        if (!fh) return;
        fh.textContent = text;
        fh.classList.add('is-on');
    }

    function bindSheet(root) {
        var overlay = document.getElementById('ping-ers-overlay');
        var sheet = root.querySelector('.ping-ers-sheet');
        var handle = root.querySelector('.ping-ers-handle');
        var dragStartY = 0;
        var dragCurrentY = 0;
        var isDragging = false;
        var pointerId = null;

        function resetDragStyles() {
            if (!sheet) return;
            sheet.style.transition = '';
            sheet.style.transform = '';
        }

        function onPointerMove(event) {
            if (!isDragging || event.pointerId !== pointerId || !sheet) return;
            dragCurrentY = Math.max(0, event.clientY - dragStartY);
            sheet.style.transition = 'none';
            sheet.style.transform = 'translateY(' + dragCurrentY + 'px)';
        }

        function onPointerUp(event) {
            if (!isDragging || event.pointerId !== pointerId || !sheet) return;
            isDragging = false;
            pointerId = null;
            if (dragCurrentY > 72) {
                closeSheet();
                return;
            }
            resetDragStyles();
        }

        if (overlay) {
            overlay.addEventListener('click', function () {
                closeSheet();
            });
        }
        if (handle && sheet) {
            handle.addEventListener('click', function () {
                closeSheet();
            });
            handle.addEventListener('pointerdown', function (event) {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                isDragging = true;
                pointerId = event.pointerId;
                dragStartY = event.clientY;
                dragCurrentY = 0;
                sheet.style.transition = 'none';
                handle.setPointerCapture(event.pointerId);
            });
            handle.addEventListener('pointermove', onPointerMove);
            handle.addEventListener('pointerup', onPointerUp);
            handle.addEventListener('pointercancel', function (event) {
                if (event.pointerId !== pointerId) return;
                isDragging = false;
                pointerId = null;
                resetDragStyles();
            });
        }
        document.getElementById('ping-ers-browse').addEventListener('click', function () {
            closeSheet();
            try {
                if (sessionStorage.getItem('ping_auth_token')) {
                    goToPage('root', 'mypage.html');
                    return;
                }
            } catch (eBrowse) {}
            window.location.href = '/login?next=mypage';
        });
        document.getElementById('ping-ers-open-invite').addEventListener('click', function () {
            sheetBatchId = newBatchId();
            sheetSent = 0;
            resetInviteForm();
            document.getElementById('ping-ers-after-send').classList.add('ping-ers-hide');
            showView('invite');
        });
        document.getElementById('ping-ers-back-reward').addEventListener('click', function () {
            resetInviteForm();
            sheetSent = 0;
            sheetBatchId = '';
            showView('reward');
        });
        document.getElementById('ping-ers-send-invite').addEventListener('click', sheetSendHandler);
    }

    function renderAfterSend() {
        var partial = document.getElementById('ping-ers-row-partial');
        var done = document.getElementById('ping-ers-row-done');
        var after = document.getElementById('ping-ers-after-send');
        if (!partial || !done || !after) return;
        partial.innerHTML = '';
        done.innerHTML = '';
        after.classList.remove('ping-ers-hide');
        if (sheetSent >= MAX_INVITE) {
            done.classList.remove('ping-ers-hide');
            done.innerHTML =
                '<button type="button" class="ping-ers-btn ping-ers-btn-primary" id="ping-ers-goto-mypage">마이페이지에서 확인하기</button>';
            document.getElementById('ping-ers-goto-mypage').addEventListener('click', function () {
                closeSheet();
                goToPage('root', 'mypage.html');
            });
            var ch = document.getElementById('ping-ers-coupon-hint');
            if (ch) ch.textContent = '5,000원 쿠폰은 마이페이지 · 혜택에서 확인할 수 있어요.';
        } else {
            partial.innerHTML =
                '<button type="button" class="ping-ers-btn ping-ers-btn-secondary" id="ping-ers-another">다른 친구에게 보내기</button>' +
                '<button type="button" class="ping-ers-btn ping-ers-btn-ghost" id="ping-ers-later">나중에 보낼래요</button>';
            document.getElementById('ping-ers-another').addEventListener('click', function () {
                document.getElementById('ping-ers-name').value = '';
                document.getElementById('ping-ers-phone').value = '';
                after.classList.add('ping-ers-hide');
            });
            document.getElementById('ping-ers-later').addEventListener('click', function () {
                alert('추가 친구 초대는 마이페이지에서 언제든지 가능합니다.');
                closeSheet();
                void refreshMypageCards();
            });
        }
    }

    async function sheetSendHandler() {
        var name = (document.getElementById('ping-ers-name').value || '').trim();
        var phone = (document.getElementById('ping-ers-phone').value || '').replace(/\D/g, '');
        if (!name || phone.length < 10) {
            alert('성함과 휴대폰 번호를 확인해 주세요.');
            return;
        }
        if (!sheetBatchId) sheetBatchId = newBatchId();
        try {
            var res = await postJson('/api/invite/friend-submit', {
                deviceId: gid(),
                batchId: sheetBatchId,
                name: name,
                phone: phone,
            });
            if (!res.ok || !res.json || !res.json.ok) {
                if (res.json && res.json.error === 'max_reached') {
                    sheetSent =
                        Number(res.json.sentInBatch) || MAX_INVITE;
                } else {
                    alert('전송 처리에 실패했습니다. 네트워크를 확인해 주세요.');
                    return;
                }
            } else {
                sheetSent = res.json.sentInBatch || sheetSent + 1;
            }
            showFloatHint('현재 ' + sheetSent + '명에게 보냈습니다. 최대 ' + MAX_INVITE + '명까지 보낼 수 있어요!');
            renderAfterSend();
            void refreshMypageCards();
        } catch (e) {
            alert('전송 처리에 실패했습니다.');
        }
    }

    async function onCountdownComplete() {
        try {
            if (localStorage.getItem('ping_engage_promo_seen_v1') === '1') return;
        } catch (eDup) {}
        if (window.__pingEngageRewardOpening) return;
        window.__pingEngageRewardOpening = true;
        try {
            injectStyles();
            ensureRoot();
            var hint = document.getElementById('ping-ers-api-hint');
            try {
                var res = await postJson('/api/reward/engage-countdown', { deviceId: gid() });
                if (hint) {
                    if (res.json && res.json.ok && res.json.alreadyClaimed && res.json.message) {
                        hint.textContent = res.json.message;
                        hint.classList.remove('ping-ers-hide');
                    } else {
                        hint.textContent = '';
                        hint.classList.add('ping-ers-hide');
                    }
                }
            } catch (e) {
                if (hint) {
                    hint.textContent = '포인트는 서버 연결 시 반영돼요.';
                    hint.classList.remove('ping-ers-hide');
                }
            }
            showView('reward');
            resetInviteForm();
            sheetBatchId = '';
            sheetSent = 0;
            openSheet();
            try {
                localStorage.setItem('ping_engage_promo_seen_v1', '1');
            } catch (eSeen) {}
            try {
                if (window.PingEngageCountdown && typeof window.PingEngageCountdown.clearSession === 'function') {
                    window.PingEngageCountdown.clearSession();
                }
            } catch (eClr) {}
            void refreshMypageCards();
        } finally {
            window.__pingEngageRewardOpening = false;
        }
    }

    async function refreshMypageCards() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('mypage') === -1) return;
        var sum = await getSummary();
        var refPts = 0;
        var refFriends = 0;
        try {
            if (window.PingReferral && PingReferral.fetchBalance) {
                var b = await PingReferral.fetchBalance();
                if (b && b.ok) {
                    refPts = Number(b.points) || 0;
                    refFriends = Number(b.friendCount) || 0;
                }
            }
        } catch (e) {}
        var engage = sum && sum.ok ? Number(sum.engagePoints) || 0 : 0;
        var invTotal = sum && sum.ok ? Number(sum.inviteTotalCount) || 0 : 0;
        var coupon = sum && sum.ok && sum.coupon5000Issued;
        var localMisc = (window.PingReferral && PingReferral.readLocalMiscPoints) ? PingReferral.readLocalMiscPoints() : 0;

        var elEng = document.getElementById('mypage-engage-points');
        var elInv = document.getElementById('mypage-invite-total');
        var elCp = document.getElementById('mypage-coupon-status');
        var elRef = document.getElementById('mypage-referral-points');
        var elFr = document.getElementById('mypage-referral-friends');
        var elLoc = document.getElementById('mypage-local-points');
        var elTot = document.getElementById('mypage-total-points');
        if (elEng) elEng.textContent = engage.toLocaleString('ko-KR');
        if (elInv) elInv.textContent = String(invTotal);
        if (elCp) elCp.textContent = coupon ? '받음 (5,000원)' : '미발급';
        if (elRef) elRef.textContent = refPts.toLocaleString('ko-KR');
        if (elFr) elFr.textContent = String(refFriends);
        if (elLoc) elLoc.textContent = localMisc.toLocaleString('ko-KR');
        if (elTot) elTot.textContent = (engage + refPts + localMisc).toLocaleString('ko-KR');
    }

    /** 마이페이지 임베드 영역 */
    function mountEmbedded(container) {
        if (!container) return;
        injectStyles();
        container.innerHTML =
            '<h3 style="margin:0 0 8px;font-size:15px;font-weight:800;">친구 초대 보내기</h3>' +
            '<p style="margin:0 0 12px;font-size:12px;color:#6b7684;line-height:1.45;">한 번에 최대 ' +
            MAX_INVITE +
            '명까지 보낼 수 있어요.</p>' +
            '<label class="ping-ers-label" for="ping-emb-name">성함</label>' +
            '<input type="text" id="ping-emb-name" class="ping-ers-input" maxlength="40">' +
            '<label class="ping-ers-label" for="ping-emb-phone">연락처</label>' +
            '<input type="tel" id="ping-emb-phone" class="ping-ers-input" inputmode="numeric" maxlength="11">' +
            '<button type="button" class="ping-ers-btn ping-ers-btn-primary" id="ping-emb-send">보내기</button>' +
            '<div class="ping-ers-float is-on" id="ping-emb-float" style="position:relative;margin-top:12px;opacity:1;animation:none;"></div>' +
            '<div id="ping-emb-after" style="margin-top:12px;"></div>';
        embedBatchId = '';
        embedSent = 0;
        document.getElementById('ping-emb-send').addEventListener('click', async function () {
            var name = (document.getElementById('ping-emb-name').value || '').trim();
            var phone = (document.getElementById('ping-emb-phone').value || '').replace(/\D/g, '');
            if (!name || phone.length < 10) {
                alert('성함과 휴대폰 번호를 확인해 주세요.');
                return;
            }
            if (!embedBatchId) embedBatchId = newBatchId();
            var floatEl = document.getElementById('ping-emb-float');
            var after = document.getElementById('ping-emb-after');
            try {
                var res = await postJson('/api/invite/friend-submit', {
                    deviceId: gid(),
                    batchId: embedBatchId,
                    name: name,
                    phone: phone,
                });
                if (!res.ok || !res.json || !res.json.ok) {
                    if (res.json && res.json.error === 'max_reached') {
                        embedSent = MAX_INVITE;
                    } else {
                        alert('전송에 실패했습니다.');
                        return;
                    }
                } else {
                    embedSent = res.json.sentInBatch || embedSent + 1;
                }
                if (floatEl) {
                    floatEl.textContent =
                        '현재 ' + embedSent + '명에게 보냈습니다. 최대 ' + MAX_INVITE + '명까지 보낼 수 있어요!';
                    floatEl.style.animation = 'pingErsFloat .9s ease-in-out infinite alternate';
                }
                after.innerHTML = '';
                if (embedSent < MAX_INVITE) {
                    after.innerHTML =
                        '<button type="button" class="ping-ers-btn ping-ers-btn-secondary" id="ping-emb-another">다른 친구에게 보내기</button>' +
                        '<button type="button" class="ping-ers-btn ping-ers-btn-ghost" id="ping-emb-newbatch">새 묶음으로 초대 (3명 한도 초기화)</button>';
                    document.getElementById('ping-emb-another').addEventListener('click', function () {
                        document.getElementById('ping-emb-name').value = '';
                        document.getElementById('ping-emb-phone').value = '';
                    });
                    document.getElementById('ping-emb-newbatch').addEventListener('click', function () {
                        embedBatchId = newBatchId();
                        embedSent = 0;
                        if (floatEl) {
                            floatEl.textContent = '새 초대 묶음이 시작됐어요. (다시 최대 ' + MAX_INVITE + '명)';
                            floatEl.style.animation = 'none';
                        }
                        after.innerHTML = '';
                    });
                } else {
                    after.innerHTML =
                        '<p style="font-size:13px;color:#0097A9;font-weight:700;">이번 묶음 3명 모두 보냈어요. 5,000원 쿠폰은 혜택 상태를 확인해 주세요.</p>';
                }
                void refreshMypageCards();
            } catch (e2) {
                alert('전송에 실패했습니다.');
            }
        });
    }

    window.addEventListener('ping:engage-countdown-complete', function () {
        void onCountdownComplete();
    });

    function openSheetForTest() {
        ensureRoot();
        showView('reward');
        openSheet();
    }

    window.PingEngageReward = {
        refreshMypageCards: refreshMypageCards,
        mountEmbedded: mountEmbedded,
        openSheetForTest: openSheetForTest,
    };

    document.addEventListener('DOMContentLoaded', function () {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('mypage') !== -1) {
            var emb = document.getElementById('mypage-embed-invite');
            if (emb) mountEmbedded(emb);
        }
    });
})();
