import type { BulkSmsTemplateId } from "@/lib/ping-bulk-sms";
import type { BulkComposeImage } from "@/lib/ping-bulk-compose-image";
import { sanitizeBulkSmsBodyText } from "@/lib/ping-bulk-sms";

/** `public/index.html` — `PING_SAVED_COMPOSE_LS` 와 동일 */
export const PING_SAVED_COMPOSE_LS = "ping_bulk_saved_compose_v1";

/** `public/index.html` — `PING_RECENT_SENDS_LS` 와 동일 */
export const PING_RECENT_SENDS_LS = "ping_bulk_recent_sends_v1";

/** 마지막 임시저장 요약 — 레거시 `ping_bulk_sms_local_draft` */
export const PING_BULK_SMS_LOCAL_DRAFT_LS = "ping_bulk_sms_local_draft";

export const INDEX_BULK_MAX_SAVED = 25;
export const INDEX_BULK_MAX_RECENT = 20;

export type BulkSavedComposeImage = {
  dataUrl: string;
  name: string;
};

export type BulkSavedComposeEntry = {
  id: string;
  ts: number;
  title: string;
  body: string;
  obituaryPageUrl: string;
  smsTemplateId: "1" | "2";
  image: BulkSavedComposeImage | null;
};

export type BulkRecentSendEntry = {
  id: string;
  ts: number;
  title: string;
  bodyPreview: string;
  count: number | null;
  amount: number | null;
  obituaryPageUrl: string | null;
};

function parseSavedList(raw: string | null): BulkSavedComposeEntry[] {
  try {
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is BulkSavedComposeEntry =>
        Boolean(x) && typeof x === "object" && typeof (x as BulkSavedComposeEntry).id === "string",
    );
  } catch {
    return [];
  }
}

export function readSavedComposeList(): BulkSavedComposeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return parseSavedList(localStorage.getItem(PING_SAVED_COMPOSE_LS));
  } catch {
    return [];
  }
}

function writeSavedComposeList(list: BulkSavedComposeEntry[]): void {
  localStorage.setItem(PING_SAVED_COMPOSE_LS, JSON.stringify(list));
}

export function formatBulkComposeSavedTs(ts: number): string {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

/**
 * 레거시 `indexBulkSaveComposeDraftToDevice` 와 동일 규칙 (`image` 는 dataUrl 2MB 이하만 목록에 포함).
 */
export function saveBulkComposeDraftToDevice(opts: {
  title: string;
  body: string;
  obituaryPageUrl: string;
  templateId: BulkSmsTemplateId;
  image?: BulkComposeImage | null;
}): void {
  const title = String(opts.title || "");
  const body = sanitizeBulkSmsBodyText(String(opts.body || ""));
  const obituaryPageUrl = String(opts.obituaryPageUrl || "").trim();
  const tid: "1" | "2" = opts.templateId === "2" ? "2" : "1";
  let entryImage: BulkSavedComposeImage | null = null;
  const im = opts.image;
  if (im?.dataUrl && String(im.dataUrl).length <= 2_000_000) {
    entryImage = { dataUrl: im.dataUrl, name: im.name || "image.jpg" };
  }
  const entry: BulkSavedComposeEntry = {
    id: `s_${Date.now()}`,
    ts: Date.now(),
    title,
    body,
    obituaryPageUrl,
    smsTemplateId: tid,
    image: entryImage,
  };
  const list = readSavedComposeList();
  list.unshift(entry);
  if (list.length > INDEX_BULK_MAX_SAVED) list.length = INDEX_BULK_MAX_SAVED;
  writeSavedComposeList(list);
  try {
    localStorage.setItem(
      PING_BULK_SMS_LOCAL_DRAFT_LS,
      JSON.stringify({ title: entry.title, body: entry.body, ts: entry.ts }),
    );
  } catch {
    /* ignore */
  }
}

export function deleteSavedComposeEntry(id: string): void {
  const list = readSavedComposeList().filter((x) => x.id !== id);
  writeSavedComposeList(list);
}

function parseRecentList(raw: string | null): BulkRecentSendEntry[] {
  try {
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is BulkRecentSendEntry => Boolean(x) && typeof x === "object");
  } catch {
    return [];
  }
}

export function readRecentBulkSendsList(): BulkRecentSendEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return parseRecentList(localStorage.getItem(PING_RECENT_SENDS_LS));
  } catch {
    return [];
  }
}
