"use client";

const STORAGE_PREFIX = "ping_order_capability:";

type StoredCapability = {
  token: string;
  expiresAt: number;
};

export function saveOrderCapability(
  orderId: string,
  value: { token?: unknown; expiresAt?: unknown },
): void {
  const oid = String(orderId || "").trim();
  const token = typeof value.token === "string" ? value.token.trim() : "";
  const expiresAt = Number(value.expiresAt);
  if (!oid || !token || !Number.isFinite(expiresAt)) return;
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${oid}`,
      JSON.stringify({ token, expiresAt }),
    );
  } catch {
    /* ignore */
  }
}

export function readOrderCapability(orderId: string): string {
  const oid = String(orderId || "").trim();
  if (!oid) return "";
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${oid}`);
    if (!raw) return "";
    const stored = JSON.parse(raw) as StoredCapability;
    if (
      !stored ||
      typeof stored.token !== "string" ||
      !Number.isFinite(Number(stored.expiresAt)) ||
      Date.now() >= Number(stored.expiresAt)
    ) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${oid}`);
      return "";
    }
    return stored.token;
  } catch {
    return "";
  }
}

export function orderCapabilityHeaders(orderId: string): HeadersInit {
  const token = readOrderCapability(orderId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
