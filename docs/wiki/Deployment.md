# 배포

## 프로덕션 구성

| 대상 | 명령·도구 |
|------|-----------|
| **Next UI** | Vercel — `npx vercel deploy --prod` |
| **Functions** | `npm run deploy:functions` |
| **Express** | `npm run deploy:express` → `PING_EXPRESS_ORIGIN` |

DNS: **`ping.funexcloud.com` → Vercel만** (Firebase Hosting과 이중 UI 금지)

---

## 배포 전 (필수)

1. `npm run smoke`
2. Vercel Production env — [handoff §3](https://github.com/funexcloud/ping/blob/main/docs/vercel-production-handoff.md)
3. PG·OAuth 콘솔에 `https://ping.funexcloud.com` 등록

---

## 배포 후

1. `/`, `/start`, `/login` — 200
2. `npm run verify:production`
3. Vercel Deployments — Production Ready

---

## 주요 env (Production)

| 변수 | 값 예 |
|------|-------|
| `NEXT_PUBLIC_SITE_URL` | `https://ping.funexcloud.com` |
| `PING_BACKEND_API_ORIGIN` | `https://ping-3a510.web.app` |
| `PING_EXPRESS_ORIGIN` | Cloud Run URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | (있으면 Express 없이 Next auth) |
| `PING_SAFE_LINK_SECRET` | 운영 필수 |
| `PING_ADMIN_*` | 관리자 |

`npm run check:vercel-env` — 점검 스크립트

---

## Cron

Vercel Cron: `/api/cron/purge-sensitive-data` (일 1회)  
env: `CRON_SECRET`, `PING_RECIPIENT_PURGE_HOURS`

---

## 관련

- [vercel-deploy.md](https://github.com/funexcloud/ping/blob/main/docs/vercel-deploy.md)
- [deployment-playbook.md](https://github.com/funexcloud/ping/blob/main/docs/deployment-playbook.md)
