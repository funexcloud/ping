# PING

**부고 커뮤니케이션 플랫폼** — 부고 URL 불러오기부터 연락처 검증, 결제, 문자·알림톡 발송, 안심 링크, 부의금 명단까지 한 흐름으로 연결합니다.

운영(공개 서비스): [https://ping.funexcloud.com](https://ping.funexcloud.com)  
소스: [github.com/funexcloud/ping](https://github.com/funexcloud/ping)

> **서비스 vs 저장소:** 위 URL은 **누구나 접속하는 공개 웹 서비스**입니다. GitHub 저장소의 Public/Private 여부는 **코드 공개 범위**이며, 서비스 배포와는 별개입니다.

---

## PING이 하는 일

일반 SMS 대행 사이트와 달리, PING은 **부고(장례) 상황에 맞춘 세로(vertical) 플로**를 제공합니다.

| 영역 | 내용 |
|------|------|
| **대량 발송** | 부고 URL 파싱 → 연락처(Google/CSV) → 유효 건수 과금 → 회원/비회원 본인확인 → 토스 결제 → Solapi 발송 |
| **안심 부고 링크** | 외부 부고 URL을 서명 JWT(`/s/{token}`)로 감싸 위·변조·만료(발인 기준) 관리 |
| **결제·주문** | Firestore `ping_orders`, 무통장 입금, 환불·재발송 API |
| **부의금** | 발송 명단 기반 부의금 정리·엑셀 (Prisma + SQLite, 로컬/보조 저장) |
| **관리자** | 입금 확인·발송 트리거, 모니터링, 서비스 설정 (`/admin/*`) |

자세한 9단계 플로는 [`docs/ping-bulk-send-process.md`](docs/ping-bulk-send-process.md)를 참고하세요.

---

## 기술 스택

| 계층 | 기술 |
|------|------|
| **UI** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **API (로컬·레거시)** | Express (`server.js`), Firebase Cloud Functions (`index.js`) |
| **데이터** | Firebase Firestore, Firebase Storage, Prisma + SQLite (부의금·연락처 보조) |
| **결제** | 토스페이먼츠 (PortOne 브라우저 SDK) |
| **발송** | Solapi (알림톡 우선, LMS 폴백) — [`ping-dispatch/`](ping-dispatch/) |
| **인증** | 회원(이메일·카카오), 비회원 Solapi OTP, 관리자 HttpOnly 세션 쿠키 |
| **배포** | Vercel (Next UI), Firebase (Functions·Hosting API), Cloud Run (Express 폴백) |

---

## 아키텍처 (요약)

```
[브라우저]
    │
    ▼
Vercel — Next.js (src/app)          ← 사용자 UI · 일부 Route Handler
    │
    ├── Firebase Functions / Hosting  ← 결제·부고 import·주문 API (PING_BACKEND_API_ORIGIN)
    ├── Express (Cloud Run)           ← 회원·게스트 인증 폴백 (PING_EXPRESS_ORIGIN)
    └── Firestore / Storage / Solapi / Toss
```

- **UI 캐논:** React `src/app`만 (레거시 HTML은 제거·스냅샷 보관)
- **로컬 개발:** Express `:3000` + Next `:3002` 동시 기동 (`npm run dev`)
- **역할 분담:** [`docs/react-integration/express-next-role-split.md`](docs/react-integration/express-next-role-split.md)
- **배포 축:** [`docs/deployment-axis-decision.md`](docs/deployment-axis-decision.md)

---

## 시작하기

### 요구 사항

- **Node.js 20** (`package.json` `engines`)
- npm
- (선택) Firebase CLI, Vercel CLI, Docker

### 설치

```bash
git clone https://github.com/funexcloud/ping.git
cd ping
npm install
cp .env.example .env
# .env 값을 채운 뒤 아래 dev 실행
```

### 로컬 개발

```bash
# Express(:3000) + Next(:3002) 동시 실행
npm run dev

# 포트 충돌 시
npm run dev:clean

# Docker
npm run dev:docker
```

| URL | 용도 |
|-----|------|
| `http://localhost:3002` | Next UI (권장 브라우저 진입) |
| `http://localhost:3000` | Express API · OAuth 콜백 |

주요 화면: `/` · `/intro` · `/start` (대량 위저드) · `/login` · `/checkout` · `/payment-success` · `/admin/monitoring`

### 검증

```bash
npm run check    # 파서·마이그레이션·env 점검 등
npm run smoke    # next build + 스모크 테스트
```

---

## 환경 변수

`.env.example`에 전체 목록과 주석이 있습니다. **`.env`는 git에 올리지 마세요.**

| 구분 | 대표 변수 |
|------|-----------|
| **공개 사이트** | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FIREBASE_*` |
| **API 베이스** | `PING_BACKEND_API_ORIGIN`, `PING_EXPRESS_ORIGIN` |
| **안심 링크** | `PING_SAFE_LINK_SECRET` |
| **관리자** | `PING_ADMIN_UI_PASSWORD`, `PING_ADMIN_API_KEY`, `PING_ADMIN_SESSION_SECRET` |
| **발송** | `SOLAPI_*`, `PING_DISPATCH_*` |
| **결제** | `TOSS_PAYMENTS_*`, `PORTONE_*` |
| **회원·OAuth** | `KAKAO_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `PING_OAUTH_STATE_SECRET` |
| **Google 연락처** | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_API_KEY` |

운영 체크리스트: [`docs/vercel-production-handoff.md`](docs/vercel-production-handoff.md)

---

## npm scripts (자주 쓰는 것)

| 명령 | 설명 |
|------|------|
| `npm run dev` | Express + Next 동시 개발 |
| `npm run dev:clean` | 포트 정리 후 dev |
| `npm run build` | Next 프로덕션 빌드 |
| `npm run check` | 저장소 일관성·규칙 검사 |
| `npm run smoke` | 빌드 + 스모크 |
| `npm run test:solapi` | Solapi 발송 테스트 |
| `npm run deploy:express` | Express → Cloud Run |
| `npm run deploy:functions` | Firebase Functions 배포 |
| `npm run verify:production` | 프로덕션 API 연결 확인 |

---

## 디렉터리 구조

```
ping/
├── src/app/              # Next.js App Router (페이지·API Route Handler)
├── src/components/       # React UI
├── src/lib/              # 클라이언트·서버 공용 유틸 (안심 링크, 주문 상태 등)
├── assets/               # CSS·레거시 JS·정적 자산
├── ping-dispatch/        # Solapi 대량 발송 모듈
├── lib/                  # CJS 브릿지 (member-auth-app, bugo 파서 등)
├── scripts/              # 빌드·검증·배포 스크립트
├── docs/                 # 운영·이관·UI 가이드
├── server.js             # 로컬 Express (API 프록시·레거시 핸들러)
├── index.js              # Firebase Cloud Functions 진입점
├── member-auth.js        # 회원 로그인·세션
├── ping-admin-auth.js    # 관리자 세션·API 키 검증
└── prisma/               # SQLite 스키마 (부의금 등)
```

---

## 관리자 (`/admin`)

| 경로 | 기능 |
|------|------|
| `/admin/auth` | PIN 로그인 → `httpOnly` 쿠키 `ping_admin_session` (8시간) |
| `/admin/monitoring` | 주문·파트너 모니터링, 무통장 입금 확인·발송 |
| `/admin/service-status` | 서비스 현황, 비회원 문자 인증 on/off |
| `/admin/partner` | 파트너 대시보드 |

- UI PIN: `PING_ADMIN_UI_PASSWORD` (서버 전용)
- API 자동화: `PING_ADMIN_API_KEY` 또는 로그인 세션 쿠키
- 실제 권한 검증은 **모든 관리 API**에서 서버 측 `resolveAdminAuth`로 수행

---

## 배포

| 대상 | 방법 |
|------|------|
| **Next UI** | Vercel — `npx vercel deploy --prod` ([`docs/vercel-deploy.md`](docs/vercel-deploy.md)) |
| **Functions** | `npm run deploy:functions` |
| **Express** | `npm run deploy:express` → `PING_EXPRESS_ORIGIN` 설정 |

프로덕션 배포 전·후: [`docs/vercel-production-handoff.md`](docs/vercel-production-handoff.md) §1·§2

---

## 문서

| 문서 | 내용 |
|------|------|
| [`docs/ping-bulk-send-process.md`](docs/ping-bulk-send-process.md) | 대량 발송 9단계 (제품 SoT) |
| [`docs/UI-GUIDE.md`](docs/UI-GUIDE.md) | UI·디자인 토큰 |
| [`docs/CODING-STANDARD.md`](docs/CODING-STANDARD.md) | 코딩 규칙 |
| [`docs/deployment-playbook.md`](docs/deployment-playbook.md) | PG·Firebase·도메인 총괄 |
| [`docs/react-integration/`](docs/react-integration/) | HTML→React 이관·API 인벤토리 |
| [`docs/legal-attorney-review-checklist.md`](docs/legal-attorney-review-checklist.md) | **변호사 검토 체크리스트** (약관·개인정보·IP) |
| [`.cursor/rules/ping-bordered-panel.mdc`](.cursor/rules/ping-bordered-panel.mdc) | 패널 UI 규칙 |

---

## 보안

- 시크릿·PIN·API 키는 **환경 변수**만 사용 (클라이언트 번들·git 금지)
- 안심 링크: `jose` HS256, 운영 시 `PING_SAFE_LINK_SECRET` 필수
- 관리자: UI PIN과 API 키 분리, 세션 쿠키 `httpOnly` + HMAC 서명
- 민감 데이터 파기: Vercel Cron `/api/cron/purge-sensitive-data` (설정: `CRON_SECRET`)

---

## 라이선스·사업자 정보

**운영 주체:** 한국AIBC융합원 (대표 송지훈)

| 항목 | 내용 |
|------|------|
| 사업자등록번호 | 225-09-26000 |
| 통신판매업신고번호 | 2024울산북구0108호 |
| 사업장주소 | 울산광역시 중구 해오름5길 24 101호 |
| 고객센터 | 052-286-4440 |

한국AIBC융합원에서 운영하는 본 사이트의 모든 유료 서비스는 한국AIBC융합원에서 책임지고 제공합니다.

| 구분 | 정책 |
|------|------|
| **웹 서비스 이용** | [이용약관](https://ping.funexcloud.com/legal/terms-of-service) · [개인정보처리방침](https://ping.funexcloud.com/legal/privacy-policy) |
| **소스 코드** | 독점 — [`LICENSE`](./LICENSE). 무단 복제·배포·2차 저작물 금지 |
| **npm `"private"`** | npm 패키지 미배포 설정 (GitHub 공개 여부와 별개) |

**변호사 검토(필수):** [`docs/legal-attorney-review-checklist.md`](docs/legal-attorney-review-checklist.md) — 약관·개인정보·지식재산 문구는 **법률 자문 후** 확정합니다.

**GitHub About:** Description → [`.github/repository-description.txt`](.github/repository-description.txt)  
`GITHUB_TOKEN=... node scripts/set-github-repo-description.mjs`

사업자 표기 단일 출처: [`src/lib/ping-company-legal.ts`](src/lib/ping-company-legal.ts)
