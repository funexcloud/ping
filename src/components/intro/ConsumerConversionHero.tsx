"use client";

import { useEffect } from "react";

import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import { HeroPhoneFan } from "@/components/intro/HeroPhoneFan";
import { LandingStartLink } from "@/components/landing/landing-start-link";
import {
  LANDING_HOW_HREF,
  LANDING_START_CTA_LABEL,
  LANDING_START_HREF,
} from "@/content/landing/landing-config";
import { HERO } from "@/lib/intro/config";
import { pingTrack } from "@/lib/ping-analytics";

export function ConsumerConversionHero() {
  useEffect(() => {
    pingTrack("landing_view");
  }, []);

  return (
    <section
      id="hero"
      className="ping-saas-hero px-5 pb-12 pt-8 md:px-10 md:pb-16 md:pt-12"
      aria-labelledby="ping-conversion-hero-title"
    >
      <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-16">
        <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
          <div className="hidden lg:block">
            <PingBrandLogo variant="horizontal" />
          </div>
          <p className="mt-2 m-0 text-sm font-semibold tracking-[-0.02em] text-[#0056F3] lg:mt-6">
            {HERO.hook}
          </p>
          <h1
            id="ping-conversion-hero-title"
            className="mt-2 m-0 max-w-[22rem] break-keep text-[1.75rem] font-extrabold leading-[1.28] tracking-[-0.04em] text-[#0b1b33] sm:max-w-none sm:text-[2.15rem] lg:text-[2.5rem]"
          >
            {HERO.h1[0]}
            <br />
            {HERO.h1[1]}
          </h1>
          <p className="mt-4 m-0 max-w-[36rem] text-[15px] leading-7 text-[#6b7684]">{HERO.sub}</p>
          <div className="mt-7 flex w-full max-w-[22rem] flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center lg:justify-start">
            <LandingStartLink
              href={LANDING_START_HREF}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0056F3] px-6 text-[15px] font-bold text-white no-underline shadow-[0_8px_20px_rgba(0,86,243,0.28)]"
            >
              {LANDING_START_CTA_LABEL}
            </LandingStartLink>
            <a
              href={LANDING_HOW_HREF}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d7e3f4] bg-white px-6 text-[15px] font-bold text-[#191f28] no-underline"
            >
              사용 방법 보기
            </a>
          </div>
        </div>
        <div className="min-w-0 ping-conversion-preview">
          <HeroPhoneFan />
        </div>
      </div>
    </section>
  );
}
