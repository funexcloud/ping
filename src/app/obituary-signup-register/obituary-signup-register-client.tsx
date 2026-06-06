"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import { goToRootPath, isMypageNextParam } from "@/lib/auth-redirect";
import {
  parseMemberFetchJson,
  resolveMemberAuthApiUrl,
} from "@/lib/member-auth-client";
import {
  getPasswordPolicyErrorClient,
  getPasswordPolicyHint,
  getPasswordStrength,
} from "@/lib/password-policy";
import {
  normalizeJoinType,
  normalizeSignupMethod,
  signupTermsHref,
} from "@/lib/auth-signup-flow";
import { AUTH_SIGNUP_REGISTER_COPY } from "@/lib/ping-flow-step-copy";
import { cn } from "@/lib/utils";

type JoinType = "general" | "group" | "admin";

function normalizeJoin(v: string | null): JoinType {
  return normalizeJoinType(v);
}

export default function ObituarySignupRegisterClient() {
  usePingCenteredLayout();
  const searchParams = useSearchParams();
  const router = useRouter();

  const method = normalizeSignupMethod(searchParams.get("method"));
  const nextParam = searchParams.get("next");

  const [joinType, setJoinType] = useState<JoinType>("general");
  useEffect(() => {
    setJoinType(normalizeJoin(searchParams.get("join")));
  }, [searchParams]);

  useEffect(() => {
    if (method !== "email") {
      if (method) {
        router.replace(signupTermsHref(method, joinType, nextParam));
      } else {
        router.replace("/login");
      }
    }
  }, [method, joinType, nextParam, router]);

  const backTermsHref = useMemo(() => {
    return signupTermsHref("email", joinType, nextParam);
  }, [joinType, nextParam]);

  const loginHref = useMemo(() => {
    const lp = new URLSearchParams(searchParams.toString());
    lp.set("from", "entry");
    lp.set("method", "email");
    return `/member-login?${lp.toString()}`;
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordPolicyHint = password ? getPasswordPolicyHint(password) : null;
  const passwordPolicyAlert =
    passwordPolicyHint?.kind === "error" ? passwordPolicyHint : null;

  const passwordAriaDescribedBy = [
    passwordStrength ? "password-strength" : null,
    passwordPolicyAlert ? "password-policy-hint" : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const [matchHint, setMatchHint] = useState({
    text: "",
    kind: "neutral" as "neutral" | "error" | "ok",
  });

  function refreshMatchHint(pw: string, pw2: string) {
    if (!pw2) {
      setMatchHint({ text: "", kind: "neutral" });
      return;
    }
    if (pw !== pw2) {
      setMatchHint({ text: "비밀번호가 일치하지 않습니다.", kind: "error" });
      return;
    }
    setMatchHint({ text: "비밀번호가 일치합니다.", kind: "ok" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const em = email.trim();
    const name = displayName.trim();
    const ph = phone.trim();
    const pwdErr = getPasswordPolicyErrorClient(password);
    if (pwdErr) {
      setFormError(pwdErr);
      return;
    }
    if (password !== password2) {
      setFormError("비밀번호가 서로 일치하지 않습니다.");
      refreshMatchHint(password, password2);
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(resolveMemberAuthApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: em,
          displayName: name,
          phone: ph,
          password,
          joinType,
        }),
      });
      const { httpOk, data } = await parseMemberFetchJson(r);
      const ok = httpOk && data.ok === true;
      if (!ok) {
        setFormError(
          (typeof data.error === "string" && data.error) || "가입에 실패했습니다.",
        );
        setSubmitting(false);
        return;
      }
      if (data.needsVerification === true) {
        if (data.emailSent === false) {
          const warn =
            (typeof data.warning === "string" && data.warning) ||
            "인증 메일을 보내지 못했습니다. Resend 발신 설정을 확인하거나, 인증 화면에서 「다시 보내기」를 이용해 주세요.";
          window.alert(warn);
        }
        const pendingEmail =
          (typeof data.email === "string" && data.email) || em;
        const qs = new URLSearchParams();
        qs.set("email", pendingEmail);
        qs.set("from", "signup");
        const cur = new URLSearchParams(searchParams.toString());
        if (cur.get("next")) qs.set("next", cur.get("next")!);
        if (cur.get("join")) qs.set("join", cur.get("join")!);
        if (data.emailSent === true && typeof data.nextResendAfterSec === "number") {
          try {
            sessionStorage.setItem(
              "ping_verify_resend_cd",
              String(data.nextResendAfterSec),
            );
          } catch {
            /* noop */
          }
        } else {
          try {
            sessionStorage.removeItem("ping_verify_resend_cd");
          } catch {
            /* noop */
          }
        }
        window.location.replace(`/obituary-verify-email?${qs.toString()}`);
        return;
      }
      sessionStorage.setItem("ping_auth_token", String(data.token));
      sessionStorage.setItem("ping_auth_user", JSON.stringify(data.user));
      const afterNext = searchParams.get("next");
      if (isMypageNextParam(afterNext)) {
        goToRootPath("/mypage/points");
        return;
      }
      window.location.href = "/obituary-create";
    } catch {
      setFormError(
        "서버에 연결할 수 없습니다. 로컬에서는 npm run dev 로 서버를 실행해 주세요.",
      );
      setSubmitting(false);
    }
  }

  if (method !== "email") return null;

  return (
    <div className="ping-shell ob-entry-shell flex min-h-0 flex-1 flex-col">
      <header className="ping-top-nav ping-top-nav--blend">
        <Link
          href={backTermsHref}
          className="ping-top-nav__back ping-back-btn"
          aria-label="뒤로"
        >
          <span className="ping-chevron-left" aria-hidden="true" />
        </Link>
        <h1
          id="signup-register-page-title"
          className="ping-top-nav__title"
        >
          회원가입
        </h1>
      </header>

      <main
        className="ping-main ping-main--tight-top flex-1 min-w-0"
        style={{ paddingTop: 12 }}
      >
        <div
          id="signup-form-block"
          className="signup-register-panel ping-bordered-panel flex min-w-0 max-w-full flex-col gap-4 p-5"
          aria-labelledby="signup-register-page-title"
        >
          <div
            id="signup-register-lead"
            className="signup-register-lead-block ping-step-head ping-step-head--lead"
          >
            <p className="signup-register-lead ping-step-head__title m-0">
              {AUTH_SIGNUP_REGISTER_COPY.leadTitle}
            </p>
            <p className="signup-register-lead-sub ping-step-head__sub m-0">
              {AUTH_SIGNUP_REGISTER_COPY.leadSubtitle}
            </p>
          </div>

          <form
            id="signupForm"
            className="ping-stack signup-register-form min-w-0"
            onSubmit={onSubmit}
          >
            <input type="hidden" name="joinType" value={joinType} readOnly />

            <div className="signup-register-field min-w-0 max-w-full">
              <label htmlFor="email" className="ping-label">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="ping@funexcloud.com"
                className="input-field ping-field-standard w-full max-w-full min-w-0"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="signup-register-field min-w-0 max-w-full">
              <label htmlFor="displayName" className="ping-label">
                이름
              </label>
              <input
                id="displayName"
                name="displayName"
                required
                autoComplete="name"
                placeholder="정 핑"
                className="input-field ping-field-standard w-full max-w-full min-w-0"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="signup-register-field min-w-0 max-w-full">
              <label htmlFor="phone" className="ping-label">
                휴대전화번호
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="010-0000-0000"
                className="input-field ping-field-standard w-full max-w-full min-w-0"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="signup-register-field min-w-0 max-w-full">
              <label htmlFor="password" className="ping-label">
                비밀번호
              </label>
              <div className="signup-register-pw-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="영문,숫자,기호로 만드세요"
                  aria-describedby={passwordAriaDescribedBy}
                  className="input-field ping-field-standard w-full max-w-full min-w-0"
                  value={password}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPassword(v);
                    refreshMatchHint(v, password2);
                  }}
                />
                <button
                  type="button"
                  className="signup-register-pw-toggle"
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
              {passwordStrength ? (
                <div
                  id="password-strength"
                  className="ping-pw-strength"
                  aria-live="polite"
                >
                  <div
                    className="ping-pw-strength__bars"
                    aria-hidden="true"
                  >
                    {([1, 2, 3, 4] as const).map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "ping-pw-strength__segment",
                          i <= passwordStrength.segments && "is-on",
                          i <= passwordStrength.segments &&
                            `is-${passwordStrength.level}`,
                        )}
                      />
                    ))}
                  </div>
                  <span
                    className={cn(
                      "ping-pw-strength__label",
                      `ping-pw-strength__label--${passwordStrength.level}`,
                    )}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              ) : null}
              {passwordPolicyAlert ? (
                <div
                  id="password-policy-hint"
                  role="alert"
                  className="ping-alert--error signup-register-inline-alert"
                >
                  {passwordPolicyAlert.text}
                </div>
              ) : null}
            </div>

            <div className="signup-register-field min-w-0 max-w-full">
              <label htmlFor="password2" className="ping-label">
                비밀번호 확인
              </label>
              <div className="signup-register-pw-wrap">
                <input
                  id="password2"
                  name="password2"
                  type={showPassword2 ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="비밀번호 재입력"
                  aria-describedby="password-match-hint"
                  className="input-field ping-field-standard w-full max-w-full min-w-0"
                  value={password2}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPassword2(v);
                    refreshMatchHint(password, v);
                  }}
                  onBlur={() => refreshMatchHint(password, password2)}
                />
                <button
                  type="button"
                  className="signup-register-pw-toggle"
                  aria-label={
                    showPassword2 ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"
                  }
                  aria-pressed={showPassword2}
                  onClick={() => setShowPassword2((v) => !v)}
                >
                  {showPassword2 ? (
                    <EyeOff className="size-5" aria-hidden />
                  ) : (
                    <Eye className="size-5" aria-hidden />
                  )}
                </button>
              </div>
              <p
                id="password-match-hint"
                className={`ping-input-hint ${matchHint.kind === "error" ? "is-error" : ""} ${matchHint.kind === "ok" ? "is-ok" : ""}`}
              >
                {matchHint.text}
              </p>
            </div>
          </form>
        </div>

        <div className="signup-register-actions min-w-0 max-w-full">
          <button
            type="submit"
            id="submitBtn"
            form="signupForm"
            className="ping-btn-primary signup-register-submit touch-manipulation"
            disabled={submitting}
          >
            가입 신청
          </button>
        </div>

        {formError ? (
          <div id="formError" className="ping-alert--error mt-4" role="alert">
            {formError}
          </div>
        ) : null}

        <p id="signup-login-hint" className="ping-foot mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href={loginHref} className="ping-link">
            로그인
          </Link>
        </p>
      </main>
    </div>
  );
}
