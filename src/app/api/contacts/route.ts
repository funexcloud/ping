import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** 이름/전화번호로 연락처 검색 (명단 선택용) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("search") ?? "").trim();
  if (q.length < 1) {
    return NextResponse.json({ contacts: [] });
  }

  const digits = q.replace(/\D/g, "");
  const phoneNorm = normalizePhone(q);

  const or: Prisma.ContactWhereInput[] = [{ name: { contains: q } }];
  if (digits.length > 0) {
    or.push({ phone: { contains: digits } });
  }
  if (phoneNorm.length > 0 && phoneNorm !== digits) {
    or.push({ phone: { contains: phoneNorm } });
  }

  const contacts = await prisma.contact.findMany({
    where: { OR: or },
    take: 40,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ search: q, contacts });
}
