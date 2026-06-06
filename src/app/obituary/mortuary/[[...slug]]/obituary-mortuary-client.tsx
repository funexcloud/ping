"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function apiBase(): string {
  if (typeof window === "undefined") return "/api";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:3000/api";
  return "/api";
}

type Mourner = { name?: string; relation?: string; phone?: string };
type Obituary = {
  deceasedName?: string;
  mourners?: Mourner[];
  hideMournerContact?: boolean | string | number;
};

type EntryData = {
  obituaryId?: string;
  canViewFull?: boolean;
  obituary?: Obituary | null;
  statusLabel?: string;
};

type Template = { id: string; label: string; body: string };

type LogRow = {
  phase?: string;
  recipientCount?: number;
  messagePreview?: string;
  createdAt?: string;
};

function isChecked(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

export default function ObituaryMortuaryClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const slugParts = params.slug as string[] | undefined;
  const pathObituaryId = Array.isArray(slugParts) && slugParts.length ? slugParts[0] : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [phase, setPhase] = useState<"during" | "after">("during");
  const [templates, setTemplates] = useState<{ during: Template[]; after: Template[] }>({
    during: [],
    after: [],
  });
  const [selectedTpl, setSelectedTpl] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logVisible, setLogVisible] = useState(false);

  const obituary = entryData?.obituary;
  const mourners = Array.isArray(obituary?.mourners) ? obituary!.mourners! : [];

  const loadLogs = useCallback(async () => {
    if (!pathObituaryId || !token) return;
    try {
      const res = await fetch(
        `${apiBase()}/getMortuaryMessageLogs?bugoCode=${encodeURIComponent(pathObituaryId)}&token=${encodeURIComponent(token)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setLogVisible(true);
    } catch {
      /* ignore */
    }
  }, [pathObituaryId, token]);

  const load = useCallback(async () => {
    if (!token) {
      setError("유효한 링크가 아닙니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tplRes = await fetch(`${apiBase()}/getMortuaryMessages`);
      const tplData = await tplRes.json().catch(() => ({}));
      if (tplRes.ok && tplData.templates) {
        setTemplates(tplData.templates as { during: Template[]; after: Template[] });
      }

      const res = await fetch(
        `${apiBase()}/getObituaryEntry?token=${encodeURIComponent(token)}&mode=family`,
      );
      const data = (await res.json().catch(() => ({}))) as EntryData & {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error || data.message || "불러오지 못했습니다.");
      if (pathObituaryId && data.obituaryId && pathObituaryId !== data.obituaryId) {
        setError("주소의 부고 ID와 링크 토큰이 일치하지 않습니다.");
        setLoading(false);
        return;
      }
      setEntryData(data);
      const list = Array.isArray(data.obituary?.mourners) ? data.obituary!.mourners! : [];
      const init: Record<number, boolean> = {};
      list.forEach((_, i) => {
        init[i] = true;
      });
      setSelected(init);
      setSelectedTpl("");
      setLoading(false);

      if (data.canViewFull && data.obituary) {
        await loadLogs();
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setLoading(false);
    }
  }, [token, pathObituaryId, loadLogs]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelectedTpl("");
  }, [phase]);

  const list = phase === "after" ? templates.after : templates.during;

  const heroSub = (() => {
    if (!entryData) return "";
    const sub: string[] = [];
    if (entryData.obituary?.deceasedName) sub.push(`故 ${entryData.obituary.deceasedName}`);
    if (entryData.statusLabel) sub.push(entryData.statusLabel);
    return sub.join(" · ");
  })();

  const getSelectedIndices = () => {
    const out: number[] = [];
    mourners.forEach((_, i) => {
      if (selected[i]) out.push(i);
    });
    return out;
  };

  const sendMortuary = async (sendToAll: boolean) => {
    if (!entryData?.obituaryId) return;
    const body = customBody.trim();
    const templateId = body ? "" : selectedTpl;

    if (!body && !templateId) {
      alert("템플릿을 선택하거나 직접 메시지를 입력해주세요.");
      return;
    }

    const mournerIndices = getSelectedIndices();
    if (!mournerIndices.length) {
      alert("받을 상주를 한 명 이상 선택해주세요.");
      return;
    }

    try {
      const res = await fetch(`${apiBase()}/sendMortuaryMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bugoCode: entryData.obituaryId,
          token,
          phase,
          templateId,
          customBody: body,
          sendToAllMourners: sendToAll,
          mournerIndices: sendToAll ? undefined : mournerIndices,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || "실패");
      alert(json.message || "접수되었습니다.");
      await loadLogs();
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    }
  };

  const toggleAllMourners = () => {
    const next: Record<number, boolean> = {};
    mourners.forEach((_, i) => {
      next[i] = true;
    });
    setSelected(next);
  };

  const canInteract = !!(entryData?.canViewFull && entryData?.obituary);

  return (
    <div className="ob-flow-shell">
      <header className="ob-flow-hero ping-sticky-page-header">
        <span className="ob-flow-eyebrow">PING · 상주 알림</span>
        {loading && <div className="ob-flow-loading">불러오는 중입니다…</div>}
        {error && !loading && <div className="ob-flow-error">{error}</div>}
        {!loading && !error && entryData && (
          <div>
            <h1 className="ob-flow-hero-title">장례 메시지 보내기</h1>
            <p className="ob-flow-hero-sub">{heroSub}</p>
            <div className="ob-flow-segment" role="tablist" aria-label="장례 단계">
              <button
                type="button"
                role="tab"
                className={`ob-flow-segment-btn ${phase === "during" ? "is-active" : ""}`}
                onClick={() => setPhase("during")}
              >
                장례 중
              </button>
              <button
                type="button"
                role="tab"
                className={`ob-flow-segment-btn ${phase === "after" ? "is-active" : ""}`}
                onClick={() => setPhase("after")}
              >
                장례 후
              </button>
            </div>
          </div>
        )}
      </header>

      {!loading && !error && entryData && (
        <main className="ob-flow-main ob-flow-main--tight">
          <p className="ob-flow-hint">
            상주에게 카카오톡·문자로 안내 메시지를 보낼 수 있습니다.
            <span className="text-[var(--ping-ui-text-hint)]">
              (실제 발송은 알림 연동 후 가능하며, 지금은 요청·이력만 저장됩니다.)
            </span>
          </p>

          <section className="ob-flow-card">
            <div className="ob-flow-card-head">
              <h2 className="ob-flow-section-title">
                {phase === "during" ? "장례 중 메시지 보내기" : "장례 후 메시지 보내기"}
              </h2>
            </div>
            <div className="max-h-[14rem] space-y-2 overflow-y-auto px-3 py-3">
              {!list.length ? (
                <p className="px-1 py-2 text-[13px] text-slate-500">템플릿을 불러오지 못했습니다.</p>
              ) : (
                list.map((t) => (
                  <label key={t.id} className="ob-flow-tpl-label">
                    <input
                      type="radio"
                      name="tpl"
                      className="ob-flow-tpl"
                      value={t.id}
                      checked={selectedTpl === t.id}
                      onChange={() => setSelectedTpl(t.id)}
                    />
                    <span className="ob-flow-tpl-box">
                      <span className="text-[13px] font-bold text-slate-900">{t.label}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-[var(--ping-muted)]">
                        {t.body.slice(0, 72)}
                        {t.body.length > 72 ? "…" : ""}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="px-4 pb-3">
              <label htmlFor="customBody" className="ob-flow-label">
                직접 수정 · 입력 (입력 시 템플릿 대신 전송)
              </label>
              <textarea
                id="customBody"
                rows={4}
                className="ob-flow-input min-h-[6rem] resize-y leading-relaxed"
                placeholder="비우면 선택한 템플릿 문구가 전송됩니다."
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
              />
            </div>
          </section>

          <section className="ob-flow-card">
            <div className="ob-flow-card-head flex flex-row items-center justify-between gap-2">
              <h2 className="ob-flow-section-title">받는 상주</h2>
              <button
                type="button"
                className="shrink-0 cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-[13px] font-semibold text-[var(--ping-primary)]"
                onClick={toggleAllMourners}
              >
                모두 선택
              </button>
            </div>
            <div className="space-y-2 px-4 py-3">
              {!canInteract ? (
                <p className="text-[13px] text-slate-500">이 부고는 아직 확인·공개 전입니다.</p>
              ) : mourners.length === 0 ? (
                <p className="text-[13px] text-slate-500">등록된 상주가 없습니다. 부고에서 상주를 입력해 주세요.</p>
              ) : (
                mourners.map((m, i) => {
                  const hide = isChecked(obituary!.hideMournerContact);
                  const phone = hide ? "연락처 비공개" : m.phone || "번호 없음";
                  return (
                    <label key={i} className="ob-flow-mourner-row">
                      <input
                        type="checkbox"
                        className="mourner-cb mt-1 h-4 w-4 shrink-0 rounded text-[var(--ping-primary)]"
                        checked={!!selected[i]}
                        onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.checked }))}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-[var(--ping-muted)]">
                          {m.relation || "상주"}
                        </span>
                        <span className="mt-0.5 block text-[14px] font-bold text-slate-900">
                          {m.name || "—"}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-slate-600">{phone}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </section>

          <button
            type="button"
            className="ob-flow-btn-primary min-h-[54px]"
            disabled={!canInteract}
            onClick={() => sendMortuary(true)}
          >
            <Send className="mr-2 inline-block size-4 opacity-90" aria-hidden />
            모든 상주에게 선택한 메시지 보내기
          </button>
          <button
            type="button"
            className="ob-flow-btn-secondary border-2 font-bold"
            disabled={!canInteract}
            onClick={() => sendMortuary(false)}
          >
            선택한 상주에게만 보내기
          </button>

          {logVisible ? (
            <section className="ob-flow-card">
              <div className="ob-flow-card-head flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-slate-900">최근 발송 이력</h2>
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold text-[var(--ping-primary)]"
                  onClick={() => loadLogs()}
                >
                  새로고침
                </button>
              </div>
              <ul className="max-h-48 divide-y divide-[var(--ping-ui-line)] overflow-y-auto text-[12px]">
                {!logs.length ? (
                  <li className="px-4 py-3 text-slate-500">이력 없음</li>
                ) : (
                  logs.map((l, idx) => (
                    <li key={idx} className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">
                        {l.phase === "after" ? "장례 후" : "장례 중"} · {l.recipientCount || 0}명
                      </p>
                      <p className="mt-0.5 text-slate-500">{l.messagePreview || ""}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{String(l.createdAt || "")}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ) : null}

          <Link
            href="/obituary-create"
            className="touch-manipulation py-2 text-center text-[14px] font-semibold text-[var(--ping-primary)] no-underline"
          >
            홈으로
          </Link>
          <p className="ob-flow-footer pb-4">한국AIBC융합원 PING · 문의 052-286-4440</p>
        </main>
      )}
    </div>
  );
}
