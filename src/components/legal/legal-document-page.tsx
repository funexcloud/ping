"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

function resolveReturnHref(pingReturn: string | null): string {
  const v = String(pingReturn || "")
    .toLowerCase()
    .trim();
  const map: Record<string, string> = {
    overview: "/products/ping",
    "products-ping": "/products/ping",
    "customer-center": "/customer-center",
    partnership: "/partnership",
    index: "/start",
    start: "/start",
    login: "/login",
    "member-login": "/member-login?from=entry",
    checkout: "/checkout",
  };
  return map[v] || "/start";
}

type Props = {
  title: string;
  articleHtml: string;
};

export function LegalDocumentPage({ title, articleHtml }: Props) {
  const searchParams = useSearchParams();
  const backHref = useMemo(
    () => resolveReturnHref(searchParams.get("pingReturn")),
    [searchParams],
  );

  return (
    <div className="ping-ui doc-page min-h-dvh bg-white text-[#191F28]">
      <div className="ping-doc-shell relative mx-auto max-w-3xl px-5 pb-16 pt-4">
        <Link
          href={backHref}
          className="ping-back-btn ping-doc-page-back mb-4 inline-flex touch-manipulation"
          aria-label="뒤로"
        >
          <span className="ping-chevron-left" aria-hidden="true" />
        </Link>
        <main
          className="ping-doc-article prose prose-slate max-w-none text-[15px] leading-relaxed [&_h1]:text-xl [&_h1]:font-extrabold [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-bold [&_li]:text-[#4E5968] [&_p]:text-[#4E5968]"
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />
      </div>
    </div>
  );
}
