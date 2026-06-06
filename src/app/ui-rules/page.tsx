import { UiRulesClient } from "@/app/ui-rules/ui-rules-client";
import { buildPublicMetadata } from "@/lib/ping-site-seo";

export const metadata = buildPublicMetadata({
  title: "UI 규칙 — PING 디자인 계약",
  description:
    "PING 제품 UI 토큰·레이아웃·컴포넌트 규칙과 페이지별 적용 체크리스트. ping-ui.css DESIGN CONTRACT 기준.",
  path: "/ui-rules",
  noindex: true,
});

export default function UiRulesPage() {
  return <UiRulesClient />;
}
