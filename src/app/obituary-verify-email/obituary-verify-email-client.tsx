"use client";

import { CircleCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import {
  parseMemberFetchJson,
  resolveMemberAuthApiUrl,
} from "@/lib/member-auth-client";
import {
  AUTH_VERIFY_EMAIL_COPY,
  AUTH_VERIFY_EMAIL_RESEND_HINT,
} from "@/lib/ping-flow-step-copy";
import {
  formatResendButtonLabel,
  useVerifyResendCooldown,
} from "@/lib/use-verify-resend-cooldown";
import "./verify-email.css";

const EMPTY_OTP = ["", "", "", "", "", ""];
const VERIFY_SUCCESS_NAV_MS = 900;

type SubmitPhase = "idle" | "loading" | "verified";

export default function ObituaryVerifyEmailClient() {
  usePingCenteredLayout();
  const router = useRouter();
  const searchParams = useSearchParams();

  const legacyToken = (searchParams.get("token") || "").trim();
  const isLegacyHex = legacyToken.length >= 64 && /^[a-fA-F0-9]+$/.test(legacyToken);
  const fromSignup = searchParams.get("from") === "signup";

  const [legacyStatus, setLegacyStatus] = useState(
    isLegacyHex ? "이전 형식 인증 링크를 처리하는 중입니다…" : "",
  );
  const [formVisible, setFormVisible] = useState(!isLegacyHex);
  const [showActions, setShowActions] = useState(false);

  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(EMPTY_OTP);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [resendBusy, setResendBusy] = useState(false);
  const { sec: resendCooldownSec, start: startResendCooldown, blocked: resendBlocked } =
    useVerifyResendCooldown();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const loginMemberHref = useMemo(() => {
    const lp = new URLSearchParams(searchParams.toString());
    lp.set("from", "entry");
    return `/member-login?${lp.toString()}`;
  }, [searchParams]);

  const backHref = useMemo(() => {
    if (fromSignup) {
      const q = searchParams.toString();
      return q ? `/obituary-signup-register?${q}` : "/obituary-signup-register";
    }
    return loginMemberHref;
  }, [fromSignup, loginMemberHref, searchParams]);

  const signupRegisterHref = "/obituary-signup-register";

  const postVerifyHref = useMemo(() => {
    const lp = new URLSearchParams(searchParams.toString());
    lp.delete("from");
    lp.set("from", "entry");
    lp.set("verified", "1");
    lp.set("method", "email");
    const q = lp.toString();
    return q ? `/member-login?${q}` : "/member-login?from=entry&verified=1&method=email";
  }, [searchParams]);

  const verifyLeadSubtitle =
    fromSignup
      ? AUTH_VERIFY_EMAIL_COPY.fromSignup
      : AUTH_VERIFY_EMAIL_COPY.default;

  /** 가입 직후 URL에 email이 있으면 입력 필드 없이 표시만 (코드는 해당 주소로 발송됨) */
  const emailLocked = useMemo(() => {
    const qp = (searchParams.get("email") || "").trim();
    return qp.length > 0;
  }, [searchParams]);

  useEffect(() => {
    const qp = (searchParams.get("email") || "").trim();
    if (!qp) return;
    try {
      setEmail(decodeURIComponent(qp));
    } catch {
      setEmail(qp);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ping_verify_resend_cd");
      if (!raw) return;
      sessionStorage.removeItem("ping_verify_resend_cd");
      startResendCooldown(Number(raw));
    } catch {
      /* noop */
    }
  }, [startResendCooldown]);

  const cleanUrlInHistory = useCallback(() => {
    try {
      window.history.replaceState(null, "", "/obituary-verify-email");
    } catch {
      /* noop */
    }
  }, []);

  const getOtpString = () =>
    digits.map((d) => String(d || "").replace(/\D/g, "").slice(0, 1)).join("");

  const fillOtpFromDigits = (rawIn: string) => {
    const raw = String(rawIn || "").replace(/\D/g, "").slice(0, 6);
    const next = [...EMPTY_OTP];
    for (let i = 0; i < 6; i++) {
      next[i] = raw.charAt(i) || "";
    }
    setDigits(next);
    const focusIdx = Math.min(raw.length, 5);
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 0);
  };

  const clearOtp = () => setDigits([...EMPTY_OTP]);

  useEffect(() => {
    if (!isLegacyHex) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(resolveMemberAuthApiUrl("/api/auth/verify-email"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: legacyToken }),
        });
        const { httpOk, data } = await parseMemberFetchJson(r);
        if (cancelled) return;
        if (httpOk && data.ok === true) {
          setLegacyStatus("이메일 인증이 완료되었습니다. 로그인해 주세요.");
          setShowActions(true);
          cleanUrlInHistory();
          return;
        }
        const errMsg =
          (typeof data.error === "string" && data.error) || "인증에 실패했습니다.";
        setLegacyStatus(
          `${errMsg} 새 코드가 필요하면 아래에서 받으신 번호를 입력하거나 「인증 메일 다시 보내기」를 이용해 주세요.`,
        );
        setFormVisible(true);
        setShowActions(true);
      } catch {
        if (cancelled) return;
        setLegacyStatus("서버에 연결할 수 없습니다.");
        setFormVisible(true);
        setShowActions(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLegacyHex, legacyToken, cleanUrlInHistory]);

  useEffect(() => {
    if (isLegacyHex || !formVisible) return;
    const t = window.setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 180);
    return () => window.clearTimeout(t);
  }, [isLegacyHex, formVisible, email]);

  function onOtpInput(idx: number, val: string) {
    const raw = String(val || "").replace(/\D/g, "");
    if (raw.length > 1) {
      fillOtpFromDigits(raw);
      return;
    }
    const next = [...digits];
    next[idx] = raw;
    setDigits(next);
    if (raw && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function onOtpKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      e.preventDefault();
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function onOtpPaste(e: ClipboardEvent<HTMLDivElement>) {
    const t = e.clipboardData?.getData("text") || "";
    if (!t) return;
    e.preventDefault();
    fillOtpFromDigits(t);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInlineError(null);
    const code = getOtpString();
    const em = email.trim();
    if (code.length !== 6 || !em) {
      setInlineError("6자리 인증번호를 확인해 주세요.");
      return;
    }
    setSubmitPhase("loading");
    try {
      const r = await fetch(resolveMemberAuthApiUrl("/api/auth/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, code }),
      });
      const { httpOk, data } = await parseMemberFetchJson(r);
      if (httpOk && data.ok === true) {
        setSubmitPhase("verified");
        setInlineError(null);
        cleanUrlInHistory();
        window.setTimeout(() => {
          router.replace(postVerifyHref);
        }, VERIFY_SUCCESS_NAV_MS);
        return;
      }
      setSubmitPhase("idle");
      setInlineError(
        (typeof data.error === "string" && data.error) || "인증에 실패했습니다.",
      );
    } catch {
      setSubmitPhase("idle");
      setInlineError("서버에 연결할 수 없습니다.");
    }
  }

  async function onResend() {
    const em = email.trim();
    if (!em) {
      setInlineError("이메일 정보가 없습니다. 회원가입 화면에서 다시 시도해 주세요.");
      return;
    }
    if (resendBlocked) return;
    setInlineError(null);
    setResendBusy(true);
    try {
      const r = await fetch(
        resolveMemberAuthApiUrl("/api/auth/resend-verification"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: em }),
        },
      );
      const { httpOk, data } = await parseMemberFetchJson(r);
      setResendBusy(false);
      if (httpOk && data.ok === true) {
        clearOtp();
        inputRefs.current[0]?.focus();
        const nextCd =
          typeof data.nextResendAfterSec === "number"
            ? data.nextResendAfterSec
            : 30;
        startResendCooldown(nextCd);
        setInlineError(null);
        return;
      }
      if (typeof data.retryAfterSec === "number" && data.retryAfterSec > 0) {
        startResendCooldown(data.retryAfterSec);
        setInlineError(
          (typeof data.error === "string" && data.error) ||
            "잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      setInlineError(
        (typeof data.error === "string" && data.error) ||
          "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } catch {
      setResendBusy(false);
      setInlineError("서버에 연결할 수 없습니다.");
    }
  }

  return (
    <div className="ping-shell ob-entry-shell flex min-h-0 flex-1 flex-col">
      <header className="ping-top-nav ping-top-nav--blend">
        <Link
          href={backHref}
          className="ping-top-nav__back ping-back-btn"
          aria-label="뒤로"
        >
          <span className="ping-chevron-left" aria-hidden="true" />
        </Link>
        <h1 className="ping-top-nav__title">{AUTH_VERIFY_EMAIL_COPY.navTitle}</h1>
      </header>

      <main
        className="ping-main ping-main--tight-top flex-1 min-w-0"
        style={{ paddingTop: 12 }}
      >
        {isLegacyHex ? (
          <div
            id="verify-legacy"
            className="verify-email-panel ping-bordered-panel min-w-0 max-w-full p-5"
          >
            <p id="verify-legacy-status" className="verify-email-lead-sub m-0 text-center">
              {legacyStatus}
            </p>
          </div>
        ) : null}

        {formVisible ? (
          <>
            <form
              id="verify-code-form"
              className={`verify-email-panel ping-bordered-panel flex min-w-0 max-w-full flex-col gap-4 p-5${submitPhase !== "idle" ? " verify-email-panel--locked" : ""}`}
              onSubmit={onSubmit}
              aria-busy={submitPhase === "loading"}
            >
              <div className="verify-email-lead-block">
                <p className="verify-email-lead m-0">이메일 인증</p>
                <p id="verify-code-lead" className="verify-email-lead-sub m-0">
                  {verifyLeadSubtitle}
                </p>
              </div>

              {emailLocked ? (
                <p className="verify-email-target m-0" aria-live="polite">
                  <span className="verify-email-target-label">인증 메일</span>
                  {email}
                </p>
              ) : (
                <div className="verify-email-field min-w-0 max-w-full">
                  <label htmlFor="verify-email-input" className="ping-label">
                    이메일 주소
                  </label>
                  <input
                    id="verify-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    maxLength={320}
                    placeholder="ping@funexcloud.com"
                    className="input-field ping-field-standard w-full max-w-full min-w-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}

              <div className="verify-otp-field min-w-0 max-w-full">
                <span className="verify-otp-label" id="verify-otp-label">
                  인증 코드 (6자리)
                </span>
                <div
                  className="verify-otp-row"
                  id="verify-otp-row"
                  role="group"
                  aria-labelledby="verify-otp-label"
                  onPaste={onOtpPaste}
                >
                  {digits.map((d, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      id={`verify-otp-${idx}`}
                      type="text"
                      className="verify-otp-digit"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoComplete={idx === 0 ? "one-time-code" : "off"}
                      aria-label={`인증번호 ${idx + 1}번째 숫자`}
                      value={d}
                      disabled={submitPhase !== "idle"}
                      onChange={(e) => onOtpInput(idx, e.target.value)}
                      onKeyDown={(e) => onOtpKeyDown(idx, e)}
                    />
                  ))}
                </div>
              </div>
            </form>

            <div className="verify-email-actions min-w-0 max-w-full">
              <button
                type="submit"
                form="verify-code-form"
                id="verify-submit-btn"
                className={`ping-btn-primary verify-submit-btn touch-manipulation${submitPhase === "verified" ? " verify-submit-btn--verified" : ""}`}
                disabled={submitPhase !== "idle"}
                aria-live="polite"
              >
                {submitPhase === "loading" ? (
                  <>
                    <Loader2
                      className="verify-submit-btn__icon verify-submit-btn__icon--spin"
                      aria-hidden
                    />
                    <span>인증 중…</span>
                  </>
                ) : submitPhase === "verified" ? (
                  <>
                    <CircleCheck
                      className="verify-submit-btn__icon verify-submit-btn__icon--check"
                      aria-hidden
                    />
                    <span>인증완료</span>
                  </>
                ) : (
                  <span>인증 완료</span>
                )}
              </button>
              <button
                type="button"
                id="verify-resend-btn"
                className="ping-btn-secondary touch-manipulation"
                disabled={
                  resendBusy || resendBlocked || submitPhase !== "idle"
                }
                onClick={() => void onResend()}
              >
                {formatResendButtonLabel(resendCooldownSec, resendBusy)}
              </button>
              <p className="verify-email-resend-hint m-0 text-center">
                {AUTH_VERIFY_EMAIL_RESEND_HINT}
              </p>
            </div>
          </>
        ) : null}

        {showActions ? (
          <div className="verify-email-actions min-w-0 max-w-full" id="verify-actions">
            <Link
              href={loginMemberHref}
              className="ping-btn-primary text-center no-underline"
            >
              로그인
            </Link>
            <Link
              href={signupRegisterHref}
              className="ping-btn-secondary text-center no-underline"
            >
              회원가입 화면
            </Link>
          </div>
        ) : null}

        {inlineError ? (
          <p
            id="verify-inline-error"
            className="ping-alert--error mt-4"
            role="alert"
          >
            {inlineError}
          </p>
        ) : null}
      </main>
    </div>
  );
}
