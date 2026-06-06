/**
 * overview.html — 네비 그림자, 앵커 스무스 스크롤, FAQ 아코디언, 스크롤 진입 시 요소 노출
 */
(function () {
    'use strict';

    var navWrap = document.getElementById('top-nav-wrap');

    function syncNavShadow() {
        if (!navWrap) return;
        navWrap.classList.toggle('is-scrolled', window.scrollY > 8);
    }

    window.addEventListener('scroll', syncNavShadow, { passive: true });
    syncNavShadow();

    document.querySelectorAll('.nav-links a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            var targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;
            var section = document.querySelector(targetId);
            if (!section) return;
            event.preventDefault();
            var y = section.getBoundingClientRect().top + window.scrollY - 86;
            window.scrollTo({ top: y, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.faq-item').forEach(function (item, index) {
        var btn = item.querySelector('.faq-btn');
        var panel = item.querySelector('.faq-panel');
        if (!btn || !panel) return;

        btn.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');

        if (item.classList.contains('is-open')) {
            panel.style.maxHeight = panel.scrollHeight + 'px';
        }

        btn.addEventListener('click', function () {
            var wasOpen = item.classList.contains('is-open');

            document.querySelectorAll('.faq-item').forEach(function (other) {
                other.classList.remove('is-open');
                var otherBtn = other.querySelector('.faq-btn');
                var otherPanel = other.querySelector('.faq-panel');
                if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                if (otherPanel) otherPanel.style.maxHeight = '0px';
            });

            if (!wasOpen) {
                item.classList.add('is-open');
                panel.style.maxHeight = panel.scrollHeight + 'px';
                btn.setAttribute('aria-expanded', 'true');
            }
        });

        if (index > 0) {
            panel.style.maxHeight = '0px';
        }
    });

    function initScrollReveals() {
        var els = document.querySelectorAll('.overview-reveal');
        if (!els.length) return;

        function revealAll() {
            els.forEach(function (el) {
                el.classList.add('overview-reveal--in');
            });
        }

        var reduceMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            revealAll();
            return;
        }

        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('overview-reveal--in');
                    io.unobserve(entry.target);
                });
            },
            { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
        );

        els.forEach(function (el) {
            io.observe(el);
        });
    }

    initScrollReveals();

    /**
     * Hero mock: damped pointer parallax on 3D stage (skipped when prefers-reduced-motion).
     */
    function initHeroMockTilt() {
        var root = document.getElementById('hero-mock-stack');
        var stage = document.getElementById('hero-mock-stage');
        if (!root || !stage) return;

        var reduceMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        /* Extra tilt on top of CSS base (--hero-mock-base-*) caps (deg) — tune intensity here */
        var maxAddRotateX = 6;
        var maxAddRotateY = 7;
        var damping = 0.12;

        var targetX = 0;
        var targetY = 0;
        var curX = 0;
        var curY = 0;
        var rafId = 0;

        function setVars() {
            stage.style.setProperty('--hero-mock-parallax-mx', curX.toFixed(3) + 'deg');
            stage.style.setProperty('--hero-mock-parallax-my', curY.toFixed(3) + 'deg');
        }

        function tick() {
            rafId = 0;
            curX += (targetX - curX) * damping;
            curY += (targetY - curY) * damping;
            setVars();
            if (
                Math.abs(targetX - curX) > 0.015 ||
                Math.abs(targetY - curY) > 0.015 ||
                Math.abs(curX) > 0.015 ||
                Math.abs(curY) > 0.015
            ) {
                schedule();
            }
        }

        function schedule() {
            if (!rafId) rafId = window.requestAnimationFrame(tick);
        }

        function onPointer(ev) {
            if (ev.pointerType === 'touch') return;

            var rect = root.getBoundingClientRect();
            var w = rect.width || 1;
            var h = rect.height || 1;
            var nx = ((ev.clientX - rect.left) / w) * 2 - 1;
            var ny = ((ev.clientY - rect.top) / h) * 2 - 1;
            targetX = Math.max(-maxAddRotateX, Math.min(maxAddRotateX, -ny * maxAddRotateX));
            targetY = Math.max(-maxAddRotateY, Math.min(maxAddRotateY, nx * maxAddRotateY));
            schedule();
        }

        root.addEventListener('pointermove', onPointer);

        function resetTargets() {
            targetX = 0;
            targetY = 0;
            schedule();
        }

        root.addEventListener('pointerleave', resetTargets);
        root.addEventListener('pointercancel', resetTargets);

        setVars();
    }

    initHeroMockTilt();
})();
