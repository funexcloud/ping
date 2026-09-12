"use client";

import { navigateToStartWithObituaryUrl } from "@/lib/landing-start-flow";
import { cn } from "@/lib/utils";
import { Check, Link2 } from "lucide-react";
import { useCallback, useState } from "react";

export function HeroUrlForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setPending(true);
      const result = navigateToStartWithObituaryUrl(url);
      if (!result.ok) {
        setError(result.message);
        setPending(false);
      }
    },
    [url],
  );

  return (
    <form onSubmit={onSubmit} className="ping-saas-url-form">
      <div className="ping-saas-url-form__row">
        <div className="ping-saas-url-input-wrap">
          <Link2 className="ping-saas-url-input-icon" aria-hidden />
          <input
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="부고 URL을 붙여넣어 주세요"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            className={cn("ping-saas-url-input", error && "ping-saas-url-input--invalid")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "hero-url-error" : undefined}
          />
        </div>
        <button type="submit" disabled={pending} className="ping-saas-url-submit">
          {pending ? "이동 중…" : "부고 보내기 시작"}
        </button>
      </div>
      {error ? (
        <p id="hero-url-error" className="ping-saas-url-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

const TRUST_ITEMS = ["회원가입 없이", "보낸 만큼만 결제", "개인정보 안전"] as const;

export function HeroTrustMicrocopy({ className }: { className?: string }) {
  return (
    <ul className={cn("ping-saas-trust", className)}>
      {TRUST_ITEMS.map((label) => (
        <li key={label}>
          <Check aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}
