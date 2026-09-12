"use client";

import { isPingMemberLoggedIn } from "@/lib/ping-member-session-client";
import { useEffect, useState } from "react";

export function usePingMemberSession(): boolean {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(isPingMemberLoggedIn());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("ping-member-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("ping-member-session", sync);
    };
  }, []);

  return loggedIn;
}
