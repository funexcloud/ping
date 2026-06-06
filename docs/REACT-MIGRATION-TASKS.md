# React(Next) 단계적 통합 — 작업목록

원칙: **UI는 Next로 모으고**, 당분간 **Express는 API·프록시·레거시 백엔드**로 유지한다. 이후 API 정리는 별도 단계로 진행한다.

---

## 0. 공통 (페이즈 시작 전)

**완료 내역:** [docs/react-integration/00-foundation.md](react-integration/00-foundation.md)

- [x] Next 앱 단일 진입점 확정 (`src/app` 등) 및 로컬/스테이징 실행 방법 문서화
- [x] 정적 HTML과 Next 간 **URL·인증(쿠키/세션)·리다이렉트** 규칙 초안 작성
- [x] 프로덕션 Next 서빙 **후보·트레이드오프** 정리 *(단일 방식 확정·배포 반영은 스테이징에서 진행)*
- [x] 공유 스타일: `ping-ui.css` 등 **디자인 토큰/글로벌 CSS**를 Next에서도 일관되게 로드하는 방식 고정

---

## 페이즈 ① 로그인 후 영역 (우선)

**대상 예시:** 마이페이지, 부고 발송·관리, 부의금 정리 등 **로그인(또는 본인 확인) 이후** 화면.

**진행 노트:** [01-phase-porting-priority.md](react-integration/01-phase-porting-priority.md)

- [x] 마이페이지: `mypage.html` → Next 라우트로 이전 (탭·딥링크 `mypage.html` ↔ `/mypage/...` 정리) — *진입 허브 `/mypage`, 공통 탭(시작·혜택·부의금), 본문 혜택은 아직 `mypage.html`*
- [x] 로그인/리다이렉트 플로우를 Next 기준으로 통일 (`next` 쿼리, 세션 쿠키 도메인) — *`next=/mypage`, `next=/mypage/condolence` 등 분기 추가. 쿠키 도메인 전역 정리는 잔여*
- [x] 부고 발송·관리 관련 화면 중 **사용 빈도 높은 것**부터 Next 페이지로 포팅 우선순위 정하기 — *우선순위 초안 문서화*
- [x] 이미 Next에 있는 기능(예: 부의금)과 HTML 쪽 링크·메뉴를 **한 도메인/한 경로 규칙**으로 연결 (프록시 또는 배포 라우팅) — *Express 프록시 `/mypage` 통째로 Next, index/overview 진입 `/mypage`*
- [x] 페이즈 ① 완료: 로그인 후 주요 업무 플로우 Next (`/mypage`, `/obituary/*`, `/checkout` 등)

---

## 페이즈 ② 랜딩·소개 — **완료**

**대상 예시:** 메인 랜딩, SaaS 랜딩, 서비스 소개, 가격, 가이드 진입 등 **공개 HTML**.

**진행 노트:** [02-phase-landing-seo.md](react-integration/02-phase-landing-seo.md)

- [x] SEO가 중요한 URL 목록 작성 (유지해야 할 path, `meta`, sitemap)
- [x] `index.html` 등 퍼블릭 랜딩을 Next `page.tsx`로 옮기거나, App Router에서 정적 생성(SSG) 전략 확정
- [x] 기존 Firebase Hosting rewrites/redirects와 Next 라우트 **충돌 없이** 매핑 표 작성
- [x] 페이즈 ② 완료: Vercel UI + redirect 301 (`html-to-next-migration-status.md`)

---

## 후속 (B2B) — 기록만

**장례지도사 등 B2B·멀티테넌시**는 본 페이즈와 별도로 스코프를 잡는다. (스키마 `tenantId`·Host 기반 `req.tenantId`·조직 로그인·직원 RBAC 등)

- [ ] B2B 테넌트 모델·로그인(조직 단위 세션·초대) 요구사항 정리
- [ ] 기존 `server.js` Host 미들웨어와 Next·API 간 **테넌트 전달 규칙** 통일
- [ ] (선택) 장례지도사용 화이트라벨·서브도메인 라우팅 설계

---

## 페이즈 ③ 나머지 레거시 HTML — **완료**

**인벤토리:** [03-phase-legacy-html-inventory.md](react-integration/03-phase-legacy-html-inventory.md)

- [x] 레포 내 `.html` 자산 목록화 및 **삭제/포팅/유지(외부 링크 전용)** 라벨 부여
- [x] 포팅 후 Express·Hosting HTML rewrite 제거 · 301 redirect 유지
- [x] `legacy-html/` repo 제거 · materialize = Google 검증만
- [x] 페이즈 ③ 완료: `npm run check` · `check-html-migration-complete.cjs`

---

## Express 역할 (페이즈 동안 유지)

**문서:** [express-next-role-split.md](react-integration/express-next-role-split.md)

- [x] 신규 **데이터·권한 로직**은 가능하면 기존 `server.js` API·모듈로 유지하거나, Next Route Handler와 **역할 분담** 규칙 명시 — *원칙·Next 소유 API 표는 문서화. 인증 중복 방지·테넌트 연계는 B2B·API 정리와 함께 갱신*
- [x] 로컬 개발: Express ↔ Next 프록시(`/_next`, `/mypage`, 필요한 `/api/...`) 경로 목록 유지·갱신
- [x] (선택) 트래픽·안정성 여유 시 **API만 별도 서비스**로 뽑는 후속 태스크 분리 — *조건만 문서화; 실행은 미정*

---

## API 정리 (후속, 페이즈와 병행 가능)

**인벤토리·SoT 표:** [api-inventory.md](react-integration/api-inventory.md)  
**역할·프록시:** [express-next-role-split.md — 섹션 2](react-integration/express-next-role-split.md#2-현재-next-route-handler-소유권-표)

- [x] Next Route Handler vs Express 중 **어느 쪽이 소스 오브 트루스인지** 엔드포인트마다 표로 정리 — *`api-inventory.md` 초안; 라우트·Functions·프록시 변경 시 동기화*
- [ ] 중복 `/api/*` 제거 및 클라이언트 베이스 URL 환경변수 통일 — *중복·URL 현황은 `api-inventory.md` §3–4; 코드·env 적용은 미진행*
- [ ] 인증 미들웨어·레이트 리밋·로깅을 한 레이어로 모으기 — *목표·현황 `api-inventory.md` §5*

---

## 진행 시 체크

**절차·경로:** [smoke-and-release-checklist.md](react-integration/smoke-and-release-checklist.md)

- [ ] 각 페이즈마다 스모크 테스트 시나리오(로그인, 발송, 결제, 마이페이지) 통과 — *§1 최소 기준; 페이즈별로 변경 영역 가중*
- [ ] 배포 후 구버전 URL 북마크·외부 링크 점검 — *§2; HTML 인벤토리·SEO 매핑 문서와 병행*
