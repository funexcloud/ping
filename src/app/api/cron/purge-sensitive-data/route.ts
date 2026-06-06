import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = String(process.env.CRON_SECRET || process.env.PING_CRON_SECRET || "").trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    ensurePingLocalEnv();
    const modPath = path.join(process.cwd(), "ping-order-purge.js");
    const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
    const { runScheduledPurge } = m as {
      runScheduledPurge: (limit?: number) => Promise<Record<string, unknown>>;
    };
    const result = await runScheduledPurge(80);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/purge-sensitive-data]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "purge_failed" },
      { status: 500 },
    );
  }
}
