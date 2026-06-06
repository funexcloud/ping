import {
  getPingFlowRoute,
  hasPingFromIndexSession,
  ROUTE_BULK_DIRECT,
} from "@/lib/ping-flow-client";
import { hasPendingBulkRecipients } from "@/lib/ping-bulk-session";

/** `/login` 등 — 대량 발송 이어가기일 때만 9단계 바 표시 */
export function shouldShowBulkFlowProgressOnLogin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (getPingFlowRoute() === ROUTE_BULK_DIRECT) return true;
    if (hasPendingBulkRecipients()) return true;
    if (hasPingFromIndexSession()) return true;
  } catch {
    /* ignore */
  }
  return false;
}
