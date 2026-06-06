/**
 * 본인확인 후 `index.html?resumeBulk&autoPay` 대신 React `/checkout` 으로 주문·결제 세션 준비.
 * `legacy-html/index.html` `processOrderInternal` 핵심만 이관.
 */
import { collection, doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  buildBulkAddressbookCsvContent,
  normalizeBulkRecipient,
} from "@/lib/ping-bulk-recipients";
import { computeBulkOrderTotals } from "@/lib/ping-bulk-pricing";
import {
  resolveBulkSmsOrderBody,
  type BulkSmsTemplateId,
} from "@/lib/ping-bulk-sms";
import {
  loadPingBulkFlags,
  loadPingFromIndexSnapshot,
  hydratePingFromIndexFromUser,
  type PingBulkFlags,
} from "@/lib/ping-bulk-session";
import { getPingFirestore, getPingFirebaseStorage } from "@/lib/ping-firebase-web";
import {
  markCheckoutWelcomePending,
  readMemberIdFromSession,
} from "@/lib/ping-member-welcome-bonus";
import { computePurgeAfterDate } from "@/lib/ping-order-purge-meta";

export const PING_CHECKOUT_SESSION = "ping_checkout_session";
export const PING_BULK_PREPARE_CHECKOUT_KEY = "ping_bulk_prepare_checkout";

function isValidObituaryUrl(url: string): boolean {
  const u = String(url || "").trim();
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 외부 부고 URL 을 PING 안심 링크(`/s/{token}`)로 감싼다(토대 + 1·2단계).
 * 서명·발인 만료는 서버(`/api/safe-link/issue`)에서 처리하므로 시크릿이 노출되지 않는다.
 * 발급 실패 시 원본 URL 로 폴백하여 발송 자체가 막히지 않도록 한다.
 */
async function issueSafeObituaryLink(opts: {
  obituaryPageUrl: string;
  deceasedName: string;
  departureAt: string;
}): Promise<string | null> {
  if (!opts.obituaryPageUrl || !/^https:/i.test(opts.obituaryPageUrl)) return null;
  try {
    const res = await fetch("/api/safe-link/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: opts.obituaryPageUrl,
        deceasedName: opts.deceasedName,
        departureAt: opts.departureAt,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      safeUrl?: string;
    };
    if (res.ok && data.ok && data.safeUrl) return data.safeUrl;
  } catch (e) {
    console.warn("안심 링크 발급 실패 (원본 URL 로 진행)", e);
  }
  return null;
}

function skipFirebaseStorageUpload(): boolean {
  try {
    const cfg = (window.__PING_PORTONE_CONFIG__ || {}) as Record<string, unknown>;
    return Boolean(cfg.skipFirebaseStorageUpload);
  } catch {
    return false;
  }
}

function contactSource(flags: PingBulkFlags): string {
  if (flags.isGoogleContactsMode) return "google_contacts";
  if (flags.bulkFlowKind === "thankyou") return "thankyou_list_upload";
  if (flags.naverAddressbookImportActive) return "naver_addressbook";
  return "file_upload";
}

function csvFileName(
  orderId: string,
  flags: PingBulkFlags,
): string {
  if (flags.isGoogleContactsMode) return `google_contacts_${orderId}.csv`;
  if (flags.bulkFlowKind === "thankyou") return `thankyou_filtered_${orderId}.csv`;
  return `addressbook_filtered_${orderId}.csv`;
}

export function requestBulkCheckoutPrepare(): void {
  try {
    sessionStorage.setItem(PING_BULK_PREPARE_CHECKOUT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function navigateToBulkCheckoutPrepare(): void {
  if (readMemberIdFromSession()) {
    markCheckoutWelcomePending();
  }
  requestBulkCheckoutPrepare();
  window.location.href = "/checkout";
}

/** 본인확인·명단 세션 → Firestore 주문 + `ping_checkout_session` */
export async function prepareBulkCheckoutAfterIdentity(): Promise<void> {
  if (typeof window === "undefined") return;

  let identityOk = false;
  try {
    identityOk = sessionStorage.getItem("ping_bulk_identity_ok") === "1";
  } catch {
    /* ignore */
  }
  if (!identityOk) {
    throw new Error("본인확인이 필요합니다.");
  }

  let recipientsRaw: unknown[] = [];
  try {
    const raw = sessionStorage.getItem("ping_bulk_recipients");
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    recipientsRaw = Array.isArray(parsed) ? parsed : [];
  } catch {
    recipientsRaw = [];
  }
  const recipients = recipientsRaw.map((r) => normalizeBulkRecipient(r));
  if (!recipients.length) {
    throw new Error("주소록 정보가 없습니다. 처음부터 다시 진행해 주세요.");
  }

  const fromIndex = loadPingFromIndexSnapshot();
  const flags = loadPingBulkFlags();
  let name = String(fromIndex.name || "").trim();
  let phone = String(fromIndex.phone || "").replace(/\s/g, "").trim();
  if (!name || !phone) {
    try {
      const authRaw = sessionStorage.getItem("ping_auth_user");
      const authUser = authRaw
        ? (JSON.parse(authRaw) as Record<string, unknown>)
        : null;
      if (authUser) hydratePingFromIndexFromUser(authUser);
    } catch {
      /* ignore */
    }
    const retry = loadPingFromIndexSnapshot();
    name = String(retry.name || name).trim();
    phone = String(retry.phone || phone).replace(/\s/g, "").trim();
  }
  if (!name || !phone) {
    throw new Error("신청자 이름·연락처가 없습니다. 본인확인을 다시 진행해 주세요.");
  }
  const emailRaw = String(fromIndex.email || loadPingFromIndexSnapshot().email || "").trim();
  const customerEmail =
    emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
      ? emailRaw
      : `${phone.replace(/\D/g, "")}@ping.temp`;

  const isThankYou = flags.bulkFlowKind === "thankyou";
  const obituaryPageUrl = isThankYou
    ? ""
    : String(fromIndex.obituaryPageUrl || "").trim();

  // 발인 일시·고인명은 부고 가져오기 파싱 결과에서 (안심 링크 만료·표기용).
  const bugoImport = (fromIndex.bugoImport as
    | { parsed?: { deceasedName?: string; bainil?: string } }
    | undefined) || undefined;
  const parsed = bugoImport?.parsed || {};
  const deceasedName = String(parsed.deceasedName || "").trim();
  const departureAt = String(parsed.bainil || "").trim();
  const purgeAfter = computePurgeAfterDate(departureAt);

  // 토대: 외부 부고 URL → PING 안심 링크. 실패 시 원본으로 폴백.
  const safeLinkUrl =
    !isThankYou && isValidObituaryUrl(obituaryPageUrl)
      ? await issueSafeObituaryLink({ obituaryPageUrl, deceasedName, departureAt })
      : null;
  const linkForMessage = safeLinkUrl || obituaryPageUrl;

  const templateId: BulkSmsTemplateId =
    fromIndex.smsTemplateId === "2" ? "2" : "1";
  // 본문에 이미 원본 부고 URL 이 치환돼 있을 수 있으므로 안심 링크로 교체.
  const draftRaw = String(fromIndex.bulkSmsMessageDraft || "");
  const draft =
    safeLinkUrl && obituaryPageUrl
      ? draftRaw.split(obituaryPageUrl).join(safeLinkUrl)
      : draftRaw;
  const title = String(fromIndex.bulkSmsTitle || "").trim().slice(0, 40);
  const orderMessageBody = resolveBulkSmsOrderBody({
    draft,
    templateId,
    obituaryPageUrl: linkForMessage,
    isThankYou,
  });

  const { recipientCount, total } = computeBulkOrderTotals(recipients.length);
  if (recipientCount < 1 || total < 0) {
    throw new Error("결제 금액·건수 정보가 올바르지 않습니다.");
  }

  try {
    sessionStorage.setItem("ping_send_channel", "sms");
  } catch {
    /* ignore */
  }

  const db = getPingFirestore();
  if (!db) {
    throw new Error("주문 저장 설정이 완료되지 않아 결제를 진행할 수 없습니다.");
  }

  const orderRef = doc(collection(db, "ping_orders"));
  const orderId = orderRef.id;
  let fileUrl: string | null = null;
  let storagePath: string | null = null;

  if (!skipFirebaseStorageUpload()) {
    const storage = getPingFirebaseStorage();
    if (storage) {
      try {
        const csvContent = buildBulkAddressbookCsvContent(recipients);
        const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const fileName = csvFileName(orderId, flags);
        storagePath = `orders/${orderId}/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, csvBlob);
        fileUrl = await getDownloadURL(storageRef);
      } catch (uploadErr) {
        console.warn("주소록 CSV 업로드 실패 (결제는 계속)", uploadErr);
      }
    }
  }

  const sendChannel = "sms";
  const sendChannelLabel = "문자(LMS)";
  // 알림톡 변수·주문 모두 안심 링크를 우선 사용(없으면 원본).
  const obitLinkForOrder = isValidObituaryUrl(linkForMessage)
    ? linkForMessage
    : isValidObituaryUrl(obituaryPageUrl)
      ? obituaryPageUrl
      : null;
  const templateDataForOrder = obitLinkForOrder ? { obit_link: obitLinkForOrder } : {};

  await setDoc(orderRef, {
    orderId,
    name,
    phone,
    obituaryPageUrl: obitLinkForOrder,
    obituaryOriginalUrl: isValidObituaryUrl(obituaryPageUrl) ? obituaryPageUrl : null,
    safeLinkUrl: safeLinkUrl || null,
    message: orderMessageBody,
    messageTitle: title || null,
    bulkSmsTemplateId: templateId,
    preferredSendChannel: sendChannel,
    preferredSendChannelLabel: sendChannelLabel,
    templateData: templateDataForOrder,
    partner: null,
    plan: "standard",
    fileUrl,
    storagePath,
    fileName: csvFileName(orderId, flags),
    contactSource: contactSource(flags),
    googleContactsCount: flags.isGoogleContactsMode ? recipientCount : null,
    count: recipientCount,
    totalCount: recipientCount,
    totalAmount: total,
    status: "waiting_payment",
    sendStatus: "instant",
    scheduledAt: null,
    createdAt: new Date(),
    departureAt: departureAt || null,
    purgeAfter: purgeAfter || null,
  });

  const regRes = await fetch("/api/checkout/register-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, totalAmount: total }),
  });
  if (!regRes.ok) {
    const errJ = (await regRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(String(errJ.error || "결제 준비에 실패했습니다."));
  }

  sessionStorage.setItem(
    PING_CHECKOUT_SESSION,
    JSON.stringify({
      orderId,
      amount: total,
      orderName: `PING 부고 문자 · ${recipientCount}건`,
      customerName: name,
      customerMobilePhone: phone,
      customerEmail,
      recipientCount,
      preferredSendChannel: sendChannel,
      sendChannelLabel,
    }),
  );
}
