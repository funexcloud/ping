import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ orderId: string }> };

async function loadCashReceiptApi() {
  const modPath = path.join(process.cwd(), "ping-cash-receipt.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as {
    issueCashReceiptForOrder: (
      orderId: string,
      opts: { amount?: number },
    ) => Promise<{ status: number; body: Record<string, unknown> }>;
  };
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    ensurePingLocalEnv();
    const { orderId } = await ctx.params;
    let body: { amount?: number } = {};
    try {
      body = (await req.json()) as { amount?: number };
    } catch {
      /* empty */
    }
    const { issueCashReceiptForOrder } = await loadCashReceiptApi();
    const r = await issueCashReceiptForOrder(orderId, { amount: body.amount });
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/orders/issue-cash-receipt]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "현금영수증 발급 실패" },
      { status: 500 },
    );
  }
}
