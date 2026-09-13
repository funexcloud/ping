"use client";

import {
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  getToken,
  initializeAppCheck,
  type AppCheck,
} from "firebase/app-check";
import { getPingFirebaseApp } from "@/lib/ping-firebase-web";

let appCheckSingleton: AppCheck | null = null;
let installPromise: Promise<void> | null = null;

function getPingAppCheck(): AppCheck | null {
  if (appCheckSingleton) return appCheckSingleton;
  const app = getPingFirebaseApp();
  const siteKey = (process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY || "").trim();
  if (!app || !siteKey) return null;

  const provider =
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_PROVIDER === "recaptcha-v3"
      ? new ReCaptchaV3Provider(siteKey)
      : new ReCaptchaEnterpriseProvider(siteKey);

  appCheckSingleton = initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
  return appCheckSingleton;
}

function isProtectedBrowserRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return false;
  const rawUrl =
    input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
  const url = new URL(rawUrl, window.location.href);
  return url.origin === window.location.origin && url.pathname.startsWith("/api/");
}

export function installPingAppCheckFetch(): Promise<void> {
  if (installPromise) return installPromise;
  installPromise = Promise.resolve().then(() => {
    const appCheck = getPingAppCheck();
    if (!appCheck) return;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isProtectedBrowserRequest(input, init)) {
        return originalFetch(input, init);
      }

      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      );
      try {
        const result = await getToken(appCheck, false);
        headers.set("X-Firebase-AppCheck", result.token);
      } catch (error) {
        console.warn("[app-check] token unavailable", error);
      }
      return originalFetch(input, { ...init, headers });
    };
  });
  return installPromise;
}
