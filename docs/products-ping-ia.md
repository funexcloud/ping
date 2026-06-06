# PING 정보 구조 — 마케팅 vs 운영

최종 갱신: `/products/ping` 마케팅 캐논 도입 기준.

## 2종 분리

| 구분 | URL | 역할 | SEO |
|------|-----|------|-----|
| **마케팅 상세** | `/products/ping` | 기능·요금 요약·FAQ·**도입하기** CTA | 색인 O, 서버 HTML |
| **운영·설정** | `/start`, `/admin/*`, `/obituary/*` 등 | 템플릿·발송·연동·화이트라벨(향후) | noindex 위주 |

## 마케팅 주변 페이지

| URL | 설명 |
|-----|------|
| `/intro` | CX 시연·8단계 시나리오 (온보딩) |
| `/pricing` | 요금표 상세 |
| `/saas` | 엔터프라이즈 |
| `/partnership`, `/customer-center`, `/tech-blog`, `/guide/*` | 제휴·문의·기술·가이드 |

## 운영(앱) 진입

| URL | 설명 |
|-----|------|
| `https://console.funexcloud.com/ping` | 통합 콘솔 PING — 마케팅 **도입하기** CTA (`PING_CONSOLE_APP_URL`) |
| `/start` | `ping.funexcloud.com` 레거시 직접 발송 (`PING_MAIN_APP_PATH`) |
| `/` | 게이트: 미시청 → `/intro`, 이후 → `/start` |

## 레거시·리다이렉트

| 이전 | 현재 |
|------|------|
| `/overview`, `/overview.html` | **301** → `/products/ping` |
| `/bulk` | **301** → `/start` |

구현: `next.config.ts` `redirects`, `firebase.json`, `scripts/ping-legacy-html-redirects.cjs`, `src/app/overview/page.tsx` (`permanentRedirect`).

## 코드 위치

| 항목 | 경로 |
|------|------|
| 캐논 상수 | `PING_PRODUCT_MARKETING_PATH` in `src/lib/ping-site-seo.ts` |
| 마케팅 페이지 | `src/app/products/ping/page.tsx` |
| 본문 UI | `src/app/overview/overview-page-view.tsx` (공용) |
| 콘텐츠 데이터 | `src/content/seo/overview-content.ts` |

## 포털 연동 (향후)

`funexcloud.com/products/ping` 에 마케팅을 두고, `ping.funexcloud.com` 은 운영 앱만 쓰는 구성도 가능하다.  
현재는 **제품 전용 도메인**에서 마케팅·운영을 path 로 분리한 상태다.

## MDX (4단계, 선택)

`content/products/ping/*.mdx` 로 기능·요금 요약을 문서화할 경우, `products/ping/page.tsx` 에서 MDX를 읽어 `OverviewPageView` 하단에 합치면 된다.
