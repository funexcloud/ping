# Firebase Hosting `rewrites` 전수 (Step 1)

> 파일: `firebase.json` → `hosting.rewrites`  
> `redirects`(301)는 별도 — 슬래시 캐논으로 `.html` 보내는 항목은 **유지** (Next로 넘긴 뒤에도 레거시 북마크용).

## 1. 슬래시 경로 → 정적 HTML (Next와 충돌 가능)

| source | destination | Next `page.tsx` | Step 2 조치 |
|--------|-------------|-----------------|-------------|
| `/` | `/index.html` | `app/page.tsx` (게이트) | **제거** → Vercel `/` |
| `/intro`, `/intro/` | `/intro.html` | `intro/page.tsx` | **제거** |
| `/payment-success`, `…/` | `/payment-success.html` | `payment-success/page.tsx` | **제거** |
| `/checkout`, `/checkout/` | `/checkout.html` | `checkout/page.tsx` | **제거** |
| `/login`, `/login/`, `/login/**` | `/obituary/obituary-entry.html` | `login/[[...slug]]/page.tsx` | **제거** |
| `/member-login`, `…/` | `/obituary/obituary-member-login.html` | `member-login/page.tsx` | **제거** |
| `/send/payments`, `…/` | `/send/payments.html` | `send/payments/page.tsx` | **제거** |
| `/send/url`, `…/` | `/send/url.html` | `send/url/page.tsx` | **제거** |
| `/obituary/send/**` | `/obituary/obituary-send.html` | `obituary/send/[[...slug]]/page.tsx` | **제거** |
| `/obituary/sales`, `/obituary/sales/**` | `/obituary/obituary-sales.html` | `obituary/sales/[[...slug]]/page.tsx` | **제거** |
| `/obituary/mortuary/**` | `/obituary/obituary-mortuary.html` | `obituary/mortuary/[[...slug]]/page.tsx` | **제거** |
| `/overview`, `…/` | `/overview.html` | `overview/page.tsx` | **제거** |
| `/customer-center`, `…/` | `/customer-center.html` | `customer-center/page.tsx` | **제거** |
| `/partnership`, `…/` | `/partnership.html` | `partnership/page.tsx` | **제거** |
| `/pricing`, `…/` | `/pricing.html` | `pricing/page.tsx` | **제거** |
| `/inquiry-board`, `…/` | `/inquiry-board.html` | `inquiry-board/page.tsx` | **제거** |
| `/tech-blog`, `…/` | `/tech-blog.html` | `tech-blog/page.tsx` | **제거** |
| `/guide/naver-contacts`, `…/` | `/guide-naver-contacts.html` | `guide/naver-contacts/page.tsx` | **제거** |

**참고:** `/start` 는 rewrite **없음** (처음부터 Vercel·Next 전용 경로).

**`/index.html` 직접 URL:** rewrite 제거 후에도 Hosting `public` 루트에 `index.html` 파일이 있으면 **`/index.html`** 로 레거시 대량 플로(handoff·`mergeBulk`)는 계속 열 수 있음.

---

## 2. 슬래시 경로 — Next 없음 (Step 4 유지)

| source | destination | 비고 |
|--------|-------------|------|
| `/legal/terms-of-service`, `…/` | `legal/*.html` | App Router 페이지 없음 |
| `/legal/privacy-policy`, `…/` |同上 | |
| `/legal/refund-policy`, `…/` |同上 | |
| `/legal/copyright`, `…/` |同上 | |
| `/legal/service-payment-guide`, `…/` |同上 | |
| `/mourner-info`, `/mourner-info/` | `/obituary/mourner-info.html` | Next `/mourner-info` 없음 |

---

## 3. 루트 `*.html` 별칭만 (슬래시 캐논 없음) — 유지

| source | destination |
|--------|-------------|
| `/obituary-signup-terms.html` | `/obituary/obituary-signup-terms.html` |
| `/obituary-signup-register.html` | … |
| `/obituary-verify-email.html` | … |
| `/obituary-guest-verify.html` | … |
| `/obituary-create.html` | … |
| `/obituary-form.html` | … |
| `/mourner-info.html` | … |
| `/obituary-send.html` | … |
| `/obituary-sales.html` | … |
| `/obituary-mortuary.html` | … |
| `/obituary-public.html` | … |
| `/obituary-review.html` | … |

Next에는 `/obituary-create` 등 **슬래시 페이지**가 있으나, Hosting에는 위처럼 **`.html` 진입만** rewrite 됨. 도메인이 Vercel이면 `next.config` redirects가 슬래시 캐논을 처리.

---

## 4. 어드민 — 유지

| source | destination |
|--------|-------------|
| `/admin-dashboard.html` | `/admin/admin-dashboard.html` |
| `/admin-auth.html` | … |
| `/partner-dashboard.html` | … |
| `/unified-monitoring.html` | … |
| `/service-status.html` | … |

---

## 5. Cloud Functions (`function`) — 유지

`/api/approvePayment`, `/api/getOrderStatus`, … (전부 유지)

---

## Step 3 배포 후 확인 (체크리스트)

**전제:** `ping.funexcloud.com` DNS가 **Vercel Production**을 가리킴 ([`vercel-production-handoff.md`](./vercel-production-handoff.md) §1.5).

| URL | 기대 |
|-----|------|
| `/` | Next 홈 게이트 → `/intro` 또는 `/start` |
| `/intro` | React 인트로 |
| `/start` | React step-zero |
| `/checkout`, `/payment-success` | React |
| `/login`, `/member-login` | React |
| `/send/url`, `/send/payments` | React |
| `/overview`, `/customer-center`, … | React |
| `/obituary/send/TOKEN` | React (동적) |
| `/legal/terms-of-service` | **정적 HTML** (Firebase 또는 public 미러) |
| `/index.html?mergeBulk=1` | **레거시** (handoff용, 의도적) |

Firebase Hosting만 단독 URL로 테스트할 경우: rewrite 제거된 경로는 **정적 파일이 없으면 404** — 이는 정상이며, 프로덕션 도메인은 Vercel이 받아야 함.

```bash
# JSON 유효성
node -e "JSON.parse(require('fs').readFileSync('firebase.json','utf8'))"

# Hosting만 배포 (Functions 제외 가능)
firebase deploy --only hosting
```
