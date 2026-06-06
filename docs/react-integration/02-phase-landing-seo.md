# 페이즈 ② — 랜딩·소개 (SEO · SSG · Hosting 매핑)

`REACT-MIGRATION-TASKS.md` 페이즈 ② 작업의 **문서화 결과**다. 실제 `page.tsx` 포팅은 이후 PR에서 단계적으로 진행한다.

---

## 1. SEO 우선 URL 목록

검색·SNS·광고 랜딩에 중요한 공개 경로다. **Canonical은 실제 배포 도메인**(`ping.funexcloud.com` 등)으로 통일한다.

| 우선순위 | 공개 URL·파일 | 비고 (meta·동작) |
|:--------:|---------------|------------------|
| P0 | `/` | 비테넌트: **`send/url.html`**(부고 주소 입력, `/send/url`과 동일 본문). 테넌트: `index.html`. Hosting rewrite·Express `sendFile` |
| P0 | `index.html` | 발송 UI. **직접 URL**로 열면 세션 게이트가 있으면 `intro.html`로 보냄(운영 도메인 정책). `<title>`, `description`, `og:*` 풍부 |
| P0 | `intro.html` | 서비스 안내 스와이프. 제목: PING · 서비스 안내 |
| P0 | `saas-landing.html` | B2B/SaaS 랜딩. `description`, `og:title`, `og:image` 별도 |
| P1 | `pricing.html` | 이용 요금. 인덱싱 가치 높음 |
| P1 | `partnership.html` | 제휴/파트너 |
| P1 | `customer-center.html` | 고객센터 |
| P1 | `guide-naver-contacts.html` | 가이드(롱테일) |
| P1 | `overview.html` | 개요/진입(내부 링크 다수) |
| P2 | `legal/terms-of-service.html` 등 | `firebase.json`에서 짧은 path로 rewrite 됨 |
| P2 | `tech-blog.html`, `inquiry-board.html` | 콘텐츠·보조 |
| — | `intro.html` / `index` **관계** | 북마크·외부 링크용으로 **두 URL 모두 유지** 전략 검토 (301 vs 세션 게이트) |

### Sitemap

- **현재:** 루트에 `sitemap.xml` 자동 생성 여부는 미확인. 정적 호스팅이면 **수동 또는 빌드 시 생성** 권장.
- **Next 이전 후:** `src/app/sitemap.ts` (또는 `public/sitemap.xml`) 으로 **P0~P1 URL 고정 목록** 우선 반영.

### robots.txt

- 프로덕션 공개 경로와 `/admin/**`, 테스트 HTML **차단 규칙**을 배포 단계에서 점검.

---

## 2. 퍼블릭 랜딩 → Next 전략 (SSG)

| 전략 | 설명 |
|------|------|
| **권장 1단계** | 랜딩·소개만 **`export const dynamic = 'force-static'`** 또는 기본 SSG에 가깝게 두고, 클라이언트에서만 `fetch` |
| **index 특수 처리** | `index.html`의 `intro.html` 세션 게이트는 **middleware 또는 `useEffect` 동등**으로 Next에서 재구현 필요 — 한 번에 옮기면 리스크 큼 |
| **Tailwind** | `index`/일부 페이지는 CDN Tailwind 사용. Next에서는 **로컬 Tailwind 빌드**로 이전 시 스타일 parody 주의 |
| **점진 이전 순서 (제안)** | 루트 `/`는 **부고 주소 입력**(`send/url`)부터 · 서비스 안내는 **`/intro`** · 이후 `pricing` → `saas-landing` 등. 발송 본문은 `index.html`(스텝 진행). |

완료 기준에 가까워지려면: 위 P0 페이지에 대해 **Lighthouse SEO·동일 `meta/og`** 유지를 스모크한다.

---

## 3. Firebase Hosting ↔ Next 라우트 매핑·충돌

### 3.1 현재 특성

- `hosting.public` = `.`, `src/**`·`firebase-functions-app/**` 등은 **ignore** (Next 빌드 산출물은 기본적으로 Hosting에 안 올라감).
- **Next를 쓰려면:** 별도 호스트(Cloud Run / Vercel 등) + **리버스 프록시** 또는 Hosting **rewrites를 해당 오리진으로** — 페이즈 0 문서 후보와 동일.

### 3.2 Next 도입 시 **겹치기 쉬운 prefix**

| Firebase / 정적 | 용도 | Next 이전 시 조치 |
|------------------|------|-------------------|
| `/` | `index.html` | Next `/` 와 **하나만** 서빙 — 나머지 301 또는 Hosting에서 Next 프록시 |
| `/login`, `/login/**` | `obituary-entry` 로 rewrite | 로그인을 Next로 옮기면 **동일 path 유지 필수** |
| `/member-login` | 회원 로그인 HTML | 동일 |
| `/checkout`, `/payment-success` | 결제 플로 | 트래픽 큼 — 충돌 시 신중히 |
| `/api/*` | Cloud Functions | Next `route.ts`와 **같은 path 금지** 또는 게이트웨이에서 분기 |
| `/obituary/**`, `/send/**` 등 | 다수 rewrite | 표는 `firebase.json` 전체를 기준으로 이 문서를 갱신 |

### 3.3 권장 프로세스

1. 스테이징에서 **Next 베이스 path** (`/` 또는 `/site`) 정하기.  
2. `firebase.json` 에 **실험 rewrite** 한 줄 추가해 스모크.  
3. 프로덕션 전 **북마크·광고 URL** 리스트로 302/301 검증.

---

## 4. 페이즈 ② 완료 기준 (체크리스트)

- [ ] P0~P1 URL이 Next(또는 프록시 뒤 Next)에서 **동일 title/description/og** 유지  
- [ ] 핵심 랜딩 **LCP·SEO**가 이전 대비 악화 없음 (측정)  
- [ ] `sitemap`·`robots` 갱신  
- [ ] `firebase.json` rewrites와 실제 서빙 **단일 진실원** 문서 동기화  

---

## 관련 문서

- [00-foundation.md](00-foundation.md) — 로컬 프록시·배포 후보  
- [REACT-MIGRATION-TASKS.md](../REACT-MIGRATION-TASKS.md) — 전체 페이즈  
