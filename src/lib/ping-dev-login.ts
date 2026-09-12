import {
  parseMemberFetchJson,
  resolveMemberAuthApiUrl,
} from "@/lib/member-auth-client";
import {
  isPingDevCondolenceTourLocation,
  isPingDevFlowSkipEnabled,
  markPingDevFlowPreview,
  pingDevGoIdentityHref,
  pingDevLoginContinueHrefFromLocation,
  seedPingDevBulkPreviewSession,
} from "@/lib/ping-dev-flow-skip";
import {
  persistPingMemberSession,
} from "@/lib/ping-member-session-client";

/** 로컬 개발 전용 — `dev@ping.local` 세션을 만들고 다음 화면으로 이어 간다. */
export async function pingDevLoginAndContinue(): Promise<boolean> {
  if (typeof window === "undefined" || !isPingDevFlowSkipEnabled()) return false;

  markPingDevFlowPreview();
  const condolence = isPingDevCondolenceTourLocation(
    window.location.pathname,
    window.location.search,
  );
  if (!condolence) seedPingDevBulkPreviewSession();

  let r: Response;
  try {
    r = await fetch(resolveMemberAuthApiUrl("/api/auth/dev-login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    window.alert(
      "개발 로그인에 실패했습니다. npm run dev 로 Express·Next가 켜져 있는지 확인해 주세요.",
    );
    return false;
  }
  const { httpOk, data } = await parseMemberFetchJson(r);
  if (!httpOk || data.ok !== true || typeof data.token !== "string") {
    const code = typeof data.error === "string" ? data.error : "";
    window.alert(
      code === "member_store_unavailable"
        ? "회원 저장소에 연결하지 못했습니다. 로컬에서는 npm run dev를 다시 시작해 주세요."
        : (typeof data.error === "string" && data.error) ||
          "개발 로그인에 실패했습니다. npm run dev 로 Express·Next가 켜져 있는지 확인해 주세요.",
    );
    return false;
  }

  if (!persistPingMemberSession(data.token, data.user)) {
    window.alert("로그인 세션을 저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.");
    return false;
  }

  pingDevGoIdentityHref(
    pingDevLoginContinueHrefFromLocation(
      window.location.pathname,
      window.location.search,
    ),
  );
  return true;
}
