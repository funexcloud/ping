/**
 * 토스형 단계 플로 — 가벼운 단계 JSON 누적(세션).
 * 단계 전환용 전체 화면 스피너는 사용하지 않음(결제·연락처 등 필수 스피너는 페이지에서 기존대로 유지).
 */
(function (global) {
    var KEY_DRAFT = 'ping_wizard_draft';

    function getDraft() {
        try {
            var raw = sessionStorage.getItem(KEY_DRAFT);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function mergeDraft(patch) {
        if (!patch || typeof patch !== 'object') return getDraft();
        var o = getDraft();
        for (var k in patch) {
            if (Object.prototype.hasOwnProperty.call(patch, k)) {
                o[k] = patch[k];
            }
        }
        o.ts = Date.now();
        try {
            sessionStorage.setItem(KEY_DRAFT, JSON.stringify(o));
        } catch (e) {}
        return o;
    }

    function clearDraft() {
        try {
            sessionStorage.removeItem(KEY_DRAFT);
        } catch (e) {}
    }

    global.PingWizardCore = {
        getDraft: getDraft,
        mergeDraft: mergeDraft,
        clearDraft: clearDraft,
    };
})(typeof window !== 'undefined' ? window : this);
