import { cn } from "@/lib/utils";

type Props = {
  title: string;
  lead: string;
  bullets?: string[];
  className?: string;
  /** true면 시각적으로 숨기고 크롤러·스크린리더용 본문만 제공 */
  visuallyHidden?: boolean;
};

/**
 * Client 하이드레이션 전에도 서버 HTML에 실제 문장이 포함되도록 하는 요약 블록 (SEO·GEO).
 */
export function SeoPageSummary({ title, lead, bullets, className, visuallyHidden }: Props) {
  return (
    <section
      className={cn(
        visuallyHidden && "sr-only",
        !visuallyHidden &&
          "border-b border-ping-border bg-ping-bg-secondary px-5 py-6 text-ping-body",
        className,
      )}
      aria-label="서비스 요약"
    >
      <h1 className="mb-2 text-lg font-bold text-ping-heading">{title}</h1>
      <p className="text-sm leading-relaxed text-ping-caption">{lead}</p>
      {bullets && bullets.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ping-caption">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
