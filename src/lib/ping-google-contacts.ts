/**
 * Google People API 연락처 — `legacy-html/index.html` `loadGoogleContacts` / `loadGoogleContactsData` 이관.
 */
import {
  normalizeKoreanPhoneForSms,
  type BulkRecipientRow,
} from "@/lib/ping-bulk-recipients";

const GOOGLE_DISCOVERY_DOCS = ["https://people.googleapis.com/$discovery/rest?version=v1"];
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/contacts.readonly";
const GOOGLE_CONTACTS_PAGE_SIZE = 1000;
const CLIENT_ID_PLACEHOLDER = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const API_KEY_PLACEHOLDER = "YOUR_GOOGLE_API_KEY";
const FLOW_WATCHDOG_MS = 55_000;

type GoogleConfig = { clientId: string; apiKey: string };

type TokenResponse = {
  access_token?: string;
  error?: string;
};

type PeopleConnection = {
  names?: Array<{
    displayName?: string;
    displayNameLastFirst?: string;
    givenName?: string;
    familyName?: string;
  }>;
  phoneNumbers?: Array<{ value?: string }>;
};

let configPromise: Promise<GoogleConfig> | null = null;
let gapiInitPromise: Promise<void> | null = null;
let tokenClient: { requestAccessToken: (opts: { prompt?: string }) => void } | null =
  null;

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(s);
  });
}

async function loadGoogleConfig(): Promise<GoogleConfig> {
  if (configPromise) return configPromise;
  configPromise = (async () => {
    if (!window.__PING_GOOGLE_CONFIG__) {
      await loadScript("/api/google-oauth-config.js", "ping-google-oauth-config");
    }
    const cfg = window.__PING_GOOGLE_CONFIG__ || {};
    return {
      clientId: String(cfg.clientId || "").trim(),
      apiKey: String(cfg.apiKey || "").trim(),
    };
  })();
  return configPromise;
}

async function ensureGapiClient(apiKey: string): Promise<void> {
  if (gapiInitPromise) return gapiInitPromise;
  gapiInitPromise = new Promise((resolve, reject) => {
    const gapi = window.gapi;
    if (!gapi) {
      gapiInitPromise = null;
      reject(new Error("Google API 스크립트가 로드되지 않았습니다."));
      return;
    }
    gapi.load("client", () => {
      void gapi.client
        .init({
          apiKey,
          discoveryDocs: GOOGLE_DISCOVERY_DOCS,
        })
        .then(() => resolve())
        .catch((err: unknown) => {
          gapiInitPromise = null;
          reject(err instanceof Error ? err : new Error("Google API 초기화 실패"));
        });
    });
  });
  return gapiInitPromise;
}

async function ensureGoogleScripts(): Promise<void> {
  await loadScript("https://apis.google.com/js/api.js", "ping-gapi");
  await loadScript("https://accounts.google.com/gsi/client", "ping-gis");
}

function connectionsToPickerRows(connections: PeopleConnection[]): BulkRecipientRow[] {
  const pickerRows: BulkRecipientRow[] = [];
  const seenPhones = new Set<string>();
  for (const contact of connections) {
    let displayName = "";
    if (contact.names?.length) {
      const nm = contact.names[0]!;
      displayName = (
        nm.displayName ||
        nm.displayNameLastFirst ||
        nm.givenName ||
        nm.familyName ||
        ""
      ).trim();
    }
    if (!contact.phoneNumbers?.length) continue;
    for (const phone of contact.phoneNumbers) {
      const normalized = normalizeKoreanPhoneForSms(phone?.value);
      if (!normalized || seenPhones.has(normalized)) continue;
      seenPhones.add(normalized);
      const label = displayName ? `${displayName} · ${normalized}` : normalized;
      pickerRows.push({
        phone: normalized,
        label,
        ...(displayName ? { name: displayName } : {}),
      });
    }
  }
  return pickerRows;
}

async function fetchAllGoogleConnections(): Promise<PeopleConnection[]> {
  const connections: PeopleConnection[] = [];
  let pageToken: string | null = null;
  do {
    const req: Record<string, unknown> = {
      resourceName: "people/me",
      pageSize: GOOGLE_CONTACTS_PAGE_SIZE,
      personFields: "names,phoneNumbers",
    };
    if (pageToken) req.pageToken = pageToken;
    const response = await window.gapi!.client.people.people.connections.list(req);
    if (!response?.result) {
      throw new Error("API 응답이 올바르지 않습니다.");
    }
    const batch = (response.result.connections || []) as PeopleConnection[];
    connections.push(...batch);
    pageToken = (response.result.nextPageToken as string | undefined) || null;
  } while (pageToken);
  return connections;
}

function gisErrorMessage(type: string): string {
  if (type === "popup_failed_to_open") {
    return "구글 로그인 창을 열 수 없습니다.\n브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.";
  }
  if (type === "popup_closed") {
    return "로그인 창이 닫혔습니다.\n다시 시도해 주세요.";
  }
  return "구글 인증을 시작할 수 없습니다.\n팝업 차단 여부를 확인하거나 잠시 후 다시 시도해 주세요.";
}

function tokenErrorMessage(error: string): string {
  if (error === "popup_closed_by_user") {
    return "로그인 창이 닫혔습니다.\n\n다시 시도해주세요.";
  }
  if (error === "access_denied") {
    return (
      "권한이 거부되었습니다.\n\n" +
      "Google Cloud Console에서 OAuth 동의 화면·테스트 사용자를 확인해 주세요."
    );
  }
  return `구글 인증에 실패했습니다.\n\n오류: ${error}`;
}

function apiErrorMessage(err: { status?: number; message?: string }): string {
  if (err.status === 403) {
    return "연락처 접근 권한이 없습니다.\nOAuth 동의 화면과 테스트 사용자 설정을 확인해 주세요.";
  }
  if (err.status === 401) {
    return "인증이 만료되었습니다.\n다시 로그인하여 권한을 승인해주세요.";
  }
  if (err.status === 400) {
    return "잘못된 요청입니다.\nAPI 파라미터를 확인하세요.";
  }
  return err.message
    ? `구글 연락처를 가져오는 중 오류가 발생했습니다.\n\n오류: ${err.message}`
    : "구글 연락처를 가져오는 중 오류가 발생했습니다.";
}

/**
 * GIS OAuth + People API — 제외 모달용 행 목록. 사용자 취소·설정 미비 시 reject.
 */
export function fetchGoogleContactPickerRows(): Promise<BulkRecipientRow[]> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      fn();
    };

    const watchdog = setTimeout(() => {
      finish(() => reject(new Error("구글 연락처 요청 시간이 초과되었습니다. 다시 시도해 주세요.")));
    }, FLOW_WATCHDOG_MS);

    void (async () => {
      try {
        const { clientId, apiKey } = await loadGoogleConfig();
        if (
          !clientId ||
          !apiKey ||
          clientId === CLIENT_ID_PLACEHOLDER ||
          apiKey === API_KEY_PLACEHOLDER
        ) {
          finish(() =>
            reject(
              new Error(
                "구글 연락처 기능을 사용하려면 Google API 설정이 필요합니다.\n\n파일 업로드로 명단을 올려 주세요.",
              ),
            ),
          );
          return;
        }

        await ensureGoogleScripts();
        if (!window.google?.accounts?.oauth2) {
          finish(() =>
            reject(new Error("Google Identity Services가 로드되지 않았습니다.\n페이지를 새로고침해 주세요.")),
          );
          return;
        }

        if (!tokenClient) {
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GOOGLE_SCOPES,
            error_callback: (gisErr: { type?: string }) => {
              finish(() => reject(new Error(gisErrorMessage(String(gisErr?.type || "")))));
            },
            callback: (tokenResponse: TokenResponse) => {
              void (async () => {
                try {
                  if (!tokenResponse) {
                    finish(() => reject(new Error("구글 인증 응답이 비어 있습니다.")));
                    return;
                  }
                  if (tokenResponse.error) {
                    finish(() => reject(new Error(tokenErrorMessage(tokenResponse.error!))));
                    return;
                  }
                  const accessToken = tokenResponse.access_token;
                  if (!accessToken) {
                    finish(() => reject(new Error("구글 인증 토큰을 받지 못했습니다.")));
                    return;
                  }
                  await ensureGapiClient(apiKey);
                  window.gapi!.client.setToken(tokenResponse);
                  const connections = await fetchAllGoogleConnections();
                  const withPhone = connections.filter(
                    (c) => c.phoneNumbers && c.phoneNumbers.length > 0,
                  );
                  if (!withPhone.length) {
                    finish(() =>
                      reject(
                        new Error(
                          "가져온 연락처 중 전화번호가 있는 연락처가 없습니다.\n\nGoogle Contacts를 확인해 주세요.",
                        ),
                      ),
                    );
                    return;
                  }
                  const pickerRows = connectionsToPickerRows(withPhone);
                  if (!pickerRows.length) {
                    finish(() =>
                      reject(
                        new Error(
                          "가져온 연락처 중 유효한 휴대폰 번호가 없습니다.\n\n번호 형식을 확인해 주세요.",
                        ),
                      ),
                    );
                    return;
                  }
                  finish(() => resolve(pickerRows));
                } catch (cbErr: unknown) {
                  const st =
                    cbErr && typeof cbErr === "object" && "status" in cbErr
                      ? (cbErr as { status?: number; message?: string })
                      : {};
                  finish(() =>
                    reject(
                      new Error(
                        apiErrorMessage({
                          status: st.status,
                          message: cbErr instanceof Error ? cbErr.message : undefined,
                        }),
                      ),
                    ),
                  );
                }
              })();
            },
          });
        }

        try {
          tokenClient.requestAccessToken({ prompt: "consent" });
        } catch {
          finish(() => reject(new Error("구글 로그인 요청을 보낼 수 없습니다.")));
        }
      } catch (err: unknown) {
        finish(() =>
          reject(
            err instanceof Error
              ? err
              : new Error("구글 연락처를 가져오는 중 오류가 발생했습니다."),
          ),
        );
      }
    })();
  });
}

declare global {
  interface Window {
    __PING_GOOGLE_CONFIG__?: { clientId?: string; apiKey?: string };
    gapi?: {
      load: (name: string, cb: () => void) => void;
      client: {
        init: (cfg: { apiKey: string; discoveryDocs: string[] }) => Promise<void>;
        setToken: (t: TokenResponse) => void;
        people: {
          people: {
            connections: {
              list: (req: Record<string, unknown>) => Promise<{
                result?: { connections?: PeopleConnection[]; nextPageToken?: string };
              }>;
            };
          };
        };
      };
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            error_callback?: (e: { type?: string }) => void;
            callback: (t: TokenResponse) => void;
          }) => { requestAccessToken: (opts: { prompt?: string }) => void };
        };
      };
    };
  }
}
