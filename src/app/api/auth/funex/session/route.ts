import { NextResponse } from "next/server";

import { readFunexUserIdFromCookieHeader } from "@/lib/funex-sso";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = readFunexUserIdFromCookieHeader(request.headers.get("cookie"));
  return NextResponse.json(
    { authenticated: Boolean(userId) },
    {
      status: 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
