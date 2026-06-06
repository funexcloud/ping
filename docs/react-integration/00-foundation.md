# 0. React(Next) 통합 — 기반 확립

이 문서는 `REACT-MIGRATION-TASKS.md` **0번 항목** 실행 결과다. 이후 페이즈 ① 작업 전에 여기부터 맞춘다.

---

## 1. Next 단일 진입점

| 항목 | 결정 |
|------|------|
| 프레임워크 | **Next.js 15** (App Router) |
| 앱 루트 | **`src/app/`** (`layout.tsx`, `page.tsx`, API는 `src/app/api/**/route.ts`) |
| 로컬 Next 전용 URL | `http://localhost:3002` (`next:dev` 스크립트) |

레거시 정적 HTML·Express는 레포 루트에 그대로 두고, **새 UI는 `src/app`에만 추가**한다.

### 루트 `app/` 폴더와 Next 충돌 (필독)

Next.js는 프로젝트 루트에 **`app` 디렉터리가 있으면 `src/app`보다 그쪽을 App Router 루트로 쓴다.**  
레포에 Firebase용 중첩 패키지 **`app/`**(내부에 `node_modules/.../route.js` 등)가 있으면, 그 파일들이 **가짜 API 라우트**로 잡히고 **`/mypage` 등 실제 페이지는 404**가 날 수 있다.

**조치:** 루트의 `app` 폴더를 `firebase-functions-app` 등 **다른 이름으로 바꾼다** (Next가 예약한 `app`과 겹치지 않게). `firebase.json`의 Hosting `ignore`에는 `firebase-functions-app/**`가 포함되어 있다. 변경 후 `.next` 삭제 → `npm run next:dev` 또는 `next build`로 다시 확인한다.

Windows에서 이름 변경이 거부되면 IDE·터미널에서 해당 폴더 사용을 모두 끄고 다시 시도한다.

---

## 2. 로컬 실행 방법

### 한 번에 띄우기 (권장)

```bash
npm run dev
```

Express(기본 `PORT` 또는 3000)와 Next(3002)가 **동시에** 올라간다 (`concurrently`).

(`npm run dev:stack` 은 위와 동일하게 `npm run dev`를 호출한다.)

### 둘로 나누기

1. 터미널 A: `npm run dev:express` — Express + 정적 HTML만
2. 터미널 B: `npm run next:dev` — Next 단독

Express만 켠 상태에서 `/intro`는 Next 연결 실패 시 **정적 `intro.html`** 로 폴백된다. React 인트로를 쓰려면 Next를 반드시 같이 띄운다.

### “한 포트로만” 쓰기 (브라우저)

- 브라우저는 **`http://localhost:3000`** (Express)만 열면 된다.
- `/_next/*`, `/mypage/condolence`, `/api/condolence/*`, `/api/contacts` 는 Express가 **Next(`NEXT_DEV_PORT`, 기본 3002)로 프록시**한다.
- Next를 안 켠 상태면 `/mypage`·`/_next` 등은 **502 안내 페이지**가 뜬다. (`/intro`만 Express 단독 시 `intro.html` 폴백)

### 환경 변수

| 변수 | 의미 | 기본값 |
|------|------|--------|
| `PORT` | Express listen 포트 | `3000` |
| `NEXT_DEV_PORT` | 프록시 대상 Next 포트 | `3002` |

---

## 3. URL·인증·리다이렉트 (초안 규칙)

이 규칙은 페이즈 ①에서 코드로 맞추며 갱신한다.

### URL

- **공개·레거시:** `*.html`, Express가 직접 `sendFile` 또는 루트 정적 제공 (`/mypage.html` 등).
- **Next UI:** 경로는 **확장자 없이** (`/mypage/condolence`, 이후 `/mypage` 등).
- **외부/북마크:** HTML URL을 없앨 때는 **301**으로 Next 경로에 넘긴다 (페이즈 ①~③에서 처리).

### 인증·쿠키 (현재 전제)

- 로그인 API·세션은 **Express `server.js` / `member-auth` 등 기존 백엔드**에 둔다.
- 정적 `login.html` / `ping-member-login.js` 는 로컬에서 **`http://localhost:3000`** 기준으로 API를 부른다.
- Next 페이지(`localhost:3000/mypage/...`로 프록시)는 **같은 오리진·같은 쿠키**를 쓰므로, 브라우저 입장에서는 Express `Set-Cookie`가 Next로 넘어온 화면에서도 유효해야 한다 (`Path=/`, 필요 시 `SameSite` 정리).
- **아직 해야 할 일:** Next 전용 미들웨어에서 세션 검증을 중복 구현하지 말고, **“보호된 페이지는 Express API로 항상 검증”** 또는 **공통 쿠키 이름·만료를 문서화** (페이즈 ① 태스크).

### 리다이렉트

- 로그인 후 `next` 쿼리 등은 기존 HTML 플로를 따른다. Next로 옮긴 뒤에는 **`/login?next=/mypage/condolence`** 형태로 통일하는 것을 목표로 한다.

---

## 4. 프로덕션 서빙 (해독 중인 결정)

| 방식 | 장점 | 단점 / 메모 |
|------|------|-------------|
| **A. 동일 도메인 Reverse Proxy** (Nginx/Caddy 등) | 쿠키·SEO·mixed content 단순 | 서버 운영 필요 |
| **B. Vercel(Next) + 별도 API 호스트** | Next 배포 단순 | CORS·쿠키 도메인·API URL 설정 필요 |
| **C. Firebase Hosting 리라이트** | 기존 호스팅 유지 | Next Node 런타임은 **별 호스트·Cloud Run** 등과 조합이 일반적 |

**현재 결정:** 위 표 중 하나를 스테이징에서 먼저 고른 뒤, `firebase.json` / DNS / TLS를 맞춘다. 로컬 프록시는 **개발 전용**이다.

---

## 5. 공유 스타일 (고정)

| 항목 | 방식 |
|------|------|
| 제품 토큰·유틸 | **`assets/css/ping-ui.css`** (단일 소스, DESIGN CONTRACT) |
| Next 스타일 스택 | **Tailwind 3** (`tailwind.config.ts`) 유틸 + 위 토큰 (`bg-ping-bg`, `text-ping-text` 등). **Preflight 끔** — 베이스는 `ping-ui`. |
| Next에서 로드 | **`src/app/globals.css`** — `ping-ui.css` 선행 import 후 `@tailwind utilities` |
| 루트 레이아웃 | `<html className="ping-ui">` + Pretendard (`src/app/layout.tsx`) |

새 페이지는 가능하면 **인라인 임의 색** 대신 `ping-ui` 변수·유틸 클래스를 쓴다 (`docs/UI-GUIDE.md`).

---

## 6. 프록시 경로 (Express → Next, 개발용)

`server.js` 기준, 아래 prefix가 Next로 전달된다:

- `/_next`
- `/mypage` (허브 `/mypage`, 부의금 `/mypage/condolence` 등 하위 경로 포함)
- `/api/condolence`
- `/api/contacts`

Next 라우트·API를 추가할 때 **같은 오리진에서 쓰려면** 여기 목록을 갱신하거나, 배포에서 동일하게 라우팅한다.

---

## 관련 문서

- [REACT-MIGRATION-TASKS.md](../REACT-MIGRATION-TASKS.md) — 전체 페이즈 작업목록
- [02-phase-landing-seo.md](02-phase-landing-seo.md) — 페이즈 ② SEO·SSG·Firebase 매핑
- [03-phase-legacy-html-inventory.md](03-phase-legacy-html-inventory.md) — 페이즈 ③ HTML 인벤토리
- [express-next-role-split.md](express-next-role-split.md) — Express ↔ Next 역할·프록시
- [api-inventory.md](api-inventory.md) — API SoT 표·중복 path·통합 목표
- [smoke-and-release-checklist.md](smoke-and-release-checklist.md) — 스모크·배포 URL 점검
- [UI-GUIDE.md](../UI-GUIDE.md) — 제품 UI 계약
