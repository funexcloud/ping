"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import {
  normalizeJoinType,
  normalizeSignupMethod,
  signupGuestVerifyHref,
  signupJoinTypeHref,
  signupRegisterHref,
} from "@/lib/auth-signup-flow";
import { AUTH_SIGNUP_TERMS_COPY } from "@/lib/ping-flow-step-copy";
import {
  SIGNUP_EMBED_PRIVACY_HTML,
  SIGNUP_EMBED_TERMS_HTML,
} from "@/lib/legal-article-html";
import { useKakaoMemberLogin } from "@/lib/use-kakao-member-login";
import { cn } from "@/lib/utils";

import "./terms-embed.css";

function LegalArticleStatic({ id, html }: { id: string; html: string }) {
  return (
    <div
      id={id}
      className={cn("ping-law-scroll mt-3 ping-doc-article-embed")}
      tabIndex={0}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function ObituarySignupTermsClient() {
  usePingCenteredLayout();
  const router = useRouter();
  const searchParams = useSearchParams();

  const method = normalizeSignupMethod(searchParams.get("method"));
  const joinType = normalizeJoinType(searchParams.get("join"));
  const nextParam = searchParams.get("next");

  const returnPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `/obituary-signup-terms?${q}` : "/obituary-signup-terms";
  }, [searchParams]);

  const backHref = useMemo(() => {
    if (!method) return "/login";
    return signupJoinTypeHref(method, nextParam);
  }, [method, nextParam]);

  const { formError, kakaoBusy, kakaoExchangeBusy, onKakaoLoginClick } =
    useKakaoMemberLogin({
      nextParam,
      returnPath,
      joinTypeParam: joinType,
    });

  const [agreeService, setAgreeService] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const agreeAll = agreeService && agreePrivacy;
  const canNext = agreeAll;

  useEffect(() => {
    document.title = AUTH_SIGNUP_TERMS_COPY.docTitle;
  }, []);

  useEffect(() => {
    if (!method) {
      router.replace("/login");
      return;
    }
    if (!searchParams.get("join")) {
      router.replace(signupJoinTypeHref(method, nextParam));
    }
  }, [method, nextParam, router, searchParams]);

  function toggleTerm(key: "service" | "privacy") {
    if (key === "service") setAgreeService((v) => !v);
    else setAgreePrivacy((v) => !v);
  }

  function toggleAgreeAll() {
    const next = !agreeAll;
    setAgreeService(next);
    setAgreePrivacy(next);
  }

  function onNext() {
    if (!canNext || !method) return;
    if (method === "email") {
      window.location.href = signupRegisterHref(joinType, nextParam);
      return;
    }
    if (method === "guest") {
      window.location.href = signupGuestVerifyHref(joinType, nextParam);
      return;
    }
    onKakaoLoginClick();
  }

  if (!method || kakaoExchangeBusy) {
    return (
      <div className="font-ping flex min-h-0 w-full flex-1 flex-col items-center justify-center bg-ping-bg">
        <PingLoadingSpinner
          label={kakaoExchangeBusy ? "카카오싱크 확인 중" : "이동 중"}
        />
      </div>
    );
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
        <h1 className="ping-top-nav__title">{AUTH_SIGNUP_TERMS_COPY.navTitle}</h1>
      </header>

      <main
        className="ping-main ping-main--tight-top ping-main--signup-terms-flow flex-1 min-w-0"
        style={{ paddingTop: 12 }}
      >
        <section
          className="ping-bordered-panel flex min-w-0 max-w-full flex-col gap-3 p-5"
          aria-labelledby="sec-terms"
        >
          <div className="signup-terms-section-head ping-step-head">
            <h2 id="sec-terms" className="ping-title-section ping-step-head__title m-0">
              {AUTH_SIGNUP_TERMS_COPY.terms.title}
            </h2>
            <p className="signup-terms-section-sub ping-step-head__sub m-0">
              {AUTH_SIGNUP_TERMS_COPY.terms.subtitle}
            </p>
          </div>

          <div className="ping-stack ping-stack--relaxed mb-5">
            <div className="ping-term-block" data-term="service">
              <button
                type="button"
                className="ping-term-toggle"
                aria-expanded
                aria-pressed={agreeService}
                aria-controls="law-service"
                id="toggle-service"
                onClick={() => toggleTerm("service")}
              >
                <span className="ping-term-label-text">
                  이용약관 동의{" "}
                  <span className="ping-term-req">(필수)</span>
                </span>
                <span
                  className="ping-term-check"
                  data-on={agreeService ? "true" : "false"}
                  aria-hidden="true"
                >
                  <span className="ping-term-check-mark">✓</span>
                </span>
              </button>
              <LegalArticleStatic id="law-service" html={SIGNUP_EMBED_TERMS_HTML} />
            </div>

            <div className="ping-term-block" data-term="privacy">
              <button
                type="button"
                className="ping-term-toggle"
                aria-expanded
                aria-pressed={agreePrivacy}
                aria-controls="law-privacy"
                id="toggle-privacy"
                onClick={() => toggleTerm("privacy")}
              >
                <span className="ping-term-label-text">
                  개인정보 수집 및 이용 동의{" "}
                  <span className="ping-term-req">(필수)</span>
                </span>
                <span
                  className="ping-term-check"
                  data-on={agreePrivacy ? "true" : "false"}
                  aria-hidden="true"
                >
                  <span className="ping-term-check-mark">✓</span>
                </span>
              </button>
              <LegalArticleStatic
                id="law-privacy"
                html={SIGNUP_EMBED_PRIVACY_HTML}
              />
            </div>
          </div>

          <div className="ping-signup-terms-actions">
            <button
              type="button"
              id="agreeAllBtn"
              className="ping-agree-all-toggle"
              aria-pressed={agreeAll}
              onClick={toggleAgreeAll}
            >
              <span className="ping-term-label-text">모두 동의합니다</span>
              <span
                className="ping-term-check"
                data-on={agreeAll ? "true" : "false"}
                aria-hidden="true"
              >
                <span className="ping-term-check-mark">✓</span>
              </span>
            </button>
            <button
              type="button"
              id="nextBtn"
              className="ob-flow-btn-primary index-flow-cta-primary w-full min-h-[52px] touch-manipulation"
              disabled={!canNext || (method === "kakao" && kakaoBusy)}
              onClick={onNext}
            >
              {method === "kakao" ? "카카오싱크로 계속" : "다음"}
            </button>
          </div>
        </section>

        {formError ? (
          <div id="formError" className="ping-alert--error mx-5 mt-3" role="alert">
            {formError}
          </div>
        ) : null}
      </main>
    </div>
  );
}
