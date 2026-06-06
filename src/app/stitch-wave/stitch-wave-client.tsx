"use client";

import { useEffect, useRef } from "react";
import { initStitchWaveCanvas } from "./stitch-wave-canvas";
import "./stitch-wave.css";

export function StitchWaveClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    document.documentElement.classList.add("ping-ui", "ping-surface-dark");
    return initStitchWaveCanvas(canvas);
  }, []);

  return <canvas ref={canvasRef} id="view" aria-hidden />;
}
