import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LandingMagicSectionProps = {
  id: string;
  label?: string;
  title?: string;
  titleBreakAfter?: string;
  description?: string;
  tone?: "default" | "soft" | "white";
  hideHead?: boolean;
  className?: string;
  children: ReactNode;
};

export function LandingMagicSectionHead({
  label,
  title,
  titleBreakAfter,
  description,
  titleId,
  className,
}: {
  label?: string;
  title?: string;
  titleBreakAfter?: string;
  description?: string;
  titleId?: string;
  className?: string;
}) {
  if (!label && !title && !description) return null;

  return (
    <header className={cn("landing-magic-section__head ping-saas-section-head", className)}>
      {label ? <p className="ping-saas-label">{label}</p> : null}
      {title ? (
        <LandingDisplayTitle
          id={titleId}
          className="landing-magic-section__title"
          title={title}
          breakAfter={titleBreakAfter}
        />
      ) : null}
      {description ? <p className="ping-saas-section-desc">{description}</p> : null}
    </header>
  );
}

/** Magic UI mobile — 라벨·제목·본문 블록 섹션 */
export function LandingMagicSection({
  id,
  label,
  title,
  titleBreakAfter,
  description,
  tone = "white",
  hideHead = false,
  className,
  children,
}: LandingMagicSectionProps) {
  const titleId = title ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      className={cn(
        "landing-magic-section ping-landing-motion__section",
        tone === "soft" && "landing-magic-section--soft",
        tone === "default" && "landing-magic-section--default",
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="ping-saas-shell">
        {!hideHead ? (
          <LandingMagicSectionHead
            label={label}
            title={title}
            titleBreakAfter={titleBreakAfter}
            description={description}
            titleId={titleId}
          />
        ) : null}
        <div className="landing-magic-section__body">{children}</div>
      </div>
    </section>
  );
}
