/** 숫자만 남기고, +82 → 0 접두 보정 (Contact.phone 저장 형식과 맞춤) */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}
