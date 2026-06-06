(function () {
    "use strict";

    function sanitizeLegalArticleHtml(html) {
        try {
            var wrapper =
                '<div id="ping-legal-sanitize-root">' + html + "</div>";
            var doc = new DOMParser().parseFromString(wrapper, "text/html");
            var root = doc.getElementById("ping-legal-sanitize-root");
            if (!root) return html;
            root.querySelectorAll(".ping-law-note").forEach(function (n) {
                n.remove();
            });
            root.querySelectorAll("p").forEach(function (p) {
                var t = (p.textContent || "").trim();
                if (
                    t.indexOf("요약본입니다") === 0 ||
                    t.indexOf("요약본입니다. 전문은") !== -1
                ) {
                    p.remove();
                }
            });
            return root.innerHTML;
        } catch (e) {
            return html;
        }
    }

    function injectLegal(url, el) {
        if (!el) return;
        el.setAttribute("aria-busy", "true");
        el.innerHTML =
            '<p class="ping-law-loading">약관 본문을 불러오는 중…</p>';
        fetch(url)
            .then(function (r) {
                if (!r.ok) throw r;
                return r.text();
            })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, "text/html");
                var main = doc.querySelector("main.ping-doc-article");
                el.classList.add("ping-doc-article-embed");
                if (main) {
                    el.innerHTML = sanitizeLegalArticleHtml(main.innerHTML);
                } else {
                    throw new Error("no article");
                }
            })
            .catch(function () {
                el.classList.remove("ping-doc-article-embed");
                el.innerHTML =
                    '<p class="ping-law-loading">본문을 불러오지 못했습니다. <a href="' +
                    url +
                    '" target="_blank" rel="noopener noreferrer">전체 문서 열기</a></p>';
            })
            .finally(function () {
                el.removeAttribute("aria-busy");
            });
    }

    function run() {
        var service = document.getElementById("law-service");
        var privacy = document.getElementById("law-privacy");
        injectLegal("/legal/terms-of-service", service);
        injectLegal("/legal/privacy-policy", privacy);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
    } else {
        run();
    }
})();
