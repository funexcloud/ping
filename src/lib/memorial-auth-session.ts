export const MEMORIAL_AUTH_KEY = "memorial_hall_auth";
export const MEMORIAL_AUTH_PHONE_KEY = "memorial_hall_auth_phone";

export function isMemorialAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const isDevMode =
    new URLSearchParams(window.location.search).get("dev") === "true";
  if (isLocalhost || isDevMode) return true;
  return sessionStorage.getItem(MEMORIAL_AUTH_KEY) === "authenticated";
}

export function setMemorialAuthenticated(phone: string): void {
  sessionStorage.setItem(MEMORIAL_AUTH_KEY, "authenticated");
  sessionStorage.setItem(MEMORIAL_AUTH_PHONE_KEY, phone);
}

export function clearMemorialAuth(): void {
  sessionStorage.removeItem(MEMORIAL_AUTH_KEY);
  sessionStorage.removeItem(MEMORIAL_AUTH_PHONE_KEY);
}
