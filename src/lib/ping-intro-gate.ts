/**
 * 인트로 분기 — `public/index.html` head 인라인 스크립트·home-entry-client 와 동일한 규칙.
 * returnPath: 인트로 복귀 시 sessionStorage `ping_intro_return` 에 넣을 경로.
 */

function navigationTypeReload(): boolean {
  const entries = performance.getEntriesByType?.("navigation");
  const navEntry =
    entries && entries[0] ? (entries[0] as PerformanceNavigationTiming) : undefined;
  if (navEntry?.type) return navEntry.type === "reload";
  if (
    typeof performance !== "undefined" &&
    "navigation" in performance &&
    (performance as unknown as { navigation?: { type?: number } }).navigation
  ) {
    return (
      (performance as unknown as { navigation: { type: number } }).navigation.type === 1
    );
  }
  return false;
}

export function pingApplyIntroSkipQueryToHistory(): void {
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("skipIntro") !== "1") return;
  sessionStorage.setItem("ping_intro_seen", "1");
  sp.delete("skipIntro");
  const qs = sp.toString();
  const clean =
    window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
  window.history.replaceState({}, document.title, clean);
}

export function pingIntroOnReloadClearSeen(): void {
  if (navigationTypeReload()) sessionStorage.removeItem("ping_intro_seen");
}

export function pingIntroSeen(): boolean {
  try {
    return sessionStorage.getItem("ping_intro_seen") != null;
  } catch {
    return false;
  }
}

/** 인트로로 보내기 직전에 호출 */
export function pingSetIntroReturnPath(returnPath: string): void {
  try {
    sessionStorage.setItem("ping_intro_return", returnPath || "/");
  } catch {
    /* ignore */
  }
}
