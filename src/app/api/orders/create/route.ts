import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextResponse } from "next/server";
import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import { buildBulkAddressbookCsvContent } from "@/lib/ping-bulk-recipients";
import {
  canonicalServerOrderPayload,
  prepareServerOrderRequest,
  ServerOrderValidationError,
  type PreparedServerOrder,
  type ServerOrderRequest,
} from "@/lib/ping-server-order-domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 5 * 1024 * 1024;

type StoreResult = {
  reused: boolean;
  orderId: string;
  totalAmount: number;
  recipientCount: number;
  checkoutExpiresAt: number;
};

type ServerOrderStore = {
  createServerOrder: (
    input: {
      prepared: PreparedServerOrder;
      payloadHash: string;
      idempotencyHash: string;
      checkoutSecretHash: string;
      checkoutExpiresAt: Date;
      csvBuffer: Buffer;
    },
  ) => Promise<StoreResult>;
  ServerOrderStoreError: new (...args: never[]) => Error & {
    code?: string;
    status?: number;
  };
};

async function loadServerOrderStore(): Promise<ServerOrderStore> {
  const modulePath = path.join(process.cwd(), "lib/ping-server-order-store.cjs");
  const loaded = (await import(
    /* webpackIgnore: true */ pathToFileURL(modulePath).href
  )) as unknown as Record<string, unknown>;
  const candidate = (loaded.default || loaded) as ServerOrderStore;
  if (!candidate || typeof candidate.createServerOrder !== "function") {
    throw new Error("server_order_store_unavailable");
  }
  return candidate;
}

function checkoutTtlMs(): number {
  const configured = Math.floor(
    Number(process.env.PING_CHECKOUT_SESSION_TTL_SECONDS || 48 * 60 * 60) * 1000,
  );
  if (!Number.isFinite(configured)) return 48 * 60 * 60 * 1000;
  return Math.min(Math.max(configured, 5 * 60 * 1000), 72 * 60 * 60 * 1000);
}

function checkoutCapabilityKey(): string {
  const configured = String(
    process.env.PING_CHECKOUT_CAPABILITY_SECRET ||
      process.env.PING_ORDER_CAPABILITY_SECRET ||
      process.env.PING_ADMIN_SESSION_SECRET ||
      "",
  ).trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "ping-checkout-capability-dev-secret-change-me";
  }
  throw new Error("checkout_capability_secret_required");
}

function digest(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function deriveCheckoutCapability(
  idempotencyHash: string,
  payloadHash: string,
): string {
  return crypto
    .createHmac("sha256", checkoutCapabilityKey())
    .update(`${idempotencyHash}:${payloadHash}`)
    .digest("hex");
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ServerOrderValidationError) {
    return NextResponse.json(
      { ok: false, error: error.code, message: error.message },
      { status: error.status },
    );
  }
  const candidate = error as { code?: unknown; status?: unknown };
  const code = String(candidate?.code || "server_order_create_failed");
  const status = Number(candidate?.status);
  return NextResponse.json(
    { ok: false, error: code },
    { status: Number.isInteger(status) && status >= 400 && status < 600 ? status : 500 },
  );
}

/**
 * Canonical server order creation.
 * 수신자, 가격, 원문 URL, 최종 메시지, artifact, order, checkout registry를 서버가 소유한다.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { ok: false, error: "request_too_large" },
      { status: 413 },
    );
  }

  try {
    ensurePingLocalEnv();
    const body = (await request.json()) as ServerOrderRequest;
    const prepared = prepareServerOrderRequest(body);
    const payloadHash = digest(JSON.stringify(canonicalServerOrderPayload(prepared)));
    const idempotencyHash = digest(prepared.clientRequestId);
    const checkoutCapability = deriveCheckoutCapability(idempotencyHash, payloadHash);
    const checkoutSecretHash = digest(checkoutCapability);
    const checkoutExpiresAt = new Date(Date.now() + checkoutTtlMs());
    const csvContent = buildBulkAddressbookCsvContent(prepared.recipients);
    const csvBuffer = Buffer.from(csvContent, "utf8");
    if (csvBuffer.length > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { ok: false, error: "recipient_artifact_too_large" },
        { status: 413 },
      );
    }

    const store = await loadServerOrderStore();
    const result = await store.createServerOrder({
      prepared,
      payloadHash,
      idempotencyHash,
      checkoutSecretHash,
      checkoutExpiresAt,
      csvBuffer,
    });

    return NextResponse.json(
      {
        ok: true,
        orderId: result.orderId,
        amount: result.totalAmount,
        recipientCount: result.recipientCount,
        rawRecipientCount: prepared.rawRecipientCount,
        droppedRecipientCount: prepared.droppedRecipientCount,
        sourceObituaryUrl: prepared.sourceObituaryUrl,
        deliveryUrl: prepared.deliveryUrl,
        message: {
          title: prepared.messageTitle,
          body: prepared.messageBody,
        },
        checkoutCapability,
        expiresAt: result.checkoutExpiresAt,
        idempotentReplay: result.reused,
      },
      { status: result.reused ? 200 : 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
