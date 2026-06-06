# `ping.funexcloud.com` — Vercel Next 운영 마무리 (핸드오프)

> **목적:** 배포 **전·후**에 같은 순서로 확인할 수 있는 단일 체크리스트.  
> 코드: `vercel.json`, `package.json`(`build`, `postinstall`), `scripts/ensure-next-public-static.mjs`.

---

## 1. 배포 **전** (다음 `vercel deploy --prod` 전에 반드시)

| # | 항목 | 확인 |
|---|------|------|
| 1 | **의도한 릴리스 범위** | 이번 배포에 포함할 커밋·변경 요약을 한 줄이라도 남겼는가. |
| 2 | **로컬 스모크** | `npm run smoke` (또는 최소 `npm run build`) 통과. |
| 3 | **Vercel Production 환경 변수** | 아래 [§3](#3-vercel-production-환경-변수-점검) 표가 채워져 있는가(빈 값이면 런타임 장애). |
| 4 | **API 베이스 URL** | `PING_BACKEND_API_ORIGIN` → Firebase **`https://ping-3a510.web.app`**. 회원·게스트 인증: **`FIREBASE_SERVICE_ACCOUNT_JSON`** 있으면 Next가 직접 처리, 없으면 `PING_EXPRESS_ORIGIN`(Cloud Run)으로 폴백. |
| 5 | **도메인 단일화** | `ping.funexcloud.com` 을 **Firebase Hosting 과 Vercel 에 동시에** 두지 않았는가(DNS/SSL 충돌). |
| 6 | **SQLite·Prisma 경로** | `/api/condolence`, `/api/contacts` 등은 Vercel serverless + **로컬 SQLite 파일**에 의존한다. **운영에서 실제 사용**하는 경우 원격 DB 또는 Express 위임 전략이 있는가. |
| 7 | **PG·OAuth 콘솔** | 토스·PortOne·Google OAuth 리퍼러/리다이렉트에 **`https://ping.funexcloud.com`**(및 필요 path) 등록 여부. |

---

## 2. 배포 **후** (프로덕션 반영 직후)

| # | 확인 | 방법(예) |
|---|------|----------|
| 1 | 루트 응답 | 브라우저 또는 `GET https://ping.funexcloud.com/` — 200, PING UI. |
| 2 | 주요 Next 경로 | `/intro`, `/start`, `/login`, `/send/url`, `/checkout` — 200. |
| 3 | API 프록시 | `npm run verify:production` — Firebase `/api/getOrderStatus`, Express `/api/auth/kakao/config`, `/api/guest-auth/config` 가 502·`express_unreachable` 이 아닌지. |
| 4 | Vercel 대시보드 | **Deployments** 에서 최신 **Production** = **Ready**. |
| 5 | 이관 문서 | [`migration-html-to-react-remaining.md`](./migration-html-to-react-remaining.md) §4 항목 7·URL 표 상태 갱신. |

---

## 3. Vercel Production 환경 변수 점검

`Settings → Environment Variables → Production` 에서 다음을 확인한다. (이름은 코드·`.env.example` 기준.)

| 변수 | 용도 |
|------|------|
| `PING_BACKEND_API_ORIGIN` | Firebase Functions API: **`https://ping-3a510.web.app`** (결제·부고·import 등). |
| `PING_EXPRESS_ORIGIN` | Cloud Run Express 폴백 URL (`FIREBASE_SERVICE_ACCOUNT_JSON` 없을 때만 인증에 사용). |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase/GCP 서비스 계정 JSON **한 줄** — 회원·세션 GCS (`ping-3a510-member-auth`). 있으면 **Express 없이** Next에서 인증 처리. |
| `PING_MEMBER_GCS_BUCKET` | (선택) 기본 `ping-3a510-member-auth` — Express와 동일 버킷 유지. |
| `PING_OAUTH_STATE_SECRET` | (권장) 카카오 OAuth state HMAC — `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | **`https://ping.funexcloud.com`** — SEO·안심 링크 캐논 |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `src/lib/ping-firebase-web.ts` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 동일 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 동일 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | 동일 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 동일 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 동일 |
| `NEXT_PUBLIC_NEXT_DEV_PORT` | (선택) 개발용 |
| (결제·PortOne·토스 서버 키) | `src/app/api`·checkout 등에서 참조하는 항목 — `.env.example` 및 실제 `route.ts` 기준으로 추가 |

**빌드 시:** `postinstall` → `prisma generate` → `ensure-next-public-static` (Vercel에서는 `assets` 디렉터리 **복사**).

### Express 없이 인증 완전 이전 (한 번만)

1. Firebase Console → **프로젝트 설정 → 서비스 계정** → **새 비공개 키** JSON 다운로드 (git·채팅에 올리지 말 것).
2. 서비스 계정에 Storage **Object Admin**(또는 버킷 `ping-3a510-member-auth` 읽기/쓰기) 권한.
3. 로컬에서:
   ```bash
   npm run push:vercel-member-auth-env -- --sa path/to/firebase-adminsdk.json
   npx vercel deploy --prod --yes
   npm run verify:production
   ```
4. `curl -sS https://ping.funexcloud.com/api/auth/kakao/config` → `enabled: true` (Express 경유 없이 Next 응답).

---

## 4. 롤백·긴급 대응

1. **Vercel:** 이전 **Production** 배포를 **Promote** 하거나, 문제 커밋만 **Revert** 후 재배포.
2. **DNS:** 도메인을 다시 Firebase(또는 Express 단독)로 돌릴 때는 TTL·양쪽 콘솔에서 **한 도메인 = 한 타깃**만 유지.
3. **문제 재현:** 로컬 `npm run smoke`, Vercel **Build Logs** / **Runtime Logs**.

---

## 5. 관련 문서

- [`vercel-deploy.md`](./vercel-deploy.md) — CLI·도메인 기본 안내  
- [`hosting-vs-next-url-parity.md`](./hosting-vs-next-url-parity.md) — Hosting vs Next URL  
- [`index-bulk-flow-reference.md`](./index-bulk-flow-reference.md) — 대량 플로·세션  
- [`deployment-playbook.md`](./deployment-playbook.md) — PG·Firebase·도메인 총괄  

---

## 6. 이번 세션에서 반영된 기술 변경(요약)

- Vercel 빌드: `public/assets` 처리(`VERCEL` 시 복사), `postinstall`에 **`prisma generate`** 추가.  
- `package.json`에 **`build`**: `next build`.  
- 프로젝트: **`funexmove-dev/ping_mobile`** — 배포는 **`npx vercel@latest deploy --prod`**.

운영 담당자는 **[§1](#1-배포-전-다음-vercel-deploy--prod-전에-반드시)·[§2](#2-배포-후-프로덕션-반영-직후)를 매 릴리스**에 맞춰 체크한 뒤 배포하는 것을 권장한다.

---

## 7. 로컬 검증 기록 (마무리)

- **2026-05-15:** 저장소 기준 `npm run smoke` (**next:build** + Express 스모크 + **`next start`** 주요 경로) **통과.**

---