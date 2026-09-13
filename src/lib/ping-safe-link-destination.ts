export type SafeLinkDestinationCategory =
  | "ping"
  | "obituary"
  | "map"
  | "public"
  | "funeral-hall";

const OBITUARY_HOSTS = [
  "samga.co.kr",
  "kakaobugo.com",
  "mbugo.com",
  "freebugo.com",
  "wooribugo.co.kr",
  "wooribugo4.com",
  "modubugo.com",
  "hanabugo.com",
  "mybugo.co.kr",
  "obituary.co.kr",
  "gugbin.co.kr",
  "yejibugo.co.kr",
  "xn--299a29t1zbi7cb3t.kr",
  "smartbugo.co.kr",
  "skyphoto7.com",
  "ebbugo.org",
] as const;

const MAP_HOSTS = [
  "map.naver.com",
  "map.kakao.com",
  "maps.google.com",
  "www.google.com",
] as const;

const PING_HOSTS = ["ping.funexcloud.com"] as const;
const PUBLIC_HOSTS = ["gov.kr"] as const;

function normalizeHost(value: string): string {
  try {
    return new URL(`https://${String(value || "").trim()}`).hostname
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return "";
  }
}

function configuredHosts(name: string): string[] {
  return String(process.env[name] || "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);
}

function hostMatchesBase(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`);
}

function matchesAny(host: string, bases: readonly string[]): boolean {
  return bases.some((base) => hostMatchesBase(host, normalizeHost(base)));
}

function isGovernmentHost(host: string): boolean {
  return (
    matchesAny(host, PUBLIC_HOSTS) ||
    host.endsWith(".go.kr") ||
    configuredHosts("PING_SAFE_LINK_PUBLIC_HOSTS").some((base) =>
      hostMatchesBase(host, base),
    )
  );
}

function classifyHost(
  host: string,
  pathname: string,
): SafeLinkDestinationCategory | null {
  if (
    matchesAny(host, PING_HOSTS) ||
    configuredHosts("PING_SAFE_LINK_INTERNAL_HOSTS").some((base) =>
      hostMatchesBase(host, base),
    )
  ) {
    return "ping";
  }
  if (
    matchesAny(host, OBITUARY_HOSTS) ||
    configuredHosts("PING_SAFE_LINK_OBITUARY_HOSTS").some((base) =>
      hostMatchesBase(host, base),
    )
  ) {
    return "obituary";
  }
  if (matchesAny(host, MAP_HOSTS)) {
    if (hostMatchesBase(host, "google.com") && !pathname.startsWith("/maps")) {
      return null;
    }
    return "map";
  }
  if (isGovernmentHost(host)) return "public";
  if (
    configuredHosts("PING_SAFE_LINK_FUNERAL_HALL_HOSTS").some((base) =>
      hostMatchesBase(host, base),
    )
  ) {
    return "funeral-hall";
  }
  return null;
}

export function validateSafeLinkDestination(
  value: unknown,
):
  | {
      ok: true;
      url: string;
      hostname: string;
      category: SafeLinkDestinationCategory;
    }
  | { ok: false; reason: string } {
  if (typeof value !== "string" || !value.trim() || /\s/.test(value.trim())) {
    return { ok: false, reason: "invalid_url" };
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "https_required" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "credentials_not_allowed" };
  }
  if (parsed.port && parsed.port !== "443") {
    return { ok: false, reason: "port_not_allowed" };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const category = classifyHost(hostname, parsed.pathname);
  if (!category) {
    return { ok: false, reason: "host_not_allowed" };
  }

  parsed.hash = "";
  return { ok: true, url: parsed.toString(), hostname, category };
}
