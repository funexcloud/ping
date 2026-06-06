/**
 * legal/*.html 하단·상단 뒤로: URL ?pingReturn=… 에 따라 목적지 고정.
 * 미지정·기타 값은 /index.html (대량 발송 테넌트·레거시 진입)로 폴백.
 */
(function () {
    function resolveReturnHref() {
        try {
            var q = new URLSearchParams(window.location.search || "");
            var v = String(q.get("pingReturn") || "")
                .toLowerCase()
                .trim();
            var map = {
                overview: "/overview",
                "customer-center": "/customer-center",
                partnership: "/partnership",
                index: "/index.html",
            };
            if (map[v]) return map[v];
            return "/index.html";
        } catch (e) {
            return "/index.html";
        }
    }
    function apply() {
        var a = document.querySelector("a.ping-doc-page-back");
        if (a) a.setAttribute("href", resolveReturnHref());
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", apply);
    } else {
        apply();
    }
})();
