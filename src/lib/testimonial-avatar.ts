export type TestimonialAuthorType =
  | "funeral_director"
  | "funeral_hall_staff"
  | "mourner"
  | "general";

const AUTHOR_TYPE_BY_VOICE_NAME: Record<string, TestimonialAuthorType> = {
  장례지도사: "funeral_director",
  장례식장: "funeral_hall_staff",
  "상주·유가족": "mourner",
  "일반 이용": "general",
};

const AVATAR_LABEL: Record<TestimonialAuthorType, string> = {
  funeral_director: "장",
  funeral_hall_staff: "식",
  mourner: "유",
  general: "이",
};

const AVATAR_ACCENT: Record<TestimonialAuthorType, string> = {
  funeral_director: "#0056f3",
  funeral_hall_staff: "#0d9488",
  mourner: "#6366f1",
  general: "#64748b",
};

export function testimonialAvatarDataUri(
  label: string,
  accent: string,
): string {
  const char = label.charAt(0) || "·";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150" role="img" aria-hidden="true"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.16"/><stop offset="100%" stop-color="${accent}" stop-opacity="0.38"/></linearGradient></defs><circle cx="75" cy="75" r="75" fill="url(#g)"/><circle cx="75" cy="75" r="72" fill="#f8fafc"/><text x="75" y="88" text-anchor="middle" font-family="Pretendard, Noto Sans KR, sans-serif" font-size="52" font-weight="700" fill="${accent}">${char}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function testimonialAvatarForAuthorType(
  authorType: TestimonialAuthorType,
): string {
  return testimonialAvatarDataUri(
    AVATAR_LABEL[authorType],
    AVATAR_ACCENT[authorType],
  );
}

export const TESTIMONIAL_AVATAR_BY_AUTHOR_TYPE: Record<
  TestimonialAuthorType,
  string
> = {
  funeral_director: testimonialAvatarForAuthorType("funeral_director"),
  funeral_hall_staff: testimonialAvatarForAuthorType("funeral_hall_staff"),
  mourner: testimonialAvatarForAuthorType("mourner"),
  general: testimonialAvatarForAuthorType("general"),
};

export function testimonialAvatarForVoiceName(name: string): string {
  const authorType = AUTHOR_TYPE_BY_VOICE_NAME[name] || "general";
  return testimonialAvatarForAuthorType(authorType);
}
