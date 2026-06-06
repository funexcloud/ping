import { handleMemberAuthApi } from "@/lib/ping-member-auth-api";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ segments: string[] }> };

export function GET(req: NextRequest, ctx: RouteCtx) {
  return handleMemberAuthApi(req);
}

export function POST(req: NextRequest, ctx: RouteCtx) {
  return handleMemberAuthApi(req);
}

export function PATCH(req: NextRequest, ctx: RouteCtx) {
  return handleMemberAuthApi(req);
}

export function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return handleMemberAuthApi(req);
}
