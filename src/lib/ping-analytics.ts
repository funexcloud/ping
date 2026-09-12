declare global {
  interface Window {
    pingTrack?: (name: string, params?: Record<string, unknown>) => void;
  }
}

const ALLOWED = new Set([
  "landing_view",
  "start_click",
  "google_login_start",
  "google_login_success",
  "contacts_import_start",
  "contacts_import_success",
  "checkout_start",
  "payment_success",
]);

export function pingTrack(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (!ALLOWED.has(name)) return;
  try {
    window.pingTrack?.(name, params ?? {});
  } catch {
    /* noop */
  }
}
