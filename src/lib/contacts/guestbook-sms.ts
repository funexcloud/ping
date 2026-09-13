import { normalizePhone } from "@/lib/phone";

export const GUESTBOOK_SMS_INVITE_NAME_MAX = 40;
export const GUESTBOOK_SMS_INVITES_PER_CASE_MAX = 500;

/** 조문 문자 본문 자리표시. 프론트에서만 쓰고 서버에 저장하지 않는다. */
export const DEFAULT_GUESTBOOK_SMS_TEMPLATE = `故 {deceasedName}님께 조문 마음을 남겨 주세요.
{url}

관리자 번호로 발송되었습니다.`;

export type GuestbookSmsInvite = {
  id: string;
  caseId: string;
  deceasedName: string;
  name: string;
  phone: string;
  createdAt: string;
  createdBy: string;
};

export type GuestbookSmsInvitePublic = {
  id: string;
  caseId: string;
  deceasedName: string;
  name: string;
  phone: string;
  createdAt: string;
};

export function cleanGuestbookSmsName(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, GUESTBOOK_SMS_INVITE_NAME_MAX);
}

export function cleanGuestbookSmsPhone(value: unknown): string {
  return normalizePhone(String(value || "")).slice(0, 11);
}

export function isKrMobilePhone(value: string): boolean {
  return /^01[016789]\d{7,8}$/.test(cleanGuestbookSmsPhone(value));
}

export function formatKrMobilePhone(value: string): string {
  const digits = cleanGuestbookSmsPhone(value);
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

/** 조문 문자 본문. 프론트에서만 조합하고 서버에 저장하지 않는다. */
export function guestbookSmsText(deceasedName: string, pageUrl: string): string {
  return renderGuestbookSmsTemplate(DEFAULT_GUESTBOOK_SMS_TEMPLATE, deceasedName, pageUrl);
}

export function renderGuestbookSmsTemplate(template: string, deceasedName: string, pageUrl: string): string {
  const name = String(deceasedName || "").trim() || "고인";
  const url = String(pageUrl || "").trim();
  const source = String(template || DEFAULT_GUESTBOOK_SMS_TEMPLATE);
  return source.replace(/\{deceasedName\}/g, name).replace(/\{url\}/g, url).trim();
}

export function guestbookSmsPageUrl(origin: string, caseId: string): string {
  const base = String(origin || "").replace(/\/+$/, "");
  const id = encodeURIComponent(String(caseId || "").trim());
  return `${base}/guestbook/${id}?source=forwarded`;
}

export function canOpenDeviceSms(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return /iPhone|iPad|iPod|Android/i.test(userAgent);
}

export function guestbookSmsComposerHref(
  body: string,
  phone = "",
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): string {
  const encoded = encodeURIComponent(body);
  const to = cleanGuestbookSmsPhone(phone);
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return to ? `sms:${to}&body=${encoded}` : `sms:&body=${encoded}`;
  }
  return to ? `sms:${to}?body=${encoded}` : `sms:?body=${encoded}`;
}

export function toGuestbookSmsInvitePublic(item: GuestbookSmsInvite): GuestbookSmsInvitePublic {
  return {
    id: item.id,
    caseId: item.caseId,
    deceasedName: item.deceasedName,
    name: item.name,
    phone: item.phone,
    createdAt: item.createdAt,
  };
}
