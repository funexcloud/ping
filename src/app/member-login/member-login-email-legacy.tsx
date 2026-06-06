"use client";

/**
 * LEGACY — 이메일/비밀번호 회원 로그인 UI (카카오싱크 전환 전)
 * 삭제하지 않고 보존. 복구 시 member-login-client.tsx 에서 import 후 렌더링.
 */
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  parseMemberFetchJson,
  resolveMemberAuthApiUrl,
} from "@/lib/member-auth-client";
import {
  AUTH_MEMBER_LOGIN_COPY,
  AUTH_VERIFY_EMAIL_RESEND_HINT,
} from "@/lib/ping-flow-step-copy";
import { signupJoinTypeHref } from "@/lib/auth-signup-flow";
import {
  formatResendButtonLabel,
  useVerifyResendCooldown,
} from "@/lib/use-verify-resend-cooldown";

const MSG = {
  emptyFields: "아이디(이메일)와 비밀번호를 입력해 주세요.",
  network:
    "서버에 연결할 수 없습니다. 로컬에서는 npm run dev 로 서버를 실행해 주세요.",
  loginFail: "로그인에 실패했습니다.",
  resendNeedId: "로그인 ID(이메일)를 입력한 뒤 다시 시도해 주세요.",
  resendFail: "발송에 실패했습니다.",
  resendNetwork: "서버에 연결할 수 없습니다.",
};

export type MemberLoginEmailLegacyProps = {
  fullQuery: string;
  registered: boolean;
  emailVerified: boolean;
  initialMemberId?: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  formError: string | null;
  setFormError: (v: string | null) => void;
  showVerifyResend: boolean;
  setShowVerifyResend: (v: boolean) => void;
  phaseRef: React.MutableRefObject<"idle" | "submitting" | "success" | "error">;
  onLoginSuccess: (token: string, user: unknown) => void;
};

export function MemberLoginEmailLegacy({
  fullQuery,
  registered,
  emailVerified,
  initialMemberId = "",
  submitting,
  setSubmitting,
  formError,
  setFormError,
  showVerifyResend,
  setShowVerifyResend,
  phaseRef,
  onLoginSuccess,
}: MemberLoginEmailLegacyProps) {
  const [memberId, setMemberId] = useState(initialMemberId);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const { sec: resendCooldownSec, start: startResendCooldown, blocked: resendBlocked } =
    useVerifyResendCooldown();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (phaseRef.current === "submitting") return;

    setFormError(null);
    setShowVerifyResend(false);

    const id = memberId.trim();
    if (!id || !password) {
      setFormError(MSG.emptyFields);
      return;
    }

    phaseRef.current = "submitting";
    setSubmitting(true);

    try {
      const r = await fetch(resolveMemberAuthApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id, password }),
      });
      const { httpOk, data } = await parseMemberFetchJson(r);
      const ok = httpOk && data.ok === true;
      if (!ok) {
        phaseRef.current = "error";
        const errShown =
          (typeof data.error === "string" && data.error) ||
          (typeof data.message === "string" && data.message) ||
          (typeof data.details === "string" && data.details) ||
          MSG.loginFail;
        setFormError(errShown);
        if (data.code === "email_not_verified") setShowVerifyResend(true);
        setSubmitting(false);
        return;
      }
      phaseRef.current = "success";
      onLoginSuccess(String(data.token), data.user);
    } catch {
      phaseRef.current = "error";
      setFormError(MSG.network);
      setSubmitting(false);
    }
  }

  async function onResendVerification() {
    const email = memberId.trim();
    if (!email) {
      window.alert(MSG.resendNeedId);
      return;
    }
    if (resendBlocked) return;
    setResendBusy(true);
    try {
      const r = await fetch(
        resolveMemberAuthApiUrl("/api/auth/resend-verification"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      const { httpOk, data } = await parseMemberFetchJson(r);
      if (httpOk && data.ok === true) {
        const nextCd =
          typeof data.nextResendAfterSec === "number"
            ? data.nextResendAfterSec
            : 30;
        startResendCooldown(nextCd);
        window.alert(
          "인증 메일을 보냈습니다. 스팸함도 확인해 주세요. 새 6자리 코드가 적용됩니다.",
        );
      } else if (
        typeof data.retryAfterSec === "number" &&
        data.retryAfterSec > 0
      ) {
        startResendCooldown(data.retryAfterSec);
        window.alert(
          (typeof data.error === "string" && data.error) || MSG.resendFail,
        );
      } else {
        window.alert(
          (typeof data.error === "string" && data.error) || MSG.resendFail,
        );
      }
    } catch {
      window.alert(MSG.resendNetwork);
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <>
      <div
        className="member-login-panel ping-bordered-panel flex min-w-0 max-w-full flex-col gap-4 p-5"
        aria-labelledby="member-login-page-title"
      >
        <div id="member-login-lead" className="member-login-lead-block">
          <p className="member-login-lead-sub m-0">
            {AUTH_MEMBER_LOGIN_COPY.subtitle}
          </p>
        </div>

        {emailVerified ? (
          <p className="ping-callout--success m-0">
            이메일 인증이 완료되었습니다. 로그인해 주세요.
          </p>
        ) : registered ? (
          <p className="ping-callout--success m-0">
            회원가입이 완료되었습니다. 로그인해 주세요.
          </p>
        ) : null}

        <form
          id="memberLoginForm"
          className="ping-stack member-login-form min-w-0"
          onSubmit={onSubmit}
        >
          <div className="member-login-field min-w-0 max-w-full">
            <label htmlFor="memberId" className="ping-label">
              이메일
            </label>
            <input
              id="memberId"
              name="memberId"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="ping@funexcloud.com"
              className="input-field ping-field-standard w-full max-w-full min-w-0"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            />
          </div>
          <div className="member-login-field min-w-0 max-w-full">
            <label htmlFor="memberPw" className="ping-label">
              비밀번호
            </label>
            <div className="member-login-pw-wrap">
              <input
                id="memberPw"
                name="memberPw"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="비밀번호 입력"
                className="input-field ping-field-standard w-full max-w-full min-w-0"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="member-login-pw-toggle"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="member-login-actions min-w-0 max-w-full">
        <button
          id="member-login-submit"
          type="submit"
          form="memberLoginForm"
          className="ping-btn-primary member-login-submit touch-manipulation"
          disabled={submitting}
        >
          로그인
        </button>
        <Link
          href={signupJoinTypeHref(
            "email",
            fullQuery.startsWith("?")
              ? new URLSearchParams(fullQuery.slice(1)).get("next")
              : null,
          )}
          id="member-signup-cta"
          className="ping-btn-secondary block w-full text-center no-underline"
        >
          회원가입
        </Link>
      </div>

      {formError ? (
        <div id="formError" className="ping-alert--error" role="alert">
          {formError}
        </div>
      ) : null}

      {showVerifyResend ? (
        <div id="verify-resend-row" className="ping-callout--slack mt-4">
          <p className="m-0 mb-3">{AUTH_VERIFY_EMAIL_RESEND_HINT}</p>
          <Button
            type="button"
            id="verify-resend-btn"
            variant="primary"
            className="mt-0"
            disabled={resendBusy || resendBlocked}
            onClick={() => void onResendVerification()}
          >
            {formatResendButtonLabel(resendCooldownSec, resendBusy)}
          </Button>
        </div>
      ) : null}
    </>
  );
}
