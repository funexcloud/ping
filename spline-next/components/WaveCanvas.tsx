'use client';

import { useEffect, useRef } from 'react';

type Pt = { x: number; y: number };
type Ripple = { x: number; y: number; t0: number };

const RIPPLE_DECAY = 620;
const RIPPLE_RADIUS = 56;
const RIPPLE_MAX = 6;

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function WaveCanvas({
  className,
  pointerEvents = 'none',
}: {
  className?: string;
  pointerEvents?: 'none' | 'auto';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let t = 0;
    let dotSpacing = 12;
    let cols = 0;
    let rows = 0;

    const gridDims = () => {
      dotSpacing = 12 * dpr;
      cols = Math.ceil(w / dotSpacing) + 1;
      rows = Math.ceil(h / dotSpacing) + 1;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.floor(window.innerWidth * dpr);
      h = Math.floor(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      gridDims();
    };
    resize();
    window.addEventListener('resize', resize);

    const clientToCanvas = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * w;
      const y = ((clientY - rect.top) / rect.height) * h;
      return { x, y };
    };

    const addRipple = (cx: number, cy: number) => {
      const list = ripplesRef.current;
      list.push({ x: cx, y: cy, t0: performance.now() });
      if (list.length > RIPPLE_MAX) list.shift();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (pointerEvents !== 'auto') return;
      const p = clientToCanvas(e.clientX, e.clientY);
      addRipple(p.x, p.y);
    };
    if (pointerEvents === 'auto') canvas.addEventListener('pointerdown', onPointerDown);

    const uCurveYBase = (x: number) => {
      const nx = x / w;
      const base = h * 0.74;
      const amp = h * 0.18;
      return base + amp * Math.sin(nx * Math.PI);
    };

    const uCurveY = (x: number, time: number) => {
      let y = uCurveYBase(x);
      const nx = x / w;
      y +=
        10 * dpr * Math.sin(nx * Math.PI * 2.1 + time * 0.001) * Math.sin(time * 0.0006 + nx * Math.PI * 1.1);
      y += 8 * dpr * Math.cos(nx * Math.PI * 2.9 - time * 0.00125);
      y += 6 * dpr * Math.sin(nx * Math.PI * 1.35 + time * 0.00075);
      y += 7 * dpr * Math.sin(nx * Math.PI * 0.75 - time * 0.00048);
      return y;
    };

    const boundarySoft = (cx: number, py: number, time: number) => {
      const curY = uCurveY(cx, time);
      const d = py - curY;
      const feather = 52 * dpr;
      if (d < -feather * 0.25) return 0;
      if (d > feather * 1.2) return 1;
      return smoothstep(-feather * 0.25, feather * 1.2, d);
    };

    const sampleCurve = (n: number, time: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * w;
        pts.push({ x, y: uCurveY(x, time) });
      }
      return pts;
    };

    const rippleInfluence = (px: number, py: number, now: number) => {
      let dx = 0,
        dy = 0;
      let scale = 1;
      let glow = 0;
      const R = RIPPLE_RADIUS * dpr;
      for (const rv of ripplesRef.current) {
        const dt = now - rv.t0;
        if (dt < 0 || dt > RIPPLE_DECAY) continue;
        const dist = Math.hypot(px - rv.x, py - rv.y);
        if (dist > R * 2.2) continue;
        const envelope = Math.max(0, 1 - dt / RIPPLE_DECAY);
        const spot = Math.exp(-(dist * dist) / (2 * R * R * 0.42));
        const rip = Math.sin(dist * 0.14 - dt * 0.022) * 0.5 + 0.5;
        const s = spot * rip * envelope * envelope;
        if (s < 0.008) continue;
        const ang = dist > 0.4 ? Math.atan2(py - rv.y, px - rv.x) : 0;
        const push = s * 4.2 * dpr;
        dx += Math.cos(ang) * push * Math.sin(dt * 0.018);
        dy += Math.sin(ang) * push * Math.sin(dt * 0.018);
        scale += s * 0.38;
        glow += s * 0.85;
      }
      return { dx, dy, scale, glow: Math.min(1, glow) };
    };

    const drawDots = (now: number) => {
      const feather = 52 * dpr;
      for (let gy = 0; gy <= rows; gy++) {
        for (let gx = 0; gx <= cols; gx++) {
          const bx = gx * dotSpacing + (w - cols * dotSpacing) * 0.5;
          const by = gy * dotSpacing + (h - rows * dotSpacing) * 0.5;
          const inf = rippleInfluence(bx, by, now);
          const x = bx + inf.dx;
          const y = by + inf.dy;
          const r = 1 * dpr * inf.scale;
          let a = 0.34 + inf.glow * 0.28;
          const curY = uCurveY(bx, now);
          const d = by - curY;
          if (d > feather * 1.05) a *= 0.1;
          else if (d > -feather * 0.2) {
            const mist = 1 - smoothstep(-feather * 0.2, feather * 1.05, d);
            a *= 0.22 + 0.78 * mist;
          }
          ctx.fillStyle = `rgba(155, 158, 172, ${Math.min(1, a).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawHologramFill = (pts: Pt[]) => {
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0018));
      const pulse2 = 0.5 + 0.5 * Math.sin(t * 0.0012 + 1.7);
      const hueBase = (t * 0.035) % 360;
      const fillPulse = 0.45 + 0.45 * pulse * pulse2;
      let minY = h;
      for (const p of pts) {
        if (p.y < minY) minY = p.y;
      }
      minY = Math.max(0, Math.floor(minY - 70 * dpr));
      const colW = Math.max(3, Math.ceil(3 * dpr));
      const strip = Math.max(2, Math.ceil(3 * dpr));

      for (let py = minY; py <= h; py += strip) {
        const nv = py / h;
        const wave = 0.5 + 0.5 * Math.sin(py * 0.0048 + t * 0.0016);
        const wave2 = 0.5 + 0.5 * Math.cos(py * 0.0055 - t * 0.0011 + nv * 2.5);
        const m = wave * 0.5 + wave2 * 0.5;
        const hue = (hueBase + nv * 95 + m * 55) % 360;
        const sat = 52 + m * 28 + fillPulse * 12;
        const light = 22 + m * 18 + (1 - nv) * 6;
        const aBot = 0.82 + 0.12 * fillPulse;
        const aTop = 0.58 + 0.18 * m * fillPulse;
        let alphaBase = aTop + (aBot - aTop) * Math.pow(nv, 0.82);
        alphaBase *= 0.92 + 0.08 * Math.sin(t * 0.00085 + py * 0.003);

        for (let x = 0; x < w; x += colW) {
          const cx = x + colW * 0.5;
          const edge = boundarySoft(cx, py + strip * 0.5, t);
          if (edge < 0.004) continue;
          const roll =
            0.5 +
            0.5 *
              Math.sin(
                cx * (6.28318 / Math.max(w * 0.38, 1)) +
                  py * (6.28318 / Math.max(h * 0.14, 1)) -
                  t * 0.0013,
              );
          const roll2 =
            0.5 +
            0.5 *
              Math.cos(
                cx * (6.28318 / Math.max(w * 0.52, 1)) -
                  py * (6.28318 / Math.max(h * 0.22, 1)) +
                  t * 0.0009,
              );
          const swell = roll * 0.55 + roll2 * 0.45;
          const hRoll = (hue + swell * 48 + cx * 0.012) % 360;
          const alpha = alphaBase * edge * (0.82 + 0.18 * swell);
          const lg = ctx.createLinearGradient(x, py, x + colW, py + strip);
          lg.addColorStop(
            0,
            `hsla(${((hRoll + nv * 30) % 360)}, ${sat}%, ${light}%, ${alpha * 0.74})`,
          );
          lg.addColorStop(
            0.5,
            `hsla(${((hRoll + 105 + Math.sin(t * 0.001) * 22) % 360)}, ${sat + 6}%, ${
              light + 4
            }%, ${alpha * 0.9})`,
          );
          lg.addColorStop(
            1,
            `hsla(${((hRoll + 195) % 360)}, ${sat}%, ${light}%, ${alpha * 0.8})`,
          );
          ctx.fillStyle = lg;
          ctx.fillRect(x, py, colW + 1, strip + 1);
        }
      }

      const bleed = 38 * dpr;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (const p of pts) {
        ctx.lineTo(p.x, p.y - bleed);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const gx0 = w * (0.25 + 0.12 * Math.sin(t * 0.00075));
      const gx1 = w * (0.75 + 0.12 * Math.cos(t * 0.00062));
      const gy0 = h * 0.88;
      const rad = Math.max(w, h) * 0.78;
      const rg = ctx.createRadialGradient(gx0, gy0, 0, gx0, gy0, rad);
      rg.addColorStop(0, `hsla(${(hueBase + 40) % 360},70%,38%,${0.24 * fillPulse})`);
      rg.addColorStop(0.4, `hsla(${(hueBase + 210) % 360},58%,32%,${0.16 * fillPulse})`);
      rg.addColorStop(1, `hsla(${(hueBase + 280) % 360},45%,22%,0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      const rg2 = ctx.createRadialGradient(gx1, h * 0.94, 0, gx1, h * 0.94, rad * 0.64);
      rg2.addColorStop(0, `hsla(${(hueBase + 300) % 360},65%,36%,${0.18 * pulse2 * fillPulse})`);
      rg2.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = rg2;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      const dimA = 0.32 + 0.14 * fillPulse;
      ctx.fillStyle = `rgba(4, 5, 12, ${dimA})`;
      ctx.fillRect(0, minY, w, h - minY);
      ctx.restore();
    };

    const drawHologramWave = (pts: Pt[]) => {
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0018));
      const pulse2 = 0.5 + 0.5 * Math.sin(t * 0.0012 + 1.7);
      const hueBase = (t * 0.035) % 360;
      const spread = 4 * dpr + 18 * dpr * pulse2;

      const holoStroke = (lineW: number, alphaMult: number, blur: number, offsetHue: number) => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineW;
        ctx.shadowBlur = blur;
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const u = i / (pts.length - 1);
          const hue =
            (hueBase + u * 140 + offsetHue + Math.sin(u * 6.283 + t * 0.0014) * 25) % 360;
          const sat = 72 + 18 * Math.sin(t * 0.0015 + u * 2.6);
          const light = 55 + 25 * pulse * (0.7 + 0.3 * Math.sin(u * 4.5 + t * 0.00085));
          const a = alphaMult * pulse * (0.35 + 0.65 * (0.5 + 0.5 * Math.cos(u * 5.5 - t * 0.0022)));
          ctx.strokeStyle = `hsla(${hue},${sat}%,${light}%,${a})`;
          ctx.shadowColor = `hsla(${(hue + 40) % 360},85%,65%,${a * 0.85})`;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      };

      holoStroke(spread, 0.14, 28 * dpr * pulse2, 0);
      holoStroke(spread * 0.55, 0.22, 14 * dpr * pulse, 30);
      ctx.shadowBlur = 0;
      const coreW = (2.2 + 2.8 * pulse) * dpr;
      holoStroke(coreW, 0.75, 0, -20);
      holoStroke(coreW * 0.45, 0.95, 6 * dpr * pulse, 50);
    };

    const frame = (now: number) => {
      t = now;
      ripplesRef.current = ripplesRef.current.filter((r: Ripple) => now - r.t0 < RIPPLE_DECAY);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      const pts = sampleCurve(280, t);
      drawDots(now);
      drawHologramFill(pts);
      drawHologramWave(pts);
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      if (pointerEvents === 'auto') canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [pointerEvents]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ display: 'block', touchAction: 'none', pointerEvents }}
    />
  );
}
