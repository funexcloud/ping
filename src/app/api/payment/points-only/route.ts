import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { getPingTossCheckoutApi } from "@/lib/load-ping-toss-checkout-api";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    ensurePingLocalEnv();
    const { apiPointsOnlyPayment } = await getPingTossCheckoutApi();
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    const r = await apiPointsOnlyPayment(body);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/payment/points-only]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "포인트 결제 처리기를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
