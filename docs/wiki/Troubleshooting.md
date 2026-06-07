# 장애 · 트러블슈팅

## 로컬

### `EADDRINUSE` :3000 / :3002

```bash
npm run dev:clean
# 또는
node scripts/kill-dev-ports.mjs
```

### Kakao 로그인 실패

- OAuth Redirect URI: `http://localhost:3000/api/auth/kakao/callback`
- **3000에 Express가 떠 있어야 함** (Vite 등 다른 프로세스 점유 금지)

### Next 404 / `.next` 깨짐

```bash
npm run clean:next
npm run next:dev
```

### Firestore / Storage CORS (로컬)

`.env`: `PING_SKIP_FIREBASE_STORAGE_UPLOAD=1` (업로드만 스킵)

---

## 운영

### API 502 / `express_unreachable`

- `PING_EXPRESS_ORIGIN` · Cloud Run 상태
- `FIREBASE_SERVICE_ACCOUNT_JSON` 있으면 auth는 Next 직접

### 결제 실패

- Toss 키·리퍼러: `https://ping.funexcloud.com`
- `npm run verify:production`

### 발송 `smsStatus: failed`

- `SOLAPI_FROM` 등록·ACTIVE 여부
- `npm run test:solapi`
- Solapi 콘솔 발송 로그

### admin 401

- `PING_ADMIN_UI_PASSWORD` Vercel env
- 쿠키 `ping_admin_session` — `/admin/auth` 재로그인

---

## 진단 스크립트

```bash
npm run check
npm run verify:production
npm run check:vercel-env
```

---

## 관련

- [Deployment](Deployment)
- [Development-Guide](Development-Guide)
