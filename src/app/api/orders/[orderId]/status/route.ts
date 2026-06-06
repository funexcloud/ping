import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ orderId: string }> };

async function loadPublicApi() {
  const modPath = path.join(process.cwd(), "ping-order-public-api.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as {
    apiGetOrderPublicStatus: (
      orderId: string,
      amount: number | null,
    ) => Promise<{ status: number; body: Record<string, unknown> }>;
  };
}

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    ensurePingLocalEnv();
    const { orderId } = await ctx.params;
    const url = new URL(req.url);
    const amountRaw = url.searchParams.get("amount");
    const amount =
      amountRaw != null && amountRaw !== "" ? Math.floor(Number(amountRaw)) : null;
    const { apiGetOrderPublicStatus } = await loadPublicApi();
    const r = await apiGetOrderPublicStatus(orderId, amount);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/orders/status]", e);
    return NextResponse.json({ ok: false, error: "status_error" }, { status: 500 });
  }
}
