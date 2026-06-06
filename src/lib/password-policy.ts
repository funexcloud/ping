/** 코드·HTML과 헷갈리기 쉬운 기호는 제외한 허용 목록 */
export const ALLOWED_PASSWORD_SPECIAL_CHARS = "!@#$%*_+-?";

const ALLOWED_SPECIAL_RE = /[!@#$%*_+\-?]/;
const PASSWORD_CHAR_RE = /^[A-Za-z0-9!@#$%*_+\-?]*$/;

function formatAllowedSpecialsDisplay(): string {
  return ALLOWED_PASSWORD_SPECIAL_CHARS.split("").join(" ");
}

export const PASSWORD_POLICY_NEUTRAL_HINT = `영문·숫자·기호를 모두 넣어 8자 이상 입력해 주세요. (기호: ${formatAllowedSpecialsDisplay()})`;

export type PasswordPolicyHintKind = "neutral" | "error" | "ok";

export function getPasswordPolicyErrorClient(password: string): string | null {
  const p = String(password || "");
  if (!p) return null;
  if (!PASSWORD_CHAR_RE.test(p)) {
    return `사용할 수 없는 문자가 포함되어 있습니다. 사용 가능 기호: ${formatAllowedSpecialsDisplay()}`;
  }
  if (p.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }
  if (!/[A-Za-z]/.test(p)) {
    return "비밀번호에 영문 문자를 포함해 주세요.";
  }
  if (!/[0-9]/.test(p)) {
    return "비밀번호에 숫자를 포함해 주세요.";
  }
  if (!ALLOWED_SPECIAL_RE.test(p)) {
    return `비밀번호에 기호를 한 글자 이상 포함해 주세요. (기호: ${formatAllowedSpecialsDisplay()})`;
  }
  return null;
}

export function getPasswordPolicyHint(password: string): {
  text: string;
  kind: PasswordPolicyHintKind;
} {
  const pw = String(password || "");
  if (!pw) {
    return { text: PASSWORD_POLICY_NEUTRAL_HINT, kind: "neutral" };
  }
  const err = getPasswordPolicyErrorClient(pw);
  if (err) return { text: err, kind: "error" };
  return { text: "사용 가능한 비밀번호 형식입니다.", kind: "ok" };
}

export type PasswordStrengthLevel = "easy" | "medium" | "strong" | "high";

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  segments: 1 | 2 | 3 | 4;
  label: PasswordStrengthLevel;
};

/** Google 스타일 4단계 보안 난이도 (easy → high) */
export function getPasswordStrength(password: string): PasswordStrength | null {
  const p = String(password || "");
  if (!p) return null;

  const invalidChar = !PASSWORD_CHAR_RE.test(p);
  const hasLetter = /[A-Za-z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasDigit = /[0-9]/.test(p);
  const hasSpecial = ALLOWED_SPECIAL_RE.test(p);
  const len = p.length;
  const policyError = getPasswordPolicyErrorClient(p);

  if (invalidChar || len < 4) {
    return { level: "easy", segments: 1, label: "easy" };
  }

  const variety =
    (hasLetter ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0);

  if (len < 6 || variety < 2) {
    return { level: "easy", segments: 1, label: "easy" };
  }

  if (policyError || len < 8 || !hasLetter || !hasDigit || !hasSpecial) {
    return { level: "medium", segments: 2, label: "medium" };
  }

  const complexity =
    (len >= 10 ? 1 : 0) +
    (hasLower && hasUpper ? 1 : 0) +
    (len >= 12 ? 1 : 0) +
    (len >= 14 ? 1 : 0);

  if (complexity >= 3 || (len >= 12 && hasLower && hasUpper)) {
    return { level: "high", segments: 4, label: "high" };
  }

  if (len >= 10 || (hasLower && hasUpper)) {
    return { level: "strong", segments: 3, label: "strong" };
  }

  return { level: "strong", segments: 3, label: "strong" };
}
