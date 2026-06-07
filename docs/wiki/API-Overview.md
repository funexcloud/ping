# API 개요

> SoT 표: [`api-inventory.md`](https://github.com/funexcloud/ping/blob/main/docs/react-integration/api-inventory.md)

## Next Route Handler (`src/app/api/`)

| prefix | 용도 |
|--------|------|
| `/api/admin/auth/*` | 관리자 login/logout/session |
| `/api/admin/orders/confirm-bank-deposit` | 무통장 확인·발송 |
| `/api/admin/app-settings` | 게스트 OTP 설정 |
| `/api/auth/*` | 회원·카카오 (Express 브릿지) |
| `/api/guest-auth/*` | 비회원 OTP |
| `/api/toss/confirm-payment` | 토스 승인 |
| `/api/checkout/*` | checkout 세션·무통장 |
| `/api/orders/[orderId]/*` | status, retry-dispatch, refund |
| `/api/import/*` | 부고 URL 파싱 |
| `/api/safe-link/issue` | 안심 링크 발급 |
| `/api/condolence/*` | 부의금 |
| `/api/cron/purge-sensitive-data` | 데이터 파기 |

## Firebase Functions / Express

`/api/*` 나머지 — `index.js`, `server.js`  
로컬: Express `:3000` 또는 Next 프록시

---

## 인증 헤더·쿠키

| API | 인증 |
|-----|------|
| admin orders | `ping_admin_session` cookie |
| admin app-settings | 동일 |
| member `/api/auth/me` | Bearer / session |
| guest send-code | 공개 (rate limit) |

---

## 외부 연동

| 서비스 | 용도 |
|--------|------|
| Solapi | SMS·알림톡 |
| Toss | 결제 |
| Firestore | 주문 |
| Google People | 연락처 import |
| Resend | 회원 이메일 (선택) |

---

## 관련

- [Architecture](Architecture)
- [Development-Guide](Development-Guide)
