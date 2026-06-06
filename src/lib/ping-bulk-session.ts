import type { BulkRecipientRow } from "@/lib/ping-bulk-recipients";
import { normalizeBulkRecipient } from "@/lib/ping-bulk-recipients";

export type PingBulkFlags = {
  useFilteredAddressbookCsv?: boolean;
  isGoogleContactsMode?: boolean;
  naverAddressbookImportActive?: boolean;
  bulkFlowKind?: string;
};

export function saveBulkRecipientsToSession(
  recipients: BulkRecipientRow[],
  flags: PingBulkFlags,
  fromIndexPatch?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const normalized = recipients.map(normalizeBulkRecipient);
  try {
    const prev = loadPingFromIndexSnapshot();
    sessionStorage.setItem(
      "ping_from_index",
      JSON.stringify({
        ...prev,
        ...fromIndexPatch,
        recipientCount: normalized.length,
        ts: Date.now(),
      }),
    );
    sessionStorage.setItem("ping_bulk_recipients", JSON.stringify(normalized));
    sessionStorage.setItem("ping_bulk_flags", JSON.stringify(flags));
    sessionStorage.setItem("ping_send_channel", "sms");
  } catch (e) {
    console.warn("saveBulkRecipientsToSession", e);
    throw new Error("명단을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
  }
}

export function loadBulkRecipientsCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem("ping_bulk_recipients");
    if (!raw) return 0;
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

/** 로그인·게스트 플로 — 대량 명단이 세션에 있으면 발송 신청 이어하기 컨텍스트 */
export function hasPendingBulkRecipients(): boolean {
  return loadBulkRecipientsCount() > 0;
}

export function loadPingBulkFlags(): PingBulkFlags {
  try {
    const raw = sessionStorage.getItem("ping_bulk_flags");
    if (!raw) return {};
    const d = JSON.parse(raw) as PingBulkFlags;
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

export function loadPingFromIndexSnapshot(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem("ping_from_index");
    if (!raw) return {};
    const d = JSON.parse(raw) as Record<string, unknown>;
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

export function clearBulkRecipientsAndFlagsSession(): void {
  try {
    sessionStorage.removeItem("ping_bulk_recipients");
    sessionStorage.removeItem("ping_bulk_flags");
    sessionStorage.removeItem("ping_bulk_identity_ok");
  } catch {
    /* ignore */
  }
}

/** `index-wiz-review` 의 파일명 라인 — `indexLoadPingBulkSessionIntoState` 와 동일 규칙 */
/** 로그인·회원 정보 → `ping_from_index` 신청자 필드 (결제 준비용) */
export function hydratePingFromIndexFromUser(user: Record<string, unknown>): void {
  try {
    const prev = loadPingFromIndexSnapshot();
    const hyName = user.name ?? user.displayName ?? user.memberName;
    const hyPhone = user.phone ?? user.phoneNumber ?? user.mobile;
    const hyEmail = user.email ?? user.memberId;
    if (hyName) prev.name = String(hyName).trim();
    if (hyPhone) {
      prev.phone = String(hyPhone).replace(/\s/g, "").trim();
    }
    if (hyEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(hyEmail))) {
      prev.email = String(hyEmail).trim();
    }
    prev.ts = Date.now();
    sessionStorage.setItem("ping_from_index", JSON.stringify(prev));
  } catch (e) {
    console.warn("hydratePingFromIndexFromUser", e);
  }
}

export function bulkReviewSourceLabel(
  count: number,
  flags: PingBulkFlags,
  fromIndex: Record<string, unknown>,
): string {
  const n = count.toLocaleString("ko-KR");
  if (flags.isGoogleContactsMode) return `구글 연락처 (${n}명 발송)`;
  if (fromIndex.bulkFlowKind === "thankyou") return `답례 명단 (${n}명 발송)`;
  return `주소록 (${n}명 발송)`;
}
