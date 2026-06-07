# 관리자 · 운영

## 경로

| URL | 기능 |
|-----|------|
| `/admin/auth` | PIN 로그인 |
| `/admin/monitoring` | 주문·파트너·**무통장 입금 확인** |
| `/admin/service-status` | 통계·비회원 OTP on/off |
| `/admin/partner?partner=코드` | 파트너 대시보드 |
| `/admin/partner?admin=true` | 관리자 모드 |

PC 레이아웃: `min-width: 1280px` (`admin-desktop.css`)

---

## 인증

- **UI PIN:** `PING_ADMIN_UI_PASSWORD` (서버 env만)
- **세션:** `ping_admin_session` HttpOnly 쿠키, 8시간
- **API 키:** `PING_ADMIN_API_KEY` (자동화·curl)
- 검증: `ping-admin-auth.js` → `resolveAdminAuth`

로그인: `POST /api/admin/auth/login`  
로그아웃: `POST /api/admin/auth/logout`  
세션 확인: `GET /api/admin/auth/session`

---

## 입금 확인 · 발송

`POST /api/admin/orders/confirm-bank-deposit`

- body: `{ orderId }` + 세션 쿠키
- `waiting_bank_transfer` → `paid` + Solapi dispatch

모니터링 UI: `adminApiFetch` (쿠키 포함)

---

## 발송 상태 (운영)

Firestore `ping_orders`:

| 필드 | 의미 |
|------|------|
| `status` | `waiting_bank_transfer`, `paid`, … |
| `smsStatus` | `sending`, `sent`, `failed` |
| `smsResult` | `failedCount`, `targetCount` 등 |

사용자 UI: `fulfillmentPhase` — [Bulk-Flow-9-Steps](Bulk-Flow-9-Steps)

**수동 상태 변경 UI 없음** — 결제·발송 파이프라인 자동.

---

## app-settings

`GET/PATCH /api/admin/app-settings` — 게스트 SMS 인증 on/off  
인증: 관리자 세션 쿠키 (service-status에서 저장)

---

## 관련

- [Security-and-Auth](Security-and-Auth)
- [Roadmap-and-Status](Roadmap-and-Status)
