import {
  BULK_SMS_BODY_MAX_BYTES,
  BULK_SMS_TITLE_MAX_CHARS,
  resolveBulkSmsOrderBody,
  truncateBulkSmsBodyToMaxBytes,
  type BulkSmsTemplateId,
} from "@/lib/ping-bulk-sms";
import { computeBulkOrderTotals } from "@/lib/ping-bulk-pricing";

/** Server-owned cap. Keep in domain so checkout does not depend on untracked pricing JSON. */
const PING_BULK_MAX_RECIPIENTS = 10000;

export type ServerOrderRecipient = {
  phone: string;
  label: string;
  name?: string;
};

export type ServerOrderRequest = {
  recipients?: unknown;
  applicant?: unknown;
  source?: unknown;
  message?: unknown;
  flowType?: unknown;
  clientRequestId?: unknown;
  [key: string]: unknown;
};

export type PreparedServerOrder = {
  clientRequestId: string;
  flowType: "obituary" | "thankyou";
  recipients: ServerOrderRecipient[];
  rawRecipientCount: number;
  recipientCount: number;
  droppedRecipientCount: number;
  applicant: { name: string; phone: string; email: string };
  sourceObituaryUrl: string;
  deliveryUrl: string;
  safeLinkRequested: boolean;
  messageTitle: string;
  messageBody: string;
  templateId: BulkSmsTemplateId;
  totalAmount: number;
};

export class ServerOrderValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ServerOrderValidationError";
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeServerRecipientPhone(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) digits = `0${digits.slice(2)}`;
  if (digits.length < 10 || digits.length > 12 || !digits.startsWith("0")) return null;
  return digits;
}

export function normalizeServerRecipients(raw: unknown): {
  recipients: ServerOrderRecipient[];
  rawRecipientCount: number;
  droppedRecipientCount: number;
} {
  if (!Array.isArray(raw)) {
    throw new ServerOrderValidationError("RECIPIENTS_REQUIRED", "수신자 목록이 필요합니다.");
  }
  if (raw.length > PING_BULK_MAX_RECIPIENTS * 2) {
    throw new ServerOrderValidationError("RECIPIENT_PAYLOAD_TOO_LARGE", "수신자 목록이 너무 큽니다.", 413);
  }
  const recipients: ServerOrderRecipient[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = typeof item === "string" ? { phone: item, label: item } : record(item);
    const phone = normalizeServerRecipientPhone(row.phone || row.tel || row.mobile || row.label);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    const name = String(row.name || "").trim().slice(0, 80);
    const label = String(row.label || name || phone).trim().slice(0, 160) || phone;
    recipients.push({ phone, label, ...(name ? { name } : {}) });
  }
  if (!recipients.length) {
    throw new ServerOrderValidationError("NO_VALID_RECIPIENT", "유효한 수신자가 없습니다.");
  }
  if (recipients.length > PING_BULK_MAX_RECIPIENTS) {
    throw new ServerOrderValidationError("RECIPIENT_LIMIT_EXCEEDED", "최대 발송 건수를 초과했습니다.", 413);
  }
  return {
    recipients,
    rawRecipientCount: raw.length,
    droppedRecipientCount: raw.length - recipients.length,
  };
}

function normalizeApplicant(raw: unknown): PreparedServerOrder["applicant"] {
  const applicant = record(raw);
  const name = String(applicant.name || "").trim().slice(0, 80);
  const phone = normalizeServerRecipientPhone(applicant.phone);
  const emailRaw = String(applicant.email || "").trim().slice(0, 254);
  if (!name || !phone) {
    throw new ServerOrderValidationError("INVALID_APPLICANT", "신청자 이름과 연락처가 필요합니다.");
  }
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
    ? emailRaw
    : `${phone}@ping.temp`;
  return { name, phone, email };
}

export function normalizeSourceObituaryUrl(raw: unknown, required: boolean): string {
  const value = String(raw || "").trim();
  if (!value && !required) return "";
  if (!value || value.length > 4096) {
    throw new ServerOrderValidationError("INVALID_SOURCE_URL", "유효한 부고 원문 주소가 필요합니다.");
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      Boolean(url.username || url.password) ||
      (url.port && url.port !== "443")
    ) {
      throw new Error("invalid");
    }
    url.hash = "";
    return url.toString();
  } catch {
    throw new ServerOrderValidationError("INVALID_SOURCE_URL", "HTTPS 부고 원문 주소가 필요합니다.");
  }
}

function normalizeClientRequestId(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(value)) {
    throw new ServerOrderValidationError("INVALID_IDEMPOTENCY_KEY", "유효한 clientRequestId가 필요합니다.");
  }
  return value;
}

function enforceNoTrustedClientFields(request: ServerOrderRequest): void {
  const forbidden = ["totalAmount", "recipientCount", "calculatedPrice", "deliveryUrl", "status"];
  const supplied = forbidden.find((key) => Object.prototype.hasOwnProperty.call(request, key));
  if (supplied) {
    throw new ServerOrderValidationError("UNTRUSTED_CANONICAL_FIELD", `${supplied} 값은 서버가 결정합니다.`);
  }
}

function composeFinalMessage(opts: {
  body: string;
  templateId: BulkSmsTemplateId;
  deliveryUrl: string;
  isThankYou: boolean;
}): string {
  let composed = resolveBulkSmsOrderBody({
    draft: opts.body,
    templateId: opts.templateId,
    obituaryPageUrl: opts.deliveryUrl,
    isThankYou: opts.isThankYou,
  }).trim();
  if (!opts.isThankYou && opts.deliveryUrl && !composed.includes(opts.deliveryUrl)) {
    composed = `${composed}\n\n${opts.deliveryUrl}`.trim();
  }
  if (new TextEncoder().encode(composed).length > BULK_SMS_BODY_MAX_BYTES) {
    if (!opts.isThankYou && opts.deliveryUrl) {
      const suffix = `\n\n${opts.deliveryUrl}`;
      const suffixBytes = new TextEncoder().encode(suffix).length;
      const bodyBudget = BULK_SMS_BODY_MAX_BYTES - suffixBytes;
      if (bodyBudget <= 0) {
        throw new ServerOrderValidationError("MESSAGE_TOO_LONG", "부고 주소가 문자 길이 제한을 초과합니다.");
      }
      const withoutUrl = composed.split(opts.deliveryUrl).join("").trim();
      composed = `${truncateBulkSmsBodyToMaxBytes(withoutUrl, bodyBudget)}${suffix}`;
    } else {
      composed = truncateBulkSmsBodyToMaxBytes(composed);
    }
  }
  if (!composed) {
    throw new ServerOrderValidationError("MESSAGE_REQUIRED", "문자 내용이 필요합니다.");
  }
  return composed;
}

export function prepareServerOrderRequest(request: ServerOrderRequest): PreparedServerOrder {
  enforceNoTrustedClientFields(request);
  const flowType = request.flowType === "thankyou" ? "thankyou" : "obituary";
  const normalizedRecipients = normalizeServerRecipients(request.recipients);
  const applicant = normalizeApplicant(request.applicant);
  const source = record(request.source);
  const sourceObituaryUrl = normalizeSourceObituaryUrl(
    source.sourceObituaryUrl,
    flowType === "obituary",
  );
  const deliveryUrl = sourceObituaryUrl;
  const message = record(request.message);
  const templateId: BulkSmsTemplateId = message.templateId === "2" ? "2" : "1";
  const messageTitle = String(message.title || "").trim().slice(0, BULK_SMS_TITLE_MAX_CHARS);
  const messageBody = composeFinalMessage({
    body: String(message.body || ""),
    templateId,
    deliveryUrl,
    isThankYou: flowType === "thankyou",
  });
  const pricing = computeBulkOrderTotals(normalizedRecipients.recipients.length);
  if (pricing.recipientCount < 1 || pricing.total <= 0) {
    throw new ServerOrderValidationError("INVALID_PRICE", "결제 금액을 계산할 수 없습니다.");
  }
  return {
    clientRequestId: normalizeClientRequestId(request.clientRequestId),
    flowType,
    ...normalizedRecipients,
    recipientCount: pricing.recipientCount,
    applicant,
    sourceObituaryUrl,
    deliveryUrl,
    safeLinkRequested: source.safeLinkRequested === true,
    messageTitle,
    messageBody,
    templateId,
    totalAmount: pricing.total,
  };
}

export function canonicalServerOrderPayload(prepared: PreparedServerOrder): Record<string, unknown> {
  return {
    flowType: prepared.flowType,
    recipients: prepared.recipients,
    applicant: prepared.applicant,
    sourceObituaryUrl: prepared.sourceObituaryUrl,
    deliveryUrl: prepared.deliveryUrl,
    safeLinkRequested: prepared.safeLinkRequested,
    messageTitle: prepared.messageTitle,
    messageBody: prepared.messageBody,
    templateId: prepared.templateId,
    recipientCount: prepared.recipientCount,
    totalAmount: prepared.totalAmount,
  };
}
