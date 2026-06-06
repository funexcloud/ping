// @ts-nocheck — legacy canvas port (var/implicit any)
/** @generated from legacy-html/stitch-wave.html */
export function initStitchWaveCanvas(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    var w = 0, h = 0, dpr = 1;
    var t = 0;

    var ripples = [];
    var RIPPLE_DECAY = 620;
    var RIPPLE_RADIUS = 56;
    var RIPPLE_MAX = 6;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = Math.floor(window.innerWidth * dpr);
        h = Math.floor(window.innerHeight * dpr);
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }
    resize();
    window.addEventListener('resize', resize);

    function clientToCanvas(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        var x = ((clientX - rect.left) / rect.width) * w;
        var y = ((clientY - rect.top) / rect.height) * h;
        return { x: x, y: y };
    }

    function addRipple(cx, cy) {
        ripples.push({ x: cx, y: cy, t0: performance.now() });
        if (ripples.length > RIPPLE_MAX) ripples.shift();
    }

    canvas.addEventListener('pointerdown', function (e) {
        var p = clientToCanvas(e.clientX, e.clientY);
        addRipple(p.x, p.y);
    });

    function uCurveYBase(x) {
        var nx = x / w;
        var base = h * 0.74;
        var amp = h * 0.18;
        return base + amp * Math.sin(nx * Math.PI);
    }

    function smoothstep(e0, e1, x) {
        var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
        return t * t * (3 - 2 * t);
    }

    /** 큰 파장 위주 U 윗선 (파도치는 림) */
    function uCurveY(x, time) {
        var y = uCurveYBase(x);
        var nx = x / w;
        var w1 = 10 * dpr * Math.sin(nx * Math.PI * 2.1 + time * 0.001) * Math.sin(time * 0.0006 + nx * Math.PI * 1.1);
        var w2 = 8 * dpr * Math.cos(nx * Math.PI * 2.9 - time * 0.00125);
        var w3 = 6 * dpr * Math.sin(nx * Math.PI * 1.35 + time * 0.00075);
        var w4 = 7 * dpr * Math.sin(nx * Math.PI * 0.75 - time * 0.00048);
        return y + w1 + w2 + w3 + w4;
    }

    /** 도트·유체 경계 페이드 (x 기준 곡선 높이) */
    function boundarySoft(cx, py, time) {
        var curY = uCurveY(cx, time);
        var d = py - curY;
        var feather = 52 * dpr;
        if (d < -feather * 0.25) return 0;
        if (d > feather * 1.2) return 1;
        return smoothstep(-feather * 0.25, feather * 1.2, d);
    }

    function sampleCurve(n, time) {
        var pts = [];
        for (var i = 0; i <= n; i++) {
            var x = (i / n) * w;
            pts.push({ x: x, y: uCurveY(x, time) });
        }
        return pts;
    }

    function buildUPath(ctx2, pts) {
        ctx2.beginPath();
        ctx2.moveTo(0, h);
        for (var j = 0; j < pts.length; j++) {
            ctx2.lineTo(pts[j].x, pts[j].y);
        }
        ctx2.lineTo(w, h);
        ctx2.closePath();
    }

    var dotSpacing = 12;
    var cols = 0, rows = 0;

    function gridDims() {
        dotSpacing = 12 * dpr;
        cols = Math.ceil(w / dotSpacing) + 1;
        rows = Math.ceil(h / dotSpacing) + 1;
    }
    gridDims();
    window.addEventListener('resize', gridDims);

    /** 클릭 주변만 짧게 출렁 (화면 끝까지 번지지 않음) */
    function rippleInfluence(px, py, now) {
        var dx = 0, dy = 0;
        var scale = 1;
        var glow = 0;
        var R = RIPPLE_RADIUS * dpr;
        for (var r = 0; r < ripples.length; r++) {
            var rv = ripples[r];
            var dt = now - rv.t0;
            if (dt < 0 || dt > RIPPLE_DECAY) continue;
            var dist = Math.hypot(px - rv.x, py - rv.y);
            if (dist > R * 2.2) continue;

            var envelope = Math.max(0, 1 - dt / RIPPLE_DECAY);
            var spot = Math.exp(-(dist * dist) / (2 * R * R * 0.42));
            var rip = Math.sin(dist * 0.14 - dt * 0.022) * 0.5 + 0.5;
            var s = spot * rip * envelope * envelope;
            if (s < 0.008) continue;

            var ang = dist > 0.4 ? Math.atan2(py - rv.y, px - rv.x) : 0;
            var push = s * 4.2 * dpr;
            dx += Math.cos(ang) * push * Math.sin(dt * 0.018);
            dy += Math.sin(ang) * push * Math.sin(dt * 0.018);
            scale += s * 0.38;
            glow += s * 0.85;
        }
        return { dx: dx, dy: dy, scale: scale, glow: Math.min(1, glow) };
    }

    function drawDots() {
        var now = t;
        var feather = 52 * dpr;
        for (var gy = 0; gy <= rows; gy++) {
            for (var gx = 0; gx <= cols; gx++) {
                var bx = gx * dotSpacing + (w - cols * dotSpacing) * 0.5;
                var by = gy * dotSpacing + (h - rows * dotSpacing) * 0.5;
                var inf = rippleInfluence(bx, by, now);
                var x = bx + inf.dx;
                var y = by + inf.dy;
                var r = 1 * dpr * inf.scale;
                var a = 0.34 + inf.glow * 0.28;
                var curY = uCurveY(bx, now);
                var d = by - curY;
                if (d > feather * 1.05) {
                    a *= 0.1;
                } else if (d > -feather * 0.2) {
                    var mist = 1 - smoothstep(-feather * 0.2, feather * 1.05, d);
                    a *= 0.22 + 0.78 * mist;
                }
                ctx.fillStyle = 'rgba(155, 158, 172, ' + Math.min(1, a).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawHologramFill(pts) {
        var pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0018));
        var pulse2 = 0.5 + 0.5 * Math.sin(t * 0.0012 + 1.7);
        var hueBase = (t * 0.035) % 360;
        var fillPulse = 0.45 + 0.45 * pulse * pulse2;

        var minY = h;
        for (var pi = 0; pi < pts.length; pi++) {
            if (pts[pi].y < minY) minY = pts[pi].y;
        }
        minY = Math.max(0, Math.floor(minY - 70 * dpr));

        var colW = Math.max(3, Math.ceil(3 * dpr));
        var strip = Math.max(2, Math.ceil(3 * dpr));

        /* 열 단위 페이드 — 날카로운 클립 없이 도트와 경계 흐림 */
        for (var py = minY; py <= h; py += strip) {
            var nv = py / h;
            var wave = 0.5 + 0.5 * Math.sin(py * 0.0048 + t * 0.0016);
            var wave2 = 0.5 + 0.5 * Math.cos(py * 0.0055 - t * 0.0011 + nv * 2.5);
            var m = wave * 0.5 + wave2 * 0.5;
            var hue = (hueBase + nv * 95 + m * 55) % 360;
            var sat = 52 + m * 28 + fillPulse * 12;
            var light = 22 + m * 18 + (1 - nv) * 6;
            var aBot = 0.82 + 0.12 * fillPulse;
            var aTop = 0.58 + 0.18 * m * fillPulse;
            var alphaBase = aTop + (aBot - aTop) * Math.pow(nv, 0.82);
            alphaBase *= 0.92 + 0.08 * Math.sin(t * 0.00085 + py * 0.003);

            for (var x = 0; x < w; x += colW) {
                var cx = x + colW * 0.5;
                var edge = boundarySoft(cx, py + strip * 0.5, t);
                if (edge < 0.004) continue;

                var roll = 0.5 + 0.5 * Math.sin(cx * (6.28318 / Math.max(w * 0.38, 1)) + py * (6.28318 / Math.max(h * 0.14, 1)) - t * 0.0013);
                var roll2 = 0.5 + 0.5 * Math.cos(cx * (6.28318 / Math.max(w * 0.52, 1)) - py * (6.28318 / Math.max(h * 0.22, 1)) + t * 0.0009);
                var swell = roll * 0.55 + roll2 * 0.45;
                var hRoll = (hue + swell * 48 + cx * 0.012) % 360;

                var alpha = alphaBase * edge * (0.82 + 0.18 * swell);

                var lg = ctx.createLinearGradient(x, py, x + colW, py + strip);
                var h1 = (hRoll + nv * 30) % 360;
                var h2 = (hRoll + 105 + Math.sin(t * 0.001) * 22) % 360;
                lg.addColorStop(0, 'hsla(' + h1 + ',' + sat + '%,' + light + '%,' + (alpha * 0.74) + ')');
                lg.addColorStop(0.5, 'hsla(' + h2 + ',' + (sat + 6) + '%,' + (light + 4) + '%,' + (alpha * 0.9) + ')');
                lg.addColorStop(1, 'hsla(' + ((hRoll + 195) % 360) + ',' + sat + '%,' + light + '%,' + (alpha * 0.8) + ')');
                ctx.fillStyle = lg;
                ctx.fillRect(x, py, colW + 1, strip + 1);
            }
        }

        /* 번짐 레이어: 살짝 위로 확장된 U로만 클립해 림 근처만 부드럽게 */
        var bleed = 38 * dpr;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var j = 0; j < pts.length; j++) {
            ctx.lineTo(pts[j].x, pts[j].y - bleed);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.clip();

        ctx.globalCompositeOperation = 'lighter';
        var gx0 = w * (0.25 + 0.12 * Math.sin(t * 0.00075));
        var gx1 = w * (0.75 + 0.12 * Math.cos(t * 0.00062));
        var gy0 = h * 0.88;
        var rad = Math.max(w, h) * 0.78;
        var rg = ctx.createRadialGradient(gx0, gy0, 0, gx0, gy0, rad);
        rg.addColorStop(0, 'hsla(' + ((hueBase + 40) % 360) + ',70%,38%,' + (0.24 * fillPulse) + ')');
        rg.addColorStop(0.4, 'hsla(' + ((hueBase + 210) % 360) + ',58%,32%,' + (0.16 * fillPulse) + ')');
        rg.addColorStop(1, 'hsla(' + ((hueBase + 280) % 360) + ',45%,22%,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);

        var rg2 = ctx.createRadialGradient(gx1, h * 0.94, 0, gx1, h * 0.94, rad * 0.64);
        rg2.addColorStop(0, 'hsla(' + ((hueBase + 300) % 360) + ',65%,36%,' + (0.18 * pulse2 * fillPulse) + ')');
        rg2.addColorStop(1, 'hsla(0,0%,0%,0)');
        ctx.fillStyle = rg2;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        var dimA = 0.32 + 0.14 * fillPulse;
        ctx.fillStyle = 'rgba(4, 5, 12, ' + dimA + ')';
        ctx.fillRect(0, minY, w, h - minY);
        ctx.restore();
    }

    function drawHologramWave(pts) {
        var pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0018));
        var pulse2 = 0.5 + 0.5 * Math.sin(t * 0.0012 + 1.7);
        var hueBase = (t * 0.035) % 360;
        var spread = 4 * dpr + 18 * dpr * pulse2;

        function holoStroke(lineW, alphaMult, blur, offsetHue) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = lineW;
            ctx.shadowBlur = blur;
            for (var i = 0; i < pts.length - 1; i++) {
                var p0 = pts[i];
                var p1 = pts[i + 1];
                var u = i / (pts.length - 1);
                var hue = (hueBase + u * 140 + offsetHue + Math.sin(u * 6.283 + t * 0.0014) * 25) % 360;
                var sat = 72 + 18 * Math.sin(t * 0.0015 + u * 2.6);
                var light = 55 + 25 * pulse * (0.7 + 0.3 * Math.sin(u * 4.5 + t * 0.00085));
                var a = alphaMult * pulse * (0.35 + 0.65 * (0.5 + 0.5 * Math.cos(u * 5.5 - t * 0.0022)));
                ctx.strokeStyle = 'hsla(' + hue + ',' + sat + '%,' + light + '%,' + a + ')';
                ctx.shadowColor = 'hsla(' + (hue + 40) % 360 + ',85%,65%,' + (a * 0.85) + ')';
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            }
        }

        holoStroke(spread, 0.14, 28 * dpr * pulse2, 0);
        holoStroke(spread * 0.55, 0.22, 14 * dpr * pulse, 30);

        ctx.shadowBlur = 0;

        var coreW = (2.2 + 2.8 * pulse) * dpr;
        holoStroke(coreW, 0.75, 0, -20);
        holoStroke(coreW * 0.45, 0.95, 6 * dpr * pulse, 50);
    }

    function frame(now) {
        t = now;
        ripples = ripples.filter(function (r) {
            return now - r.t0 < RIPPLE_DECAY;
        });

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        var pts = sampleCurve(280, t);

        drawDots();
        drawHologramFill(pts);
        drawHologramWave(pts);

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  return () => {
    window.removeEventListener('resize', resize);
  };
}
