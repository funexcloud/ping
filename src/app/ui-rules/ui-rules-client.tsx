"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BulkFlowLogoBar } from "@/components/bulk/bulk-flow-logo-bar";
import {
  countRolloutProgress,
  getRuleById,
  UI_DESIGN_TOKENS,
  UI_ROLLOUT_GROUP_LABEL,
  UI_ROLLOUT_PAGES,
  UI_RULE_CATEGORY_LABEL,
  UI_RULES,
  UI_RULES_STORAGE_KEY,
  type UiRolloutStatus,
} from "@/lib/ping-ui-rules-data";

import "./ui-rules.css";

type RolloutFilter = "all" | UiRolloutStatus;

const STATUS_LABEL: Record<UiRolloutStatus, string> = {
  todo: "대기",
  in_progress: "진행 중",
  done: "완료",
};

const NAV_ITEMS = [
  { id: "tokens", label: "토큰" },
  { id: "rules", label: "규칙 10개" },
  { id: "demos", label: "라이브 예시" },
  { id: "rollout", label: "페이지 적용" },
] as const;

function loadStatusMap(): Record<string, UiRolloutStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(UI_RULES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, UiRolloutStatus>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function UiRulesClient() {
  const [statusMap, setStatusMap] = useState<Record<string, UiRolloutStatus>>({});
  const [filter, setFilter] = useState<RolloutFilter>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStatusMap(loadStatusMap());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(UI_RULES_STORAGE_KEY, JSON.stringify(statusMap));
    } catch {
      /* ignore */
    }
  }, [statusMap, hydrated]);

  const getPageStatus = useCallback(
    (pageId: string, fallback: UiRolloutStatus) => statusMap[pageId] ?? fallback,
    [statusMap],
  );

  const progress = useMemo(
    () => countRolloutProgress(UI_ROLLOUT_PAGES, statusMap),
    [statusMap],
  );

  const filteredPages = useMemo(() => {
    const sorted = [...UI_ROLLOUT_PAGES].sort((a, b) => a.priority - b.priority);
    if (filter === "all") return sorted;
    return sorted.filter((p) => getPageStatus(p.id, p.defaultStatus) === filter);
  }, [filter, getPageStatus]);

  const setPageStatus = (pageId: string, status: UiRolloutStatus) => {
    setStatusMap((prev) => ({ ...prev, [pageId]: status }));
  };

  const resetRollout = () => {
    if (!window.confirm("저장된 적용 상태를 모두 초기화할까요?")) return;
    setStatusMap({});
    try {
      localStorage.removeItem(UI_RULES_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="ping-shell ui-rules-shell flex min-h-0 flex-1 flex-col">
      <header className="ping-top-nav">
        <Link href="/start" className="ping-top-nav__back ping-back-btn" aria-label="뒤로">
          <span className="ping-chevron-left" aria-hidden="true" />
        </Link>
        <h1 className="ping-top-nav__title">UI 규칙</h1>
      </header>

      <main className="ping-main ui-rules-main min-w-0">
        <p className="ui-rules-intro">
          4개월 동안 쌓인 PING UI를 <strong>한 계약</strong>으로 묶는 내부 가이드입니다.{" "}
          <strong>코드 기준은 토스 블루</strong>(<code>ping-ui.css</code>)이며,{" "}
          <code>docs/UI-GUIDE.md</code>의 Vercel 흑백 서술과 다를 수 있습니다. 아래 체크리스트로
          화면을 하나씩 맞춰 가세요.
        </p>

        <nav className="ui-rules-nav" aria-label="섹션 이동">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`#ui-rules-${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <section id="ui-rules-tokens" className="ui-rules-section">
          <h2 className="ui-rules-section__title">디자인 토큰</h2>
          <p className="ui-rules-section__lead">
            `:root` 변수만 수정합니다. React는 <code>globals.css</code> shadcn 변수와 동기.
          </p>
          <div className="ui-rules-callout">
            단일 출처: <code>assets/css/ping-ui.css</code> 상단 DESIGN CONTRACT
          </div>
          <div className="ui-rules-token-grid">
            {UI_DESIGN_TOKENS.map((token) => (
              <div key={token.var} className="ui-rules-token">
                <div
                  className="ui-rules-token__swatch"
                  style={{ background: `var(${token.var})` }}
                />
                <div className="ui-rules-token__body">
                  <p className="ui-rules-token__name">{token.name}</p>
                  <p className="ui-rules-token__var">{token.var}</p>
                  <p className="ui-rules-token__role">{token.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="ui-rules-rules" className="ui-rules-section">
          <h2 className="ui-rules-section__title">규칙 {UI_RULES.length}개</h2>
          <p className="ui-rules-section__lead">
            Cursor 규칙(<code>ping-bordered-panel.mdc</code> 등)과 동일한 기준입니다.
          </p>
          <div className="ui-rules-rule-list">
            {UI_RULES.map((rule) => (
              <article key={rule.id} className="ui-rules-rule-card" id={`rule-${rule.id}`}>
                <div className="ui-rules-rule-card__head">
                  <h3 className="ui-rules-rule-card__title">{rule.title}</h3>
                  <span className="ui-rules-rule-card__badge">
                    {UI_RULE_CATEGORY_LABEL[rule.category]}
                  </span>
                </div>
                <p className="ui-rules-rule-card__summary">{rule.summary}</p>
                <div className="ui-rules-rule-card__cols">
                  <div>
                    <p className="ui-rules-rule-card__col-title">해야 할 것</p>
                    <ul>
                      {rule.doList.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="ui-rules-rule-card__col-title ui-rules-rule-card__col-title--dont">
                      하지 말 것
                    </p>
                    <ul>
                      {rule.dontList.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {rule.cssRef ? (
                  <p className="ui-rules-rule-card__ref">{rule.cssRef}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section id="ui-rules-demos" className="ui-rules-section">
          <h2 className="ui-rules-section__title">라이브 예시</h2>
          <p className="ui-rules-section__lead">실제 제품 클래스 그대로 미리보기.</p>

          <BulkFlowLogoBar />

          <div className="ui-rules-demo-nav ping-top-nav ui-rules-demo-panel">
            <span className="ping-top-nav__back ping-back-btn" aria-hidden="true">
              <span className="ping-chevron-left" />
            </span>
            <h2 className="ping-top-nav__title m-0 text-[17px]">ping-top-nav</h2>
          </div>

          <div className="ping-bordered-panel ui-rules-demo-panel min-w-0 max-w-full p-5">
            <p className="ping-label">ping-field-standard</p>
            <p className="m-0 mb-3 text-sm text-[var(--ping-ui-text-sub)]">
              제품 플로 단일행 입력 — hover primary-light-bg, focus 2px ring. `/start` URL 기준.
            </p>
            <input
              type="text"
              className="input-field ping-field-standard w-full max-w-full min-w-0"
              placeholder="hover · focus 미리보기"
              aria-label="ping-field-standard 데모"
            />
          </div>
        </section>

        <section id="ui-rules-rollout" className="ui-rules-section">
          <h2 className="ui-rules-section__title">페이지별 적용</h2>
          <p className="ui-rules-section__lead">
            상태는 이 브라우저에 저장됩니다. 화면 하나 고칠 때마다 «진행 중» → «완료»로 올리세요.
          </p>

          <div className="ui-rules-rollout-progress">
            <div className="ui-rules-rollout-progress__bar" aria-hidden="true">
              <div
                className="ui-rules-rollout-progress__fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="ui-rules-rollout-progress__label">
              {progress.done} / {progress.total} 페이지 완료 ({progress.percent}%)
            </p>
          </div>

          <div className="ui-rules-rollout-filters" role="tablist" aria-label="상태 필터">
            {(["all", "todo", "in_progress", "done"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={filter === key ? "is-active" : undefined}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "전체" : STATUS_LABEL[key]}
              </button>
            ))}
            <button type="button" onClick={resetRollout}>
              초기화
            </button>
          </div>

          <div className="ui-rules-rollout-table-wrap">
            <table className="ui-rules-rollout-table">
              <thead>
                <tr>
                  <th scope="col">화면</th>
                  <th scope="col">그룹</th>
                  <th scope="col">상태</th>
                  <th scope="col">남은 규칙</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((page) => {
                  const status = getPageStatus(page.id, page.defaultStatus);
                  return (
                    <tr key={page.id}>
                      <td>
                        <Link href={page.route}>{page.label}</Link>
                        <br />
                        <code>{page.route}</code>
                        {page.note ? (
                          <>
                            <br />
                            <span className="text-[var(--ping-ui-text-hint)]">{page.note}</span>
                          </>
                        ) : null}
                      </td>
                      <td>{UI_ROLLOUT_GROUP_LABEL[page.group]}</td>
                      <td>
                        <select
                          className="ui-rules-status-select"
                          data-status={status}
                          value={status}
                          aria-label={`${page.label} 적용 상태`}
                          onChange={(e) =>
                            setPageStatus(page.id, e.target.value as UiRolloutStatus)
                          }
                        >
                          <option value="todo">대기</option>
                          <option value="in_progress">진행 중</option>
                          <option value="done">완료</option>
                        </select>
                      </td>
                      <td>
                        <div className="ui-rules-pending-tags">
                          {page.ruleIds.map((ruleId) => {
                            const rule = getRuleById(ruleId);
                            return (
                              <span key={ruleId} className="ui-rules-pending-tag" title={rule?.summary}>
                                {rule?.title ?? ruleId}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="ui-rules-footer-links">
          <p className="m-0">
            참고: 레포 <code>docs/UI-GUIDE.md</code> ·{" "}
            <code>.cursor/rules/ping-bordered-panel.mdc</code>
          </p>
          <p className="m-0 mt-2">
            적용 순서 권장: <strong>bulk flow</strong> → auth → 부고 작성 → 마케팅
          </p>
        </footer>
      </main>
    </div>
  );
}
