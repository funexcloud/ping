/**
 * 부의금 장부 API — 유족·신청자용 연락처·금액 기록(PII).
 * 조문객 행동 추적(analytics)과 별개 도메인이며, E 집계 지표와 혼용하지 않는다.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bugoRequestId = searchParams.get("bugoRequestId");
  if (!bugoRequestId) {
    return NextResponse.json(
      { error: "bugoRequestId query parameter is required" },
      { status: 400 },
    );
  }

  const items = await prisma.condolenceMoney.findMany({
    where: { bugoRequestId },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  const totalAmount = items.reduce((sum, row) => sum + row.amount, 0);
  const count = items.length;
  const average = count === 0 ? 0 : totalAmount / count;

  return NextResponse.json({ items, totalAmount, count, average });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON object expected" }, { status: 400 });
  }

  const { contactId, bugoRequestId, amount, note } = body as Record<
    string,
    unknown
  >;

  if (
    typeof contactId !== "string" ||
    typeof bugoRequestId !== "string" ||
    amount === undefined ||
    amount === null
  ) {
    return NextResponse.json(
      { error: "contactId, bugoRequestId, amount are required" },
      { status: 400 },
    );
  }

  const amt =
    typeof amount === "number" ? amount : parseInt(String(amount), 10);
  if (!Number.isInteger(amt) || amt < 0) {
    return NextResponse.json(
      { error: "amount must be a non-negative integer (원)" },
      { status: 400 },
    );
  }

  const row = await prisma.condolenceMoney.upsert({
    where: { contactId },
    create: {
      contactId,
      bugoRequestId,
      amount: amt,
      note:
        note === undefined || note === null
          ? null
          : String(note).trim() || null,
    },
    update: {
      bugoRequestId,
      amount: amt,
      ...(note !== undefined && {
        note: note === null ? null : String(note).trim() || null,
      }),
    },
  });

  return NextResponse.json(row);
}
