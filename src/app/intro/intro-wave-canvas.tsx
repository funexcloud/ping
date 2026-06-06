"use client";

import { useEffect, useRef } from "react";

const DOT_GAP_MIN = 28;
/** 화면당 점 개수 상한 — 과도한 arc fill 로 인한 프레임 저하 방지 */
const DOT_TARGET_COUNT = 1350;

function computeDotGap(width: number, height: number): number {
  const g = Math.sqrt((width * height) / DOT_TARGET_COUNT);
  return Math.max(DOT_GAP_MIN, Math.round(g));
}

const WAVE_SPEED = 0.0015;
const WAVE_AMP = 25;
const FOCUS_RADIUS = 300;

class Dot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  size = 1.2;
  currentSize: number;
  opacity = 0.15;
  targetSize: number;
  targetOpacity = 0.15;

  constructor(x: number, y: number) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.currentSize = this.size;
    this.targetSize = this.size;
  }

  update(
    time: number,
    mouse: { x: number; y: number; active: boolean },
  ): void {
    const movement =
      Math.sin(
        time * WAVE_SPEED + this.baseX * 0.005 + this.baseY * 0.002,
      ) * WAVE_AMP;
    this.y = this.baseY + movement;
    let factor = 0;
    if (mouse.active && mouse.x > -500) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < FOCUS_RADIUS) {
        factor = 1 - distance / FOCUS_RADIUS;
        factor = Math.pow(factor, 2);
      }
    }
    this.targetSize = this.size + factor * 3.0;
    this.targetOpacity = 0.15 + factor * 0.85;
    this.currentSize += (this.targetSize - this.currentSize) * 0.1;
    this.opacity += (this.targetOpacity - this.opacity) * 0.1;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function IntroWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d", { alpha: false });
    if (!ctx) return;
    const ctx2d = ctx;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;

    function rebuildDots(): void {
      const dots: Dot[] = [];
      const gap = computeDotGap(width, height);
      for (let x = gap / 2; x < width; x += gap) {
        for (let y = gap / 2; y < height; y += gap) {
          dots.push(new Dot(x, y));
        }
      }
      dotsRef.current = dots;
    }

    function resize(): void {
      const el = canvasRef.current;
      if (!el) return;
      width = window.innerWidth;
      height = window.innerHeight;
      el.width = width;
      el.height = height;
      rebuildDots();
    }

    function paintFrame(time: number): void {
      const t = time;
      ctx2d.fillStyle = "#000000";
      ctx2d.fillRect(0, 0, width, height);
      const mouse = mouseRef.current;
      for (const dot of dotsRef.current) {
        dot.update(t, mouse);
        dot.draw(ctx2d);
      }
    }

    let visible = true;
    const onVisibility = (): void => {
      visible = document.visibilityState === "visible";
      if (reduceMotion) return;
      if (!visible && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (visible && rafRef.current == null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    function animate(time: number): void {
      rafRef.current = null;
      if (!visible) return;
      paintFrame(time);
      rafRef.current = requestAnimationFrame(animate);
    }

    resize();
    if (reduceMotion) {
      paintFrame(0);
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }

    const onMove = (e: MouseEvent): void => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };
    const onLeave = (): void => {
      mouseRef.current.active = false;
    };
    const onBlur = (): void => {
      mouseRef.current.active = false;
    };
    const onTouchStart = (e: TouchEvent): void => {
      if (e.touches.length > 0) {
        mouseRef.current.active = true;
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent): void => {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };
    const onTouchEnd = (): void => {
      mouseRef.current.active = false;
    };
    let resizeRaf: number | null = null;
    const onResize = (): void => {
      if (resizeRaf != null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        resize();
        if (reduceMotion) paintFrame(0);
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onBlur);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", onResize);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div id="intro-wave-bg" aria-hidden="true">
      <canvas ref={canvasRef} width={300} height={300} />
    </div>
  );
}
