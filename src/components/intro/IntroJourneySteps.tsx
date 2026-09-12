export function IntroJourneySteps({ benefitsMode = "grid" }: { benefitsMode?: "grid" | "scroll" }) {
  const steps = [
    ["01", "부고 준비", "전할 부고 내용을 준비합니다."],
    ["02", "연락처 가져오기", "스마트폰 주소록에서 연락처를 불러와 보낼 사람을 고릅니다."],
    ["03", "한 번에 발송", "선택한 사람에게 보내고 전달 결과를 확인합니다."],
  ];
  return (
    <div className={benefitsMode === "scroll" ? "grid gap-4" : "grid gap-4 md:grid-cols-3"}>
      {steps.map(([no, title, desc]) => (
        <article key={no} className="rounded-2xl border bg-white p-4">
          <span className="text-xs font-bold text-ping-primary">{no}</span>
          <h3 className="mt-2 font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p>
        </article>
      ))}
    </div>
  );
}

export function IntroFeaturesGrid() {
  return <IntroJourneySteps />;
}
