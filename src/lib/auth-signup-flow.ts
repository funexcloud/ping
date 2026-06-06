export type SignupMethod = "kakao" | "guest" | "email";
export type JoinType = "general" | "group" | "admin";

const JOIN_TYPES = new Set<JoinType>(["general", "group", "admin"]);
const SIGNUP_METHODS = new Set<SignupMethod>(["kakao", "guest", "email"]);

export function normalizeJoinType(value: string | null | undefined): JoinType {
  const j = String(value || "general").trim() as JoinType;
  return JOIN_TYPES.has(j) ? j : "general";
}

export function normalizeSignupMethod(
  value: string | null | undefined,
): SignupMethod | null {
  const m = String(value || "").trim() as SignupMethod;
  return SIGNUP_METHODS.has(m) ? m : null;
}

export function buildAuthSignupQuery(params: {
  method?: SignupMethod | null;
  join?: JoinType | null;
  next?: string | null;
}): string {
  const q = new URLSearchParams();
  if (params.method) q.set("method", params.method);
  if (params.join) q.set("join", params.join);
  if (params.next) q.set("next", params.next);
  return q.toString();
}

/** `/login` 등 진입 후 이메일·비밀번호 회원 로그인 */
export function memberLoginEmailHref(next?: string | null): string {
  const q = new URLSearchParams();
  q.set("from", "entry");
  q.set("method", "email");
  if (next) q.set("next", next);
  return `/member-login?${q.toString()}`;
}

export function signupJoinTypeHref(
  method: SignupMethod,
  next?: string | null,
): string {
  const q = buildAuthSignupQuery({ method, next });
  return q ? `/obituary-signup-join-type?${q}` : "/obituary-signup-join-type";
}

export function signupTermsHref(
  method: SignupMethod,
  join: JoinType,
  next?: string | null,
): string {
  const q = buildAuthSignupQuery({ method, join, next });
  return `/obituary-signup-terms?${q}`;
}

export function signupRegisterHref(
  join: JoinType,
  next?: string | null,
): string {
  const q = buildAuthSignupQuery({ method: "email", join, next });
  return `/obituary-signup-register?${q}`;
}

export function signupGuestVerifyHref(
  join: JoinType,
  next?: string | null,
): string {
  const q = buildAuthSignupQuery({ method: "guest", join, next });
  return `/obituary-guest-verify?${q}`;
}
