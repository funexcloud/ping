import {
  hasPendingBulkRecipients,
  hydratePingFromIndexFromUser,
} from "@/lib/ping-bulk-session";
import { navigateToBulkCheckoutPrepare } from "@/lib/ping-bulk-checkout-prep";
import { markCheckoutWelcomePending } from "@/lib/ping-member-welcome-bonus";

/** 회원가입/로그인 후 `next` 쿼리 — 마이페이지 합류 여부 */
export function isMypageNextParam(value: string | null): boolean {
  if (value == null || value === "") return false;
  const v = String(value).trim();
  if (
    v === "mypage" ||
    v === "mypage.html" ||
    v === "/mypage.html" ||
    v === "/mypage/points" ||
    v === "mypage/points"
  )
    return true;
  if (v === "/mypage" || v === "/mypage/condolence") return true;
  if (v.includes("mypage/condolence")) return true;
  return false;
}

/** 레거시 HTML 기준 상위 경로 `../file` → 루트 절대 경로 */
export function goToRootPath(path: string) {
  const p = path.replace(/^\//, "");
  window.location.href = `/${p}`;
}

/** 이메일·카카오 회원 로그인 성공 후 공통 이동 */
export function runAfterMemberLoginSuccess(nextParam: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (isMypageNextParam(nextParam)) {
      const raw = nextParam;
      let dest = "/mypage/points";
      if (raw) {
        const nr = String(raw).trim();
        if (
          nr === "/mypage/condolence" ||
          nr === "mypage/condolence" ||
          nr.includes("condolence")
        ) {
          dest = "mypage/condolence";
        } else if (nr === "/mypage" || nr === "mypage") {
          dest = "mypage";
        }
      }
      goToRootPath(dest);
      return;
    }
    if (hasPendingBulkRecipients()) {
      sessionStorage.setItem("ping_bulk_identity_ok", "1");
      try {
        const authRaw = sessionStorage.getItem("ping_auth_user");
        const authUser = authRaw
          ? (JSON.parse(authRaw) as Record<string, unknown>)
          : null;
        if (authUser) hydratePingFromIndexFromUser(authUser);
      } catch {
        /* noop */
      }
      markCheckoutWelcomePending();
      navigateToBulkCheckoutPrepare();
      return;
    }
  } catch {
    /* noop */
  }
  goToRootPath("obituary-create");
}
