import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  getPingExpressMemberAuthOrigin,
  canPersistMemberStoreOnNext,
} from "@/lib/ping-express-backend-origin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

type MemberAuthApp = {
  getApp: () => {
    handle: (
      req: IncomingMessage,
      res: ServerResponse,
      callback?: (err?: unknown) => void,
    ) => void;
  };
};

let cachedApp: MemberAuthApp | null = null;

async function loadMemberAuthApp(): Promise<MemberAuthApp> {
  if (cachedApp) return cachedApp;
  const modPath = path.join(process.cwd(), "lib/ping-member-auth-app.cjs");
  const mod = (await import(/* webpackIgnore: true */ pathToFileURL(modPath).href)) as MemberAuthApp;
  cachedApp = mod;
  return mod;
}

type ExpressLikeRequest = IncomingMessage & {
  get: (name: string) => string | undefined;
  protocol: string;
  hostname: string;
  body?: unknown;
};

function augmentExpressRequest(
  req: IncomingMessage,
  request: NextRequest,
  url: URL,
): ExpressLikeRequest {
  const headers = req.headers;
  const expressReq = req as ExpressLikeRequest;
  expressReq.get = (name: string) => {
    const key = name.toLowerCase();
    const v = headers[key];
    if (v == null) return undefined;
    return Array.isArray(v) ? v[0] : String(v);
  };
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  expressReq.protocol = (
    forwardedProto?.split(",")[0]?.trim() ||
    (loopback ? "http" : "https")
  ).replace(/:$/, "");
  expressReq.hostname = url.hostname;
  return expressReq;
}

function buildNodeRequest(
  request: NextRequest,
  pathname: string,
  search: string,
  bodyText: string,
): ExpressLikeRequest {
  const socket = new Socket();
  const raw = new IncomingMessage(socket);
  raw.method = request.method;
  raw.url = `${pathname}${search}`;
  const headers: Record<string, string | string[] | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  raw.headers = headers as IncomingMessage["headers"];
  raw.push(null);

  const url = new URL(`${pathname}${search}`, "http://local");
  const req = augmentExpressRequest(raw, request, url);
  if (bodyText.trim()) {
    try {
      req.body = JSON.parse(bodyText);
    } catch {
      req.body = {};
    }
  }
  return req;
}

function collectExpressResponse(
  res: ServerResponse,
): Promise<{ status: number; headers: Headers; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    const capture = (chunk: unknown) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).write = (chunk: unknown, ...args: unknown[]) => {
      capture(chunk);
      return origWrite(chunk as never, ...(args as never[]));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).end = (chunk?: unknown, ...args: unknown[]) => {
      capture(chunk);
      return origEnd(chunk as never, ...(args as never[]));
    };

    res.on("finish", () => {
      const out = new Headers();
      const raw = res.getHeaders();
      for (const [key, value] of Object.entries(raw)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
          for (const v of value) out.append(key, String(v));
        } else {
          out.set(key, String(value));
        }
      }
      resolve({
        status: res.statusCode || 200,
        headers: out,
        body: Buffer.concat(chunks),
      });
    });
    res.on("error", reject);
  });
}

async function proxyMemberAuthToExpress(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const backend = getPingExpressMemberAuthOrigin().replace(/\/+$/, "");
  const targetUrl = `${backend}${url.pathname}${url.search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase()) || key.toLowerCase() === "host") return;
    headers.set(key, value);
  });
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
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
          "회원 API(Express)에 연결하지 못했습니다. PING_EXPRESS_ORIGIN 또는 FIREBASE_SERVICE_ACCOUNT_JSON을 확인해 주세요.",
      },
      { status: 502 },
    );
  }
}

export async function runMemberAuthApp(request: NextRequest): Promise<NextResponse> {
  if (!canPersistMemberStoreOnNext()) {
    return proxyMemberAuthToExpress(request);
  }
  const url = new URL(request.url);
  const bodyText =
    request.method === "GET" || request.method === "HEAD"
      ? ""
      : await request.text();

  const { getApp } = await loadMemberAuthApp();
  const app = getApp();
  const nodeReq = buildNodeRequest(request, url.pathname, url.search, bodyText);
  if (!nodeReq.get("host")) {
    nodeReq.headers.host = url.host;
  }
  const nodeRes = new ServerResponse(nodeReq);

  const collected = collectExpressResponse(nodeRes);
  await new Promise<void>((resolve, reject) => {
    app.handle(nodeReq, nodeRes, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const { status, headers, body } = await collected;
  const out = new NextResponse(body.length ? new Uint8Array(body) : null, { status });
  headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    out.headers.set(key, value);
  });
  return out;
}
