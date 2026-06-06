import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

async function loadAdminApi() {
  const modPath = path.join(process.cwd(), "ping-order-admin-api.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as {
    apiConfirmBankDeposit: (
      body: Record<string, unknown>,
      authOpts?: { cookieHeader?: string; headers?: Record<string, string> },
    ) => Promise<{ status: number; body: Record<string, unknown> }>;
  };
}

export async function POST(req: Request) {
  try {
    ensurePingLocalEnv();
    const { apiConfirmBankDeposit } = await loadAdminApi();
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const r = await apiConfirmBankDeposit(body, {
      cookieHeader: req.headers.get("cookie") || "",
      headers,
    });
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/admin/orders/confirm-bank-deposit]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "입금 확인 처리 실패" },
      { status: 500 },
    );
  }
}
