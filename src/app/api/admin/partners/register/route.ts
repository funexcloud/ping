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
        doc: (id: string) => { set: (data: unknown) => Promise<void> };
      };
    };
  };
  return loaded;
}

function text(value: unknown, max: number): string {
  return String(value || "").trim().slice(0, max);
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
    const code = text(body.code, 64);
    const name = text(body.name, 120);
    if (!code || !name) {
      return NextResponse.json({ ok: false, error: "invalid_partner" }, { status: 400 });
    }
    const { getPingFirestoreAdmin } = await loadFirestoreAdmin();
    const now = new Date();
    await getPingFirestoreAdmin().collection("ping_partners").doc(code).set({
      name,
      contact: text(body.contact, 120),
      phone: text(body.phone, 32),
      email: text(body.email, 254) || null,
      code,
      link: text(body.link, 512),
      bank: text(body.bank, 80),
      bankCode: text(body.bankCode, 16),
      accountNumber: text(body.accountNumber, 64),
      accountHolder: text(body.accountHolder, 80),
      accountAgreement: body.accountAgreement === true,
      accountAgreementDate: body.accountAgreement === true ? now : null,
      createdAt: now,
      status: "active",
    });
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    console.error("[api/admin/partners/register]", error);
    return NextResponse.json({ ok: false, error: "partner_register_failed" }, { status: 500 });
  }
}
