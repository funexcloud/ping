import { MAGIC_SECTIONS } from "@/lib/intro/config";
import { HeroPhoneFan } from "@/components/intro/HeroPhoneFan";

/** 부고 발송 3단계 폰 목업 — 전환 카피와 같은 섹션 */
export function HeroPhoneStepsSection() {
  return (
    <div
      id={MAGIC_SECTIONS.experience.id}
      className="hero-phone-steps"
      aria-label="부고 발송 3단계"
    >
      <HeroPhoneFan />
    </div>
  );
}
