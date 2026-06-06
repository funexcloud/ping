import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { getPingTossCheckoutApi } from "@/lib/load-ping-toss-checkout-api";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    ensurePingLocalEnv();
    const { apiConfirmTossPayment } = await getPingTossCheckoutApi();
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    const r = await apiConfirmTossPayment(body);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) {
    console.error("[api/toss/confirm-payment]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "결제 승인 처리기를 불러오지 못했습니다. 서버 루트에 ping-toss-checkout-api.js 가 있는지 확인하세요.",
      },
      { status: 500 },
    );
  }
}
