# Vercel 배포 (Next `src/app`)

**운영 마무리·배포 전후 체크리스트:** [`vercel-production-handoff.md`](./vercel-production-handoff.md) — **먼저 읽고** `deploy --prod` 할 것.

## 전제

- 이 레포는 **Express(`server.js`)·Firebase Functions·정적 HTML**과 **Next App Router**가 공존한다.
- Vercel에 올라가는 것은 **Next 빌드 결과**이며, 대부분의 **`/api/*` 는 `src/app/api/[[...path]]`** 가 `PING_BACKEND_API_ORIGIN` / `PING_EXPRESS_ORIGIN` 으로 **Express(또는 기존 API 호스트)** 로 프록시한다.
- **`/api/condolence`**, **`/api/contacts`** 등은 Prisma + 로컬 SQLite 를 쓴다. Vercel serverless 파일시스템에서는 **운영 DB 전략이 없으면 실패할 수 있다.** (추후 Turso/원격 API로 옮기거나 해당 경로만 Express 로 통일.)

## 로컬·CI에서 배포

```bash
npx vercel@latest login
npx vercel@latest link
npx vercel@latest env pull .env.vercel.local
```

프로덕션:

```bash
npx vercel@latest deploy --prod
```

비대화형(CI): Vercel 대시보드에서 생성한 토큰으로  
`VERCEL_TOKEN=... npx vercel@latest deploy --prod --token $VERCEL_TOKEN`

## 필수 환경 변수 (프로덕션)

| 변수 | 설명 |
|------|------|
| `PING_BACKEND_API_ORIGIN` 또는 `PING_EXPRESS_ORIGIN` | 결제·회원·기존 `/api/*` 를 처리하는 **백엔드 베이스 URL** (끝 `/` 없음). 예: API 전용 서브도메인 또는 Cloud Run/Firebase 뒤 주소. |
| 기타 | `.env.example`·PortOne/토스·Firebase 클라이언트 키 등, `src`에서 참조하는 `NEXT_PUBLIC_*` |

`npm install` 의 **`postinstall`**: **`prisma generate`** → `ensure-next-public-static` (`legacy-html/` 전개·`public/` 미러). Vercel 에서는 `VERCEL=1` 일 때 `assets` 는 심볼릭 링크 대신 복사한다.

## 커스텀 도메인 `ping.funexcloud.com`

프로덕션 alias 가 Vercel 에 연결돼 있으면 `npx vercel deploy --prod` 후 **`ping.funexcloud.com`** 으로 트래픽이 붙는다. DNS·도메인 설정은 Vercel 프로젝트 **Settings → Domains** 에서 확인한다.

과거 Firebase Hosting 과 **같은 FQDN**을 쓰던 경우, 한쪽에서 도메인을 제거해야 충돌이 나지 않는다.

(일반적인 최초 연결 절차)

1. Vercel 프로젝트 → **Settings → Domains** → `ping.funexcloud.com` 추가.
2. DNS 에서 안내하는 **A** / **CNAME** 적용.

## 스크립트

- 루트 `package.json` 의 **`build`** = `next build` (Vercel 기본과 호환).
- `vercel.json` 에서 **`regions`: `icn1`**(인천) — 필요 시 변경.
