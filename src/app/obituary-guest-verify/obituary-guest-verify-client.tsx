"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { useFontAwesomeCdn } from "@/hooks/use-font-awesome-cdn";
import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import { navigateToBulkCheckoutPrepare } from "@/lib/ping-bulk-checkout-prep";
import { shouldShowBulkFlowProgressOnLogin } from "@/lib/ping-bulk-flow-login-progress";
import {
  bulkFlowBackAriaLabel,
  navigateBulkFlowBack,
} from "@/lib/ping-bulk-flow-nav";
import { isGuestVerifyFromBulk } from "@/lib/guest-flow-client";
import {
  normalizeJoinType,
  normalizeSignupMethod,
  signupTermsHref,
} from "@/lib/auth-signup-flow";
import { AUTH_GUEST_VERIFY_COPY } from "@/lib/ping-flow-step-copy";
import "./guest-verify.css";

function normalizePhone(v: string) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.indexOf("82") === 0 && d.length >= 10) d = "0" + d.slice(2);
  return d;
}

function validKrMobile(d: string) {
  return /^01[016789]\d{7,8}$/.test(d);
}

export default function ObituaryGuestVerifyClient() {
  usePingCenteredLayout();
  useFontAwesomeCdn();
  const searchParams = useSearchParams();

  const method = normalizeSignupMethod(searchParams.get("method"));
  const joinType = normalizeJoinType(searchParams.get("join"));
  const nextParam = searchParams.get("next");

  const [fromBulk, setFromBulk] = useState(false);
  const [showBulkProgress, setShowBulkProgress] = useState(false);
  useEffect(() => {
    setFromBulk(isGuestVerifyFromBulk());
    setShowBulkProgress(shouldShowBulkFlowProgressOnLogin());
  }, []);

  const [smsMode, setSmsMode] = useState(false);
  const [guestCodeSent, setGuestCodeSent] = useState(false);
  const [verifyInProgress, setVerifyInProgress] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [statusText, setStatusText] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [showSmsBlock, setShowSmsBlock] = useState(false);
  const [showCodeWrap, setShowCodeWrap] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const backHref = useMemo(() => {
    if (method === "guest") {
      return signupTermsHref("guest", joinType, nextParam);
    }
    return "/login";
  }, [method, joinType, nextParam]);
  const continueLabel = fromBulk
    ? "확인 후 발송 신청 계속"
    : "본인인증 후 부고 작성하기";

  useEffect(() => {
    document.title = fromBulk ? "PING · 본인인증 (발송)" : "PING · 본인인증";
  }, [fromBulk]);

  const setSmsUi = useCallback((enabled: boolean) => {
    setSmsMode(enabled);
    if (enabled) {
      setShowSmsBlock(true);
      setShowCodeWrap(false);
      setDigits(["", "", "", "", "", ""]);
      setGuestCodeSent(false);
      setStatusText("");
    } else {
      setShowSmsBlock(false);
      setShowCodeWrap(false);
    }
  }, []);

  const clearOtp = () => setDigits(["", "", "", "", "", ""]);

  const focusOtpIndex = (i: number) => {
    otpRefs.current[i]?.focus();
  };

  const proceedAfterVerified = useCallback(() => {
    try {
      if (fromBulk) {
        sessionStorage.setItem("ping_bulk_identity_ok", "1");
        try {
          const prevRaw = sessionStorage.getItem("ping_from_index");
          let prevObj: Record<string, unknown> = {};
          try {
            prevObj = prevRaw ? (JSON.parse(prevRaw) as Record<string, unknown>) : {};
          } catch {
            prevObj = {};
          }
          const n = name.trim();
          const ph = normalizePhone(phone);
          if (n) prevObj.name = n;
          if (ph) prevObj.phone = ph.replace(/\s/g, "").trim();
          prevObj.ts = Date.now();
          sessionStorage.setItem("ping_from_index", JSON.stringify(prevObj));
        } catch (e) {
          console.warn("신청자 hydrate 실패", e);
        }
        navigateToBulkCheckoutPrepare();
        return;
      }
    } catch {
      /* noop */
    }
    window.location.href = "/obituary-form";
  }, [fromBulk, name, phone]);

  const tryAutoVerifyWithCode = useCallback(
    (code: string) => {
      if (!guestCodeSent || verifyInProgress) return;
      const ph = normalizePhone(phone);
      if (code.length !== 6) return;
      if (!validKrMobile(ph)) {
        setStatusText("휴대폰 번호를 다시 확인해 주세요.");
        return;
      }
      setVerifyInProgress(true);
      setStatusText("인증 확인 중…");
      fetch("/api/guest-auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: ph, code }),
      })
        .then(async (r) => {
          const data = (await r.json().catch(() => ({}))) as Record<
            string,
            unknown
          >;
          return { ok: r.ok, data };
        })
        .then((res) => {
          setVerifyInProgress(false);
          if (!res.ok || !res.data.ok) {
            setStatusText(
              (typeof res.data.error === "string" && res.data.error) ||
                "인증에 실패했습니다.",
            );
            clearOtp();
            focusOtpIndex(0);
            return;
          }
          setStatusText("완료!");
          setTimeout(() => {
            proceedAfterVerified();
          }, 1700);
        })
        .catch(() => {
          setVerifyInProgress(false);
          setStatusText("서버에 연결할 수 없습니다.");
          clearOtp();
          focusOtpIndex(0);
        });
    },
    [
      guestCodeSent,
      verifyInProgress,
      phone,
      proceedAfterVerified,
    ],
  );

  const fillOtpFromPasteString = useCallback(
    (raw: string, startIdx: number) => {
      const start = Math.max(0, Math.min(5, parseInt(String(startIdx), 10) || 0));
      const maxTake = start === 0 ? 6 : 6 - start;
      const d = String(raw || "")
        .replace(/\D/g, "")
        .slice(0, maxTake);
      if (!d) return;
      setDigits((prev) => {
        const next = [...prev];
        if (start === 0) {
          for (let j = 0; j < 6; j++) next[j] = d[j] || "";
        } else {
          let p = 0;
          for (let j = start; j < 6 && p < d.length; j++, p++) next[j] = d[p]!;
        }
        const code = next
          .map((x) => String(x || "").replace(/\D/g, "").slice(0, 1))
          .join("");
        queueMicrotask(() => {
          const focusAt = Math.min(start + d.length - 1, 5);
          focusOtpIndex(focusAt < start ? start : focusAt);
          if (code.length === 6) tryAutoVerifyWithCode(code);
        });
        return next;
      });
    },
    [tryAutoVerifyWithCode],
  );

  useEffect(() => {
    fetch("/api/guest-auth/config")
      .then((r) => r.json())
      .then((d: unknown) => {
        const o = d as Record<string, unknown>;
        if (
          o &&
          o.ok &&
          o.guestSmsVerificationEnabled &&
          o.guestIdentityProvider !== "official"
        ) {
          setSmsUi(true);
        } else {
          setSmsUi(false);
        }
      })
      .catch(() => setSmsUi(false));
  }, [setSmsUi]);

  function onOtpChange(idx: number, val: string) {
    const raw = String(val || "");
    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly.length > 1) {
      const next = [...digits];
      next[idx] = "";
      setDigits(next);
      fillOtpFromPasteString(digitsOnly, idx);
      return;
    }
    const v = digitsOnly.slice(0, 1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
    const code = next
      .map((x, i) => (i === idx ? v : x))
      .map((x) => String(x || "").replace(/\D/g, "").slice(0, 1))
      .join("");
    if (code.length === 6) tryAutoVerifyWithCode(code);
  }

  function onOtpKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function onGridPaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    let text = e.clipboardData?.getData("text/plain") || "";
    if (!text && typeof window !== "undefined" && (window as unknown as { clipboardData?: { getData: (s: string) => string } }).clipboardData) {
      try {
        text =
          (window as unknown as { clipboardData: { getData: (s: string) => string } }).clipboardData.getData("Text") || "";
      } catch {
        /* noop */
      }
    }
    const active = document.activeElement as HTMLInputElement | null;
    let startIdx = 0;
    if (active?.getAttribute("data-otp-index") != null) {
      startIdx = parseInt(active.getAttribute("data-otp-index") || "0", 10) || 0;
    }
    fillOtpFromPasteString(text, startIdx);
  }

  function onSendSms() {
    const ph = normalizePhone(phone);
    const n = name.trim();
    if (!validKrMobile(ph)) {
      window.alert("유효한 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setSendBusy(true);
    setStatusText("Solapi 문자 발송 중…");
    fetch("/api/guest-auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: ph, name: n }),
    })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        return { ok: r.ok, data };
      })
      .then((res) => {
        setSendBusy(false);
        if (!res.ok || !res.data.ok) {
          setStatusText("");
          window.alert(
            (typeof res.data.error === "string" && res.data.error) ||
              "인증 문자를 보내지 못했습니다.",
          );
          return;
        }
        setGuestCodeSent(true);
        setShowCodeWrap(true);
        clearOtp();
        setTimeout(() => focusOtpIndex(0), 0);
        setStatusText(
          "[PING 문자인증서비스] 문자의 6자리를 칸마다 입력하세요. (자동 확인)",
        );
      })
      .catch(() => {
        setSendBusy(false);
        setStatusText("");
        window.alert("서버에 연결할 수 없습니다.");
      });
  }

  return (
    <div
      className="ping-shell ob-entry-shell flex min-h-0 flex-1 flex-col"
      id="guest-app-shell"
    >
      <header className="ping-top-nav ping-top-nav--blend" role="banner">
        {showBulkProgress ? (
          <button
            type="button"
            id="guest-nav-back"
            className="ping-top-nav__back ping-back-btn touch-manipulation-guest"
            aria-label={bulkFlowBackAriaLabel(5)}
            onClick={() => navigateBulkFlowBack(5)}
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </button>
        ) : (
          <Link
            href={backHref}
            id="guest-nav-back"
            className="ping-top-nav__back ping-back-btn touch-manipulation-guest"
            aria-label="뒤로"
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </Link>
        )}
        <h1 className="ping-top-nav__title">{AUTH_GUEST_VERIFY_COPY.title}</h1>
      </header>

      {showBulkProgress ? <BulkFlowProgress currentStep={5} sticky /> : null}

      <main className="ping-main ping-main--tight-top flex-1 min-w-0 overflow-x-hidden">
        <div className="ping-stack ping-stack--relaxed min-w-0 max-w-full">
          <div id="guest-block-info" className="ping-bordered-panel ping-stack min-w-0 max-w-full gap-4 p-5">
            <div className="guest-verify-field min-w-0 max-w-full">
              <label htmlFor="guestName" className="ping-label">
                이름
              </label>
              <input
                id="guestName"
                autoComplete="name"
                placeholder="실명 입력"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field ping-field-standard w-full max-w-full min-w-0 touch-manipulation-guest"
              />
            </div>
            <div className="guest-verify-field min-w-0 max-w-full">
              <label htmlFor="guestPhone" className="ping-label">
                휴대폰 번호
              </label>
              <input
                id="guestPhone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field ping-field-standard w-full max-w-full min-w-0 touch-manipulation-guest"
              />
            </div>
          </div>

          <div
            id="guest-sms-verify-block"
            className={`ping-stack ${showCodeWrap ? "" : "ping-hidden"}`}
            style={{ gap: 12, paddingTop: 8 }}
          >
            <span className="ping-label" style={{ marginBottom: 0 }}>
              인증번호 6자리
            </span>
            <div
              id="guest-otp-grid"
              className="guest-otp-grid"
              role="group"
              aria-label="인증번호 한 자리씩 입력"
              tabIndex={-1}
              onPaste={onGridPaste}
            >
              {digits.map((d, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={idx === 0 ? "one-time-code" : "one-time-code"}
                  data-otp-index={idx}
                  disabled={!guestCodeSent}
                  className="guest-otp-digit touch-manipulation-guest"
                  aria-label={`인증번호 ${idx + 1}번째`}
                  value={d}
                  onChange={(e) => onOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(idx, e)}
                  onPaste={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const text = e.clipboardData?.getData("text/plain") || "";
                    fillOtpFromPasteString(text, idx);
                  }}
                />
              ))}
            </div>
            <p id="guest-sms-status" className="ping-input-hint" role="status">
              {statusText}
            </p>
          </div>
        </div>

        <div
          id="guest-actions-sms"
          className={showSmsBlock ? "" : "ping-hidden"}
          style={{ marginTop: 24 }}
        >
          <button
            type="button"
            id="guestSendSmsBtn"
            className="ping-btn-primary touch-manipulation-guest m-0"
            disabled={sendBusy}
            onClick={onSendSms}
          >
            본인확인
          </button>
        </div>

        {!smsMode ? (
          <button
            type="button"
            id="guestContinueBtn"
            className="ping-btn-primary touch-manipulation-guest mt-6 w-full"
            onClick={() => proceedAfterVerified()}
          >
            {continueLabel}
          </button>
        ) : null}
      </main>
    </div>
  );
}
