import {
  PING_BRAND_NAME,
  PING_LOGO_CANONICAL_SRC,
  PING_LOGO_HORIZONTAL_SRC,
} from "@/lib/ping-brand";
import { cn } from "@/lib/utils";

import "./ping-brand-logo.css";

type PingBrandLogoProps = {
  variant?: "horizontal" | "icon" | "mark";
  alt?: string;
  className?: string;
};

/**
 * Brand-kit lockups.
 * Header uses the horizontal PNG. App icon / mark use the square master.
 */
export function PingBrandLogo({
  variant = "horizontal",
  alt = PING_BRAND_NAME,
  className,
}: PingBrandLogoProps) {
  if (variant === "icon" || variant === "mark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={PING_LOGO_CANONICAL_SRC}
        alt={variant === "icon" ? alt : ""}
        width={512}
        height={512}
        className={cn(
          "ping-brand-logo",
          variant === "icon" ? "ping-brand-logo--icon" : "ping-brand-logo--mark",
          className,
        )}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={PING_LOGO_HORIZONTAL_SRC}
      alt={alt}
      width={640}
      height={360}
      className={cn("ping-brand-logo ping-brand-logo--horizontal", className)}
    />
  );
}
