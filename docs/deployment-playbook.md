# PING Deployment Playbook

This playbook is the final pre-launch and post-launch guide for the current PING project.

## 0. Canonical site, Toss PG review, Firebase, Google contacts

**Production web origin (canonical):** `https://ping.funexcloud.com` — use this everywhere PG/OAuth consoles ask for domains, return URLs, or HTTP referrer allowlists.

### Toss Payments (심사·운영 체크)

- **SDK:** React `/checkout` — `https://js.tosspayments.com/v2/standard` (`checkout-client.tsx`).
- **Keys (never commit real values):** `TOSS_PAYMENTS_WIDGET_CLIENT_KEY` (위젯용, 값에 `_gck_` 포함) · 서버 전용 `TOSS_PAYMENTS_SECRET_KEY` (또는 호환 별칭 env — see `.env.example`). 샌드박스/가이드 키: `PING_USE_TOSS_DOCS_TEST_KEYS=1`. **운영 전** `PING_TOSS_CONFIRM_MOCK` 반드시 끄기.
- **승인 HTTP:** 브라우저가 `POST` → `/api/toss/confirm-payment` (`server.js`). **토스 서버→우리 webhook 전용 라우트는 없음** (리다이렉트 + 승인 API 패턴만).
- **Return / failure URLs:** React `/checkout` — `widgets.requestPayment`에 `successUrl` / `failUrl`로 **현재 origin + `/checkout` + `?ping_toss_return=success|fail`**.
  - `https://ping.funexcloud.com/checkout?ping_toss_return=success`
  - `https://ping.funexcloud.com/checkout?ping_toss_return=fail`
  - `/checkout/` 리라이트를 쓰는 경우 동일 쿼리로 `.../checkout/?ping_toss_return=...` 도 점검.
- **금액:** 결제 금액은 위젯/order와 서버 승인 요청이 일치해야 함; 포인트 병행 시 checkout 세션(`register-session`)과 `confirm` 바디 검증이 `server.js`에 있음.
- **HTTPS:** 필수.
- **정책·약관 URL (호스팅 리라이트):** 예) `https://ping.funexcloud.com/privacy-policy.html`, `/terms-of-service.html`, `/refund-policy.html`, `/service-payment-guide.html` → `legal/` 하위 HTML.

### Firebase CLI / Hosting / custom domain

- **프로젝트:** `ping-3a510` (`.firebaserc` 기본). **기본 Hosting 사이트:** `ping-3a510` → URL `https://ping-3a510.web.app` (`firebase hosting:sites:list`).
- **멀티 사이트/타깃:** 현재 repo에는 `hosting` target 맵이 비어 있음. 추가 사이트가 필요하면: `firebase hosting:sites:create <SITE_ID>` 후 `firebase target:apply hosting <target> <SITE_ID>` (`.firebaserc`에 targets 블록 생성).
- **배포:** `firebase use ping-3a510` → `npm run deploy` 또는 `firebase deploy --only hosting` / `functions,hosting`.
- **로그인 (대화형):** `firebase login` — CI에서는 SA 키·`FIREBASE_TOKEN` 등 별도 패턴.
- **`ping.funexcloud.com` 을 쓸 때:** Firebase Console → **Hosting** → **도메인 추가** → 안내하는 **DNS 레코드**(A/AAAA 또는 CNAME)를 **DNS 호스팅업체**에 설정. SSL은 Firebase가 프로비저닝. (DNS/외부 레지스트라 설정은 repo 밖.)
- **Vercel에 같은 도메인을 연결할 때:** [`vercel-deploy.md`](./vercel-deploy.md) — **동일 FQDN을 Firebase Hosting과 Vercel에 동시에 둘 수 없음.** DNS를 한쪽으로 옮기기 전에 트래픽·API(`PING_BACKEND_API_ORIGIN`) 분리를 정할 것. **릴리스 순서:** [`vercel-production-handoff.md`](./vercel-production-handoff.md).

### Authorized domains (Firebase Authentication)

- 앱에서 **Firebase Auth**(예: Google 로그인 제공자)를 쓰면: Console → **Authentication** → Settings → **Authorized domains** 에 예: `ping.funexcloud.com`, `ping-3a510.firebaseapp.com`, `ping-3a510.web.app`, `localhost` (개발). apex `funexcloud.com` 을 콜백·링크에 쓰면 동일하게 추가 검토.

### Google 연락처 (People API) — Firebase와 별개

- 한국어 설정 상세: [`docs/google-contacts-setup.md`](./google-contacts-setup.md).
- React `/start`: scope **`https://www.googleapis.com/auth/contacts.readonly`**, People API (`ping-google-contacts.ts`).
- **Google Cloud Console** OAuth 클라이언트: **승인된 JavaScript 원본** 등에 `https://ping.funexcloud.com`, 로컬 호스트. API 키는 HTTP 리퍼러 제한 시 동일 출처 패턴. 이 설정은 **Firebase Authorized domains 와 다름**.

### Storage CORS (주소록 파일 업로드)

- 루트 `firebase-storage-cors.json` 에 운영 출처 포함 후 버킷에 적용:  
  `gsutil cors set firebase-storage-cors.json gs://ping-3a510.firebasestorage.app`  
  (버킷 이름은 Console → Storage 에 표시된 값과 일치하는지 확인.)
- 네이버 주소록은 **내보낸 파일 업로드** 방식입니다. 사용자 단계별 안내: [naver-contacts-setup.md](./naver-contacts-setup.md).

### Express API vs Firebase Hosting 정적 파일

- `firebase.json` rewrites 에는 **`/api/toss/confirm-payment`**, **`/api/checkout/register-session`**, **`/api/payment/points-only`** 가 없음 — 구현은 **`server.js` (Express)**.
- 정적 Hosting만 배포하고 API가 다른 호스트이면 서버 `.env` 에 **`PING_BACKEND_API_ORIGIN`**(끝 슬래시 없음)을 두면 `/api/portone-config.js` 가 클라이언트에 `backendApiOrigin` 으로 넘겨, 토스 승인·포인트 결제 등이 해당 호스트로 붙음.

### Static `index.html` vs Next.js App Router (동일 repo, 배포 축 분리)

- **Firebase Hosting** (`firebase.json` rewrites): 운영에서 `/`, `checkout`, `send/payments` 등이 여전히 **`public/` 정적 `.html`** 로 서빙될 수 있음 (`index.html`, `checkout.html`, …).
- **Next** (`src/app`): 로컬에서는 보통 **`npm run dev`** 로 Express와 **`next dev` (포트 3002)** 를 같이 둠. 홈 진입 후 인트로·**`/bulk`**(URL·작성·pick·review)·`/checkout` 등 App Router 페이지가 이 축에 해당.
- **대량 문자:** React **`/bulk`** 가 `index.html` 로 넘길 때 `ping_from_index`, `ping_compose_image_data` 등 세션을 레거시와 공유함 — 상세 **`docs/index-bulk-flow-reference.md`**, URL·Hosting/Next 대응표 **`docs/migration-html-to-react-remaining.md`**, 경로 단위 대조 **`docs/hosting-vs-next-url-parity.md`**.

---

## 1. Pre-deployment Checklist

### Code and build

- Environment variables: confirm production values are set instead of local or test values.
  - Payment: Toss `TOSS_PAYMENTS_WIDGET_CLIENT_KEY`, `TOSS_PAYMENTS_SECRET_KEY`; PortOne(레거시) `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`; split API host `PING_BACKEND_API_ORIGIN` when needed
  - Legacy payment fallback if still used: `IMP_API_KEY`, `IMP_API_SECRET`
  - App URL: `APP_BASE_URL`
  - Notification: `KAKAO_API_KEY`, `KAKAO_USER_ID`, `KAKAO_SENDER_KEY`, `OBITUARY_FAMILY_TEMPLATE_CODE`
  - Bulk dispatch if enabled: `PING_DISPATCH_USE_SOLAPI`, `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_FROM`, `SOLAPI_KAKAO_PF_ID`, `SOLAPI_KAKAO_TEMPLATE_ID`
- Console log review: remove or reduce debug-heavy `console.log` calls before production if they expose internal flow or sensitive identifiers.
- Dependency cleanup: review `package.json`, remove unused libraries, and run security checks.
  - Suggested commands: `npm run check`, `npm run smoke`, `npm audit`

### Quality and performance

- Final happy-path test: verify the main flows work end to end.
  - Home application flow
  - Payment approval flow
  - Obituary draft creation
  - Family review and approval
  - Public obituary opening
- Asset optimization: confirm minified assets and caching headers are applied through Hosting or CDN configuration.
- Browser compatibility: check desktop Chrome, Samsung Internet, iPhone Safari, and Android Chrome.
- Responsive QA: verify sticky CTA, modal sheets, side menu, form sections, and memorial pages on narrow screens.

### Security and infrastructure

- SSL: confirm the production domain is serving HTTPS only.
- Error pages: prepare custom `404` and `500` handling for Hosting and app flows.
- Rollback plan: define how to revert to the previous Hosting and Functions release if production issues occur.
- Secrets review: confirm no test key, local callback URL, or internal-only endpoint is exposed in client HTML.
- Webhook verification: confirm `PORTONE_WEBHOOK_SECRET` is set and webhook signature validation is working.

## 2. Deployment-phase Useful Prompts

### Code review and optimization

Prompt:

```text
아래 코드를 배포 직전 단계라고 가정하고 검토해줘. 불필요한 디버깅 로그를 찾고, 성능을 개선하거나 가독성을 높일 수 있는 부분을 리팩토링해줘. 보안상 위험한 하드코딩된 값이 있는지도 확인해줘.
```

### README or handoff documentation

Prompt:

```text
이 프로젝트의 주요 기능과 설치 방법, 환경 설정법을 포함한 전문적인 README.md 파일을 작성해줘. 기술 스택은 Firebase Functions, Express, static HTML, PortOne, Solapi야. 부고 작성, 결제, 유가족 확인, 공개 부고 링크 흐름을 포함해줘.
```

### Test scenarios and edge cases

Prompt:

```text
현재 핑 웹 앱의 배포를 앞두고 있어. 사용자가 유입부터 결제, 부고 등록, 유가족 확인까지 진행하는 과정에서 발생할 수 있는 잠재적인 엣지 케이스와 오류 시나리오 5가지를 뽑아줘.
```

### Release notes

Prompt:

```text
이번 업데이트에서 결제 승인 안정화, 부고 등록 승인 플로우 추가, UI 통일감 개선이 이루어졌어. 이를 사용자들에게 친절하고 명확하게 전달할 수 있는 릴리스 노트를 작성해줘.
```

## 3. Post-deployment Monitoring Points

- Logs: monitor Functions and server logs for approval failures, webhook verification errors, and obituary approval failures.
- Analytics: verify GA4, Meta Pixel, or other analytics tools collect page and conversion events correctly if enabled.
- Real user path: re-test the production flow in a normal browser session.
  - Payment request
  - Payment approval callback
  - Order status lookup
  - Family notification delivery
  - Family approval link
  - Public obituary access
- Customer support inbox: watch for first-day reports about failed payment, SMS or Kakao delivery mismatch, and mobile layout issues.

## 4. Suggested Command Order

```bash
npm run check
npm run smoke
npm audit
firebase deploy --only functions,hosting
firebase functions:log
```

## 5. Release-day Sign-off

- Payment owner confirms production keys and webhook secret
- Operations owner confirms Kakao or Solapi template readiness
- QA owner confirms desktop and mobile happy-path passes
- Business owner confirms PG review pages, policy pages, and business information are visible
