export function sanitizeFunexReturnTo(raw: string | null | undefined, fallback = "/start"): string {
  if (!raw || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}
