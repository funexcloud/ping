declare module "*.css";

/** checkout / 레거시 스크립트가 기대하는 전역 */
interface PingCheckoutPortoneProbe {
  done: boolean;
  ok: boolean;
  status: number | null;
  emptyPayload: boolean;
}

interface Window {
  __PING_PORTONE_CONFIG__?: Record<string, unknown>;
  __PING_PORTONE_CONFIG_SCRIPT_ERROR__?: number;
  __PING_CHECKOUT_PORTONE_PROBE__?: PingCheckoutPortoneProbe;
  __PING_AWAIT_CHECKOUT_PORTONE_PROBE__?: (ms?: number) => Promise<void>;
  __PING_CHECKOUT_PORTONE_REFRESH_BANNER__?: () => void;
  TossPayments?: ((clientKey: string) => unknown) & { ANONYMOUS?: string };
  PingReferral?: {
    getDeviceId?: () => string;
    registerMyCode?: () => Promise<string>;
  };
}
