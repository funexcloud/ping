export type AgentPlanningStep = {
  title: string;
  description?: string;
};

export function buildShiftPlanningSteps(shift: {
  beforeItems?: string[];
  afterItems?: string[];
}): AgentPlanningStep[] {
  const before = shift.beforeItems?.[0] || "복잡한 수기 확인";
  const after = shift.afterItems?.[0] || "자동화된 단계 안내";
  return [
    { title: "기존 불편 확인", description: before },
    { title: "핵심 단계만 남김", description: after },
    { title: "발송 결과까지 연결", description: "확인·결제·완료 화면을 한 흐름으로 이어갑니다." },
  ];
}

export default function AgentPlanning({
  title,
  steps,
}: {
  title: string;
  steps: AgentPlanningStep[];
}) {
  return (
    <section className="ping-bordered-panel rounded-3xl bg-white/90 backdrop-blur-md p-6 border border-slate-200/80 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={`${step.title}-${index}`}
            className="flex flex-col justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 transition-all duration-200 hover:bg-white hover:border-blue-100 hover:shadow-sm"
          >
            <div>
              <span className="inline-block text-xs font-bold text-[var(--ping-primary,#0056f3)] mb-1">
                Step 0{index + 1}
              </span>
              <strong className="block text-sm font-bold text-slate-900">{step.title}</strong>
              {step.description ? (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{step.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
