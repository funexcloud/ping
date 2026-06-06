import path from "node:path";
import { pathToFileURL } from "node:url";

/** `ping-toss-checkout-api.js`(CJS) — Next 번들에서 제외하고 런타임 로드 */
export type PingTossCheckoutApi = {
  apiRegisterCheckoutSession: (body: Record<string, unknown>) => {
    status: number;
    body: Record<string, unknown>;
  };
  apiConfirmTossPayment: (body: Record<string, unknown>) => Promise<{
    status: number;
    body: Record<string, unknown>;
  }>;
  apiPointsOnlyPayment: (body: Record<string, unknown>) => Promise<{
    status: number;
    body: Record<string, unknown>;
  }>;
  apiBankTransferPayment: (body: Record<string, unknown>) => Promise<{
    status: number;
    body: Record<string, unknown>;
  }>;
};

let apiPromise: Promise<PingTossCheckoutApi> | null = null;

function coerceCheckoutApi(m: unknown): PingTossCheckoutApi {
  if (!m || typeof m !== "object") {
    throw new Error("ping-toss-checkout-api: empty module");
  }
  const rec = m as Record<string, unknown>;
  const d = rec.default;
  if (
    d &&
    typeof d === "object" &&
    typeof (d as PingTossCheckoutApi).apiConfirmTossPayment === "function" &&
    typeof (d as PingTossCheckoutApi).apiBankTransferPayment === "function"
  ) {
    return d as PingTossCheckoutApi;
  }
  if (
    typeof rec.apiConfirmTossPayment === "function" &&
    typeof rec.apiBankTransferPayment === "function"
  ) {
    return rec as unknown as PingTossCheckoutApi;
  }
  throw new Error(
    "ping-toss-checkout-api: invalid module shape (expected apiConfirmTossPayment)",
  );
}

export function getPingTossCheckoutApi(): Promise<PingTossCheckoutApi> {
  if (!apiPromise) {
    const modPath = path.join(process.cwd(), "ping-toss-checkout-api.js");
    const href = pathToFileURL(modPath).href;
    apiPromise = import(/* webpackIgnore: true */ href).then(coerceCheckoutApi);
  }
  return apiPromise;
}
