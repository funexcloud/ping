"use client";

import { hydratePingFunexSession } from "@/lib/ping-member-session-client";
import { pingTrack } from "@/lib/ping-analytics";
import { useEffect } from "react";

export function PingFunexSessionHydrate() {
  useEffect(() => {
    void hydratePingFunexSession().then((ok) => {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("funex") === "1") {
          if (ok) pingTrack("google_login_success");
          url.searchParams.delete("funex");
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        }
      } catch {
        /* noop */
      }
    });
  }, []);
  return null;
}
