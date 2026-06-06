import { handleMemberAuthApi } from "@/lib/ping-member-auth-api";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ segments: string[] }> };

async function dispatch(req: NextRequest, _ctx: RouteCtx) {
  return handleMemberAuthApi(req);
}

export function GET(req: NextRequest, ctx: RouteCtx) {
  return dispatch(req, ctx);
}

export function POST(req: NextRequest, ctx: RouteCtx) {
  return dispatch(req, ctx);
}

export function PATCH(req: NextRequest, ctx: RouteCtx) {
  return dispatch(req, ctx);
}

export function PUT(req: NextRequest, ctx: RouteCtx) {
  return dispatch(req, ctx);
}

export function DELETE(req: NextRequest, ctx: RouteCtx) {
  return dispatch(req, ctx);
}

export function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return dispatch(req, ctx);
}
