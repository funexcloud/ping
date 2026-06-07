# 보안 · 인증

## 계층별 정리

| 대상 | 메커니즘 | 비고 |
|------|----------|------|
| **수신자 (안심 링크)** | JWT HS256 `/s/{token}` | `PING_SAFE_LINK_SECRET` |
| **관리자** | HttpOnly HMAC 세션 | `ping-admin-auth.js` |
| **회원** | opaque token + GCS/파일 | `member-auth.js` |
| **비회원** | Solapi OTP 6자리 | `guest-sms-auth.js` |
| **대량 UX** | `sessionStorage` | 플로우 상태만, auth 아님 |

---

## 안심 부고 링크

- 코드: `src/lib/ping-safe-link.ts`
- 발급: `/api/safe-link/issue`
- 만료: 발인 일시 + 48h 유예
- Edge: `/s/*` middleware — 봇 UA 차단

**운영:** `PING_SAFE_LINK_SECRET` 필수 (dev만 폴백)

---

## 관리자 (F 완료 기준)

- UI 게드: `verifyAdminSession()` + layout `useAdminAuthGuard`
- API: `resolveAdminAuth` (쿠키 또는 API 키)
- PIN ≠ API 키 분리
- Firebase custom claim / `/admin` middleware — **미적용 (선택)**

---

## 시크릿 규칙

- `.env` / Vercel env만 — **git·클라이언트 번들 금지**
- `NEXT_PUBLIC_*` — 공개 가능한 값만

---

## 민감 데이터 파기

Cron: `/api/cron/purge-sensitive-data`  
env: `CRON_SECRET`, `PING_RECIPIENT_PURGE_HOURS`

약관: 주소록 24h 파기 (설계·cron 연동 확인)

---

## 관련

- [Admin-and-Operations](Admin-and-Operations)
- [Legal-and-License](Legal-and-License)
