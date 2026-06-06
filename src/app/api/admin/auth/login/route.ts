import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

async function loadAdminAuth() {
  const modPath = path.join(process.cwd(), "ping-admin-auth.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as {
    apiAdminLogin: (body: Record<string, unknown>) => {
      status: number;
      body: Record<string, unknown>;
      sessionToken?: string;
    };
    SESSION_COOKIE: string;
    sessionCookieOptions: () => {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge: number;
    };
  };
}

export async function POST(req: Request) {
  try {
    ensurePingLocalEnv();
    const { apiAdminLogin, SESSION_COOKIE, sessionCookieOptions } = await loadAdminAuth();
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    const r = apiAdminLogin(body);
    const res = NextResponse.json(r.body, { status: r.status });
    if (r.status === 200 && r.sessionToken) {
      res.cookies.set(SESSION_COOKIE, r.sessionToken, sessionCookieOptions());
    }
    return res;
  } catch (e) {
    console.error("[api/admin/auth/login]", e);
    return NextResponse.json({ ok: false, error: "login_error" }, { status: 500 });
  }
}
