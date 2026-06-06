import { getGoogleOAuthConfigJs } from "@/lib/ping-inject-config-scripts";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const body = getGoogleOAuthConfigJs();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
