# API 인벤토리 · 소스 오브 트루스 (SoT)

`REACT-MIGRATION-TASKS.md` **API 정리** 절의 실행 표이다. **라우트를 추가·삭제·프록시할 때마다** 이 파일과 [express-next-role-split.md](express-next-role-split.md) §2를 함께 갱신한다.

**로컬 단일 포트:** Express가 `/_next`, `/mypage`, 아래 Next API prefix만 Next 개발 서버로 프록시한다 (`server.js`).

---

## 1. Next `Route Handler` (SoT = Next)

| Path | Method | 구현 | SoT 비고 |
|------|--------|------|----------|
| `/api/condolence` | GET, POST | `src/app/api/condolence/route.ts` | Prisma `CondolenceMoney`; 쿼리 `bugoRequestId` |
| `/api/condolence/bulk` | POST | `src/app/api/condolence/bulk/route.ts` | CSV/XLSX 일괄 |
| `/api/condolence/template` | GET | `src/app/api/condolence/template/route.ts` | XLSX 템플릿 |
| `/api/contacts` | GET | `src/app/api/contacts/route.ts` | `search` — 명단 검색 |

인증·테넌트: [express-next-role-split.md §1](express-next-role-split.md#1-신규-데이터권한-로직--기본-원칙)와 맞출 것. (세션이 필요한 API면 Express 위임 또는 공통 검증 레이어 검토.)

---

## 2. Express `server.js` (SoT = Express)

구현 단위는 **핸들러 등록 위치 기준**이다. 동일 핸들러에 여러 path가 붙은 경우는 §3에서 별칭으로 적는다.

| Path (prefix 또는 전체) | Method | 역할 (요약) |
|-------------------------|--------|-------------|
| `/api/google-oauth-config.js` | GET | 클라이언트용 OAuth 설정 스크립트 |
| `/api/portone-config.js` | GET | PortOne 설정 스크립트 |
| `/api/ping-health` | GET | 헬스 |
| `/api/funeral-halls`, `/api/funeralHalls` | GET | 장례식 처리 동선 |
| `/api/checkout/register-session` | POST | 체크아웃 세션 |
| `/api/payment/points-only` | POST | 포인트 결제 |
| `/api/toss/confirm-payment` | POST | 토스 확정 |
| `/api/approvePayment` | POST | 로컬 결제 승인 |
| `/api/getOrderStatus` | GET | 주문 상태 |
| `/api/obituaries`, `/api/createObituaryDraft` | POST | 부고 초안 생성 |
| `/api/obituary-entry`, `/api/getObituaryEntry` | GET | 부고 항목 조회 |
| `/api/getObituarySales` | GET | 매출 조회 |
| `/api/postObituarySale` | POST | 매출 기록 |
| `/api/getMortuaryMessages` | GET | 조문 메시지 |
| `/api/getMortuaryMessageLogs` | GET | 조문 메시지 로그 |
| `/api/sendMortuaryMessage` | POST | 조문 메시지 발송 |
| `/api/obituary-entry/approve`, `/api/approveObituaryEntry` | POST | 항목 승인 |
| `/api/webhookHandler` | POST | 웹훅 |
| `/api/verify-account-holder` | POST | 예금주 검증 |
| `/api/leads` | POST | 마케팅 리드 |
| `/api/marketing/cookie-sync` | POST | 쿠키 동기 |
| `/api/import/bugo-funeral`, `/api/import/wooribugo-funeral` | POST | 부고 가져오기 |
| `/api/auth/register` | POST | 회원가입 일부 |
| `/api/auth/login` | POST | 로그인 |
| `/api/auth/me` | GET | 세션 사용자 |
| `/api/auth/logout` | POST | 로그아웃 |
| `/api/auth/verify-email` | POST | 이메일 인증 |
| `/api/auth/resend-verification` | POST | 인증 메일 재발송 |
| `/api/guest-auth/config` | GET | 게스트 인증 공개 설정 |
| `/api/guest-auth/send-code` | POST | SMS 코드 발송 |
| `/api/guest-auth/verify-code` | POST | SMS 코드 검증 |
| `/api/admin/app-settings` | GET, PATCH | 앱 설정(관리) |
| `/api/sendCouponAdmin` | GET, POST, PATCH | 쿠폰 관리 |
| `/api/validateSendCoupon` | POST | 쿠폰 검증 |
| `/api/consumeSendCoupon` | POST | 쿠폰 사용 |
| `/api/referral/register` | POST | 추천 등록 |
| `/api/referral/friend-visit` | POST | 친구 방문 |
| `/api/referral/balance` | GET | 추천 잔액 |
| `/api/reward/engage-countdown` | POST | 리워드 카운트다운 |
| `/api/invite/friend-submit` | POST | 초대 친구 제출 |
| `/api/reward/summary` | GET | 리워드 요약 |

**Firebase Functions**에 동일·유사 API가 있을 수 있다. 프로덕션 SoT는 호스팅·리라이트 설정과 함께 별도 줄에서 관리하는 것이 좋다.

---

## 3. 중복·별칭 (`/api/*`)

같은 핸들러 또는 같은 도메인에 **두 가지 path**가 붙은 경우. 정리 시 **하나를 SoT로 고정**하고, 나머지는 301/호환 기간 후 제거하거나 클라이언트만 통일한다.

| 별칭 그룹 | 경로 | 권장 SoT (제안) |
|-----------|------|-----------------|
| 장례식장 | `/api/funeral-halls`, `/api/funeralHalls` | 케밥 케이스(`funeral-halls`)로 통일 후 한쪽 deprecate |
| 부고 초안 | `/api/obituaries`, `/api/createObituaryDraft` | REST형 `/api/obituaries` 유지 등 |
| 부고 항목 | `/api/obituary-entry`, `/api/getObituaryEntry` | 리소스형 `/api/obituary-entry` |
| 승인 | `/api/obituary-entry/approve`, `/api/approveObituaryEntry` | `/api/obituary-entry/approve` |
| 가져오기 | `/api/import/bugo-funeral`, `/api/import/wooribugo-funeral` | 공급자별 유지가 비즈니스상 필요하면 문서에 이유 명시 |

Next와 Express **경로 충돌**은 금지. 새 API는 [express-next-role-split.md §2](express-next-role-split.md#2-현재-next-route-handler-소유권-표)에 먼저 반영한다.

---

## 4. 클라이언트 베이스 URL

| 현황 | 설명 |
|------|------|
| **상대 경로** | 대부분 `fetch('/api/...')` — 브라우저 origin이 API와 같다는 전제 (정상: Express 한 포트에서 정적·API·프록시 제공). |
| **Next 클라이언트** | `condolence-client.tsx` 등 동일하게 `/api/...` (프록시 경로면 Express를 거침). |

| 목표 (미적용) | 설명 |
|---------------|------|
| **환경변수** | API 호스트가 분리될 때 `NEXT_PUBLIC_API_ORIGIN`(또는 동등) 한 곳에서 조합해 `fetch`에 사용. |
| **중복 제거** | §3 별칭 제거 후 HTML/JS의 구 path 참조 일괄 교체. |

---

## 5. 인증 · 레이트 리밋 · 로깅 (한 레이어로 모으기)

| 현황 | Express 쪽에 `member-auth`, 게스트 SMS, 결제·웹훅 등 분산. Next Route Handler는 요청당 로직만 있고 **Express와 동일한 세션 미들웨어를 공유하지 않음**. |
| 목표 | (1) 인증이 필요한 API는 한 레이어에서 검증 (Express 미들웨어 추출, 리버스 프록시 뒤 공통 서비스, 또는 Functions 공통 모듈). (2) 레이트 리밋·구조화 로깅·요청 ID를 동일 스택에 둔다. (3) Next 전용 API에 민감 권한 로직을 **중복 구현하지 않기**. |

구체 적용 순서는 배포 형태(단일 서버 vs API 분리)와 맞춰 `REACT-MIGRATION-TASKS.md`에서 따로 쪼갠다.

---

## 관련 문서

- [express-next-role-split.md](express-next-role-split.md)
- [REACT-MIGRATION-TASKS.md](../REACT-MIGRATION-TASKS.md)
- [00-foundation.md](00-foundation.md)
