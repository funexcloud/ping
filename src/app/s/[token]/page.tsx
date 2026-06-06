import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX, Flower2 } from "lucide-react";
import { verifySafeLinkToken } from "@/lib/ping-safe-link";
import SafeRedirectClient from "./safe-redirect-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PING · 안심 부고",
  description: "PING 안심 부고 링크입니다. 발인 후 자동으로 소멸합니다.",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ token: string }> };

function StatusScreen({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="ping-recipient-shell ping-recipient-page bg-[var(--ping-surface,#fff)]">
      <div className="flex size-16 items-center justify-center rounded-full bg-[var(--ping-bg-subtle,#f2f4f6)]">
        {icon}
      </div>
      <div className="space-y-2">
        <h1 className="ping-recipient-title">{title}</h1>
        <p className="ping-recipient-body">{body}</p>
      </div>
      <Link href="/" className="ping-recipient-cta ping-recipient-cta--secondary">
        PING 홈으로
      </Link>
    </div>
  );
}

export default async function SafeLinkPage({ params }: PageProps) {
  const { token } = await params;
  const result = await verifySafeLinkToken(token);

  if (result.ok) {
    return (
      <div className="ping-recipient-page min-h-dvh">
        <SafeRedirectClient
          destination={result.claims.u}
          deceasedName={result.claims.dn}
        />
      </div>
    );
  }

  if (result.expired) {
    const dn = result.claims?.dn;
    return (
      <div className="ping-recipient-page min-h-dvh">
        <StatusScreen
          icon={<Flower2 className="size-8 text-[var(--ping-primary,#3182f6)]" aria-hidden />}
          title="장례가 모두 무사히 끝났습니다"
          body={`${dn ? `故 ${dn}님의 ` : ""}장례 일정이 마무리되어 이 부고 링크는 자동으로 소멸되었습니다. 따뜻한 마음 전해주셔서 감사합니다.`}
        />
      </div>
    );
  }

  return (
    <div className="ping-recipient-page min-h-dvh">
      <StatusScreen
        icon={<ShieldX className="size-8 text-rose-600" aria-hidden />}
        title="확인할 수 없는 링크입니다"
        body="PING이 발급하지 않았거나 변조된 주소입니다. 스미싱 피해 예방을 위해 연결을 중단했습니다. 받으신 부고가 의심되면 보낸 분께 직접 확인해 주세요."
      />
    </div>
  );
}
