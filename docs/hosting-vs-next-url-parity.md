# Hosting (`firebase.json`) vs Next (`src/app`) URL 대응

운영 **Firebase Hosting** 트래픽과 로컬/별도 배포 **Next App Router** 가 같은 경로에서 어떤 자산을 쓰는지 한눈에 보기 위한 표이다. 완전 통일(§4.2) 전까지 **“어느 축이 진실인지”** 판단할 때 참고한다.

---

## 1. 요약

| 축 | 역할 |
|----|------|
| **Hosting** | `firebase.json` 의 `redirects` / `rewrites` → 주로 루트 및 `public/`·루트에 전개된 **정적 `.html`**. |
| **Next** | `next dev`(기본 **3002**) — `app/**/page.tsx` 가 캐논 경로를 처리. 레거시 `.html`·일부 경로는 `next.config.ts` 의 `beforeFiles` 및 `next-legacy-html-rewrites.json` 으로 정적 미러 또는 동일 경로로 연결. |

**주의:** Hosting 설정에 **`/bulk` rewrite가 없다.** 프로덕션이 Hosting 정적만 서빙하면 **`https://도메인/bulk` 는 존재하지 않을 수 있다** (정적 `bulk.html` 이 없을 때). Next 스택에서만 대량 위저드 초입이 `/bulk` 인 구성이 가능하다.

---

## 2. 주요 사용자 플로 경로

| 경로 | `firebase.json` (rewrites) | Next (`src/app`) | 비고 |
|------|----------------------------|------------------|------|
| `/` | `/index.html` | `page.tsx` → 인트로 게이트 후 `/bulk` 등 | Hosting은 `index.html` 단일 대량 UI; Next는 `/bulk` 분리. |
| `/bulk` | *(없음)* | `bulk/page.tsx` | **Hosting 단독 배포 시 미정의.** |
| `/intro` | `/intro.html` | `intro/page.tsx` | |
| `/login` | `/obituary/obituary-entry.html` | `login/[[...slug]]/page.tsx` | `login.html` 등 → `/login` **redirect** (Hosting) / **beforeFiles** (Next). |
| `/member-login` | `/obituary/obituary-member-login.html` | `member-login/page.tsx` | |
| `/checkout` | `/checkout.html` | `checkout/page.tsx` | |
| `/payment-success` | `/payment-success.html` | `payment-success/page.tsx` | |
| `/send/url` | `/send/url.html` | `send/url/page.tsx` | |
| `/send/payments` | `/send/payments.html` | `send/payments/page.tsx` | |
| `/send/review` | *redirect* → `/send/payments` | — | Hosting 전용 redirect. |

---

## 3. `next-legacy-html-rewrites.json` 과의 관계

Next 에만 있는 `beforeFiles` 확장 목록이다. 항목 예:

- 약관·고객센터 등: `/overview` → `/overview.html` (정적 미러)
- 일부 부고·가입: `.html` → **App 경로**(예: `/obituary-form.html` → `/obituary-form`)로 보내 React 페이지를 연다.

**Hosting** 은 같은 URL에 대해 **다른 `.html` 목적지**를 쓰는 경우가 있다(예: `firebase.json` 의 `/obituary/...` 패턴). 세부는 `firebase.json` 과 `next-legacy-html-rewrites.json` 을 diff 하거나, 아래 이관 표와 함께 본다.

- [`migration-html-to-react-remaining.md`](./migration-html-to-react-remaining.md) §2.2, §5 표
- [`index-bulk-flow-reference.md`](./index-bulk-flow-reference.md) — 대량 플로·세션

---

## 4. 다음에 할 일 (§4.2 정리용)

1. **배포 축(§4.1)** 확정 후, 운영에서 **`/bulk`** 를 살릴지(Next SSR/프록시) vs **`/` 만** 쓸지 결정.
2. 결정에 맞춰 `firebase.json` 에 `/bulk`·인트로 등을 **추가/redirect** 할지, 아니면 문서·온보딩만 Next 기준으로 맞출지 확정.
3. `next-legacy-html-rewrites.json` 과 `firebase.json` 의 **같은 `source`에 대한 destination 불일치**를 목록화해, 경로별로 하나의 캐논만 남기기.
4. `legacy-html` 축소·제거는 [`legacy-html-materialize-removal-order.md`](./legacy-html-materialize-removal-order.md) 페이즈 순서를 따른다.

이 문서는 위 작업이 진행될 때마다 표를 갱신하면 된다.
