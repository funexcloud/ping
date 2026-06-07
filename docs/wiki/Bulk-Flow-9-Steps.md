# 대량 발송 9단계

> **제품 SoT.** 상세 규칙·라우트 매핑은 저장소 [`docs/ping-bulk-send-process.md`](https://github.com/funexcloud/ping/blob/main/docs/ping-bulk-send-process.md) 참고.

## 단계 요약

| # | 단계 | URL (주) | 완료 조건 |
|---|------|----------|-----------|
| 1 | 부고 주소 | `/start?step=url` | 유효 HTTPS URL |
| 2 | 부고 문자 (파싱) | `/start?step=compose` | 제목·본문·바이트 검증 |
| 3 | 연락처 | `/start?step=pick` | 수신자 ≥ 1, 제외 모달 |
| 4 | 결제금액 안내 | `/start?step=review` · `/send/payments` | 금액 확인 |
| 5 | 로그인 | `/login` | 회원 또는 비회원 OTP |
| 6 | 결제 | `/checkout` | 토스 승인·주문 ID |
| 7 | 발송 처리 | `/payment-success` (진입) | dispatch 트리거 |
| 8 | 발송완료 | `/payment-success` | 완료 UI |
| 9 | 부의금 명단 | `/mypage/condolence` | 엑셀·정리 |

**인트로** (`/intro`, `/`)는 1단계 **이전** 게이트입니다.

---

## 발송 진행 상태 (사용자 표기)

코드: `src/lib/ping-order-fulfillment.ts`

| 내부 phase | 사용자 칩 |
|------------|-----------|
| `received` | 접수 |
| `dispatching` | 세팅중 |
| `complete` | 발송완료 |
| `partial` | 부분실패 |
| `failed` | 발송실패 |

무통장 입금 대기 중에는 **접수**로 표시합니다.

---

## 답례 플로

`thankyou=1` — **1·2단계 생략**, 3단계(연락처)부터 동일.

---

## 세션 키 (개발 참고)

| 키 | 용도 |
|----|------|
| `ping_from_index` | 부고 URL·파싱 스냅샷 |
| `ping_bulk_recipients` | 수신자 목록 |
| `ping_bulk_identity_ok` | 5단계 본인확인 |
| `ping_checkout_session` | 결제 세션 |

UX 상태용 — **인증 경계 아님**.

---

## 관련

- [Product-Positioning](Product-Positioning)
- [Admin-and-Operations](Admin-and-Operations) — 입금 확인·재발송
