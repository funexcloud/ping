"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { INTRO_HEAD_PHRASES } from "@/content/seo/intro-content";
import { introStages } from "./intro-stages";
import { IntroWaveCanvas } from "./intro-wave-canvas";

const PHRASES = [...INTRO_HEAD_PHRASES];

const TYPING_MS = 42;
const DELETING_MS = 26;
const PAUSE_TYPED_MS = 2400;
const PAUSE_EMPTY_MS = 380;

const INTRO_RETURN_KEY = "ping_intro_return";

/** 인트로 직후 복귀 경로(같은 출처·경로만). 미설정 시 공식 홈 `/`. */
function consumeIntroReturnPath(): string {
  try {
    const raw = sessionStorage.getItem(INTRO_RETURN_KEY);
    sessionStorage.removeItem(INTRO_RETURN_KEY);
    if (!raw || typeof raw !== "string") return "/";
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    if (raw.includes("..")) return "/";
    return raw;
  } catch {
    return "/";
  }
}

const CLEAR_BULK_KEYS = [
  "ping_bulk_recipients",
  "ping_bulk_flags",
  "ping_bulk_identity_ok",
  "ping_from_index",
  "ping_send_channel",
  "ping_flow_route",
  "ping_flow_started",
  "ping_obituary_public_url",
  "ping_wizard_draft",
  "ping_pay_success_session",
  "ping_pay_success_recipients",
  "ping_checkout_session",
  "ping_toss_pending",
  "ping_compose_image_data",
];

function clearBulkFlowSessionForFreshMain(): void {
  try {
    for (const k of CLEAR_BULK_KEYS) {
      sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

function goMain(): void {
  try {
    sessionStorage.setItem("ping_intro_seen", "1");
  } catch {
    /* ignore */
  }
  clearBulkFlowSessionForFreshMain();
  const dest = new URL(consumeIntroReturnPath(), window.location.origin);
  try {
    const sp = new URLSearchParams(window.location.search);
    sp.delete("resumeBulk");
    sp.delete("autoPay");
    sp.delete("mergeBulk");
    const qs = sp.toString();
    if (qs) dest.search = qs;
  } catch {
    /* ignore */
  }
  try {
    dest.hash = window.location.hash || "";
  } catch {
    /* ignore */
  }
  window.location.href = dest.href;
}

function subscribePrefersReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getPrefersReducedMotionClient(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionClient,
    () => false,
  );
}

function useCxHeadTyping(
  reducedMotion: boolean,
): [string, string, boolean] {
  const [display, setDisplay] = useState("");
  const [a11y, setA11y] = useState("");
  const [showCaret, setShowCaret] = useState(true);

  const phraseIdxRef = useRef(0);
  const charIdxRef = useRef(0);
  const modeRef = useRef<"typing" | "pauseAfterTyped" | "deleting" | "pauseAfterEmpty">("typing");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(PHRASES[0]);
      setA11y(PHRASES[0]);
      setShowCaret(false);
      return;
    }

    function schedule(fn: () => void, ms: number): void {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fn, ms);
    }

    function tick(): void {
      const phrase = PHRASES[phraseIdxRef.current];
      const mode = modeRef.current;
      if (mode === "typing") {
        if (charIdxRef.current < phrase.length) {
          charIdxRef.current += 1;
          setDisplay(phrase.slice(0, charIdxRef.current));
          schedule(tick, TYPING_MS);
        } else {
          setA11y(phrase);
          modeRef.current = "pauseAfterTyped";
          schedule(tick, PAUSE_TYPED_MS);
        }
      } else if (mode === "pauseAfterTyped") {
        modeRef.current = "deleting";
        tick();
      } else if (mode === "deleting") {
        if (charIdxRef.current > 0) {
          charIdxRef.current -= 1;
          setDisplay(phrase.slice(0, charIdxRef.current));
          schedule(tick, DELETING_MS);
        } else {
          phraseIdxRef.current = (phraseIdxRef.current + 1) % PHRASES.length;
          modeRef.current = "pauseAfterEmpty";
          schedule(tick, PAUSE_EMPTY_MS);
        }
      } else if (mode === "pauseAfterEmpty") {
        modeRef.current = "typing";
        tick();
      }
    }

    tick();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reducedMotion]);

  return [display, a11y, showCaret];
}

export function IntroClient() {
  const reducedMotion = usePrefersReducedMotion();

  const [typeText, typeA11y, showCaret] = useCxHeadTyping(reducedMotion);

  const [cur, setCur] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoAdvance = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (reducedMotion) return;
    const ms =
      introStages[cur].advanceMs != null ? introStages[cur].advanceMs : 1650;
    timerRef.current = setTimeout(() => {
      setCur((c) => (c + 1) % introStages.length);
    }, ms);
  }, [cur, reducedMotion]);

  useEffect(() => {
    scheduleAutoAdvance();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleAutoAdvance]);

  const s = introStages[cur];

  const onCtaClick = (e: FormEvent): void => {
    e.preventDefault();
    goMain();
  };

  return (
    <>
      <IntroWaveCanvas />
      <div className="app-shell intro-app">
        <header className="cx-head">
          <p className="cx-head-title" id="cxHeadTitle">
            <span className="cx-head-type-text" aria-hidden="true">
              {typeText}
            </span>
            {showCaret ? (
              <span className="cx-head-caret" aria-hidden="true" />
            ) : null}
            <span className="cx-sr-only" aria-live="polite">
              {typeA11y}
            </span>
          </p>
        </header>

        <main className="cx-main">
          <div className="stage-top">
            <div className="stage-label" id="stageLabel">
              {s.label}
            </div>
            <div className="stage-num" id="stageNum">
              {cur + 1} / {introStages.length}
            </div>
          </div>

          <div className="step-dots" id="progressDots">
            {introStages.map((_, i) => (
              <div
                key={i}
                className={`dot${i < cur ? " done" : ""}${i === cur ? " on" : ""}`}
              />
            ))}
          </div>

          <div className="phone-wrap">
            <div className="phone">
              <div className="phone-bar">
                <button
                  type="button"
                  className="intro-brand-hit touch-manipulation"
                  onClick={goMain}
                  aria-label="메인 화면으로 이동"
                >
                  <span className="phone-logo">PING</span>
                </button>
                <div className="phone-menu" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div
                className="phone-body"
                id="phoneBody"
                dangerouslySetInnerHTML={{ __html: s.html }}
              />
            </div>
          </div>
          <div className="intro-hero-tagline">
            <button
              type="button"
              className="intro-hero-brand intro-hero-brand-btn touch-manipulation"
              onClick={goMain}
              aria-label="메인 화면으로 이동"
            >
              PING
            </button>
            <p className="intro-hero-sub">Where Hearts Connect.</p>
          </div>
        </main>

        <div className="cx-cta">
          <div className="cx-cta-inset">
            <div className="phone-wrap cx-cta-phone-wrap">
              <a
                href="/"
                className="touch-manipulation intro-cta-link"
                data-go-main
                aria-label="메인 화면으로 이동"
                onClick={onCtaClick}
              >
                시작하기
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
