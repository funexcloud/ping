import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const runtime = "nodejs";

async function loadSendFrom() {
  const modPath = path.join(process.cwd(), "ping-dispatch-send-from.js");
  const m = await import(/* webpackIgnore: true */ pathToFileURL(modPath).href);
  return m as { loadSendFromDisplay: () => { label: string; digits: string } };
}

export async function GET() {
  try {
    ensurePingLocalEnv();
    const { loadSendFromDisplay } = await loadSendFrom();
    const { label, digits } = loadSendFromDisplay();
    return NextResponse.json({ ok: true, label, digits: digits || null });
  } catch (e) {
    console.error("[api/ping-config-send-from]", e);
    return NextResponse.json({ ok: false, error: "config_error" }, { status: 500 });
  }
}
