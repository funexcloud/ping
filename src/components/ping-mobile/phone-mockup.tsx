"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./phone-mockup.css";

type PhoneMockupProps = {
  children: ReactNode;
  className?: string;
  overlay?: ReactNode;
  stack?: "front" | "back";
  compact?: boolean;
  showStatusBar?: boolean;
  /** Extra class on the scaled inner viewport */
  viewportClassName?: string;
  /** Drop the device bezel on narrow viewports (avoid phone-in-phone). */
  fillViewportOnNarrow?: boolean;
};

/**
 * Visual shell only. Generic smartphone — not a manufacturer device.
 */
export function PhoneMockup({
  children,
  className,
  overlay,
  stack = "front",
  compact = false,
  showStatusBar = true,
  viewportClassName,
  fillViewportOnNarrow = false,
}: PhoneMockupProps) {
  return (
    <div
      className={cn(
        "ping-phone-frame ping-phone-mockup",
        compact && "ping-phone-mockup--compact",
        fillViewportOnNarrow && "ping-phone-mockup--fill-narrow",
        stack === "back" && "ping-phone-frame--back",
        className,
      )}
    >
      <div className="ping-phone-mockup__screen">
        {showStatusBar ? (
          <div className="ping-phone-mockup__status" aria-hidden="true">
            <span>9:41</span>
            <span className="ping-phone-mockup__status-meta">LTE  100%</span>
          </div>
        ) : null}
        <div className="ping-phone-frame__viewport">
          <div className="ping-phone-frame__fit">
            <div className={cn("ping-phone-frame__scale-inner", viewportClassName)}>
              {children}
            </div>
          </div>
          {overlay ? <div className="ping-phone-frame__overlay">{overlay}</div> : null}
        </div>
      </div>
    </div>
  );
}
