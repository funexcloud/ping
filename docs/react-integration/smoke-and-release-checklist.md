# 스모크 테스트 · 배포 후 URL 점검

`REACT-MIGRATION-TASKS.md` **진행 시 체크**에 대응한다. **페이즈 마일스톤마다** §1을, **프로덕션(또는 스테이징) 반영 직후** §2를 수행한다. 결과는 팀 규칙에 맞게 이슈·릴리즈 노트 등에 남긴다.

환경·계정(테스트 회원, 테스트 결제)은 팀 내부 문서를 따른다.

---

## 1. 페이즈별 스모크 시나리오

아래는 **최소 통과 기준**이다. 해당 페이즈에서 건드린 영역은 그 페이즈 종료 시 반드시 포함한다.

### 1.1 로그인·세션

| 단계 | 검증 |
|------|------|
| 회원 로그인 | `/login` 또는 `/member-login` → 자격 증명 제출 후 **세션·리다이렉트** 정상 (`next` 쿼리가 있으면 의도한 경로로 이동). |
| 로그인 상태 API | `/api/auth/me` 가 **401 없이** 사용자 정보를 반환하는지 (또는 Functions 동등 경로). |
| 로그아웃 | 로그아웃 후 보호 페이지 접근 시 로그인 유도 또는 401. |
| (해당 시) 게스트 SMS | 조문/게스트 플로에서 `/api/guest-auth/*` 발송·검증 한 사이클. |

### 1.2 발송·부고 (핵심 업무)

| 단계 | 검증 |
|------|------|
| 발송 진입 | `index.html` / `/` 또는 `overview` → **부고·명단·발송** 흐름 진입 가능. |
| 명단·금액 | `/send/payments` 등 명단·금액 단계 저장·이동 없이 깨지지 않음. |
| 부고 초안·항목 | (스테이징 데이터로) 부고 생성·항목 조회·승인 관련 API가 기대 응답. |

### 1.3 결제

| 단계 | 검증 |
|------|------|
| 체크아웃 진입 | `/checkout` 또는 `checkout.html` 동등 경로에서 **결제 UI·설정 스크립트** 로드 (`/api/portone-config.js` 등). |
| 결제 확정 | 테스트 카드/토스·PortOne 스테이징 정책에 따라 **성공 플로** 한 번 (`/api/toss/confirm-payment` 또는 제품이 사용하는 경로). |
| 결제 완료 페이지 | `payment-success`에서 주문·안내 문구 정상. |

### 1.4 마이페이지·부의금 (Next)

| 단계 | 검증 |
|------|------|
| 허브 | `/mypage` 로드, 탭·내비 **`/mypage/...`·레거시 `*.html` 혼용 시** 깨지는 링크 없음. |
| 부의금 | `/mypage/condolence` 에서 목록·통계 로드, **GET `/api/condolence`**, 검색 **GET `/api/contacts`** 가 같은 오리진에서 200 (로컬은 Express `:3000` 단일 포트 프록시). |
| 일괄·템플릿 | 샘플 파일로 bulk POST, **GET `/api/condolence/template`** 다운로드. |

### 1.5 회귀 스모크 (가벼운 한 바퀴)

페이즈 ①/② 배포 시: 위 네 축 중 **이번에 변경하지 않은 축**도 **한 경로씩**만 눌러 이전처럼 열리는지 확인한다.

---

## 2. 배포 후 구버전 URL·외부 링크 점검

### 2.1 북마크·구 path (제품 도메인 기준)

| 유형 | 점검 |
|------|------|
| `.html` 직접 URL | `mypage.html`, `index.html`, `overview.html` 등 **북마크·QR**가 404/무한 리다이렉트 없이 도달하는지. |
| 클린 URL vs 레거시 | `server.js`·Firebase rewrites에 정의된 **캐논**과 다른 path는 **301 또는 유지** 정책이 문서와 일치하는지 ([02-phase-landing-seo.md](02-phase-landing-seo.md), [03-phase-legacy-html-inventory.md](03-phase-legacy-html-inventory.md)). |
| Next 전용 | `/mypage`, `/mypage/condolence` 프로덕션에서 정적 자산이 아닌 **Next 앱**으로 붙는지 (리라이트 누락 시 빈 페이지·옛 HTML). |

### 2.2 외부·검색

| 유형 | 점검 |
|------|------|
| 검색 노출 URL | 서치콘솔·사이트맵의 대표 URL이 **깨진 링크** 없이 200인지. |
| 제휴·광고 랜딩 | `partnership.html`, 캠페인 UTM이 붙은 구 URL이 의도한 페이지로 수렴하는지. |
| OAuth·PG 콜백 | 리다이렉트 URI·웹훅이 **새 호스트/경로**와 일치하는지 (배포 체크리스트 별도 항목과 중복되면 한쪽만 수행). |

### 2.3 인벤토리 동기화

HTML을 301/제거했으면 [03-phase-legacy-html-inventory.md](03-phase-legacy-html-inventory.md)의 해당 행 **비고·라벨**을 갱신해 다음 릴리즈에서 다시 헷갈리지 않게 한다.

---

## 관련 문서

- [REACT-MIGRATION-TASKS.md](../REACT-MIGRATION-TASKS.md)
- [00-foundation.md](00-foundation.md)
- [api-inventory.md](api-inventory.md) — API 경로
- [express-next-role-split.md](express-next-role-split.md) — 로컬 프록시
