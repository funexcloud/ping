import { PingLoadingSpinner } from "@/components/ping-loading-spinner";

type PingPageLoadingProps = {
  label?: string;
  /** 전체 화면 높이로 중앙 정렬 (Suspense fallback 기본값) */
  fullscreen?: boolean;
};

/** 페이지 단위 로딩 화면 — 슬릭 스피너 중앙 정렬 (Suspense fallback 공용) */
export function PingPageLoading({
  label = "불러오는 중",
  fullscreen = true,
}: PingPageLoadingProps) {
  return (
    <div
      className={`font-ping flex w-full flex-col items-center justify-center gap-3 bg-ping-bg${
        fullscreen ? " min-h-dvh" : " py-16"
      }`}
    >
      <PingLoadingSpinner size="lg" label={label} />
    </div>
  );
}
