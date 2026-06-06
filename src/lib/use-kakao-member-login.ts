"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { runAfterMemberLoginSuccess } from "@/lib/auth-redirect";
import {
  parseMemberFetchJson,
  resolveMemberAuthApiUrl,
} from "@/lib/member-auth-client";

const MSG = {
  network:
    "서버에 연결할 수 없습니다. 로컬에서는 npm run dev 로 서버를 실행해 주세요.",
  kakaoFail: "카카오싱크 연동에 실패했습니다. 다시 시도해 주세요.",
};

export type UseKakaoMemberLoginOptions = {
  nextParam: string | null;
  /** OAuth 완료 후 돌아올 경로 (예: `/login`, `/member-login?from=entry`) */
  returnPath: string;
  /** 신규 가입 시 회원 유형 — `/api/auth/kakao/authorize?join_type=` */
  joinTypeParam?: string | null;
  enabled?: boolean;
};

export function useKakaoMemberLogin({
  nextParam,
  returnPath,
  joinTypeParam,
  enabled = true,
}: UseKakaoMemberLoginOptions) {
  const [formError, setFormError] = useState<string | null>(null);
  const [kakaoBusy, setKakaoBusy] = useState(false);
  const [kakaoExchangeBusy, setKakaoExchangeBusy] = useState(false);
  const kakaoExchangeStartedRef = useRef(false);

  const afterLoginSuccess = useCallback(() => {
    runAfterMemberLoginSuccess(nextParam);
  }, [nextParam]);

  const persistSession = useCallback((token: string, user: unknown) => {
    sessionStorage.setItem("ping_auth_token", token);
    sessionStorage.setItem("ping_auth_user", JSON.stringify(user));
  }, []);

  const clearKakaoQueryParams = useCallback(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("kakao_code");
      u.searchParams.delete("kakao_error");
      window.history.replaceState({}, "", `${u.pathname}${u.search}`);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const kakaoErrorParam = params.get("kakao_error");
    if (!kakaoErrorParam) return;
    setFormError(decodeURIComponent(kakaoErrorParam));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const kakaoCodeParam = params.get("kakao_code");
    if (!kakaoCodeParam || kakaoExchangeStartedRef.current) return;

    kakaoExchangeStartedRef.current = true;
    setKakaoExchangeBusy(true);
    setFormError(null);

    void (async () => {
      try {
        const r = await fetch(resolveMemberAuthApiUrl("/api/auth/kakao/exchange"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: kakaoCodeParam }),
        });
        const { httpOk, data } = await parseMemberFetchJson(r);
        if (!httpOk || data.ok !== true || typeof data.token !== "string") {
          setFormError(
            (typeof data.error === "string" && data.error) || MSG.kakaoFail,
          );
          setKakaoExchangeBusy(false);
          return;
        }
        persistSession(data.token, data.user);
        clearKakaoQueryParams();
        afterLoginSuccess();
      } catch {
        setFormError(MSG.network);
        setKakaoExchangeBusy(false);
      }
    })();
  }, [enabled, afterLoginSuccess, clearKakaoQueryParams, persistSession]);

  const kakaoAuthorizeUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("return_path", returnPath);
    if (nextParam) params.set("next", nextParam);
    const join = String(joinTypeParam || "").trim();
    if (join) params.set("join_type", join);
    if (typeof window !== "undefined") {
      params.set("return_origin", window.location.origin);
    }
    return resolveMemberAuthApiUrl(`/api/auth/kakao/authorize?${params.toString()}`);
  }, [nextParam, returnPath, joinTypeParam]);

  const onKakaoLoginClick = useCallback(() => {
    if (kakaoBusy || kakaoExchangeBusy) return;
    setFormError(null);
    setKakaoBusy(true);
    window.location.href = kakaoAuthorizeUrl;
  }, [kakaoAuthorizeUrl, kakaoBusy, kakaoExchangeBusy]);

  return {
    formError,
    kakaoBusy,
    kakaoExchangeBusy,
    onKakaoLoginClick,
  };
}
