import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import { LANDING_HERO_PREVIEW, LANDING_RESEARCH_STAGES, LANDING_SECTION_EYEBROWS, LANDING_TITLE_BREAKS } from "@/content/landing/landing-config";

const SHIFT_FLOW_STEPS = [
  {
    key: "paste",
    label: "부고 준비",
    caption: "링크 입력 또는 작성",
  },
  {
    key: "parse",
    label: "연락처 가져오기",
    caption: "주소록에서 불러오기",
  },
  {
    key: "dispatch",
    label: "한 번에 전달",
    caption: "대상 선택 후 발송",
  },
] as const;

function PasteSkeleton() {
  return (
    <div className="old-way-flow__mock old-way-flow__mock--paste" aria-hidden>
      <div className="shift-flow__bounce-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ParseSkeleton() {
  return (
    <div className="old-way-flow__mock old-way-flow__mock--parse" aria-hidden>
      {LANDING_HERO_PREVIEW.rows.slice(0, 3).map((row) => (
        <div key={row.label} className="shift-flow__row">
          <span className="shift-flow__row-label">{row.label}</span>
          <div className="old-way-flow__bar old-way-flow__bar--line" />
        </div>
      ))}
    </div>
  );
}

function DispatchSkeleton() {
  return (
    <div className="old-way-flow__mock old-way-flow__mock--dispatch" aria-hidden>
      <p className="shift-flow__count-tag">결과 확인</p>
      <div className="shift-flow__progress">
        <span className="shift-flow__progress-fill" />
      </div>
      <p className="shift-flow__time-tag">한 번에 전달</p>
    </div>
  );
}

const MOCK_BY_KEY = {
  paste: PasteSkeleton,
  parse: ParseSkeleton,
  dispatch: DispatchSkeleton,
} as const;

type ShiftFlowSwipeProps = {
  hideHeader?: boolean;
};

/** 연구 3단계 — 부고 준비 → 연락처 → 전달 */
export function ShiftFlowSwipe({ hideHeader = false }: ShiftFlowSwipeProps) {
  return (
    <div className="research-stage research-stage--flow old-way-flow shift-flow">
      {!hideHeader ? (
        <div className="ping-saas-shift-iteration__head">
          <p className="ping-saas-label">{LANDING_SECTION_EYEBROWS.product}</p>
          <LandingDisplayTitle
            as="p"
            className="ping-saas-shift-iteration__title"
            title={LANDING_RESEARCH_STAGES.build.title}
            breakAfter={LANDING_TITLE_BREAKS.product}
          />
          <p className="ping-saas-shift-iteration__lead">{LANDING_RESEARCH_STAGES.build.lead}</p>
        </div>
      ) : null}
      <ol className="old-way-flow__list" aria-label="만든 발송 흐름">
        {SHIFT_FLOW_STEPS.map((step, index) => {
          const Mock = MOCK_BY_KEY[step.key];
          return (
            <li key={step.key} className="old-way-flow__item">
              <article className="old-way-flow__card ping-bordered-panel">
                <p className="old-way-flow__step-num">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="old-way-flow__step-label">{step.label}</h3>
                <p className="old-way-flow__step-caption">{step.caption}</p>
                <Mock />
              </article>
              {index < SHIFT_FLOW_STEPS.length - 1 ? (
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
