# HTML → React 이관 — 완료 안내

> **2026-06-02:** 이관 **완료**. 현재 상태는 [`html-to-next-migration-status.md`](./html-to-next-migration-status.md) 가 단일 기준이다.

아래 §1–§5는 **이관 진행 중** 기록이다. Hosting rewrite·`public/index.html`·`handoffReactBulkEntryToLegacyWizard` 등은 **더 이상 해당 없음**.

---

## 완료 요약

- UI: **Vercel Next** (`src/app`)
- API: **Firebase Functions** + Express(로컬)
- `legacy-html/`: repo **제거**, 스냅샷만 repo 밖
- 대량 플로: **`/start`** 단일 React 위저드
- 검증: `npm run check` · `npm run smoke`

---

## (역사) §1. 호스팅 vs Next

이관 전에는 Firebase Hosting이 `*.html` rewrite로 UI를 서빙했다.  
**현재:** Firebase Hosting rewrites는 **API만**. UI는 Vercel.

---

## (역사) §2. 미이관 목록

§2.1 `index.html` · §2.2 Hosting rewrites · §2.3 `legacy-html/` — **모두 처리 완료**.

---

## (역사) §3–§5

진입 링크·체크리스트·제거 순서는 [`legacy-html-materialize-removal-order.md`](./legacy-html-materialize-removal-order.md) · [`deployment-axis-decision.md`](./deployment-axis-decision.md) 참고.
