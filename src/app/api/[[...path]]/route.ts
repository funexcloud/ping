import {
  getPingExpressBackendOrigin,
  getPingExpressMemberAuthOrigin,
  shouldUseExpressMemberHost,
} from "@/lib/ping-express-backend-origin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

type RouteCtx = { params: Promise<{ path?: string[] }> };

async function proxyToExpress(req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  const { path } = await ctx.params;
  const tail = path?.length ? path.join("/") : "";
  const backend = (
    shouldUseExpressMemberHost(tail)
      ? getPingExpressMemberAuthOrigin()
      : getPingExpressBackendOrigin()
  ).replace(/\/+$/, "");
  const url = new URL(req.url);
  const targetUrl = `${backend}/api/${tail}${url.search}`;

  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    if (k.toLowerCase() === "host") continue;
    headers.set(k, v);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    Object.assign(init, { duplex: "half" });
  }

  try {
    const res = await fetch(targetUrl, init);
    const out = new NextResponse(res.body, { status: res.status });
    res.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      out.headers.set(key, value);
    });
    return out;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "express_unreachable",
        message:
          "Express API(기본 3000)에 연결하지 못했습니다. `npm run dev`로 Express+Next를 같이 띄우거나 PING_EXPRESS_ORIGIN을 설정하세요.",
      },
      { status: 502 },
    );
  }
}

export function GET(req: NextRequest, ctx: RouteCtx) {
  return proxyToExpress(req, ctx);
}

export function POST(req: NextRequest, ctx: RouteCtx) {
  return proxyToExpress(req, ctx);
}

export function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxyToExpress(req, ctx);
}

export function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxyToExpress(req, ctx);
}

export function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxyToExpress(req, ctx);
}

export function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return proxyToExpress(req, ctx);
}
