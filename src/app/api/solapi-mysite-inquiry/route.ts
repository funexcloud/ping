import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type MySiteInquiryPayload = {
  siteName?: string;
  subdomain?: string;
  logoFileName?: string;
  fees?: Record<string, string>;
  customerCenter?: {
    phone?: string;
    homepage?: string;
    email?: string;
  };
  consoleSettings?: Record<string, string>;
  colors?: {
    main?: string;
    sub?: string;
  };
  note?: string;
};

type DeliveryResult = {
  channel: string;
  ok: boolean;
  error?: string;
};

const feeLabels: Record<string, string> = {
  sms: "SMS",
  lms: "LMS",
  mms: "MMS",
  ata: "ATA",
  cta: "CTA",
  cti: "CTI",
  nsa: "NSA",
  rcsSms: "RCS_SMS",
  rcsLms: "RCS_LMS",
  rcsMms: "RCS_MMS",
  voice: "VOICE",
  fax: "FAX",
  bmsText: "BMS_TEXT",
  bmsImage: "BMS_IMAGE",
  bmsWide: "BMS_WIDE",
  bmsCarousel: "BMS_CAROUSEL_FEED",
  bmsCommerce: "BMS_COMMERCE",
  bmsPremiumVideo: "BMS_PREMIUM_VIDEO",
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatPayload(payload: MySiteInquiryPayload): string {
  const fees = payload.fees || {};
  const feeLines = Object.entries(feeLabels)
    .map(([key, label]) => `${label}: ${clean(fees[key]) || "-"}`)
    .join("\n");

  return [
    "[마이사이트 생성 요청]",
    "",
    `마이사이트 이름: ${clean(payload.siteName) || "-"}`,
    `주소: https://${clean(payload.subdomain) || "-"}.solapi.com`,
    `로고 파일명: ${clean(payload.logoFileName) || "-"}`,
    "",
    "[추가수익금 설정]",
    feeLines,
    "",
    "[고객센터 설정]",
    `연락처: ${clean(payload.customerCenter?.phone) || "-"}`,
    `홈페이지: ${clean(payload.customerCenter?.homepage) || "-"}`,
    `알림 이메일: ${clean(payload.customerCenter?.email) || "-"}`,
    "",
    "[콘솔 설정]",
    `홈페이지 좌측 메뉴: ${clean(payload.consoleSettings?.leftMenu) || "-"}`,
    `홈페이지 상단 헤더: ${clean(payload.consoleSettings?.header) || "-"}`,
    `솔라피 고객센터: ${clean(payload.consoleSettings?.solapiCenter) || "-"}`,
    "",
    "[컬러 설정]",
    `메인 컬러: ${clean(payload.colors?.main) || "-"}`,
    `서브 컬러: ${clean(payload.colors?.sub) || "-"}`,
    "",
    "[메모]",
    clean(payload.note) || "-",
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

async function sendResend(text: string, payload: MySiteInquiryPayload): Promise<DeliveryResult> {
  const apiKey = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.RESEND_FROM_EMAIL) || "PING <onboarding@resend.dev>";
  const to = clean(
    process.env.PING_MYSITE_NOTIFY_EMAIL ||
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
        subject: `[PING] 마이사이트 생성 요청 - ${clean(payload.siteName) || "이름 미입력"}`,
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
  let payload: MySiteInquiryPayload;

  try {
    payload = (await request.json()) as MySiteInquiryPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "요청 데이터를 읽을 수 없습니다." }, { status: 400 });
  }

  if (!clean(payload.siteName) || !clean(payload.subdomain)) {
    return NextResponse.json(
      { ok: false, error: "마이사이트 이름과 주소를 입력해 주세요." },
      { status: 400 },
    );
  }

  const text = formatPayload(payload);
  const results = await Promise.all([sendSolapi(text), sendResend(text, payload)]);
  const delivered = results.filter((result) => result.ok).map((result) => result.channel);

  if (delivered.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "전달 채널 설정이 없어 전송하지 못했습니다.",
        results,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, delivered, results });
}
