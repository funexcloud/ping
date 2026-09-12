export function ResearchFlowStages() {
  const stages = [
    { num: "01", label: "부고 링크 분석", caption: "복잡한 URL 자동 파싱 및 고인 정보 추출" },
    { num: "02", label: "스마트 검증", caption: "스미싱 의심 없는 안심 링크 및 본문 자동 구성" },
    { num: "03", label: "2분 대량 발송", caption: "연락처 업로드 후 알림톡·SMS 즉시 발송" },
    { num: "04", label: "부의금·답례 연결", caption: "발송 후 디지털 방명록 및 답례 문자 연계" },
  ];

  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 my-8">
      {stages.map((stage) => (
        <li key={stage.num} className="list-none">
          <article className="old-way-flow__card ping-bordered-panel h-full flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-blue-200">
            <div>
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[var(--ping-primary,#0056f3)]">
                {stage.num}
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-900 tracking-tight">{stage.label}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{stage.caption}</p>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
