"use client";

import { useEffect } from "react";

/** `ping-ui` 전역 — `body.ping-layout-centered` (기준: member-login 등) */
export function usePingCenteredLayout() {
  useEffect(() => {
    document.body.classList.add("ping-layout-centered");
    return () => {
      document.body.classList.remove("ping-layout-centered");
    };
  }, []);
}
