/** 클라이언트 주문 생성 시 purgeAfter 계산 — 서버 ping-order-purge.js 와 동일 규칙 */

const PURGE_DAYS_AFTER_DEPARTURE = 30;

export function parseDepartureToDate(departureAt: string): Date | null {
  const raw = String(departureAt || "").trim();
  if (!raw) return null;
  const dm = raw.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (!dm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo - 1, d, 12, 0, 0);
}

export function computePurgeAfterDate(departureAt: string): Date | null {
  const base = parseDepartureToDate(departureAt);
  if (!base) return null;
  const out = new Date(base.getTime());
  out.setDate(out.getDate() + PURGE_DAYS_AFTER_DEPARTURE);
  return out;
}
