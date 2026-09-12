import Link from "next/link";
import type { ReactNode } from "react";

export function ResponsiveHeroBanner({
  className = "",
  sectionId,
  title,
  titleLine2,
  description,
  primaryButtonText,
  primaryButtonHref = "/start",
  primaryButton,
  trustItems = [],
}: {
  className?: string;
  sectionId?: string | null;
  backgroundImageUrl?: string;
  title: string;
  titleLine2?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  primaryButton?: ReactNode;
  trustItems?: string[];
}) {
  return (
    <section id={sectionId || undefined} className={`rounded-[32px] bg-slate-950 p-6 text-white ${className}`}>
      <h2 className="text-3xl font-extrabold tracking-[-0.05em]">
        {title}
        {titleLine2 ? <><br />{titleLine2}</> : null}
      </h2>
      {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{description}</p> : null}
      <div className="mt-5">
        {primaryButton || (
          <Link className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 no-underline" href={primaryButtonHref}>
            {primaryButtonText || "시작하기"}
          </Link>
        )}
      </div>
      {trustItems.length ? (
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
          {trustItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </section>
  );
}
