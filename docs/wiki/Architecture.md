# 아키텍처

## 배포 축 (2026-06)

| 축 | 역할 | 프로덕션 |
|----|------|----------|
| **Vercel** | Next.js UI 전체 | `ping.funexcloud.com` |
| **Firebase/GCP** | Functions, Firestore, Storage | API rewrite, Hosting은 API·자산만 |
| **Cloud Run** | Express (`server.js` 핵심) | `PING_EXPRESS_ORIGIN` — 인증 폴백 |

상세: [`docs/deployment-axis-decision.md`](https://github.com/funexcloud/ping/blob/main/docs/deployment-axis-decision.md)

---

## 요청 흐름

```
Browser
  → Vercel (Next 15, src/app)
       → Route Handler (일부 /api/*)
       → PING_BACKEND_API_ORIGIN (Firebase Functions)
       → PING_EXPRESS_ORIGIN (회원·게스트 auth, 폴백)
       → Firestore / Solapi / Toss
```

---

## 코드 레이어

| 경로 | 역할 |
|------|------|
| `src/app/` | 페이지·Next API |
| `server.js` | 로컬 Express, API 프록시 |
| `index.js` | Firebase Cloud Functions |
| `ping-dispatch/` | Solapi 대량 발송 |
| `ping-order-finalize.js` | 결제 후 dispatch |
| `ping-admin-auth.js` | 관리자 세션 |
| `member-auth.js` | 회원 세션 |
| `lib/ping-member-auth-app.cjs` | auth·guest·app-settings Express 라우터 |

---

## Express ↔ Next (로컬)

| 포트 | 프로세스 |
|------|----------|
| **3002** | Next (`npm run next:dev`) — 브라우저 진입 |
| **3000** | Express — OAuth 콜백, `/api/*` 대부분 |

`npm run dev` = 둘 다 기동.

문서: [`express-next-role-split.md`](https://github.com/funexcloud/ping/blob/main/docs/react-integration/express-next-role-split.md)

---

## 데이터

| 저장소 | 용도 |
|--------|------|
| Firestore `ping_orders` | 주문·발송 상태 |
| Firebase Storage | 업로드·이미지 |
| GCS `ping-3a510-member-auth` | 회원·게스트 설정 (Express/Next) |
| SQLite (Prisma) | 부의금·연락처 보조 (Vercel serverless 주의) |

---

## 관련

- [Deployment](Deployment)
- [API-Overview](API-Overview)
