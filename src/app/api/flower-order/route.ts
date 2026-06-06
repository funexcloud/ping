import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type FlowerOrderPayload = {
  productId?: string;
  productName?: string;
  productPrice?: number;
  deliveryDate?: string;
  deliveryTime?: string;
  funeralHall?: string;
  mortuaryRoom?: string;
  recipientName?: string;
  ribbonLeft?: string;
  ribbonRight?: string;
  senderName?: string;
  senderPhone?: string;
  payerName?: string;
  payerPhone?: string;
  requestNote?: string;
};

type DeliveryResult = {
  channel: string;
  ok: boolean;
  error?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatPrice(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString("ko-KR")}원` : "-";
}

function formatOrder(payload: FlowerOrderPayload): string {
  return [
    "[PING 근조화환 주문 접수]",
    "",
    "[상품]",
    `상품명: ${clean(payload.productName) || "-"}`,
    `상품코드: ${clean(payload.productId) || "-"}`,
    `금액: ${formatPrice(payload.productPrice)}`,
    "",
    "[배송]",
    `희망일: ${clean(payload.deliveryDate) || "-"}`,
    `희망시간: ${clean(payload.deliveryTime) || "-"}`,
    `장례식장: ${clean(payload.funeralHall) || "-"}`,
    `빈소: ${clean(payload.mortuaryRoom) || "-"}`,
    `받는 분: ${clean(payload.recipientName) || "-"}`,
    "",
    "[리본 문구]",
    `좌측: ${clean(payload.ribbonLeft) || "-"}`,
    `우측: ${clean(payload.ribbonRight) || "-"}`,
    `보내는 분: ${clean(payload.senderName) || "-"}`,
    `보내는 분 연락처: ${clean(payload.senderPhone) || "-"}`,
    "",
    "[주문자]",
    `성함: ${clean(payload.payerName) || "-"}`,
    `연락처: ${clean(payload.payerPhone) || "-"}`,
    "",
    "[요청사항]",
    clean(payload.requestNote) || "-",
  ].join("\n");
}

async function sendSolapi(text: string): Promise<DeliveryResult> {
  const key = clean(process.env.SOLAPI_API_KEY);
  const secret = clean(process.env.SOLAPI_API_SECRET);
  const from = clean(process.env.SOLAPI_FROM).replace(/\D/g, "");
  const to = clean(process.env.SOLAPI_NOTIFY_TO || process.env.SOLAPI_TEST_TO || "01031030282").replace(/\D/g, "");

  if (!key || !secret || !from || !to) {
    return {
      channel: "solapi",
      ok: false,
      error: "SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_FROM, SOLAPI_NOTIFY_TO 설정이 필요합니다.",
    };
  }

  try {
    const { SolapiMessageService } = await import("solapi");
    const svc = new SolapiMessageService(key, secret);
    await svc.send([{ to, from, type: "LMS", text }], { showMessageList: true });
    return { channel: "solapi", ok: true };
  } catch (error) {
    return {
      channel: "solapi",
      ok: false,
      error: error instanceof Error ? error.message : "SOLAPI 발송 실패",
    };
  }
}

async function sendResend(text: string, payload: FlowerOrderPayload): Promise<DeliveryResult> {
  const apiKey = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.RESEND_FROM_EMAIL) || "PING <onboarding@resend.dev>";
  const to = clean(
    process.env.PING_FLOWER_NOTIFY_EMAIL ||
      process.env.PING_NOTIFY_EMAIL ||
      process.env.RESEND_NOTIFY_TO ||
      "kaibcmac@gmail.com",
  );

  if (!apiKey || !to) {
    return {
      channel: "resend",
      ok: false,
      error: "RESEND_API_KEY 또는 수신 이메일 설정이 필요합니다.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[PING] 근조화환 주문 - ${clean(payload.productName) || "상품 미선택"}`,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { channel: "resend", ok: false, error: body || `HTTP ${res.status}` };
    }

    return { channel: "resend", ok: true };
  } catch (error) {
    return {
      channel: "resend",
      ok: false,
      error: error instanceof Error ? error.message : "이메일 발송 실패",
    };
  }
}

export async function POST(request: NextRequest) {
  let payload: FlowerOrderPayload;

  try {
    payload = (await request.json()) as FlowerOrderPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "요청 데이터를 읽을 수 없습니다." }, { status: 400 });
  }

  const required = [
    payload.productId,
    payload.deliveryDate,
    payload.funeralHall,
    payload.mortuaryRoom,
    payload.ribbonLeft,
    payload.ribbonRight,
    payload.payerName,
    payload.payerPhone,
  ];

  if (required.some((value) => !clean(value))) {
    return NextResponse.json({ ok: false, error: "필수 정보를 모두 입력해 주세요." }, { status: 400 });
  }

  const text = formatOrder(payload);
  const results = await Promise.all([sendSolapi(text), sendResend(text, payload)]);
  const delivered = results.filter((result) => result.ok).map((result) => result.channel);

  if (delivered.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "관리자 전달 채널 설정이 없어 전송하지 못했습니다.",
        results,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, delivered, results });
}
