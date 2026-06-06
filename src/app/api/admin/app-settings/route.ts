import { handleMemberAuthApi } from "@/lib/ping-member-auth-api";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handleMemberAuthApi(req);
}

export function PATCH(req: NextRequest) {
  return handleMemberAuthApi(req);
}

export function OPTIONS(req: NextRequest) {
  return handleMemberAuthApi(req);
}
