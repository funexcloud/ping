import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

async function loadAdminAuth() {
  const modPath = path.join(process.cwd(), "ping-admin-auth.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as {
    apiAdminSession: (cookieHeader: string) => { status: number; body: Record<string, unknown> };
  };
}

export async function GET(req: Request) {
  try {
    ensurePingLocalEnv();
    const { apiAdminSession } = await loadAdminAuth();
    const cookieHeader = req.headers.get("cookie") || "";
    const r = apiAdminSession(cookieHeader);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/admin/auth/session]", e);
    return NextResponse.json({ ok: false, authenticated: false }, { status: 500 });
  }
}
