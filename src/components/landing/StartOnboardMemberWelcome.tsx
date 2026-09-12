import { LandingStartLink } from "@/components/landing/landing-start-link";
import { LANDING_START_CTA_LABEL, LANDING_START_HREF } from "@/content/landing/landing-config";

export function StartOnboardMemberWelcome() {
  return (
    <section className="rounded-[28px] bg-[#0336ff] p-6 text-white">
      <p className="m-0 text-sm font-semibold text-white/80">시작하기</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
        연락처를 가져와 중요한 소식을 한 번에 전하세요
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/80">
        부고를 준비하고, 주소록에서 보낼 사람을 고른 뒤 발송 결과까지 확인할 수 있습니다.
      </p>
      <LandingStartLink
        className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0336ff] no-underline"
        href={LANDING_START_HREF}
      >
        {LANDING_START_CTA_LABEL}
      </LandingStartLink>
    </section>
  );
}
