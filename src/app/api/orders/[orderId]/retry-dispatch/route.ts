import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ orderId: string }> };

async function loadRetryApi() {
  const modPath = path.join(process.cwd(), "ping-order-dispatch-retry.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as {
    apiRetryOrderDispatch: (
      orderId: string,
      amount: number | null,
    ) => Promise<{ status: number; body: Record<string, unknown> }>;
  };
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    ensurePingLocalEnv();
    const { orderId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { amount?: unknown };
    const amountRaw = body.amount;
    const amount =
      amountRaw != null && amountRaw !== "" ? Math.floor(Number(amountRaw)) : null;
    const { apiRetryOrderDispatch } = await loadRetryApi();
    const r = await apiRetryOrderDispatch(orderId, amount);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/orders/retry-dispatch]", e);
    return NextResponse.json({ ok: false, error: "retry_error" }, { status: 500 });
  }
}
