"use client";

import { cn } from "@/lib/utils";
import "./ping-loading-spinner.css";

type PingLoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
  /** 스크린 리더용 (화면에는 스피너만 표시) */
  label?: string;
};

const SIZE_PX = { sm: 24, md: 40, lg: 52 } as const;

export function PingLoadingSpinner({
  size = "md",
  variant = "light",
  className,
  label = "로딩 중",
}: PingLoadingSpinnerProps) {
  const px = SIZE_PX[size];

  return (
    <div
      className={cn("ping-loading-spinner", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-size={size}
      data-variant={variant}
    >
      <svg
        className="ping-loading-spinner__svg"
        width={px}
        height={px}
        viewBox="0 0 50 50"
        aria-hidden
      >
        <circle
          className="ping-loading-spinner__track"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
        />
        <circle
          className="ping-loading-spinner__arc"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="72 125"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
