import { validateSafeLinkDestination } from "@/lib/ping-safe-link-destination";
import { normalizeExternalObituaryUrl } from "@/lib/ping-obituary-url";

export const OBITUARY_HOST_NOT_ALLOWED_HINT =
  "이 주소는 PING 발송 링크로 아직 등록되지 않았고, 부고 내용도 가져오지 못했습니다. 승인된 부고장 주소를 사용하거나 고객센터(052-286-4440)로 도메인 등록을 문의해 주세요.";

export const PING_CUSTOMER_CENTER_PATH = "/customer-center";

export function hostnameFromHttpsUrl(url: string): string | null {
  const dest = validateSafeLinkDestination(url);
  if (dest.ok) return dest.hostname;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return null;
    return parsed.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

export function hasSessionImportVerification(
  normalizedUrl: string,
  snap: Record<string, unknown>,
): boolean {
  const norm = normalizeExternalObituaryUrl(normalizedUrl);
  const host = hostnameFromHttpsUrl(norm);
  if (!host) return false;

  const verified = String(snap.importVerifiedHost || "")
    .trim()
    .toLowerCase();
  if (verified && verified === host) return true;

  const bi = snap.bugoImport as
    | { url?: string; parsed?: { deceasedName?: string } }
    | undefined;
  if (!bi?.url) return false;
  if (normalizeExternalObituaryUrl(String(bi.url)) !== norm) return false;
  return Boolean(String(bi.parsed?.deceasedName || "").trim());
}

export function canProceedObituaryUrlForBulkFlow(
  normalizedUrl: string,
  importSucceeded: boolean,
  sessionSnap?: Record<string, unknown>,
): { ok: true } | { ok: false; reason: "host_not_allowed"; hostname: string } {
  const dest = validateSafeLinkDestination(normalizedUrl);
  if (dest.ok) return { ok: true };
  if (importSucceeded) return { ok: true };
  if (sessionSnap && hasSessionImportVerification(normalizedUrl, sessionSnap)) {
    return { ok: true };
  }
  if (dest.reason !== "host_not_allowed") {
    return {
      ok: false,
      reason: "host_not_allowed",
      hostname: hostnameFromHttpsUrl(normalizedUrl) || "",
    };
  }
  return {
    ok: false,
    reason: "host_not_allowed",
    hostname: hostnameFromHttpsUrl(normalizedUrl) || "",
  };
}
