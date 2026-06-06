import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ orderId: string }> };

async function loadRefundApi() {
  const modPath = path.join(process.cwd(), "ping-order-refund-api.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as {
    apiRequestOrderRefund: (
      orderId: string,
      amount: number | null,
      body: Record<string, unknown>,
    ) => Promise<{ status: number; body: Record<string, unknown> }>;
  };
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    ensurePingLocalEnv();
    const { orderId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const amountRaw = body.amount;
    const amount =
      amountRaw != null && amountRaw !== "" ? Math.floor(Number(amountRaw)) : null;
    const { apiRequestOrderRefund } = await loadRefundApi();
    const r = await apiRequestOrderRefund(orderId, amount, body);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/orders/request-refund]", e);
    return NextResponse.json({ ok: false, error: "refund_error" }, { status: 500 });
  }
}
