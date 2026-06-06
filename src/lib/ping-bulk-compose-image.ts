/**
 * 대량발송 문자 작성 이미지 첨부 — `public/index.html` 의
 * `PING_COMPOSE_IMAGE_SESSION` / `indexCompressImageFileForCompose` 와 호환.
 */

export const PING_COMPOSE_IMAGE_SESSION = "ping_compose_image_data";

/** `indexPersistComposeImageSession`: URL 길이 상한 */
const MAX_SESSION_DATA_URL_LEN = 1_800_000;

/** 압축 후 허용 최대(문자열 길이) — 레거시 2_400_000 */
const MAX_COMPRESSED_DATA_URL_LEN = 2_400_000;

export type BulkComposeImage = {
  dataUrl: string;
  name: string;
  mime: string;
};

export function persistComposeImageSession(img: BulkComposeImage | null): void {
  if (typeof window === "undefined") return;
  try {
    if (img?.dataUrl && String(img.dataUrl).length < MAX_SESSION_DATA_URL_LEN) {
      sessionStorage.setItem(
        PING_COMPOSE_IMAGE_SESSION,
        JSON.stringify({
          dataUrl: img.dataUrl,
          name: img.name || "",
          mime: img.mime || "image/jpeg",
        }),
      );
    } else {
      sessionStorage.removeItem(PING_COMPOSE_IMAGE_SESSION);
    }
  } catch {
    /* ignore */
  }
}

export function loadComposeImageFromSession(): BulkComposeImage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PING_COMPOSE_IMAGE_SESSION);
    if (!raw) return null;
    const o = JSON.parse(raw) as {
      dataUrl?: string;
      name?: string;
      mime?: string;
    };
    if (!o?.dataUrl) return null;
    return {
      dataUrl: o.dataUrl,
      name: o.name || "image.jpg",
      mime: o.mime || "image/jpeg",
    };
  } catch {
    return null;
  }
}

export function clearComposeImageSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PING_COMPOSE_IMAGE_SESSION);
  } catch {
    /* ignore */
  }
}

/** `indexCompressImageFileForCompose` 이식 */
export function compressImageFileForBulkCompose(file: File): Promise<BulkComposeImage> {
  return new Promise((resolve, reject) => {
    if (!file?.type || String(file.type).indexOf("image/") !== 0) {
      reject(new Error("이미지 파일만 첨부할 수 있습니다."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      if (typeof url !== "string") {
        reject(new Error("파일을 읽지 못했습니다."));
        return;
      }
      const image = new Image();
      image.onload = () => {
        try {
          const maxW = 1280;
          let w = image.width;
          let h = image.height;
          if (w > maxW) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("이미지 처리에 실패했습니다."));
            return;
          }
          ctx.drawImage(image, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          if (!dataUrl || dataUrl.length < 32) {
            reject(new Error("이미지 변환에 실패했습니다."));
            return;
          }
          if (dataUrl.length > MAX_COMPRESSED_DATA_URL_LEN) {
            reject(new Error("첨부 이미지가 너무 큽니다. 더 작은 사진을 선택해 주세요."));
            return;
          }
          const base = String(file.name || "image").replace(/\.[^.]+$/, "");
          resolve({
            dataUrl,
            name: `${base}.jpg`,
            mime: "image/jpeg",
          });
        } catch (ex) {
          reject(ex instanceof Error ? ex : new Error("이미지 처리에 실패했습니다."));
        }
      };
      image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      image.src = url;
    };
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}
