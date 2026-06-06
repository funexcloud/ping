export type ObituaryMourner = {
  relation?: string;
  name?: string;
  phone?: string;
};

export type ObituaryPayload = {
  deceasedName?: string;
  gender?: string;
  age?: string | number;
  ageUnit?: string;
  exposeGender?: boolean | string | number;
  hideAge?: boolean | string | number;
  funeralHall?: string;
  funeralRoom?: string;
  burialPlace?: string;
  deathDate?: string;
  deathHour?: string;
  deathMinute?: string;
  entryDate?: string;
  entryHour?: string;
  entryMinute?: string;
  viewingDate?: string;
  viewingHour?: string;
  viewingMinute?: string;
  departureDate?: string;
  departureHour?: string;
  departureMinute?: string;
  hideMournerContact?: boolean | string | number;
  hideAccountLastDigits?: boolean | string | number;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  mourners?: ObituaryMourner[];
  mournerMessageText?: string;
  notificationMessageText?: string;
  scheduleShowOnObituary?: Record<string, boolean>;
};

export type ObituaryEntry = {
  status?: string;
  statusLabel?: string;
  obituaryId?: string;
  approvedAt?: string;
  reviewUrl?: string;
  publicUrl?: string;
  sendUrl?: string;
  salesUrl?: string;
  mortuaryUrl?: string;
  notice?: string;
  canViewFull?: boolean;
  obituary?: ObituaryPayload;
  familyPrimaryContact?: { name?: string; phone?: string };
  familyNotification?: { message?: string };
  createdAt?: string;
  updatedAt?: string;
};

export function isChecked(value: unknown): boolean {
  return (
    value === true ||
    value === "true" ||
    value === "on" ||
    value === 1 ||
    value === "1"
  );
}

export function formatDateTime(
  date?: string,
  hour?: string,
  minute?: string,
): string {
  if (!date) return "미정";
  const timeParts: string[] = [];
  if (hour) timeParts.push(`${hour}시`);
  if (minute) timeParts.push(`${minute}분`);
  return `${date}${timeParts.length ? ` ${timeParts.join(" ")}` : ""}`;
}

export function formatDateText(value?: string): string {
  if (!value) return "미정";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR");
}

export function maskAccountNumber(
  accountNumber?: string,
  hideLastDigits?: unknown,
): string {
  if (!accountNumber) return "";
  if (!isChecked(hideLastDigits)) return accountNumber;
  return accountNumber.replace(/(\d{4})$/, "****");
}

export async function fetchObituaryEntry(
  token: string,
  mode: "family" | "public",
): Promise<ObituaryEntry> {
  const { pingApiBase } = await import("@/lib/ping-api-base");
  const base = pingApiBase();
  const query = `token=${encodeURIComponent(token)}&mode=${encodeURIComponent(mode)}`;
  const response = await fetch(`${base}/getObituaryEntry?${query}`);
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  } & ObituaryEntry;
  if (!response.ok) {
    throw new Error(
      result.error || result.message || "부고 정보를 불러오지 못했습니다.",
    );
  }
  return result;
}

export async function approveObituaryEntry(
  token: string,
): Promise<ObituaryEntry> {
  const { pingApiBase } = await import("@/lib/ping-api-base");
  const base = pingApiBase();
  const response = await fetch(`${base}/approveObituaryEntry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  } & ObituaryEntry;
  if (!response.ok) {
    throw new Error(result.error || result.message || "승인 처리에 실패했습니다.");
  }
  return result;
}
