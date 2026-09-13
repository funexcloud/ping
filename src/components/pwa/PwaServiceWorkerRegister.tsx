"use client";

import { useEffect } from "react";

/** PWA 설치 조건 — service worker 등록 */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("[pwa] service worker registration failed", error);
    });

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(register, { timeout: 3_000 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = globalThis.setTimeout(register, 1_500);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return null;
}
