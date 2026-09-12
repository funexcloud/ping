"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { pingTrack } from "@/lib/ping-analytics";

export function LandingStartLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        pingTrack("start_click");
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
