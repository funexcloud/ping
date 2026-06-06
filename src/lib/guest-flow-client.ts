import { hasPendingBulkRecipients } from "@/lib/ping-bulk-session";
import {
  getPingFlowRoute,
  ROUTE_BULK_DIRECT,
} from "@/lib/ping-flow-client";

/** 게스트 본인인증 화면 — 대량발송 직행·명단 컨텍스트 */
export function isGuestVerifyFromBulk(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (hasPendingBulkRecipients()) return true;
    if (getPingFlowRoute() === ROUTE_BULK_DIRECT) return true;
  } catch {
    /* noop */
  }
  return false;
}
