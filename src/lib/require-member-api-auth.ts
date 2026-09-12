import { ensurePingLocalEnv } from "@/lib/ensure-ping-local-env";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type MemberAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

type MemberAuthModule = {
  parseBearer: (req: { headers: { authorization?: string; cookie?: string } }) => string;
  getUserIdFromToken: (token: string) => string | null;
  getUserIdFromRequest?: (req: { headers: { authorization?: string; cookie?: string } }) => string | null;
};

type MemberStoreModule = {
  beginRequest: () => Promise<void>;
  endRequest: () => Promise<void>;
};

async function loadMemberAuth(): Promise<MemberAuthModule> {
  ensurePingLocalEnv();
  const modPath = path.join(process.cwd(), "member-auth.js");
  return import(/* webpackIgnore: true */ pathToFileURL(modPath).href) as Promise<MemberAuthModule>;
}

async function loadMemberStore(): Promise<MemberStoreModule> {
  const modPath = path.join(process.cwd(), "lib", "ping-member-store.cjs");
  return import(/* webpackIgnore: true */ pathToFileURL(modPath).href) as Promise<MemberStoreModule>;
}

/** 회원 세션 쿠키(`ping_auth_token`) 또는 Bearer 토큰 검증 */
export async function requireMemberApiAuth(req: Request): Promise<MemberAuthResult> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const store = await loadMemberStore();
  try {
    await store.beginRequest();
    const { parseBearer, getUserIdFromToken, getUserIdFromRequest } = await loadMemberAuth();
    const reqLike = {
      headers: {
        authorization: headers.authorization,
        cookie: headers.cookie,
      },
    };
    const userId = getUserIdFromRequest
      ? getUserIdFromRequest(reqLike)
      : getUserIdFromToken(parseBearer(reqLike));
    if (!userId) {
      return { ok: false, status: 401, error: "member_auth_required" };
    }
    return { ok: true, userId };
  } catch (error) {
    console.error("[require-member-api-auth]", error);
    return { ok: false, status: 503, error: "member_store_unavailable" };
  } finally {
    try {
      await store.endRequest();
    } catch (error) {
      console.error("[require-member-api-auth] endRequest", error);
    }
  }
}
