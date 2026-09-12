import { PING_MARKETING_USE_HREF } from "@/components/marketing-responsive/ping-marketing-nav-config";
import { pingTrack } from "@/lib/ping-analytics";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type PingSlashButtonProps = {
  href: string;
  label: string;
  variant?: "gradient" | "space" | "funex";
  /** 외부(콘솔) 링크 — `<a>` + 새 탭 */
  external?: boolean;
  className?: string;
  block?: boolean;
  onClick?: () => void;
};

/** funexcloud.com `slash-button` 마크업 */
export function PingSlashButton({
  href,
  label,
  variant = "gradient",
  external,
  className,
  block,
  onClick,
}: PingSlashButtonProps) {
  const variantClass =
    variant === "gradient"
      ? "slash-button--gradient"
      : variant === "funex"
        ? "slash-button--funex"
        : "slash-button--space";

  const cls = cn("slash-button", variantClass, block && "slash-button--block", className);

  const content = (
    <span className="slash-button__content">
      <span className="slash-button__label">{label}</span>
    </span>
  );

  if (external || /^https?:\/\//.test(href)) {
    return (
      <a
        href={href}
        className={cls}
        onClick={onClick}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} onClick={onClick}>
      {content}
    </Link>
  );
}

export function PingMarketingSlashCtaRow({
  className,
  stack,
  onNavigate,
}: {
  className?: string;
  stack?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("ping-mkt__slash-cta-row", stack && "ping-mkt__slash-cta-row--stack", className)}>
      <PingSlashButton
        href={PING_MARKETING_USE_HREF}
        label="부고 보내기"
        variant="gradient"
        block={stack}
        onClick={() => {
          pingTrack("start_click");
          onNavigate?.();
        }}
      />
    </div>
  );
}
