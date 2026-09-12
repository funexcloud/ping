const OLD_WAY_FLOW_STEPS = [
  {
    key: "intake",
    label: "접수",
    caption: "장례식장 · 지도사",
  },
  {
    key: "site",
    label: "부고 사이트 → 유가족",
    caption: "유가족에게 부고 발송",
  },
  {
    key: "manual",
    label: "유가족 10명씩 개별 발송",
    caption: "휴대폰에서 반복",
  },
] as const;

function IntakeSkeleton() {
  return (
    <div className="old-way-flow__mock" aria-hidden>
      <div className="old-way-flow__bar old-way-flow__bar--wide" />
      <div className="old-way-flow__bar old-way-flow__bar--mid" />
      <div className="old-way-flow__bar old-way-flow__bar--short" />
    </div>
  );
}

function SiteToFamilySkeleton() {
  return (
    <div className="old-way-flow__mock old-way-flow__mock--site" aria-hidden>
      <div className="old-way-flow__site-row">
        <div className="old-way-flow__chip" />
        <span className="old-way-flow__arrow-inline" />
        <div className="old-way-flow__avatar" />
      </div>
      <div className="old-way-flow__bubble">
        <div className="old-way-flow__bar old-way-flow__bar--wide" />
        <div className="old-way-flow__bar old-way-flow__bar--mid" />
      </div>
    </div>
  );
}

function ManualBatchSkeleton() {
  return (
    <div className="old-way-flow__mock old-way-flow__mock--batch" aria-hidden>
      <p className="old-way-flow__batch-tag">10명씩</p>
      <ul className="old-way-flow__contact-list">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="old-way-flow__contact-row">
            <div className="old-way-flow__avatar old-way-flow__avatar--sm" />
            <div className="old-way-flow__bar old-way-flow__bar--line" />
          </li>
        ))}
      </ul>
      <div className="old-way-flow__repeat">
        <span className="old-way-flow__repeat-dot" />
        <span className="old-way-flow__repeat-dot" />
        <span className="old-way-flow__repeat-dot" />
      </div>
    </div>
  );
}

const MOCK_BY_KEY = {
  intake: IntakeSkeleton,
  site: SiteToFamilySkeleton,
  manual: ManualBatchSkeleton,
} as const;

/** 옛 방식 3단계 — 접수 → 부고사이트 → 10명씩 개별 발송 (스켈레톤) */
export function OldWayFlowSkeleton() {
  return (
    <div className="old-way-flow" aria-label="지금까지의 부고 발송 흐름">
      <ol className="old-way-flow__list">
        {OLD_WAY_FLOW_STEPS.map((step, index) => {
          const Mock = MOCK_BY_KEY[step.key];
          return (
            <li key={step.key} className="old-way-flow__item">
              <article className="old-way-flow__card ping-bordered-panel">
                <p className="old-way-flow__step-num">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="old-way-flow__step-label">{step.label}</h3>
                <p className="old-way-flow__step-caption">{step.caption}</p>
                <Mock />
              </article>
              {index < OLD_WAY_FLOW_STEPS.length - 1 ? (
                <span className="old-way-flow__connector" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
