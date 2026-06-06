import type { NextRequest } from "next/server";
import { runMemberAuthApp } from "@/lib/ping-node-handler-bridge";

export function handleMemberAuthApi(request: NextRequest) {
  return runMemberAuthApp(request);
}
