# `legacy-html` / `materialize-legacy-html` 제거 순서 (권장)

> **2026-06-02 완료:** 배포 축 확정(Vercel UI + Firebase API) · `legacy-html/` repo 제거 · 스냅샷 `../ping_mobile_legacy_html_snapshot/` · materialize는 Google 검증 HTML만.  
> 결정 문서: [`deployment-axis-decision.md`](./deployment-axis-decision.md)

`legacy-html/` 은 **단일 소스**이고, `npm run materialize:legacy-html` 이 루트·`public/`·하위 트리에 HTML 을 전개한다. 한 번에 폴더를 지우면 **Firebase Hosting predeploy**, **Express 기동**, **Next `ensure-next-public-static`** 이 동시에 깨진다.  
파일 단위 인벤토리·라벨은 **`docs/react-integration/03-phase-legacy-html-inventory.md`** 를 따른다.

---

## 1. 의존 관계 (무엇이 materialize 를 부르는가)

| 단계 | 호출 |
|------|------|
| `npm install` (`postinstall`) | `scripts/ensure-next-public-static.mjs` → 내부에서 `materialize-legacy-html.mjs` |
| `next dev` / `next build` | `next.config.ts` 로드 시 `ensure-next-public-static` ( `PING_SKIP_NEXT_ENSURE` 로 스킵 가능) |
| `node server.js` | 시작 시 `materialize-legacy-html.mjs` |
| `firebase deploy --only hosting` | `firebase.json` `hosting.predeploy` → `npm run materialize:legacy-html` |

**제거·축소 전제:** 위 네 경로가 **같은 기대 경로**(루트 `*.html`, `send/`, `obituary/`, `legal/`, `admin/` 등)를 계속 채울 다른 소스(예: Next standalone 출력만 배포)를 갖거나, 해당 URL 을 더 이상 배포하지 않기로 **배포 축(이관 §4.1)** 이 정해져 있어야 한다.

---

## 2. 권장 페이즈 (안전한 순서)

### 페이즈 0 — 동결·증거

- 스테이징에서 **Hosting rewrite 목록**과 **Next 라우트**를 [`hosting-vs-next-url-parity.md`](./hosting-vs-next-url-parity.md) 와 맞춘다.
- 외부에 노출된 **북마크·문서·PG URL** 목록을 한 번 스냅샷한다.
- `npm run archive:legacy-html` 등으로 `legacy-html/` 스냅샷을 남긴다 (이미 있는 스크립트 활용).

### 페이즈 1 — URL 단위로 “캐논 하나” 정하기

- 인벤토리에서 **포팅 완료**한 항목부터: Next `page.tsx` 가 **실제 트래픽**을 받게 `firebase.json` rewrite 를 바꾸거나, 정적 `*.html` 대신 프록시/Cloud Run 등으로 Next 를 연다.
- **301/302** 로 예전 `.html` 을 새 캐논으로 모은 뒤에만 파일 삭제를 논의한다.

### 페이즈 2 — `legacy-html/` 에서 파일 삭제

- 해당 경로가 **Express·Hosting·서버 바깥 링크** 어디에서도 참조되지 않음을 확인한 뒤, `legacy-html/` 트리에서만 삭제한다.
- `materialize` 한 번 돌린 뒤 루트/미러에 **의도적으로 사라졌는지** 확인한다.

### 페이즈 3 — 파이프라인 축소

- 더 이상 정적 HTML 이 필요 없는 디렉터리는 `materialize-legacy-html.mjs` 의 `SUBDIRS` / 루트 복사 규칙에서 제외하는 **PR**을 별도로 낸다 (동작 변경이 크므로 릴리즈 노트 권장).
- 최종적으로는 `predeploy`·`server.js`·`ensure-next-public-static` 중 materialize 호출을 제거하거나, **Next 빌드 아티팩트만** 배포하는 스크립트로 교체한다.

---

## 3. 하지 말아야 할 것

- 인벤토리 **유지** 라벨(약관·검증 파일·운영 필수) 파일을 먼저 삭제하지 않는다.
- `firebase.json` 만 바꾸고 Express 기본 경로·내부 링크는 그대로 두지 않는다(이중 캐논 유지).

---

## 4. 관련 문서

- [`migration-html-to-react-remaining.md`](./migration-html-to-react-remaining.md) §2.3, §4, §5
- [`hosting-vs-next-url-parity.md`](./hosting-vs-next-url-parity.md)
- [`react-integration/03-phase-legacy-html-inventory.md`](./react-integration/03-phase-legacy-html-inventory.md)
- [`deployment-playbook.md`](./deployment-playbook.md)
