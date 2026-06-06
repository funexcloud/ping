import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

async function loadAdminAuth() {
  const modPath = path.join(process.cwd(), "ping-admin-auth.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as { SESSION_COOKIE: string };
}

export async function POST() {
  try {
    ensurePingLocalEnv();
    const { SESSION_COOKIE } = await loadAdminAuth();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[api/admin/auth/logout]", e);
    return NextResponse.json({ ok: false, error: "logout_error" }, { status: 500 });
  }
}
