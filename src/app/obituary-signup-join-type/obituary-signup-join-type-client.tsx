"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { usePingCenteredLayout } from "@/hooks/use-ping-centered-layout";
import {
  normalizeJoinType,
  normalizeSignupMethod,
  signupTermsHref,
  type JoinType,
} from "@/lib/auth-signup-flow";
import {
  AUTH_SIGNUP_JOIN_TYPE_COPY,
  AUTH_SIGNUP_JOIN_TYPE_LABELS,
} from "@/lib/ping-flow-step-copy";

export default function ObituarySignupJoinTypeClient() {
  usePingCenteredLayout();
  const router = useRouter();
  const searchParams = useSearchParams();

  const method = normalizeSignupMethod(searchParams.get("method"));
  const nextParam = searchParams.get("next");

  const backHref = useMemo(() => {
    const p = new URLSearchParams();
    if (nextParam) p.set("next", nextParam);
    const q = p.toString();
    return q ? `/login?${q}` : "/login";
  }, [nextParam]);

  const initialJoin = normalizeJoinType(searchParams.get("join"));
  const [joinType, setJoinType] = useState<JoinType>(initialJoin);

  useEffect(() => {
    if (!method) {
      router.replace(backHref);
    }
  }, [method, backHref, router]);

  useEffect(() => {
    document.title = AUTH_SIGNUP_JOIN_TYPE_COPY.docTitle;
  }, []);

  useEffect(() => {
    setJoinType(normalizeJoinType(searchParams.get("join")));
  }, [searchParams]);

  if (!method) return null;

  function onNext() {
    window.location.href = signupTermsHref(method!, joinType, nextParam);
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
        <h1 className="ping-top-nav__title">{AUTH_SIGNUP_JOIN_TYPE_COPY.navTitle}</h1>
      </header>

      <main
        className="ping-main ping-main--tight-top ping-main--signup-terms-flow flex-1 min-w-0"
        style={{ paddingTop: 12 }}
      >
        <section
          className="ping-bordered-panel flex min-w-0 max-w-full flex-col gap-3 p-5"
          aria-labelledby="sec-join-type"
        >
          <div className="signup-terms-section-head ping-step-head m-0">
            <h2 id="sec-join-type" className="ping-title-section ping-step-head__title m-0">
              {AUTH_SIGNUP_JOIN_TYPE_COPY.title}
            </h2>
            <p className="signup-terms-section-sub ping-step-head__sub m-0">
              {AUTH_SIGNUP_JOIN_TYPE_COPY.subtitle}
            </p>
          </div>
          <div className="ping-stack" role="radiogroup" aria-label="가입 유형">
            <label className="ping-join-option">
              <input
                type="radio"
                name="joinType"
                className="ping-join-radio"
                checked={joinType === "general"}
                onChange={() => setJoinType("general")}
              />
              <span className="ping-join-option-body">
                <span className="ping-join-option-title">
                  {AUTH_SIGNUP_JOIN_TYPE_LABELS.general}
                </span>
              </span>
            </label>
            <label className="ping-join-option">
              <input
                type="radio"
                name="joinType"
                className="ping-join-radio"
                checked={joinType === "group"}
                onChange={() => setJoinType("group")}
              />
              <span className="ping-join-option-body">
                <span className="ping-join-option-title">
                  {AUTH_SIGNUP_JOIN_TYPE_LABELS.group}
                </span>
              </span>
            </label>
            <label className="ping-join-option">
              <input
                type="radio"
                name="joinType"
                className="ping-join-radio"
                checked={joinType === "admin"}
                onChange={() => setJoinType("admin")}
              />
              <span className="ping-join-option-body">
                <span className="ping-join-option-title">
                  {AUTH_SIGNUP_JOIN_TYPE_LABELS.admin}
                </span>
              </span>
            </label>
          </div>
          <button
            type="button"
            className="ob-flow-btn-primary index-flow-cta-primary w-full min-h-[52px] touch-manipulation mt-1"
            onClick={onNext}
          >
            다음
          </button>
        </section>
      </main>
    </div>
  );
}
