import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadAdminAuth() {
  const modulePath = path.join(process.cwd(), "ping-admin-auth.js");
  const loaded = (await import(/* webpackIgnore: true */ pathToFileURL(modulePath).href)) as {
    apiAdminSession: (cookieHeader: string) => { status: number; body: Record<string, unknown> };
  };
  return loaded;
}

async function loadFirestoreAdmin() {
  const modulePath = path.join(process.cwd(), "ping-firebase-admin.js");
  const loaded = (await import(/* webpackIgnore: true */ pathToFileURL(modulePath).href)) as {
    getPingFirestoreAdmin: () => {
      collection: (name: string) => {
        doc: (id: string) => { delete: () => Promise<void> };
      };
    };
  };
  return loaded;
}

export async function POST(request: Request) {
  try {
    ensurePingLocalEnv();
    const { apiAdminSession } = await loadAdminAuth();
    const session = apiAdminSession(request.headers.get("cookie") || "");
    if (session.status !== 200 || session.body.authenticated !== true) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(body.code || "").trim().slice(0, 64);
    if (!code) {
      return NextResponse.json({ ok: false, error: "invalid_partner" }, { status: 400 });
    }
    const { getPingFirestoreAdmin } = await loadFirestoreAdmin();
    await getPingFirestoreAdmin().collection("ping_partners").doc(code).delete();
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    console.error("[api/admin/partners/delete]", error);
    return NextResponse.json({ ok: false, error: "partner_delete_failed" }, { status: 500 });
  }
}
