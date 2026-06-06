# 페이즈 ③ — 레거시 HTML 인벤토리

**범위:** 제품 루트 `ping_mobile` 기준 `.html` 자산.  
**제외:** `node_modules/**`, `.next/**`, `**/functions/node_modules/**`, `spline-next/**`(별도 실험 앱), `firebase-functions-app/**`(루트 Firebase TS 패키지; Next `app/` 디렉터리와 이름 충돌 방지).

라벨 의미:

| 라벨 | 의미 |
|------|------|
| **유지** | 당분간 HTML 그대로(외부 링크·검증·고관여 플로). 포팅 시 301. |
| **포팅** | Next `page.tsx` 등으로 이전 대상. |
| **검토** | 사용처 불명·중복·실험 — 삭제 또는 아카이브 가능성. |

---

## 루트 및 1-depth

| 파일 | 라벨 | 비고 |
|------|------|------|
| `index.html` | 포팅 | 메인 발송 UI·SEO 핵심. 인트로 게이트 스크립트 포함. |
| `intro.html` | 포팅 | 서비스 안내 (페이즈 ②와 연계). |
| `saas-landing.html` | 포팅 | B2B SaaS 랜딩. 공개 루트 `/`(Hosting·Express) 비테넌트는 **`send/url.html`** 부고 주소 입력 단계. 인트로는 `/intro`. |
| `overview.html` | 포팅(진행) | **`/overview`** — App Router 이관. `legacy-html/overview.html` 은 materialize·Hosting용으로 유지. |
| `mypage.html` | 포팅 | 페이즈 ① 진행 중 (혜택 본문). |
| `pricing.html` | 포팅(진행) | **`/pricing`** — App Router. Express `sendFile`·루트 정적과 병행 시 301으로 통일. |
| `guide-naver-contacts.html` | 포팅·유지 | 가이드 (`/guide/naver-contacts`). |
| `payment-success.html` | 유지→포팅 | 결제 완료. |
| `checkout.html` | 유지→포팅 | 결제. |
| `partnership.html` | 포팅(진행) | **`/partnership`** — App Router. `legacy-html` 유지(배포 미러). |
| `customer-center.html` | 포팅(진행) | **`/customer-center`** — App Router. `legacy-html` 파일은 배포·Express 미러용 유지. |
| `tech-blog.html` | 검토 | 트래픽·링크 확인 후 유지/삭제. |
| `inquiry-board.html` | 검토 | |
| `memorial-list.html` | 검토 | 메모리얼 기능 사용 여부. |
| `memorial-hall.html` | 검토 | |
| `memorial-auth.html` | 검토 | |
| `setup-finish.html` | 검토 | 온보딩 잔여? |
| `ping-cx-flow.html` | 검토 | 내부 플로 데모? |
| `ping-cx-flow ex.html` | 검토 | 파일명 공백 — 정리 권장. |
| `stitch-wave.html` | 검토 | 실험 페이지. |
| `google4c696c4b8b110781.html` | **유지** | Search Console 등 검증 파일. **삭제 금지(대체 전)**. |

---

## `send/`

| 파일 | 라벨 | 비고 |
|------|------|------|
| `send/payments.html` | 유지→포팅 | 명단·금액 (`/send/payments`). |
| `send/url.html` | 유지→포팅 | URL 입력 단계. |

---

## `obituary/`

| 파일 | 라벨 | 비고 |
|------|------|------|
| `obituary-entry.html` | 유지→포팅 | `/login` 캐논. |
| `obituary-member-login.html` | 유지→포팅 | `/member-login`. |
| `obituary-signup-terms.html` | 유지 | 약관. |
| `obituary-signup-register.html` | 유지→포팅 | 가입. |
| `obituary-verify-email.html` | 유지 | |
| `obituary-guest-verify.html` | 유지 | |
| `obituary-create.html` | 유지→포팅 | |
| `obituary-form.html` | 유지→포팅 | |
| `mourner-info.html` | 유지→포팅 | |
| `obituary-send.html` | 유지→포팅 | `/obituary/send/:id`. |
| `obituary-sales.html` | 유지→포팅 | |
| `obituary-mortuary.html` | 유지→포팅 | |
| `obituary-public.html` | 유지 | 공개 부고. |
| `obituary-review.html` | 유지→포팅 | |

---

## `admin/`

| 파일 | 라벨 | 비고 |
|------|------|------|
| `admin-dashboard.html` | 유지 | 내부 운영. Next 분리 가능. |
| `admin-auth.html` | 유지 | |
| `partner-dashboard.html` | 유지 | |
| `unified-monitoring.html` | 유지 | |
| `service-status.html` | 유지 | |

---

## `legal/`

| 파일 | 라벨 | 비고 |
|------|------|------|
| `terms-of-service.html` 등 | **유지** | Compliance. Firebase 짧은 path rewrite와 동기화. |

---

## Express `sendFile` / 별도 라우트 (포팅 시 정리)

`server.js`에서 HTML을 직접 여는 주요 구간:

- `/`, `/obituary/send/:id`, `/obituary/sales`, `/obituary/mortuary/:id`
- `/payment-success`, `/checkout`, `/pricing`, `/guide/naver-contacts`
- `/login`, `/login.html`, `/login/**`
- `registerLegacyHtmlAliases()` — 루트 이름으로 `legal/`, `obituary/`, `admin/` 파일 매핑
- `/member-login`, `/send/payments`, `/send/url`, `/obituary-entry` → `/login` 리다이렉트

**포팅 후:** 해당 경로는 **Next 또는 301**으로 넘기고, `sendFile` 제거 순서는 트래픽 낮은 화면부터.

---

## 스크립트·CSS·API 중복 (정리 가이드)

- **자산:** `assets/js/**`, `assets/css/**` — 페이지 포팅 시 **미사용 파일**은 `rg "파일명" --glob "*.html"` 로 참조 제거 후 삭제.
- **인라인 설정:** `server.js`의 `/api/google-oauth-config.js`, `/api/portone-config.js` 등 — Next `route`로 옮길 때 **한 곳만** 소스 오브 트루스로 두기.
- **중복 API 호출:** 브라우저 네트워크 탭·`ping-backend-api-path` 패턴으로 동일 엔드포인트 이중 호출 점검.

---

## 페이즈 ③ 완료 기준 (실행 시)

- [ ] 위 표에서 **포팅** 라벨 제품 플로가 Next(또는 단일 호스팅)로 이전되고 HTML 의존 최소화
- [ ] 모든 URL 변경에 **301** 및 Search Console·광고 랜딩 반영
- [ ] `검토` 라벨 파일 처리 결정(삭제 시 git 히스토리·외부 링크 확인)

---

## 관련 문서

- [REACT-MIGRATION-TASKS.md](../REACT-MIGRATION-TASKS.md)
- [02-phase-landing-seo.md](02-phase-landing-seo.md) — 공개 URL·Firebase
