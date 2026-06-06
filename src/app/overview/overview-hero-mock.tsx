import { OVERVIEW_PREVIEW_ITEMS } from "@/content/seo/overview-content";

/** 히어로 3D 레이어 목업 — legacy overview.html 정적 복원 */
export function OverviewHeroMock() {
  return (
    <div className="ping-landing-hero-mock" aria-label="발송 진행 예시">
      <div className="ping-landing-hero-mock__perspective">
        <div className="ping-landing-hero-mock__stage">
          <div className="ping-landing-hero-mock__stage-inner">
            <div
              className="ping-landing-hero-mock__plate ping-landing-hero-mock__plate--back"
              aria-hidden
            >
              <div className="ping-landing-hero-mock__plate-bar" />
              <div className="ping-landing-hero-mock__plate-rows">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div
              className="ping-landing-hero-mock__plate ping-landing-hero-mock__plate--mid"
              aria-hidden
            >
              <div className="ping-landing-hero-mock__plate-bar" />
              <div className="ping-landing-hero-mock__plate-rows">
                <span />
                <span />
                <span />
              </div>
            </div>
            <aside className="ping-landing-mock-card ping-landing-hero-mock__plate--front">
              <div className="ping-landing-mock-card__top">
                <span>발송 진행 보드</span>
                <span className="ping-landing-mock-card__pill">실시간</span>
              </div>
              <ul className="ping-landing-mock-card__list">
                {OVERVIEW_PREVIEW_ITEMS.map((item) => (
                  <li key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
