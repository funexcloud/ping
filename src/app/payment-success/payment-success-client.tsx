"use client";

import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { PingBankAccountCopyAllButton } from "@/components/ping-bank-account-copy-all-button";
import { PingBankAccountCopyButton } from "@/components/ping-bank-account-copy-button";
import {
  clearBankTransferConfirmSession,
  PING_BANK_TRANSFER,
  readBankTransferConfirmForOrder,
  readBankTransferConfirmSession,
} from "@/lib/ping-bank-transfer-checkout";
import {
  fetchOrderStatusOnce,
  getRefundDeviceIdForOrder,
  pollOrderStatusUntil,
  requestOrderRefund,
  retryOrderDispatch,
  type OrderStatusPayload,
} from "@/lib/ping-order-status-client";
import { fetchPingSendFromLabel } from "@/lib/ping-send-from-client";
import { PING_CASH_RECEIPT_TYPE_LABELS, type PingCashReceiptType } from "@/lib/ping-cash-receipt";
import { pingAssignToLocation } from "@/lib/ping-nav-home";
import type { BulkFlowStep } from "@/lib/ping-bulk-flow-steps";
import {
  deriveFulfillmentPhase,
  fulfillmentBulkFlowLabelOverride,
  fulfillmentToBulkFlowStep,
  type FulfillmentDerived,
} from "@/lib/ping-order-fulfillment";
import { Building2, FileSpreadsheet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { AnimationEvent } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./payment-success.css";

const PING_PAY_SUCCESS_SESSION = "ping_pay_success_session";
const PING_PAY_SUCCESS_RECIPIENTS = "ping_pay_success_recipients";
const PAY_SUCCESS_TTL_MS = 1000 * 60 * 60 * 24;

function clearPaySuccessExportSession() {
  try {
    sessionStorage.removeItem(PING_PAY_SUCCESS_SESSION);
    sessionStorage.removeItem(PING_PAY_SUCCESS_RECIPIENTS);
  } catch {
    /* ignore */
  }
}

function clearBulkSession() {
  try {
    sessionStorage.removeItem("ping_bulk_recipients");
    sessionStorage.removeItem("ping_bulk_flags");
    sessionStorage.removeItem("ping_bulk_identity_ok");
    sessionStorage.removeItem("ping_from_index");
    sessionStorage.removeItem("ping_toss_pending");
    sessionStorage.removeItem("ping_checkout_session");
    sessionStorage.removeItem("ping_gcc_state_v1");
    sessionStorage.removeItem("ping_gcc_event_sent_v1");
    sessionStorage.removeItem("ping_gcc_complete_pending_v1");
  } catch {
    /* ignore */
  }
}

type PayRecipient = { phone: string; label: string; name?: string };

function pingNormalizePayRecipient(raw: unknown): PayRecipient {
  if (raw == null) return { phone: "", label: "" };
  if (typeof raw === "string") {
    const s = String(raw).trim();
    return { phone: s, label: s };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const ph = String(o.phone || o.tel || o.mobile || "").trim();
    let lab = o.label != null ? String(o.label).trim() : "";
    if (!lab) lab = ph;
    const nm = o.name != null ? String(o.name).trim() : "";
    const out: PayRecipient = { phone: ph || lab, label: lab || ph };
    if (nm) out.name = nm;
    return out;
  }
  const t = String(raw).trim();
  return { phone: t, label: t };
}

function pingRecipientPhone(item: unknown): string {
  if (item == null) return "";
  if (typeof item === "string") return String(item).trim();
  if (typeof item === "object") {
    const o = item as Record<string, unknown>;
    return String(o.phone || o.tel || o.mobile || "");
  }
  return String(item);
}

function pingRecipientName(item: unknown): string {
  if (item == null) return "";
  const phoneNorm = String(pingRecipientPhone(item)).replace(/\D/g, "");
  if (typeof item === "string") return "";
  if (typeof item !== "object") return "";
  const o = item as Record<string, unknown>;
  const name = String(o.name || "").trim();
  if (name) return name;
  const lab = String(o.label || "").trim();
  if (!lab) return "";
  const stripped = lab.replace(/\s*·\s*[0-9][0-9\-\s]*\s*$/, "").trim();
  if (!stripped) return "";
  const strippedDigits = stripped.replace(/\D/g, "");
  if (phoneNorm.length >= 8 && strippedDigits === phoneNorm) return "";
  return stripped;
}

function payOkSendChannelFromOrder(d: Record<string, unknown> | null | undefined) {
  if (!d || typeof d !== "object") return "문자(LMS)";
  const ch = String(d.preferredSendChannel || "").trim();
  const lab = String(d.preferredSendChannelLabel || "").trim();
  if (lab) {
    if (ch === "sms" && lab === "문자") return "문자(LMS)";
    return lab;
  }
  if (ch === "kakao_alimtalk") return "카카오 알림톡";
  return "문자(LMS)";
}

function payOkChannelFromUrlFallback(urlCh: string) {
  if (urlCh && String(urlCh).trim()) return String(urlCh).trim();
  return "문자(LMS)";
}

function orderPayloadToRecord(d: OrderStatusPayload): Record<string, unknown> {
  return {
    orderId: d.orderId,
    status: d.status,
    paymentMethod: d.paymentMethod,
    smsStatus: d.smsStatus,
    totalAmount: d.totalAmount,
    cashReceiptType: d.cashReceiptType,
    cashReceiptVoluntary: d.cashReceiptVoluntary,
    cashReceiptStatus: d.cashReceiptStatus,
    cashReceiptApprovalNo: d.cashReceiptApprovalNo,
    successCount: d.successCount,
    smsSentCount: d.smsSentCount,
    targetCount: d.targetCount,
    failedCount: d.failedCount,
  };
}

function fulfillmentFromStatusPayload(d: OrderStatusPayload): FulfillmentDerived {
  return deriveFulfillmentPhase(orderPayloadToRecord(d));
}

function resolveDisplayCount(
  orderData: Record<string, unknown> | null | undefined,
  countFromUrl: number,
  recipientsLen: number,
) {
  if (orderData && orderData.count != null && Number.isFinite(Number(orderData.count))) {
    return Math.max(0, Math.floor(Number(orderData.count)));
  }
  if (orderData && orderData.totalCount != null && Number.isFinite(Number(orderData.totalCount))) {
    return Math.max(0, Math.floor(Number(orderData.totalCount)));
  }
  if (Number.isFinite(countFromUrl) && countFromUrl >= 0) return Math.floor(countFromUrl);
  if (recipientsLen > 0) return recipientsLen;
  return null;
}

type Phase = "verifying" | "valid" | "invalid";
type BankTrackPhase = "registered" | "awaiting_deposit";

function PaymentSuccessInner() {
  const sp = useSearchParams();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [invalidTitle, setInvalidTitle] = useState("");
  const [invalidSubHtml, setInvalidSubHtml] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amountLabel, setAmountLabel] = useState("—");
  const [sendCountLabel, setSendCountLabel] = useState("—");
  const [channelLabel, setChannelLabel] = useState("—");
  const [sendFromLabel, setSendFromLabel] = useState("—");
  const [canRetryDispatch, setCanRetryDispatch] = useState(false);
  const [refundEligible, setRefundEligible] = useState(false);
  const [canRequestRefund, setCanRequestRefund] = useState(false);
  const [refundStatus, setRefundStatus] = useState<string | null>(null);
  const [retryDispatching, setRetryDispatching] = useState(false);
  const [refundRequesting, setRefundRequesting] = useState(false);
  const [recipientsSnap, setRecipientsSnap] = useState<PayRecipient[]>([]);
  const [successBoop, setSuccessBoop] = useState(false);
  const [invalidBoop, setInvalidBoop] = useState(false);
  const [invalidFloatReady, setInvalidFloatReady] = useState(false);
  const [isBankTransfer, setIsBankTransfer] = useState(false);
  const [bankPhase, setBankPhase] = useState<BankTrackPhase>("awaiting_deposit");
  const [fulfillment, setFulfillment] = useState<FulfillmentDerived | null>(null);
  const [orderAmountNum, setOrderAmountNum] = useState(0);
  const [cashReceiptType, setCashReceiptType] = useState<PingCashReceiptType | "">("");
  const [cashReceiptVoluntary, setCashReceiptVoluntary] = useState(false);
  const [cashReceiptStatus, setCashReceiptStatus] = useState("");
  const [cashReceiptApprovalNo, setCashReceiptApprovalNo] = useState<string | null>(null);
  const [issuingReceipt, setIssuingReceipt] = useState(false);
  const [verifyingBankIntent, setVerifyingBankIntent] = useState(false);

  const runDownloadXlsx = useCallback((oid: string, list: PayRecipient[]) => {
    const rows: (string | number)[][] = [["번호", "이름", "전화번호"]];
    list.forEach((item, i) => {
      rows.push([i + 1, pingRecipientName(item), pingRecipientPhone(item)]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "발송목록");
    const safeId = String(oid).replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
    XLSX.writeFile(wb, "PING_부의금정리명단_" + safeId + ".xlsx");
  }, []);

  const onXlsxClick = useCallback(() => {
    let list = recipientsSnap;
    try {
      if (!list || !list.length) {
        const again = sessionStorage.getItem(PING_PAY_SUCCESS_RECIPIENTS);
        if (again) {
          const parsed2 = JSON.parse(again) as unknown;
          if (Array.isArray(parsed2) && parsed2.length) {
            list = parsed2.map(pingNormalizePayRecipient);
          }
        }
      }
    } catch {
      /* ignore */
    }
    if (!list || !list.length) {
      alert(
        "지금 이 기기에는 부의금·명단 정리용 연락처가 남아 있지 않습니다.\n" +
          "결제를 마친 직후, 같은 브라우저·같은 흐름에서만 파일을 받을 수 있습니다. 건수는 위 주문 요약을 참고해 주세요.",
      );
      return;
    }
    runDownloadXlsx(orderId, list);
  }, [orderId, recipientsSnap, runDownloadXlsx]);

  const onIssueCashReceipt = useCallback(async () => {
    if (!orderId || !orderAmountNum) return;
    setIssuingReceipt(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/issue-cash-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: orderAmountNum }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        approvalNo?: string;
        alreadyIssued?: boolean;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "현금영수증 발급에 실패했습니다.");
      }
      setCashReceiptStatus("issued");
      if (json.approvalNo) setCashReceiptApprovalNo(String(json.approvalNo));
      alert(
        json.alreadyIssued
          ? "이미 발급된 현금영수증입니다."
          : `현금영수증이 발급되었습니다.\n승인번호: ${json.approvalNo || "—"}`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "현금영수증 발급에 실패했습니다.");
    } finally {
      setIssuingReceipt(false);
    }
  }, [orderId, orderAmountNum]);

  const onRequestRefund = useCallback(async () => {
    if (!orderId || !orderAmountNum || refundRequesting) return;
    if (
      !window.confirm(
        "결제 금액 전액 환불을 진행합니다. 발송이 전혀 되지 않은 경우에만 자동 환불됩니다. 계속할까요?",
      )
    ) {
      return;
    }
    setRefundRequesting(true);
    try {
      const r = await requestOrderRefund(orderId, orderAmountNum, {
        deviceId: getRefundDeviceIdForOrder(),
      });
      if (!r.ok) {
        if (r.manual) {
          window.location.href = `/customer-center?topic=payment&orderId=${encodeURIComponent(orderId)}`;
          return;
        }
        throw new Error(r.error || "환불 처리에 실패했습니다.");
      }
      if (r.alreadyRefunded) {
        alert("이미 환불 처리된 주문입니다.");
      } else {
        alert("환불이 접수되었습니다. 카드 결제는 영업일 기준 며칠 내 환불될 수 있습니다.");
      }
      setCanRequestRefund(false);
      setRefundEligible(false);
      setCanRetryDispatch(false);
      setRefundStatus(r.refundStatus || "refunded");
      const status = await fetchOrderStatusOnce(orderId, orderAmountNum);
      if (status.ok) {
        setRefundStatus(status.data.refundStatus || "refunded");
        setCanRequestRefund(status.data.canRequestRefund === true);
        setRefundEligible(status.data.refundEligible === true);
        setCanRetryDispatch(status.data.canRetryDispatch === true);
        setFulfillment(fulfillmentFromStatusPayload(status.data));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "환불 처리에 실패했습니다.");
    } finally {
      setRefundRequesting(false);
    }
  }, [orderId, orderAmountNum, refundRequesting]);

  const onRetryDispatch = useCallback(async () => {
    if (!orderId || !orderAmountNum || retryDispatching) return;
    setRetryDispatching(true);
    try {
      const r = await retryOrderDispatch(orderId, orderAmountNum);
      if (!r.ok) {
        throw new Error(r.error || "재발송에 실패했습니다.");
      }
      if (r.alreadyDispatched) {
        alert("이미 발송 처리 중이거나 완료된 주문입니다.");
      } else {
        alert("재발송을 요청했습니다. 잠시 후 상태가 갱신됩니다.");
      }
      setCanRetryDispatch(false);
      setFulfillment(deriveFulfillmentPhase({ status: "paid", smsStatus: "sending" }));
      const status = await fetchOrderStatusOnce(orderId, orderAmountNum);
      if (status.ok) {
        setFulfillment(fulfillmentFromStatusPayload(status.data));
        setCanRetryDispatch(status.data.canRetryDispatch === true);
        setRefundEligible(status.data.refundEligible === true);
        if (status.data.sendFromLabel) setSendFromLabel(status.data.sendFromLabel);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "재발송에 실패했습니다.");
    } finally {
      setRetryDispatching(false);
    }
  }, [orderId, orderAmountNum, retryDispatching]);

  useEffect(() => {
    void fetchPingSendFromLabel().then((label) => {
      setSendFromLabel((prev) => (prev === "—" ? label : prev));
    });
  }, []);

  useEffect(() => {
    if (phase !== "valid" || !orderId || !orderAmountNum) return;
    let cancelled = false;

    const poll = async () => {
      const r = await fetchOrderStatusOnce(orderId, orderAmountNum);
      if (cancelled || !r.ok) return;
      const json = r.data;
      const st = String(json.status || "");
      if (st === "waiting_bank_transfer") {
        setBankPhase((prev) => (prev === "registered" ? "registered" : "awaiting_deposit"));
      }
      setFulfillment(fulfillmentFromStatusPayload(json));
      setCanRetryDispatch(json.canRetryDispatch === true);
      setRefundEligible(json.refundEligible === true);
      setCanRequestRefund(json.canRequestRefund === true);
      setRefundStatus(json.refundStatus || null);
      if (json.sendFromLabel) setSendFromLabel(json.sendFromLabel);
      if (json.cashReceiptType === "income_deduction" || json.cashReceiptType === "expense_proof") {
        setCashReceiptType(json.cashReceiptType);
      }
      if (json.cashReceiptVoluntary === true) setCashReceiptVoluntary(true);
      if (json.cashReceiptStatus) setCashReceiptStatus(json.cashReceiptStatus);
      if (json.cashReceiptApprovalNo) {
        setCashReceiptApprovalNo(String(json.cashReceiptApprovalNo));
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [phase, orderId, orderAmountNum]);

  useEffect(() => {
    let orderIdVal = (sp.get("orderId") || "").trim();
    let amountRaw = sp.get("amount");
    let amount = Number(amountRaw);
    let countRaw = sp.get("count");
    let countFromUrl = countRaw != null && countRaw !== "" ? Number(countRaw) : NaN;
    let channelFromUrl = (sp.get("channel") || "").trim();
    const bankTransferFromUrl = sp.get("bank_transfer") === "1";
    const flooredAmount = Math.floor(amount);

    function hasBankTransferConfirmSession(oid: string, amt: number): boolean {
      return readBankTransferConfirmSession(oid, amt);
    }

    /** Phase 2: 체크아웃 직후만 — URL `bank_transfer=1` 또는 짧은 TTL confirm 세션 */
    function allowBankBeforeFirestore(
      oid: string,
      amt: number,
      bankSnap: ReturnType<typeof readBankTransferConfirmForOrder>,
    ): boolean {
      if (bankTransferFromUrl) return true;
      if (hasBankTransferConfirmSession(oid, amt)) return true;
      if (bankSnap && bankSnap.amount === Math.floor(Number(amt))) return true;
      return false;
    }

    function buildPaySuccessUrl(
      oidForXlsx: string,
      displayAmount: number,
      keepBankTransfer: boolean,
    ): string {
      const u = new URL(window.location.pathname, window.location.origin);
      u.searchParams.set("orderId", oidForXlsx);
      u.searchParams.set("amount", String(displayAmount));
      if (keepBankTransfer) u.searchParams.set("bank_transfer", "1");
      return u.pathname + u.search;
    }

    function tryRestorePaySuccessFromSession() {
      try {
        const snapRaw = sessionStorage.getItem(PING_PAY_SUCCESS_SESSION);
        if (!snapRaw) return false;
        const snap = JSON.parse(snapRaw) as {
          orderId?: string;
          amount?: number;
          count?: unknown;
          channel?: string;
          bankTransfer?: boolean;
          ts?: number;
        };
        const amt = Number(snap && snap.amount);
        if (!snap || !snap.orderId || !Number.isFinite(amt) || amt < 0) {
          clearPaySuccessExportSession();
          return false;
        }
        if (!snap.ts || Date.now() - snap.ts >= PAY_SUCCESS_TTL_MS) {
          clearPaySuccessExportSession();
          return false;
        }
        orderIdVal = String(snap.orderId).trim();
        amount = amt;
        if (snap.count != null && snap.count !== "") countFromUrl = Number(snap.count);
        if (snap.channel != null && String(snap.channel).trim())
          channelFromUrl = String(snap.channel).trim();
        return true;
      } catch {
        clearPaySuccessExportSession();
        return false;
      }
    }

    let recipients: PayRecipient[] = [];
    try {
      const rj =
        sessionStorage.getItem("ping_bulk_recipients") ||
        sessionStorage.getItem(PING_PAY_SUCCESS_RECIPIENTS);
      if (rj) {
        const parsed = JSON.parse(rj) as unknown;
        if (Array.isArray(parsed)) recipients = parsed.map(pingNormalizePayRecipient);
      }
    } catch {
      /* ignore */
    }
    setRecipientsSnap(recipients);

    if (!orderIdVal || !Number.isFinite(amount) || amount < 0) {
      tryRestorePaySuccessFromSession();
    }
    if (!orderIdVal || !Number.isFinite(amount) || amount < 0) {
      clearBulkSession();
      setPhase("invalid");
      setInvalidTitle("이 화면으로 직접 들어올 수 없습니다");
      setInvalidSubHtml(
        "결제 완료 페이지는 결제가 끝난 뒤에만 표시됩니다.<br>주소만 붙여 넣어 열면 정보가 없어 이 안내가 나옵니다.",
      );
      return;
    }

    let cancelled = false;

    void (async () => {
      const bankConfirmSnap = readBankTransferConfirmForOrder(orderIdVal);
      const bankPreFirestore = allowBankBeforeFirestore(
        orderIdVal,
        flooredAmount,
        bankConfirmSnap,
      );
      setVerifyingBankIntent(bankPreFirestore);
      document.title = bankPreFirestore ? "주문 접수 — PING" : "결제 확인 중 — PING";

      const finishValid = (
        oidForXlsx: string,
        displayAmount: number,
        resolvedChannelLabel: string,
        displayCount: number | null,
        bankPending?: boolean,
        orderData?: Record<string, unknown> | null,
        bankRegistered?: boolean,
      ) => {
        setPhase("valid");
        setIsBankTransfer(!!bankPending);
        setOrderAmountNum(displayAmount);
        if (bankPending) {
          setBankPhase(bankRegistered ? "registered" : "awaiting_deposit");
        }
        setOrderId(oidForXlsx);
        setAmountLabel(displayAmount.toLocaleString("ko-KR") + "원");
        const crt = orderData?.cashReceiptType;
        if (crt === "income_deduction" || crt === "expense_proof") {
          setCashReceiptType(crt);
        }
        if (orderData?.cashReceiptVoluntary === true) setCashReceiptVoluntary(true);
        const crs = orderData?.cashReceiptStatus;
        if (typeof crs === "string") setCashReceiptStatus(crs);
        const crn = orderData?.cashReceiptApprovalNo;
        if (crn) setCashReceiptApprovalNo(String(crn));
        if (orderData) {
          setFulfillment(deriveFulfillmentPhase(orderData));
        } else if (bankPending) {
          setFulfillment(deriveFulfillmentPhase({ status: "waiting_bank_transfer" }));
        }
        setChannelLabel(resolvedChannelLabel);
        setSendCountLabel(
          displayCount != null ? displayCount.toLocaleString("ko-KR") + "건" : "—",
        );
        document.title = bankPending
          ? bankRegistered
            ? "주문 접수 — PING"
            : "무통장 입금 안내 — PING"
          : "결제 완료 — PING";
        try {
          sessionStorage.setItem(
            PING_PAY_SUCCESS_SESSION,
            JSON.stringify({
              orderId: oidForXlsx,
              amount: displayAmount,
              count: displayCount != null ? displayCount : null,
              channel: resolvedChannelLabel,
              bankTransfer: !!bankPending,
              ts: Date.now(),
            }),
          );
          if (recipients.length > 0) {
            sessionStorage.setItem(PING_PAY_SUCCESS_RECIPIENTS, JSON.stringify(recipients));
          } else {
            sessionStorage.removeItem(PING_PAY_SUCCESS_RECIPIENTS);
          }
        } catch {
          /* ignore */
        }
        clearBulkSession();
        clearBankTransferConfirmSession();
        window.history.replaceState(
          {},
          document.title,
          buildPaySuccessUrl(oidForXlsx, displayAmount, !!bankPending),
        );
      };

      const showInvalid = (
        title: string,
        subHtml: string,
        opts?: { clearBulkFlow?: boolean },
      ) => {
        if (opts?.clearBulkFlow !== false) {
          clearBulkSession();
          clearBankTransferConfirmSession();
        }
        setPhase("invalid");
        setInvalidTitle(title);
        setInvalidSubHtml(subHtml);
        document.title = "접근 안내 — PING";
      };

      const finishFromBankConfirmSession = () => {
        const snap = bankConfirmSnap || readBankTransferConfirmForOrder(orderIdVal);
        const strictOk = hasBankTransferConfirmSession(orderIdVal, flooredAmount);
        if (!strictOk && !snap && !bankTransferFromUrl) return false;
        const displayAmt = snap?.amount ?? flooredAmount;
        const chFb = payOkChannelFromUrlFallback(channelFromUrl);
        finishValid(
          orderIdVal,
          displayAmt,
          chFb,
          resolveDisplayCount(null, countFromUrl, recipients.length),
          true,
          null,
          true,
        );
        return true;
      };

      /** 무통장 체크아웃 직후: Firestore 반영 전 입금 안내 (짧은 TTL 세션·URL만) */
      if (bankPreFirestore) {
        if (finishFromBankConfirmSession()) return;
        const chFb = payOkChannelFromUrlFallback(channelFromUrl);
        finishValid(
          orderIdVal,
          flooredAmount,
          chFb,
          resolveDisplayCount(null, countFromUrl, recipients.length),
          true,
          null,
          true,
        );
        return;
      }

      const verified = await pollOrderStatusUntil(orderIdVal, amount, {
        acceptStatuses: new Set(["paid", "waiting_bank_transfer"]),
      });
      if (cancelled) return;

      if (verified.ok) {
        const d = orderPayloadToRecord(verified.data);
        const oidShow = String(verified.data.orderId || orderIdVal).trim();
        const amtShow = Math.floor(Number(verified.data.totalAmount ?? flooredAmount));
        const ch = payOkSendChannelFromOrder(d);
        const cnt = resolveDisplayCount(d, countFromUrl, recipients.length);
        const st = String(verified.data.status || "").trim();
        const bankPending = st === "waiting_bank_transfer";
        finishValid(oidShow, amtShow, ch, cnt, bankPending, d, false);
        return;
      }

      if (verified.code === "no_admin_db") {
        showInvalid(
          "주문을 확인할 수 없습니다",
          "서버 주문 확인이 일시적으로 불가합니다.<br>잠시 뒤 새로고침하거나 고객센터로 문의해 주세요.",
          { clearBulkFlow: false },
        );
        return;
      }

      if (verified.code === "missing") {
        showInvalid(
          "주문을 확인할 수 없습니다",
          "해당 주문 번호의 기록이 없습니다.<br>· 주소 표시줄의 주문번호·금액이 맞는지 확인해 주세요.<br>· 문제가 계속되면 고객센터로 문의해 주세요.",
        );
        return;
      }
      if (verified.code === "amount_mismatch") {
        showInvalid(
          "주문을 확인할 수 없습니다",
          "결제 금액이 주문 정보와 일치하지 않습니다.<br>고객센터로 문의해 주세요.",
        );
        return;
      }
      if (verified.code === "not_paid") {
        showInvalid(
          "아직 결제가 완료되지 않았습니다",
          "주문 상태가 결제 완료로 반영되지 않았습니다.<br>잠시 뒤 새로고침 하거나, 처음 화면에서 결제 상태를 확인해 주세요.",
          { clearBulkFlow: false },
        );
        return;
      }
      if (verified.code === "timeout_pending") {
        showInvalid(
          "주문을 확인하는 중 시간이 초과되었습니다",
          "카드·간편결제 승인 반영이 지연되고 있을 수 있습니다.<br>잠시 뒤 새로고침하거나 고객센터로 문의해 주세요.",
          { clearBulkFlow: false },
        );
        return;
      }
      if (verified.code === "network" || verified.code === "error") {
        showInvalid(
          "주문을 확인할 수 없습니다",
          "서버에 연결하지 못했습니다.<br>네트워크를 확인한 뒤 새로고침해 주세요.",
          { clearBulkFlow: false },
        );
        return;
      }
      showInvalid(
        "주문을 확인할 수 없습니다",
        "예기치 않은 오류가 발생했습니다.<br>고객센터로 문의해 주세요.",
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [sp]);

  const onSuccessMarkAnimationEnd = useCallback((e: AnimationEvent<HTMLSpanElement>) => {
    if (e.animationName === "pay-ok-mark-enter") {
      e.currentTarget.classList.add("pay-ok-circle-enter-done");
    }
    if (e.animationName === "pay-ok-mark-boop") {
      setSuccessBoop(false);
    }
  }, []);

  const onInvalidFloatAnimationEnd = useCallback((e: AnimationEvent<HTMLSpanElement>) => {
    if (e.animationName === "pay-ok-invalid-pop") {
      setInvalidFloatReady(true);
    }
    if (e.animationName === "pay-ok-invalid-tap") {
      setInvalidBoop(false);
    }
  }, []);

  const bankTransferFromUrl = sp.get("bank_transfer") === "1";
  const isBankAwaitingDeposit =
    phase === "valid" && isBankTransfer && bankPhase === "awaiting_deposit";
  const isBankRegistered =
    phase === "valid" && isBankTransfer && bankPhase === "registered";
  const bankDepositPending = isBankAwaitingDeposit || isBankRegistered;
  const fulfillmentPhase = fulfillment?.phase;

  const flowStep: BulkFlowStep | null =
    phase === "invalid"
      ? null
      : phase === "valid"
        ? fulfillmentToBulkFlowStep(
            bankDepositPending ? "received" : fulfillmentPhase ?? "dispatching",
          )
        : 7;

  const flowLabelOverride = fulfillmentBulkFlowLabelOverride(
    bankDepositPending ? "received" : fulfillmentPhase ?? "dispatching",
    { bankDepositPending },
  );

  const showSuccessCheckmark =
    phase === "valid" && !bankDepositPending && fulfillmentPhase === "complete";

  return (
    <div className="pay-ok-page">
      {flowStep != null ? (
        <div className="pay-ok-flow-progress-wrap">
          <BulkFlowProgress
            currentStep={flowStep}
            labelOverride={flowLabelOverride}
            sticky
          />
        </div>
      ) : null}
      <div
        className={`pay-ok-shell ${phase === "verifying" ? "" : "pay-ok-panel--hidden"}`}
        id="pay-ok-verifying"
        aria-live="polite"
      >
        <PingLoadingSpinner
          size="lg"
          label={
            verifyingBankIntent
              ? bankTransferFromUrl
                ? "주문을 접수하는 중입니다"
                : "입금 안내를 불러오는 중입니다"
              : "결제 완료 여부를 확인하는 중입니다"
          }
        />
      </div>

      <div
        className={`pay-ok-shell ${phase === "valid" ? "" : "pay-ok-panel--hidden"}${isBankAwaitingDeposit ? " pay-ok-shell--bank-pending" : ""}${isBankRegistered ? " pay-ok-shell--bank-registered" : ""}`}
        id="pay-ok-valid"
        aria-live="polite"
      >
        {showSuccessCheckmark ? (
          <div className="pay-ok-hero">
            <button
              type="button"
              className={`pay-ok-success-mark${successBoop ? " is-boop" : ""}`}
              id="pay-ok-success-mark"
              aria-label="결제 성공 — 눌러 표시가 한 번 더 튀어 오릅니다"
              onClick={() => {
                setSuccessBoop(false);
                void 0;
                setSuccessBoop(true);
              }}
            >
              <span className="pay-ok-success-float">
                <span
                  className="pay-ok-success-circle"
                  onAnimationEnd={onSuccessMarkAnimationEnd}
                >
                  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                      d="M16 33.5 L28.5 46 L48.5 20"
                      stroke="#ffffff"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
            </button>
          </div>
        ) : isBankAwaitingDeposit ? (
          <div className="pay-ok-bank-pending-hero" aria-hidden>
            <div className="pay-ok-bank-pending-icon">
              <Building2 strokeWidth={2} />
            </div>
          </div>
        ) : null}

        <h1 className="pay-ok-title">
          {isBankAwaitingDeposit
            ? "입금 안내"
            : isBankRegistered
              ? "주문이 접수되었습니다"
              : fulfillmentPhase === "failed"
                ? "발송에 실패했습니다"
                : fulfillmentPhase === "partial"
                  ? "일부 수신자에게 발송되지 않았습니다"
                  : fulfillmentPhase === "complete"
                    ? isBankTransfer
                      ? "발송이 완료되었습니다"
                      : "발송이 완료되었습니다"
                    : fulfillmentPhase === "dispatching"
                      ? isBankTransfer
                        ? "입금 확인 · 발송 중"
                        : "발송 준비 중"
                      : "결제가 완료되었습니다"}
        </h1>
        <p className="pay-ok-sub">
          {isBankAwaitingDeposit
            ? "아래 계좌로 입금해 주세요. 입금 확인 후 문자 발송이 시작됩니다."
            : isBankRegistered
              ? "체크아웃에서 확인한 계좌로 입금해 주세요. 입금이 확인되면 문자 발송이 시작됩니다."
              : refundStatus === "refunded"
                ? "결제 금액이 환불 처리되었습니다."
                : fulfillmentPhase === "failed"
                  ? canRetryDispatch
                    ? "결제는 완료되었으나 발송에 실패했습니다. 아래에서 재발송을 시도하거나 전액 환불을 요청해 주세요."
                    : "발송 처리에 실패했습니다. 고객센터로 문의해 주시면 재발송·환불을 안내해 드립니다."
                : fulfillmentPhase === "partial"
                  ? fulfillment?.sentCount != null && fulfillment?.targetCount != null
                    ? `총 ${fulfillment.targetCount.toLocaleString("ko-KR")}건 중 ${fulfillment.sentCount.toLocaleString("ko-KR")}건이 접수되었습니다. 미도달 건은 고객센터로 문의해 주세요.`
                    : "일부 수신자에게 부고가 전달되지 않았습니다. 고객센터로 문의해 주세요."
                  : fulfillmentPhase === "complete"
                    ? isBankTransfer
                      ? "발송이 완료되었습니다. 아래에서 현금영수증을 발급해 주세요."
                      : "지인분들께 부고가 발송되었습니다."
                    : fulfillmentPhase === "dispatching"
                      ? isBankTransfer
                        ? "입금이 확인되었습니다. 지인분들께 부고가 발송되고 있습니다."
                        : "결제가 확인되었습니다. 지인분들께 부고를 발송하고 있습니다."
                      : "주문·결제가 정상적으로 처리되었습니다."}
        </p>

        {isBankAwaitingDeposit || isBankRegistered ? (
          <>
            <ol className="pay-ok-bank-steps" aria-label="진행 순서">
              <li className="pay-ok-bank-steps__item is-current">
                <span className="pay-ok-bank-steps__num">1</span>
                <span>입금</span>
              </li>
              <li className="pay-ok-bank-steps__item">
                <span className="pay-ok-bank-steps__num">2</span>
                <span>입금 확인</span>
              </li>
              <li className="pay-ok-bank-steps__item">
                <span className="pay-ok-bank-steps__num">3</span>
                <span>발송</span>
              </li>
            </ol>

            {isBankRegistered ? null : (
            <div className="pay-ok-card pay-ok-bank-card-pending" aria-label="입금 계좌">
              <div className="pay-ok-bank-amount-block">
                <span className="pay-ok-bank-amount-label">입금하실 금액</span>
                <span className="pay-ok-bank-amount" id="pay-ok-bank-deposit-amount">
                  {amountLabel}
                </span>
              </div>

              <div
                className="pay-ok-bank-notice rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-950"
                role="status"
              >
                <p className="m-0 font-semibold">PG 심사중이에요.</p>
                <p className="m-0 mt-1 text-xs text-amber-900/90">
                  무통장 입금만 이용 가능합니다. 입금자명은 주문 시 입력한 이름과 동일하게 해 주세요.
                </p>
              </div>

              <div className="pay-ok-bank-rows space-y-2.5 text-sm text-gray-800">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">은행</span>
                  <span className="font-medium">{PING_BANK_TRANSFER.bankName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="shrink-0 text-gray-500">계좌</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-mono text-base font-semibold">
                      {PING_BANK_TRANSFER.accountNumber}
                    </span>
                    <PingBankAccountCopyButton />
                  </div>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">예금주</span>
                  <span className="font-medium">{PING_BANK_TRANSFER.holder}</span>
                </div>
              </div>

              <PingBankAccountCopyAllButton className="pay-ok-bank-copy-all mt-1" />
            </div>
            )}
          </>
        ) : null}

        {isBankTransfer && fulfillmentPhase === "complete" && cashReceiptType ? (
          <div className="pay-ok-card pay-ok-cash-receipt-card" aria-label="현금영수증">
            <p className="pay-ok-k m-0 mb-2">현금영수증</p>
            <p className="m-0 text-sm text-gray-600">
              체크아웃 시 선택한{" "}
              <strong>{PING_CASH_RECEIPT_TYPE_LABELS[cashReceiptType]}</strong>
              {cashReceiptVoluntary ? (
                <>
                  {" "}
                  · <strong>자진발급</strong>
                </>
              ) : null}{" "}
              으로 발급합니다.
            </p>
            {cashReceiptStatus === "issued" && cashReceiptApprovalNo ? (
              <p className="mt-3 text-sm font-semibold text-[#0336FF]">
                발급 완료 · 승인번호 {cashReceiptApprovalNo}
              </p>
            ) : (
              <button
                type="button"
                className="pay-ok-bank-copy-all mt-3 w-full rounded-xl border border-[#0336FF]/30 bg-[#0336FF]/5 py-2.5 text-sm font-semibold text-[#0336FF] disabled:opacity-50"
                disabled={issuingReceipt}
                onClick={() => void onIssueCashReceipt()}
              >
                {issuingReceipt ? "발급 처리 중…" : "현금영수증 발급하기"}
              </button>
            )}
          </div>
        ) : null}

        <div
          className={`pay-ok-card${isBankAwaitingDeposit ? " pay-ok-card--compact" : ""}`}
          aria-label="주문 요약"
        >
          <div className="pay-ok-row">
            <span className="pay-ok-k">주문번호</span>
            <span className="pay-ok-v pay-ok-v--mono" id="pay-ok-order-id">
              {orderId || "—"}
            </span>
          </div>
          {!isBankAwaitingDeposit ? (
            <div className="pay-ok-row">
              <span className="pay-ok-k">결제 금액</span>
              <span className="pay-ok-v pay-ok-amount" id="pay-ok-amount">
                {amountLabel}
              </span>
            </div>
          ) : null}
          <div className="pay-ok-row">
            <span className="pay-ok-k">발송 건수</span>
            <span className="pay-ok-v" id="pay-ok-send-count">
              {sendCountLabel}
            </span>
          </div>
          <div className="pay-ok-row">
            <span className="pay-ok-k">발송 방식</span>
            <span className="pay-ok-v" id="pay-ok-send-channel">
              {channelLabel}
            </span>
          </div>
          <div className="pay-ok-row">
            <span className="pay-ok-k">발신번호</span>
            <span className="pay-ok-v" id="pay-ok-send-from">
              {sendFromLabel}
            </span>
          </div>
          {fulfillment &&
          (fulfillment.phase === "partial" ||
            fulfillment.phase === "complete" ||
            fulfillment.phase === "failed") &&
          fulfillment.targetCount != null ? (
            <div className="pay-ok-row">
              <span className="pay-ok-k">발송 결과</span>
              <span className="pay-ok-v" id="pay-ok-dispatch-result">
                {fulfillment.sentCount != null
                  ? `${fulfillment.sentCount.toLocaleString("ko-KR")} / ${fulfillment.targetCount.toLocaleString("ko-KR")}건`
                  : `— / ${fulfillment.targetCount.toLocaleString("ko-KR")}건`}
                {fulfillment.failedCount != null && fulfillment.failedCount > 0
                  ? ` (미도달 ${fulfillment.failedCount.toLocaleString("ko-KR")}건)`
                  : null}
              </span>
            </div>
          ) : null}
        </div>

        {refundStatus === "refunded" && !bankDepositPending ? (
          <div className="pay-ok-card" role="status" aria-label="환불 완료">
            <p className="m-0 text-center text-sm font-semibold text-emerald-700">
              환불이 완료되었습니다.
            </p>
          </div>
        ) : null}

        {(canRetryDispatch || canRequestRefund) && !bankDepositPending && refundStatus !== "refunded" ? (
          <div className="pay-ok-card flex flex-col gap-2" aria-label="발송 재시도·환불">
            {canRetryDispatch ? (
              <button
                type="button"
                className="pay-ok-btn pay-ok-btn--primary w-full disabled:opacity-50"
                disabled={retryDispatching || refundRequesting}
                onClick={() => void onRetryDispatch()}
              >
                {retryDispatching ? "재발송 요청 중…" : "발송 다시 시도"}
              </button>
            ) : null}
            {canRequestRefund ? (
              <button
                type="button"
                className="pay-ok-btn w-full border border-[var(--ping-primary)] bg-white text-[var(--ping-primary)] disabled:opacity-50"
                disabled={refundRequesting || retryDispatching}
                onClick={() => void onRequestRefund()}
              >
                {refundRequesting ? "환불 처리 중…" : "전액 환불 받기"}
              </button>
            ) : refundEligible ? (
              <a
                href={`/customer-center?topic=payment&orderId=${encodeURIComponent(orderId)}`}
                className="text-center text-sm font-semibold text-[var(--ping-primary)] underline-offset-2 hover:underline"
              >
                전액 환불 문의하기
              </a>
            ) : null}
          </div>
        ) : null}

        {!isBankAwaitingDeposit && !isBankRegistered ? (
          <div className="pay-ok-message">
            <p>
              <strong>마음, PING으로 정확하게</strong>
              <br />
              고객님의 부고 소식이 지인분들께 순차적으로 전달됩니다.
              <br />
              부의금·조문 정리에 참고하실 <strong>발송 명단</strong>은 아래 버튼으로 받으실 수 있습니다.
            </p>
          </div>
        ) : isBankAwaitingDeposit || isBankRegistered ? (
          <p className="pay-ok-bank-pending-foot m-0 text-center text-sm text-[var(--pay-ok-text-sub)]">
            {isBankRegistered
              ? "입금하신 뒤에는 이 화면을 닫으셔도 됩니다. 발송 명단은 아래에서 받을 수 있어요."
              : "입금 후에는 이 화면을 닫으셔도 됩니다. 발송 명단은 아래에서 받을 수 있어요."}
          </p>
        ) : null}

        <div className="pay-ok-actions">
          <button
            type="button"
            className={`pay-ok-btn pay-ok-btn--excel${recipientsSnap.length === 0 ? " pay-ok-btn--dim" : ""}`}
            id="pay-ok-xlsx-btn"
            aria-label="부의금·조문 정리용 발송 명단을 엑셀 파일로 받기"
            onClick={onXlsxClick}
          >
            <FileSpreadsheet className="h-[1.1rem] w-[1.1rem] shrink-0" aria-hidden />
            명단 받기
          </button>
          <a
            href="/"
            className="pay-ok-btn pay-ok-btn--primary"
            onClick={(e) => {
              e.preventDefault();
              pingAssignToLocation("/");
            }}
          >
            처음으로 돌아가기
          </a>
          <a href="/customer-center" className="pay-ok-btn pay-ok-btn--secondary">
            고객센터
          </a>
        </div>
      </div>

      <div
        className={`pay-ok-shell ${phase === "invalid" ? "" : "pay-ok-panel--hidden"}`}
        id="pay-ok-invalid"
        aria-live="polite"
      >
        <div className="pay-ok-invalid-hero">
          <button
            type="button"
            className={`pay-ok-invalid-bounce${invalidBoop ? " is-boop" : ""}`}
            id="pay-ok-invalid-mark"
            aria-label="잘못된 접근 — 눌러 표시가 한 번 더 튀어 오릅니다"
            onClick={() => {
              setInvalidBoop(false);
              void 0;
              setInvalidBoop(true);
            }}
          >
            <span
              className={`pay-ok-invalid-bounce-float${invalidFloatReady ? " pay-ok-invalid-float-ready" : ""}`}
              onAnimationEnd={onInvalidFloatAnimationEnd}
            >
              <span className="pay-ok-invalid-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 8v5m0 3h.01"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
          </button>
        </div>
        <h1 className="pay-ok-title" id="pay-ok-invalid-title">
          {invalidTitle}
        </h1>
        <p
          className="pay-ok-sub"
          id="pay-ok-invalid-sub"
          dangerouslySetInnerHTML={{ __html: invalidSubHtml }}
        />
        <div className="pay-ok-actions pay-ok-invalid-actions">
          <div className="pay-ok-message pay-ok-invalid-prompt">
            <p>처음 화면에서 처리를 이어가 주시거나, 고객센터로 문의해 주세요.</p>
          </div>
          <a
            href="/"
            className="pay-ok-btn pay-ok-btn--primary"
            onClick={(e) => {
              e.preventDefault();
              pingAssignToLocation("/");
            }}
          >
            처음으로 돌아가기
          </a>
          <a href="/customer-center" className="pay-ok-btn pay-ok-btn--secondary">
            고객센터
          </a>
        </div>
      </div>
    </div>
  );
}

export function PaymentSuccessClient() {
  return (
    <Suspense
      fallback={
        <div className="pay-ok-page">
          <div className="pay-ok-shell flex justify-center pt-10">
            <PingLoadingSpinner size="lg" label="페이지를 불러오는 중입니다" />
          </div>
        </div>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}
