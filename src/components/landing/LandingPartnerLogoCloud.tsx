"use client";

import { LogoCloud } from "@/components/ui/logo-cloud-3";
import { cn } from "@/lib/utils";

const logos = [
  {
    src: "https://svgl.app/library/nvidia-wordmark-light.svg",
    alt: "Nvidia Logo",
  },
  {
    src: "https://svgl.app/library/supabase_wordmark_light.svg",
    alt: "Supabase Logo",
  },
  {
    src: "https://svgl.app/library/openai_wordmark_light.svg",
    alt: "OpenAI Logo",
  },
  {
    src: "https://svgl.app/library/turso-wordmark-light.svg",
    alt: "Turso Logo",
  },
  {
    src: "https://svgl.app/library/vercel_wordmark.svg",
    alt: "Vercel Logo",
  },
  {
    src: "https://svgl.app/library/github_wordmark_light.svg",
    alt: "GitHub Logo",
  },
  {
    src: "https://svgl.app/library/claude-ai-wordmark-icon_light.svg",
    alt: "Claude AI Logo",
  },
  {
    src: "https://svgl.app/library/clerk-wordmark-light.svg",
    alt: "Clerk Logo",
  },
];

/** shadcn LogoCloud demo — `#start` 히어로 배너 바로 아래 */
export function LandingPartnerLogoCloud() {
  return (
    <section className="landing-partner-logo-cloud">
      <div className="ping-saas-shell">
        <div className="relative mx-auto max-w-3xl">
          <h2 className="mb-5 text-center font-medium text-xl tracking-tight text-foreground md:text-3xl">
            <span className="text-muted-foreground">Trusted by experts.</span>
            <br />
            <span className="font-semibold">Used by the leaders.</span>
          </h2>
          <div
            className={cn(
              "mx-auto my-5 h-px max-w-sm bg-border",
              "[mask-image:linear-gradient(to_right,transparent,black,transparent)]",
            )}
          />
          <LogoCloud logos={logos} />
          <div
            className={cn(
              "mt-5 h-px bg-border",
              "[mask-image:linear-gradient(to_right,transparent,black,transparent)]",
            )}
          />
        </div>
      </div>
    </section>
  );
}
