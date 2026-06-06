# Express ↔ Next 역할 분담 (마이그레이션 기간)

`REACT-MIGRATION-TASKS.md` **Express 역할**·**API 정리** 절에 대응하는 규칙이다.

---

## 1. 신규 데이터·권한 로직 — 기본 원칙

| 규칙 | 설명 |
|------|------|
| **기본** | **비즈니스·권한·결제·외부 PG** 는 **`server.js` + 기존 모듈**(`member-auth`, `bugo-import`, …)에서 처리한다. |
| **예외** | Next 전용 UI(`src/app`)에만 쓰는 **가벼운 CRUD·파서**는 `src/app/api/**/route.ts` 에 둘 수 있다. 이때 **도메인 불변식**은 Express 쪽과 중복되지 않게 한다. |
| **인증** | 세션·쿠키 검증이 필요하면 **Express API를 호출**하거나, 향후 공통 미들웨어를 한 레이어에 모은다. (Next Route Handler에 비밀·권한 로직만 또 쌓지 않기.) |
| **테넌트** | `req.tenantId`(Host) 등은 B2B 확장 시 **동일 규칙**으로 Next·API에 전달할 계획 — [후속 B2B](../REACT-MIGRATION-TASKS.md#후속-b2b--기록만) |

---

## 2. 현재 Next `Route Handler` (소유권 표)

로컬에서 `localhost:3000` 한 포트로 쓰려면 **아래 prefix는 `server.js`가 Next로 프록시**한다. 새 Next API를 추가하면 **프록시 한 줄을 반드시 추가**한다.

| HTTP path prefix | 구현 위치 | 비고 |
|------------------|-----------|------|
| `/_next/*` | Next 빌드 산출물 | HMR·청크 |
| `/intro/*` | `src/app/intro/**` | 서비스 안내(구 `intro.html`) |
| `/mypage/*` | `src/app/mypage/**` | 허브·부의금 UI |
| `/api/condolence/*` | `src/app/api/condolence/**` | GET/POST/bulk/template |
| `/api/contacts` | `src/app/api/contacts/route.ts` | 명단 검색 |

그 외 `/api/*` 는 **Express·Firebase Functions** 가 처리 (충돌 경로 만들지 않기).

전체 SoT·중복 path·클라이언트 URL 목표는 [api-inventory.md](api-inventory.md)를 본다.

---

## 3. 로컬 프록시 설정

- **환경 변수:** `NEXT_DEV_PORT` (기본 `3002`), Express `PORT` (기본 `3000`).
- **변경 시:** `server.js` 내 `NEXT_DEV_PROXY_PORT` 주석과 [00-foundation.md](00-foundation.md) 동기화.
- **502:** Next 미기동 — `npm run dev`로 Express+Next를 함께 띄우거나, 터미널에서 `npm run next:dev` 추가. Express만(`npm run dev:express`) 켠 경우 GET `/intro`는 정적 `intro.html`로 폴백된다.

---

## 4. (선택) API 단독 서비스로 분리

**후속**으로만 검토:

- Express(또는 Functions)만 **별 호스트·컨테이너**로 두고, Next는 정적·SSR만.
- **전제:** CORS·쿠키 `SameSite`·인증 헤더·레이트 리밋을 재설계.
- 트래픽·팀 규모·배포 단순화 필요 시 [API 정리](../REACT-MIGRATION-TASKS.md#api-정리-후속-페이즈와-병행-가능) 단계에서 결정.

---

## 관련 문서

- [REACT-MIGRATION-TASKS.md](../REACT-MIGRATION-TASKS.md)
- [api-inventory.md](api-inventory.md) — SoT 표, 중복 path, 클라이언트 URL·크로스컷 목표
- [smoke-and-release-checklist.md](smoke-and-release-checklist.md) — 페이즈 스모크·배포 URL 점검
- [00-foundation.md](00-foundation.md)
- [03-phase-legacy-html-inventory.md](03-phase-legacy-html-inventory.md) — Express `sendFile` 목록
