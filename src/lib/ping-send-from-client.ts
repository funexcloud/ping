/** 플로우·결제 화면 — 서버 발신번호(SOLAPI_FROM) 표시 */

let cachedLabel: string | null = null;

export async function fetchPingSendFromLabel(): Promise<string> {
  if (cachedLabel) return cachedLabel;
  try {
    const res = await fetch("/api/ping-config-send-from", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; label?: string };
    if (res.ok && json.ok && json.label) {
      cachedLabel = String(json.label).trim();
      return cachedLabel;
    }
  } catch {
    /* ignore */
  }
  return "PING 대표번호";
}
