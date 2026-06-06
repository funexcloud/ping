# 배포 축 결정 (2026-06-02)

## 결정

| 축 | 역할 | 프로덕션 |
|----|------|----------|
| **Vercel (Next App Router)** | 사용자 UI 전부 — `/`, `/start`, `/login`, `/checkout`, … | `ping.funexcloud.com` DNS → Vercel Production |
| **Firebase / GCP** | Cloud Functions API, Firestore, Auth, Hosting(검증·리다이렉트·`assets/`) | Functions rewrite `/api/*`, Hosting은 UI **미서빙** |
| **Express (`server.js`)** | 회원·게스트 인증 API (`/api/auth/*`, `/api/guest-auth/*`) | Cloud Run **`ping-express-api`** → Vercel `PING_EXPRESS_ORIGIN` |

**캐논:** 화면 HTML은 **`src/app` React만**. 레거시 HTML은 repo 밖 스냅샷(`../ping_mobile_legacy_html_snapshot/`)에만 보관.

## Firebase Hosting에서 제거한 것

- `hosting.rewrites`의 **슬래시 → `*.html`** 규칙 전부 제거 (2026-06-02 기준 API Functions만 유지)
- `hosting.redirects`의 **`.html` → 슬래시 캐논** 301은 북마크용으로 유지 (Vercel이 실제 페이지 응답)

## materialize 파이프라인

- **이전:** `legacy-html/` → 루트·`public/` 전개
- **현재:** Google Search Console 검증 HTML + `assets/` 만 동기화 (`scripts/materialize-legacy-html.mjs`, `ensure-next-public-static.mjs`)
- **predeploy / postinstall:** `prune` + 검증 HTML 동기화만

## Google Cloud / Firebase 스타트업 프로그램

UI를 Vercel에 두어도 **Functions·Firestore·Auth**는 GCP/Firebase 청구 대상이므로 스타트업 크레딧 사용 가능. Hosting 대역은 최소(검증·리다이렉트·정적 자산)로 유지.

## 2026-06-02 마무리

| 항목 | 상태 |
|------|------|
| `legacy-html/` repo 제거 | ✅ 스냅샷 `../ping_mobile_legacy_html_snapshot/` |
| Firebase HTML rewrites | ✅ API만 |
| materialize | ✅ Google 검증 HTML + assets |
| `/start` 대량 플로 캐논 | ✅ `PING_MAIN_APP_PATH=/start`, `/index.html` → `/start` redirect |
| handoff | ✅ `/start` 단일 React 위저드 · `mergeToBulkFlow` |
| HTML 이관 검증 | ✅ `check-html-migration-complete.cjs` |
| Vercel env·DNS | ✅ `npm run sync:vercel-env` · `ping.funexcloud.com` → Vercel |
| Express Cloud Run | ✅ `npm run deploy:express` · `PING_EXPRESS_ORIGIN` |
| Docker dev | ✅ `npm run dev:docker` — `.env`는 dotenv 형식만 (`KEY=value`) |
| dev 포트 정리 | ✅ `npm run dev:clean` |

## 관련 문서

- [`firebase-hosting-rewrite-inventory.md`](./firebase-hosting-rewrite-inventory.md)
- [`vercel-production-handoff.md`](./vercel-production-handoff.md)
- [`legacy-html-materialize-removal-order.md`](./legacy-html-materialize-removal-order.md)
