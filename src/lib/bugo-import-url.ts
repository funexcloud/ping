import rules from "../../lib/bugo-import-url-rules.json";

function normalizeHost(host: string): string {
  return String(host || "").toLowerCase();
}

export function isWooribugoImportHost(host: string): boolean {
  const h = normalizeHost(host);
  return (rules.wooribugo.hosts as string[]).some((x) => normalizeHost(x) === h);
}

export function isModubugoImportHost(host: string): boolean {
  const h = normalizeHost(host);
  return (rules.modubugo.hosts as string[]).some((x) => normalizeHost(x) === h);
}

/** `bugo-import.js` · UI 공통 — 자동 가져오기 대상 URL */
export function isSupportedFuneralImportUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = normalizeHost(u.hostname);
  const allowed = new Set((rules.allowedHosts as string[]).map(normalizeHost));
  if (!allowed.has(host)) return false;
  if (isWooribugoImportHost(host)) {
    const path = u.pathname.toLowerCase();
    return (rules.wooribugo.pathIncludes as string[]).some((frag) =>
      path.includes(String(frag).toLowerCase()),
    );
  }
  if (isModubugoImportHost(host)) {
    return new RegExp(rules.modubugo.pathPattern, "i").test(u.pathname);
  }
  return false;
}
