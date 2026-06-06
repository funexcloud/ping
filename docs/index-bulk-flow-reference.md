# `index.html` 대량발송 플로 — 참고 (아카이브)

> **2026-06-02:** 런타임은 **`/start` React만**. 이 문서는 세션 키·쿼리·레거시 DOM **참고용** (아카이브 HTML 대조).

**공식 9단계:** [`ping-bulk-send-process.md`](./ping-bulk-send-process.md)  
**`/start` 전환:** [`bulk-start-page-transitions.md`](./bulk-start-page-transitions.md)  
**완료 상태:** [`html-to-next-migration-status.md`](./html-to-next-migration-status.md)

---

## 1. 진입 축 (요약)

| 환경 | 비고 |
|------|------|
| **Next (현재)** | `/` → `/intro` → **`/start`** (url·compose·pick·review) → `/send/payments` · `/checkout` · `/payment-success` |
| **구 Hosting** | `/` → `index.html` — **폐기** |
| **URL 단계만** | `/send/url` → `/start?bulkAfterUrl=1` |

---

## 2. 주요 쿼리 파라미터 (`index.html`)

| 파라미터 | 역할 |
|----------|------|
| `mergeBulk=1` | 부고 합류·React 대량 합류 등 **본 플로(에ntry 이후)** 직행. URL에서 제거 처리되는 구간 있음 (`entryParams.delete('mergeBulk')` 등). |
| `thankyou=1` | 답례 대량 플로 (`pingFlowChooseThankYou` / `bulkFlowKind: thankyou`). |
| `resumeBulk=1` | 결제·본인확인 후 대량 플로 **재개** (예: `payments` → `index`). |
| `autoPay=1` | 본인확인 완료 시 결제 자동 진행 분기. |
| `bulkOpenGoogleContacts=1` | React 핸드오프 직후 Google 연락처 로드 트리거. |
| `skipIntro=1` | 인트로 스킵(`ping_intro_seen` 설정 후 정리). |
| `partner`, `plan`, `debug` | 파트너·플랜·디버그 (결제·표시용). |

인트로 복귀 경로는 `ping_intro_return`(session)로 보관되며, 레거시 `intro.html` / Next `intro-client` 모두 동일 키를 쓴다.

---

## 3. `sessionStorage` 키 — 플로·대량

### 3.1 PingFlow (`assets/js/ping-flow-state.js` · `ping-flow-client.ts`)

| 키 | 의미 |
|----|------|
| `ping_flow_route` | `bulk_direct` \| `obituary_then_bulk` |
| `ping_flow_started` | `'1'` 플로 시작 표시 |
| `ping_obituary_public_url` | 부고 공개 URL (발송·합류 시) |

### 3.2 대량 명단·견적·플래그

| 키 | 의미 |
|----|------|
| `ping_bulk_recipients` | 수신자 배열 JSON |
| `ping_bulk_flags` | `isGoogleContactsMode` 등 플래그 |
| `ping_bulk_identity_ok` | 본인확인 완료 `'1'` |
| `ping_from_index` | 부고 URL·문자 초안·`bulkFlowKind`·제목 등 스냅샷 |
| `ping_compose_image_data` | 대량 문자 첨부 이미지(`dataUrl`·`name`·`mime` JSON). React `/bulk`·`index.html` 공유; 세션 URL 길이 상한은 레거시와 동일. |

### 3.3 React `/start` ↔ 레거시 review

| 키 | 의미 |
|----|------|
| `ping_react_bulk_review_return` | React에서 명단 확정 후 **레거시 review 대신 `/start` review**로 돌아갈 때 `1`. 레거시에서 소비 후 `ping_react_bulk_pending_review` 설정·`/start` 이동. |
| `ping_react_bulk_pending_review` | `/start` 마운트 시 recipient 수 확인 후 `review` 스텝. |
| `ping_payments_skip_redirect` | `/send/payments` **뒤로** 1회 레거시에 머물 때 |
| `ping_review_skip_redirect` | review 단계 redirect 스킵용 |

### 3.4 결제·토스

| 키 | 의미 |
|----|------|
| `ping_checkout_session` | 체크아웃 페이로드 |
| `ping_toss_pending` | 토스 결제 대기 |
| `ping_pay_success_*` | 결제 성공 후 세션 |
| (기타) | `ping_send_channel`, `ping_wizard_draft`, 로컬 드래프트 키 등 — `intro-client` 의 인트로 완료 시 비우는 키 목록 참고 (`ping_compose_image_data` 포함). |

### 3.5 `localStorage` — 문자 작성 임시·최근 (레거시·React `/bulk` 공유)

| 키 | 의미 |
|----|------|
| `ping_bulk_saved_compose_v1` | 「임시 저장」목록(제목·본문·부고 URL·템플릿·선택 이미지). |
| `ping_bulk_recent_sends_v1` | 주문·결제 후 쌓는 최근 발송 요약 — React에서 **참고 불러오기**만. |
| `ping_bulk_sms_local_draft` | 마지막 임시저장 요약(`title`·`body`·`ts`). |

---


## 4. 결제 금액 단계 분기 — `indexMaybeHandoffToPaymentsPage`

연락처가 확정·review 상태일 때:

1. `ping_payments_skip_redirect` / `ping_review_skip_redirect` 있으면 소비 후 **이동 안 함**.
2. `ping_react_bulk_review_return === '1'` 이면: 조건 충족 시 `ping_react_bulk_pending_review` 설정 후 **`location.replace('/start')`** (자동 `/send/payments` 대신 React review).
3. 그 외: `indexFlowStep`·URL의 `autoPay`/`resumeBulk`/`mergeBulk` 등 검사 후 **`/send/payments`** 로 이동 (Hosting/정적은 `payments.html`).

Next 앱에서는 `/send/payments`가 React 페이지일 수 있다 — 세션 hydrate 규칙은 `payments-client`·레거시 `send/payments.html` 주석과 동일.

---

## 5. 이후 이관 시 권장 순서

1. **단계별 DOM·전역·함수** — 아래 §7–§9 참고(계속 보강).
2. `processContactsCount`·`indexTryResumeBulkFlow` 등 **자동 redirect** 엣지 케이스 E2E.
3. `/start`가 커버하는 스텝을 늘리면 **핸드오프 조건·플래그**와 §10 표를 갱신. 로드맵: [`index-html-react-migration-plan.md`](./index-html-react-migration-plan.md).

---

## 6. 관련 소스

- `legacy-html/index.html` — 본 문서의 동작 정의.
- `src/lib/ping-flow-client.ts` — React `mergeToBulkFlow` / `handoffReactBulkEntryToLegacyWizard`.
- `src/lib/ping-bulk-compose-storage.ts` — React `/bulk` 저장내용·최근발송(`localStorage`, 레거시 키 동일).
- `src/lib/ping-bulk-compose-image.ts` — 첨부 압축·`ping_compose_image_data` 세션 (`index.html` 호환).
- `src/app/start/bulk-entry-client.tsx` — React 위저드.
- `assets/js/ping-flow-state.js` — 레거시 PingFlowState.

---

## 7. 주요 DOM 섹션 (`index.html`)

인라인 주석(약 1959행 근처)에 Route A 위저드 방향이 요약되어 있다.

| ID / 루트 | 설명 |
|-----------|------|
| `#index-flow-step-zero` | 시작(히어로·진입 카드·`#index-entry-zero-url` 등). `mergeBulk` 등으로 넘어오면 숨김 처리. |
| `#index-flow-after-entry` | 본 플로 셸. `pingFlowShouldSkipEntry()` 시 표시. |
| `#index-flow-step-addressbook` | 주소록·위저드 묶음. |
| `#index-wiz-url` | 부고 URL + `#index-url-compose-wrap`(문자 작성). 서브: `#index-url-address-block`, 파싱 오버레이 `#index-url-pass-parse-overlay`. |
| `#index-wiz-pick` | Google / 파일 선택 (`#index-wiz-file-btn`). |
| `#index-wiz-review` | 인라인 명단·금액 요약(레거시). 결제 확인 페이지로 넘기기 전 단계. |
| `#index-route-a-channel` | 발송 수단(문자 등). |
| `#index-flow-step-applicant` | 신청자 정보 — 본인확인 hydrate용으로 DOM 유지(주석상 DEPRECATED 성격). |
| `#submit-btn-container` | 하단 CTA(`#submit-prev-btn`, `#submit-btn`). 슬롯: `index-submit-btn-slot-*` 들이 단계별로 버튼 위치 연동. |
| 모달 | `#index-bulk-saved-modal`, `#index-bulk-recent-modal` 등 compose 부가 UI. |

---

## 8. 전역 UI 상태 (`window`)

레거시 스크립트가 네비게이션을 동기화할 때 사용한다.

| 변수 | 의미 |
|------|------|
| `__indexFlowStep` | `1` = 주소록/대량 위저드 축, `2` = 신청자(applicant) 등 후단 |
| `__bulkRouteSubStep` | 예: 1 Route A 주소록, 2 보조 단계 |
| `__addrMicroStep` | `'url'` \| `'pick'` \| `'review'` — `index-wiz-url` / `pick` / `review` 전환 |
| `__pingBulkFlowKind` | `'obituary'` \| `'thankyou'` (`indexSetBulkFlowKind`) |
| `__pingPaymentsHandoffInFlight` | `/send/payments` 또는 `/start` 이동 중복 방지 |
| `__indexUrlWizardPhase` | URL 위저드 페이즈(문자 단계 노출 등) |
| `__addrMicroStep` + `indexMaybeHandoffToPaymentsPage` | review + 명단 준비 시 결제 페이지 또는 React `/bulk` |

---

## 9. 핵심 함수 (grep·호출 기준, 이름만 참고용)

| 함수 | 역할 |
|------|------|
| `pingFlowShouldSkipEntry()` | `mergeBulk`, 세션 복원 등으로 **시작 화면 건너뛰고** `#index-flow-after-entry` 진입 여부 |
| `indexApplyRouteAWizardPanels` / `indexApplyAddrMicro` | micro step에 따라 `index-wiz-url`/`pick`/`review` 표시 |
| `indexStickyPrimaryClick` / `indexStickySecondaryClick` | 하단 CTA 이전·다음 |
| `indexWizBackToUrl` / `indexWizBackToPick` | 위저드 뒤로 |
| `indexWizPickFile` | 파일 입력 트리거 |
| `loadGoogleContacts` | OAuth 후 명단 처리 (쿼리 `bulkOpenGoogleContacts` 연동) |
| `processContactsCount` | 유효 연락처 수 갱신 후 `indexPersistBulkRecipientsSession`·`indexMaybeHandoffToPaymentsPage` |
| `indexTryResumeBulkFlow` | `resumeBulk`/`autoPay` 복귀 시 스텝 복원 |
| `indexLoadPingBulkSessionIntoState` | `ping_bulk_*` / `ping_from_index` hydrate |
| `indexMaybeHandoffToPaymentsPage` | §4 — React review 플래그 시 `/start`, 아니면 `/send/payments` |
| `indexSetBulkFlowKind` / `pingFlowChooseThankYou` | 답례 플로 |
| `syncMainBottomPadding` / `indexSyncFlowDocumentTitle` | 레이아웃·타이틀 |

---

## 10. Next `/start` 와의 단계 대응 (현재)

| 레거시 (`__addrMicroStep`) | React `/start` |
|----------------------------|----------------|
| `url` (부고 주소) | `url` |
| `url` (문자 작성 — `index-url-compose-wrap`) | `compose` |
| `pick` | `pick` |
| `review` (또는 `/send/payments` 이전) | `review` → CTA로 `/send/payments` |

**이미지 첨부**는 React `/start`에서도 JPEG 압축·미리보기·`ping_compose_image_data` 세션 저장·레거시 핸드오프까지 동일하게 동작한다. **임시저장·저장내용·최근발송**은 `localStorage` 키를 레거시와 공유한다 (`ping_bulk_saved_compose_v1`, `ping_bulk_recent_sends_v1`, `ping_bulk_sms_local_draft`).

**pick 단계**는 UI만 React이고, Google/파일 처리는 `handoffReactBulkEntryToLegacyWizard` → `index.html?mergeBulk=1` 후 레거시가 담당한다.

