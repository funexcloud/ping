/**
 * 본인확인 후 React `/checkout`에서 주문과 결제 세션을 준비한다.
 * 주문·금액·수신자 건수·checkout capability는 서버(`/api/orders/create`)가 소유한다.
 */
import { normalizeBulkRecipient } from "@/lib/ping-bulk-recipients";
import { type BulkSmsTemplateId } from "@/lib/ping-bulk-sms";
import {
  hydratePingFromIndexFromUser,
  loadPingBulkFlags,
  loadPingFromIndexSnapshot,
} from "@/lib/ping-bulk-session";
import {
  markCheckoutWelcomePending,
  readMemberIdFromSession,
} from "@/lib/ping-member-welcome-bonus";

export const PING_CHECKOUT_SESSION = "ping_checkout_session";
export const PING_BULK_PREPARE_CHECKOUT_KEY = "ping_bulk_prepare_checkout";
export const PING_SERVER_ORDER_REQUEST_KEY = "ping_server_order_request";

export type PingCheckoutSession = {
  orderId: string;
  amount: number;
  orderName?: string;
  customerName?: string;
  customerMobilePhone?: string;
  customerEmail?: string;
  recipientCount?: number;
  preferredSendChannel?: string;
  sendChannelLabel?: string;
  checkoutSecret?: string;
};

function readReusableCheckoutSession(): PingCheckoutSession | null {
  try {
    const raw = sessionStorage.getItem(PING_CHECKOUT_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PingCheckoutSession;
    const reusable =
      Boolean(String(parsed.orderId || "").trim()) &&
      Number(parsed.amount) > 0 &&
      Number(parsed.recipientCount) > 0 &&
      String(parsed.checkoutSecret || "").length >= 32;
    if (reusable) return parsed;

    // 0원 placeholder와 불완전한 이전 세션은 주문 준비를 다시 수행한다.
    sessionStorage.removeItem(PING_CHECKOUT_SESSION);
  } catch {
    try {
      sessionStorage.removeItem(PING_CHECKOUT_SESSION);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function payloadFingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clientRequestIdForServerOrder(payload: unknown): string {
  const fingerprint = payloadFingerprint(payload);
  try {
    const raw = sessionStorage.getItem(PING_SERVER_ORDER_REQUEST_KEY);
    const stored = raw
      ? (JSON.parse(raw) as { fingerprint?: unknown; clientRequestId?: unknown })
      : null;
    if (
      stored &&
      stored.fingerprint === fingerprint &&
      typeof stored.clientRequestId === "string" &&
      stored.clientRequestId.length >= 16
    ) {
      return stored.clientRequestId;
    }
  } catch {
    /* 새 id를 생성한다. */
  }
  const clientRequestId = crypto.randomUUID();
  sessionStorage.setItem(
    PING_SERVER_ORDER_REQUEST_KEY,
    JSON.stringify({ fingerprint, clientRequestId }),
  );
  return clientRequestId;
}

async function prepareCheckoutWithServerOrder(input: {
  recipients: unknown[];
  applicant: { name: string; phone: string; email: string };
  sourceObituaryUrl: string;
  isThankYou: boolean;
  title: string;
  draft: string;
  templateId: BulkSmsTemplateId;
}): Promise<PingCheckoutSession> {
  const requestPayload = {
    recipients: input.recipients,
    applicant: input.applicant,
    source: {
      sourceObituaryUrl: input.sourceObituaryUrl,
      safeLinkRequested: false,
    },
    message: {
      title: input.title,
      body: input.draft,
      templateId: input.templateId,
    },
    flowType: input.isThankYou ? "thankyou" : "obituary",
  };
  const clientRequestId = clientRequestIdForServerOrder(requestPayload);
  const response = await fetch("/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...requestPayload, clientRequestId }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    message?: { title?: string; body?: string } | string;
    orderId?: string;
    amount?: number;
    recipientCount?: number;
    rawRecipientCount?: number;
    droppedRecipientCount?: number;
    checkoutCapability?: string;
  };
  if (!response.ok || data.ok !== true) {
    const message =
      typeof data.message === "string"
        ? data.message
        : String(data.error || "서버 주문 준비에 실패했습니다.");
    throw new Error(message);
  }
  if (
    !data.orderId ||
    Number(data.amount) <= 0 ||
    Number(data.recipientCount) < 1 ||
    String(data.checkoutCapability || "").length < 32
  ) {
    throw new Error("서버 주문 응답이 올바르지 않습니다.");
  }
  sessionStorage.setItem(
    "ping_bulk_server_recipient_adjustment",
    JSON.stringify({
      rawRecipientCount: Number(data.rawRecipientCount) || input.recipients.length,
      recipientCount: Number(data.recipientCount),
      droppedRecipientCount: Number(data.droppedRecipientCount) || 0,
    }),
  );
  const checkoutSession: PingCheckoutSession = {
    orderId: data.orderId,
    amount: Number(data.amount),
    orderName: `PING 부고 문자 · ${Number(data.recipientCount)}건`,
    customerName: input.applicant.name,
    customerMobilePhone: input.applicant.phone,
    customerEmail: input.applicant.email,
    recipientCount: Number(data.recipientCount),
    preferredSendChannel: "sms",
    sendChannelLabel: "문자(LMS)",
    checkoutSecret: String(data.checkoutCapability),
  };
  sessionStorage.setItem(PING_CHECKOUT_SESSION, JSON.stringify(checkoutSession));
  sessionStorage.setItem("ping_send_channel", "sms");
  return checkoutSession;
}

export function requestBulkCheckoutPrepare(): void {
  try {
    sessionStorage.setItem(PING_BULK_PREPARE_CHECKOUT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function navigateToBulkCheckoutPrepare(): void {
  if (typeof window === "undefined") return;
  if (readMemberIdFromSession()) markCheckoutWelcomePending();
  requestBulkCheckoutPrepare();
  window.location.href = "/checkout";
}

/** 본인확인·명단 세션 → 서버 주문 생성·checkout session */
export async function prepareBulkCheckoutAfterIdentity(): Promise<PingCheckoutSession> {
  if (typeof window === "undefined") {
    throw new Error("브라우저에서만 결제 준비를 진행할 수 있습니다.");
  }

  const existing = readReusableCheckoutSession();
  if (existing) return existing;

  let identityOk = false;
  try {
    identityOk = sessionStorage.getItem("ping_bulk_identity_ok") === "1";
  } catch {
    /* ignore */
  }
  if (!identityOk) throw new Error("본인확인이 필요합니다.");

  let recipientsRaw: unknown[] = [];
  try {
    const raw = sessionStorage.getItem("ping_bulk_recipients");
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    recipientsRaw = Array.isArray(parsed) ? parsed : [];
  } catch {
    recipientsRaw = [];
  }
  const recipients = recipientsRaw.map((recipient) => normalizeBulkRecipient(recipient));
  if (!recipients.length) {
    throw new Error("주소록 정보가 없습니다. 처음부터 다시 진행해 주세요.");
  }

  let fromIndex = loadPingFromIndexSnapshot();
  const flags = loadPingBulkFlags();
  let name = String(fromIndex.name || "").trim();
  let phone = String(fromIndex.phone || "").replace(/\s/g, "").trim();
  if (!name || !phone) {
    try {
      const authRaw = sessionStorage.getItem("ping_auth_user");
      const authUser = authRaw ? (JSON.parse(authRaw) as Record<string, unknown>) : null;
      if (authUser) hydratePingFromIndexFromUser(authUser);
    } catch {
      /* ignore */
    }
    fromIndex = loadPingFromIndexSnapshot();
    name = String(fromIndex.name || name).trim();
    phone = String(fromIndex.phone || phone).replace(/\s/g, "").trim();
  }
  if (!name || !phone) {
    throw new Error("신청자 이름·연락처가 없습니다. 본인확인을 다시 진행해 주세요.");
  }

  const emailRaw = String(fromIndex.email || "").trim();
  const customerEmail =
    emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
      ? emailRaw
      : `${phone.replace(/\D/g, "")}@ping.temp`;
  const isThankYou = flags.bulkFlowKind === "thankyou";
  const obituaryPageUrl = isThankYou
    ? ""
    : String(fromIndex.obituaryPageUrl || "").trim();
  const templateId: BulkSmsTemplateId = fromIndex.smsTemplateId === "2" ? "2" : "1";
  const draftRaw = String(fromIndex.bulkSmsMessageDraft || "");
  const title = String(fromIndex.bulkSmsTitle || "").trim().slice(0, 40);

  return prepareCheckoutWithServerOrder({
    recipients,
    applicant: { name, phone, email: customerEmail },
    sourceObituaryUrl: obituaryPageUrl,
    isThankYou,
    title,
    draft: draftRaw,
    templateId,
  });
}
