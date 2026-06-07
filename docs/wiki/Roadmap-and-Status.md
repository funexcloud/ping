# 로드맵 · 현황

> 마지막 갱신: 2026-06-07 (Wiki 초판)

## 현재 상태 한눈에

| 영역 | 상태 | 비고 |
|------|------|------|
| **Next UI (`src/app`)** | ✅ 운영 | Vercel `ping.funexcloud.com` |
| **대량 플로 `/start`** | ✅ React 위저드 | 9단계 SoT: [Bulk-Flow-9-Steps](Bulk-Flow-9-Steps) |
| **레거시 HTML** | ✅ 제거 | 스냅샷만 repo 외 보관 |
| **토스 결제** | ✅ | checkout + confirm API |
| **Solapi 발송** | ✅ | `ping-dispatch`, env `SOLAPI_*` |
| **안심 링크 `/s/[token]`** | ✅ | JWT HS256, 발인 만료 |
| **관리자 세션** | ✅ | HttpOnly 쿠키, `resolveAdminAuth` |
| **발송 상태 UI** | 🔄 진행 | `fulfillmentPhase` — 접수/세팅/완료 통일 |
| **발송 idempotency** | 📋 예정 | Firestore CAS (`smsStatus`) |
| **변호사 약관 검토** | ⏳ 필수 | [Legal-and-License](Legal-and-License) |
| **DLR·부분실패 자동 환불** | 📋 백로그 | Solapi DLR 미연동 |

범례: ✅ 완료 · 🔄 진행 · 📋 예정 · ⏳ 외부 의존

---

## 우선순위 (엔지니어링)

1. **B** — 발송 idempotency (동시 confirm/webhook 레이스)
2. **D+A** — `[접수]`/`[세팅중]`/`[발송완료]` 표시 통일 (payment-success + admin)
3. **E/G/H** — 마케팅 cookie, 자동 파기 cron, 고령자 UI (백로그)

---

## 마일스톤

### 2026 Q2 — 플랫폼 전환
- [x] HTML → Next App Router
- [x] `/start` 대량 플로 캐논
- [x] Vercel UI + Firebase API 축
- [x] Express Cloud Run 인증 폴백
- [x] Admin HttpOnly 세션

### 2026 Q3 — 운영 신뢰
- [ ] 발송 상태·환불 UX 정직성 (부분실패 표시)
- [ ] Solapi DLR 또는 폴링 기반 delivery 추적
- [ ] 변호사 검토 반영 (약관·copyright 문구)
- [ ] Wiki·온보딩 문서 정착

### 이후
- [ ] Firebase Auth custom claim (관리자 대안, 선택)
- [ ] B2B 파트너 셀프서비스 강화
- [ ] 본인확인 공식 API (NICE/PASS) — 현재 Solapi OTP

---

## 릴리스 전 체크 (매 배포)

1. `npm run check`
2. `npm run smoke` (또는 `npm run build`)
3. [vercel-production-handoff](https://github.com/funexcloud/ping/blob/main/docs/vercel-production-handoff.md) §1
4. 배포 후 `npm run verify:production`

---

## 관련 문서

- [REACT-MIGRATION-TASKS.md](https://github.com/funexcloud/ping/blob/main/docs/REACT-MIGRATION-TASKS.md)
- [html-to-next-migration-status.md](https://github.com/funexcloud/ping/blob/main/docs/html-to-next-migration-status.md)
