/**
 * PingBulkContacts — 대량 발송 명단 import 공유 모듈.
 *
 * 목적: index.html 의 레거시 #index-wiz-pick 단계 코드를 점진적으로 추출해,
 *      신규 /send/contacts.html(예정)와 공유한다. 동작 무변경(리팩토링).
 *
 * 단계 진행:
 *   Phase 4a-1 (현재): triggerFileSelect 추출
 *   Phase 4a-2 (예정): analyzeFile + VCard/sheet 헬퍼 (콜백 API)
 *   Phase 4a-3 (예정): loadGoogleContacts + gapiInit
 *   Phase 4b (예정):   /send/contacts.html 신규 → 본 모듈 사용
 *
 * 설계 원칙:
 *   - 글로벌 상태(currentCount, phonesToSend 등)는 호출자가 관리. 모듈은 인자/콜백만.
 *   - DOM 의존은 인자(fileInput, 콜백)로 분리해 contacts.html 에서도 재사용 가능.
 *   - 외부 라이브러리: XLSX(SheetJS), google.accounts/gapi 는 호출 시점에 전역 존재 가정.
 */
;(function (global) {
    'use strict';

    function isMobileUA() {
        try { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ''); }
        catch (e) { return false; }
    }

    /**
     * 주소록 파일 입력에 click() 을 던져 OS 파일 다이얼로그를 띄운다.
     *
     * 호환성 노트:
     *   - 모바일: accept="*\/*" 로 iOS 사진 라이브러리 메뉴 건너뛰고 Files 앱(다운로드 폴더) 직진.
     *   - 데스크톱: accept 미설정 → Windows/Chromium 의 "Custom Files" 잔여 필터 회피.
     *   - iOS Safari: user-gesture 동기 컨텍스트가 필요 → setTimeout 사용 금지.
     *
     * @param {Object}            opts
     * @param {HTMLInputElement}  [opts.fileInput]    file input 요소 (없으면 fileInputId 사용)
     * @param {string}            [opts.fileInputId]  요소 id (기본값: 'file')
     * @param {string}            [opts.mobileAccept] 모바일 accept 값 (기본값: '*\/*')
     * @param {(msg:string)=>void}[opts.onError]      에러 메시지 핸들러 (기본값: alert)
     */
    function triggerFileSelect(opts) {
        opts = opts || {};
        var fileInput = opts.fileInput
            || (opts.fileInputId ? document.getElementById(opts.fileInputId) : null)
            || document.getElementById('file');
        var onError = typeof opts.onError === 'function' ? opts.onError : function (m) { alert(m); };

        if (!fileInput) {
            console.error('❌ 파일 입력 요소를 찾을 수 없습니다.');
            onError('파일 선택 기능을 사용할 수 없습니다.\n페이지를 새로고침해주세요.');
            return;
        }

        try {
            fileInput.value = '';

            if (isMobileUA()) {
                fileInput.setAttribute('accept', opts.mobileAccept || '*/*');
            } else {
                try { fileInput.removeAttribute('accept'); } catch (eRm) {}
            }

            try {
                fileInput.click();
                console.log('✅ 파일 선택 다이얼로그 열기 (click)');
                return;
            } catch (clickError) {
                console.warn('⚠️ click() 실패, dispatchEvent 시도:', clickError);
            }

            try {
                var ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                fileInput.dispatchEvent(ev);
                console.log('✅ 파일 선택 다이얼로그 열기 (dispatchEvent)');
            } catch (eventError) {
                console.error('❌ 모든 파일 선택 방법 실패:', eventError);
                onError(
                    '파일 선택 창을 열 수 없습니다.\n\n해결 방법:\n' +
                    '1. 브라우저를 최신 버전으로 업데이트\n' +
                    '2. 다른 브라우저에서 시도\n' +
                    '3. 페이지를 새로고침'
                );
            }
        } catch (error) {
            console.error('❌ 파일 선택 실패:', error);
            onError('파일 선택 중 오류가 발생했습니다.\n페이지를 새로고침하고 다시 시도해주세요.');
        }
    }

    var existing = global.PingBulkContacts || {};
    global.PingBulkContacts = {
        isMobileUA:        existing.isMobileUA        || isMobileUA,
        triggerFileSelect: existing.triggerFileSelect || triggerFileSelect,
    };
})(typeof window !== 'undefined' ? window : this);
