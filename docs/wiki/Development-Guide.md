# 로컬 개발

## 요구 사항

- Node.js **20**
- npm
- `.env` (`.env.example` 복사)

## 시작

```bash
git clone https://github.com/funexcloud/ping.git
cd ping
npm install
cp .env.example .env
npm run dev
```

| URL | 용도 |
|-----|------|
| http://localhost:3002 | Next UI |
| http://localhost:3000 | Express API · Kakao OAuth |

포트 충돌: `npm run dev:clean`

---

## 필수 env (로컬 최소)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_FIREBASE_*` | Firestore 클라이언트 |
| `KAKAO_*` | 카카오 로그인 (OAuth는 :3000) |
| `TOSS_PAYMENTS_*` 또는 mock | 결제 |
| `PING_ADMIN_UI_PASSWORD` | `/admin` 로그인 |

전체: [`.env.example`](https://github.com/funexcloud/ping/blob/main/.env.example)

---

## 검증

```bash
npm run check    # 규칙·파서·마이그레이션
npm run smoke    # build + 스모크
npm run test:solapi   # Solapi (env 필요)
```

---

## 주요 경로 (수동 QA)

1. `/intro` → `/start` — 대량 위저드
2. `/login` — 회원·비회원
3. `/checkout` — 결제 (mock 가능)
4. `/payment-success?orderId=…`
5. `/admin/auth` → `/admin/monitoring`

---

## Docker

```bash
npm run dev:docker
```

`.env`는 `KEY=value` 형식만 (주석 줄바꿈 주의).

---

## 관련

- [Troubleshooting](Troubleshooting)
- [Architecture](Architecture)
