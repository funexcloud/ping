# `/start` 대량 위저드 — 페이지 전환 규칙

> **전체 9단계 프로세스:** [`ping-bulk-send-process.md`](./ping-bulk-send-process.md)  
> 구현: `src/app/start/bulk-entry-client.tsx`  
> 부고 URL 파싱·스크래핑: `src/lib/ping-bugo-import.ts` ( `/send/url` 과 공유)

---

## 1. 스텝 정의

| `step` | 화면 | 하단 CTA |
|--------|------|----------|
| `url` | 부고 주소 입력 (1/4) | **없음** — 유효 URL이면 자동으로 `compose` |
| `compose` | 문자 제목·본문 작성 | 이전 · 다음 |
| `pick` | 연락처 가져오기 (Google/CSV · 제외 모달) | 이전 · (모달 완료 시 review) |
| `review` | 견적·명단 확인 | 이전 · 결제 금액 확인하기 |

답례 플로(`thankyou=1` 또는 `bulkFlowKind: thankyou`)는 **`url` 스킵** → `compose` 또는 recipient 있으면 `review`.

---

## 2. `url` → `compose` 자동 전환

### 2.1 트리거

| 이벤트 | 동작 |
|--------|------|
| 붙여넣기 | 텍스트에서 첫 `https://` 추출 → 정규화 → 유효하면 **즉시** 전환 시도 |
| 입력(타이핑) | `https://` 유효 URL이 되면 **약 480ms 디바운스** 후 전환 |
| blur | 정규화·힌트 갱신 후 전환 시도 (디바운스와 중복 시 락으로 1회만) |

### 2.2 전환 시 처리 순서

1. `normalizeExternalObituaryUrl` + `isValidExternalObituaryUrl`
2. 우리부고·모두부고 URL이면 `tryBugoImportForUrl` → `ping_from_index`에 본문·제목 반영
3. 그 외 유효 `https://` → `persistObituaryUrlToPingFromIndex` 만
4. 세션 스냅샷의 `bulkSmsMessageDraft` / `bulkSmsTitle` / `smsTemplateId` 를 폼 state에 반영 (없으면 기본 템플릿)
5. `setStep("compose")`

### 2.3 자동 전환 **하지 않음**

- `compose`에서 **이전**으로 `url`에 돌아온 뒤, **주소를 다시 입력·붙여넣기하기 전** (자동 전환 일시 중지)
- URL이 비었거나 `https://` 형식이 아닐 때
- import API 실패 시: 알림 후 **`url`에 머무름** (사용자가 수정 가능)

### 2.4 레거시와의 관계

- 예전 `/send/url` 단독 페이지: 붙여넣기·blur 후 import → `index.html?bulkAfterUrl=1` 이동
- `/start` url 단계: import 후 **같은 앱 안에서 `compose`** (CTA 없음)

---

## 3. 이후 스텝

| From | To | 조건 |
|------|-----|------|
| `compose` | `url` | 이전 (답례는 `/overview`) |
| `compose` | `pick` | 다음 — 본문 바이트·제목 유효 |
| `pick` | `compose` | 이전 |
| `pick` | `review` | Google/CSV → 제외 모달 → `saveBulkRecipientsToSession` |
| `review` | `pick` | 이전 — 명단 세션 초기화 |
| `review` | `/send/payments` | 결제 금액 확인하기 |

`ping_react_bulk_pending_review` 가 있으면 마운트 시 `review` 로 점프.

---

## 4. URL 단계 표면(디자인) 토큰

| 요소 | 토큰 | 비고 |
|------|------|------|
| 페이지 배경 | `var(--ping-bg)` | 앱 셸과 동일 |
| 히어로 카드 | `.bulk-url-step__card` → `#F2F4F6` | 흰 카드 대신 **그레이 카드** (시안) |
| URL 필드 | `.bulk-url-step__field` (단일 `label`) | 아이콘+input **한 박스**, `min-height: 3rem`. 회색 래퍼+작은 input 이중 구조 없음 |
| 도움말 | `#EBF3FF` | 기존 정보 블루 유지 |
| 스텝 점 | 활성 `#3182F6` / 비활성 `#E9ECF0` | |

시안이 확정되면 `bulk-entry.css` 의 `--bulk-url-card-bg` 등으로만 조정한다.

---

## 5. 관련 문서

- [`index-bulk-flow-reference.md`](./index-bulk-flow-reference.md) — 세션 키·핸드오프
- [`index-html-react-migration-plan.md`](./index-html-react-migration-plan.md) — 레거시 이관 로드맵
