export function LandingTestimonialsPanel() {
  const items = [
    "부고 링크만 붙여넣으면 바로 정리돼서 편했습니다.",
    "발송 전 확인 흐름이 단순해서 현장에서 쓰기 좋았습니다.",
    "결제와 결과 확인까지 한 화면에서 이어져 안심됐습니다.",
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((quote) => (
        <blockquote key={quote} className="rounded-2xl border bg-white p-4 text-sm leading-6 text-slate-700">
          “{quote}”
        </blockquote>
      ))}
    </div>
  );
}
