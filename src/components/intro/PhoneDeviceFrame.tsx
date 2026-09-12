"use client";

import type { ReactNode } from "react";
import { PhoneMockup } from "@/components/ping-mobile/phone-mockup";

type PhoneDeviceFrameProps = {
  children: ReactNode;
  className?: string;
  overlay?: ReactNode;
  stack?: "front" | "back";
};

/** Canonical generic smartphone shell (legacy export name). */
export function PhoneDeviceFrame({
  children,
  className,
  overlay,
  stack = "front",
}: PhoneDeviceFrameProps) {
  return (
    <PhoneMockup className={className} overlay={overlay} stack={stack}>
      {children}
    </PhoneMockup>
  );
}
