"use client";

import { useEffect } from "react";
import { installPingAppCheckFetch } from "@/lib/ping-app-check-client";

export function PingAppCheckBootstrap() {
  useEffect(() => {
    void installPingAppCheckFetch();
  }, []);
  return null;
}
