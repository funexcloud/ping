# HTML → React(Next) 이관 상태 (완료)

최종 갱신: **2026-06-02** · 검증: `npm run check` · `npm run smoke`

## 결론

| 항목 | 상태 |
|------|------|
| 사용자 UI | **100% App Router** (`src/app/**/page.tsx`, 49+ 경로) |
| 레거시 HTML in repo | **없음** (Google 검증 HTML만) |
| `legacy-html/` | repo 밖 `../ping_mobile_legacy_html_snapshot/` |
| Firebase Hosting UI | **미서빙** — API Functions + redirects + `assets/` |
| 프로덕션 UI | **Vercel (Next)** — [`deployment-axis-decision.md`](./deployment-axis-decision.md) |
| 대량 발송 캐논 | **`/start`** (`/bulk`, `/index.html` → `/start` redirect) |
| Express 로컬 | API + Next 프록시 (화면 HTML 서빙 없음) |

**운영 기준:** 브라우저가 보는 모든 제품 화면은 React. `.html` URL은 **301 redirect**로 슬래시 경로만 사용.

---

## 라우트 매핑 (요약)

| URL | Next | 구 HTML(참고) |
|-----|------|---------------|
| `/` | `page.tsx` → 인트로 게이트 | — |
| `/start` | `start/` — 대량 9단계 위저드 전체 | `index.html` |
| `/intro` | `intro/` | `intro.html` |
| `/send/url`, `/send/payments` | React | `send/*.html` |
| `/checkout`, `/payment-success` | React | `checkout.html` 등 |
| `/login`, `/member-login` | React | `obituary-entry.html` 등 |
| 부고·마이페이지·추모·어드민·약관 | 각 `src/app/...` | 대응 `.html` (redirect만 유지) |

전체 표·SEO: 아래 §법적·마케팅 참고.

---

## 대량 발송 플로 (완료)

1. **`/`** → (인트로) → **`/start`**
2. **`/start`**: url → compose → pick → review — **단일 React 클라이언트** (`bulk-entry-client.tsx`)
3. **`/send/url`**: import 후 **`/start?bulkAfterUrl=1`**
4. **부고 작성 완료**: `mergeToBulkFlow()` → **`/start?mergeBulk=1`**
5. **결제**: review → `/send/payments` 또는 `/checkout` → `/payment-success`

레거시 `index.html?mergeBulk=1` 진입은 **제거**. 쿼리 키(`mergeBulk`, `bulkAfterUrl`)는 `/start`에서만 소비.

상세: [`ping-bulk-send-process.md`](./ping-bulk-send-process.md) · [`bulk-start-page-transitions.md`](./bulk-start-page-transitions.md)

---

## repo 안 HTML

| 파일 | 용도 |
|------|------|
| `google4c696c4b8b110781.html` | Google Search Console 검증 (`materialize` → root + `public/`) |

`npm run prune:legacy-html-copies` 가 이관 완료 HTML을 루트·`public/`·하위 폴더에서 제거.

---

## 북마크·SEO

- **301:** `next.config.ts` · `firebase.json` · Express `LEGACY_HTML_REDIRECTS` — 동일 캐논
- **sitemap / robots:** `src/app/sitemap.ts`, `robots.ts`
- **법적 본문:** `src/content/legal/*.ts` (archive에서 generate)

---

## 아카이브·생성

```bash
npm run archive:legacy-html   # repo 밖 스냅샷 (이미 완료 시 생략)
node scripts/generate-legal-content.mjs   # archive → src/content/legal
```

원본 HTML은 **`../ping_mobile_legacy_html_snapshot/`** 만.

---

## 검증 명령

```bash
npm run check          # check-html-migration-complete 포함
npm run smoke          # Express API + next start + 주요 React 경로
npm run check:vercel-env:strict   # Vercel Production env (배포 전)
```

---

## 배포 후 사용자 작업

1. Vercel Production env — [`vercel-production-handoff.md`](./vercel-production-handoff.md)
2. DNS `ping.funexcloud.com` → Vercel
3. 스테이징 E2E — 모바일·Safari·토스 sandbox

---

## 관련 문서

- [`deployment-axis-decision.md`](./deployment-axis-decision.md) — Vercel + Firebase API
- [`migration-html-to-react-remaining.md`](./migration-html-to-react-remaining.md) — 이관 전 체크리스트 (역사)
- [`index-bulk-flow-reference.md`](./index-bulk-flow-reference.md) — 세션 키·쿼리 참고
- [`REACT-MIGRATION-TASKS.md`](./REACT-MIGRATION-TASKS.md) — 페이즈별 작업 (완료 표시)
