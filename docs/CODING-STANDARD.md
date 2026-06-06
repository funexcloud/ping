# PING 코드 검수·표준화 가이드

이 문서는 **언어별 공식(또는 사실상 표준) 문서**를 기준으로, `ping_mobile` 리포지토리에서 코드 리뷰와 일상 개발 시 동일한 줄자를 쓰기 위한 것이다.  
상세 UI 토큰·페이지 계약은 **[UI-GUIDE.md](./UI-GUIDE.md)** 와 [assets/css/ping-ui.css](../assets/css/ping-ui.css)를 우선한다.

---

## 1. 공식 참고 문서 (필독 기준)

| 영역 | 공식·준공식 가이드 | 비고 |
|------|-------------------|------|
| HTML / DOM / CSS / JS (브라우저) | [MDN Web Docs](https://developer.mozilla.org/) | API·요소·속성의 **사실상 표준 설명**. 스펙 읽기 전 1차 참고. |
| HTML (스펙) | [HTML Living Standard (WHATWG)](https://html.spec.whatwg.org/) | HTML 문서 구조·시맨틱 근거. |
| JavaScript (언어) | [ECMA-262 / MDN JavaScript](https://developer.mozilla.org/docs/Web/JavaScript) | 문법·내장 객체. |
| Web API (Fetch 등) | [Fetch Living Standard](https://fetch.spec.whatwg.org/) · [MDN fetch](https://developer.mozilla.org/docs/Web/API/Fetch_API) | 클라이언트 HTTP. |
| 접근성 | [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/) · [WAI-ARIA (MDN)](https://developer.mozilla.org/docs/Web/Accessibility/ARIA) | 버튼·라이브 리전·대비·포커스. |
| Node.js | [Node.js v20 문서](https://nodejs.org/docs/latest-v20.x/api/) | 런타임 API (`package.json` engines: **20**). |
| Express | [Express 4.x 가이드](https://expressjs.com/en/guide/routing.html) · [API 레퍼런스](https://expressjs.com/en/4x/api.html) | [server.js](../server.js) 라우팅·미들웨어. |
| 보안 일반 | [OWASP Top 10](https://owasp.org/www-project-top-ten/) · [OWASP Cheat Sheet (XSS)](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) | XSS·설정 노출·CORS 등 점검 시 참고. |

프런트가 React로 확장될 경우: **[React 공식 문서](https://react.dev/)** 를 컴포넌트·훅 기준으로 둔다 (현 리포 루트는 주로 정적 HTML + 바닐라 JS).

---

## 2. 이 저장소에 맞춘 규칙 (요약)

### 2.1 런타임·모듈

- **Node.js 20** — `package.json`의 `engines` 준수.
- **CommonJS** (`require` / `module.exports`) 가 백엔드·도구 코드의 기본이다.
- 배포 전 **구문 검사**: `npm run check` (주요 `.js`에 대해 `node --check`).

### 2.2 서버 ([server.js](../server.js) 및 `*-api.js`)

- 라우트: Express 공식 패턴 — 경로·HTTP 메서드·`next(err)` / `res.status` 일관성.
- 요청 본문: 이미 `express.json()` 사용 — 새 엔드포인트도 JSON 한도·검증 정책을 문서화할 것.
- **비밀·키**: 소스에 평문 하드코딩 지양 — `process.env` + `.env`·시크릿 매니저 (OWASP).
- **CORS**: `cors()` 전역 허용은 개발 편의와 트레이드오프가 있음. 프로덕션에서 출처 제한 여부를 검토할 것.

### 2.3 브라우저 (HTML / `assets/js` / 인라인 스크립트)

- **DOM 삽입**: `innerHTML`에 **신뢰할 수 없는 문자열**(사용자 입력·API 본문 그대로)을 넣지 않는다. MDN·OWASP XSS 가이드 준수. 필요 시 `textContent`, `Document.createElement`, 또는 **이스케이프/정화** 후 삽입.
- **Fetch**: `response.ok` 확인, `try/catch` 또는 `.catch`, 타임아웃·에러 메시지는 사용자에게 안전한 수준만.
- **시맨틱 HTML**: 버튼은 `<button>` 또는 명확한 `role`/`aria-*` (WCAG).
- **스타일 단일 계약**: 제품 페이지는 [UI-GUIDE.md](./UI-GUIDE.md)대로 `ping-ui.css` 토큰 우선.

### 2.4 UI 플로 버튼 (PING 내부 표준)

- **대량 발송 «이전 | 다음»**: [index.html](../index.html) — `.index-sticky-btn-row` (동일 폭 `1fr 1fr`), 이전 숨김 시 다음 전폭.
- **단일 전폭 슬레이트 CTA** (비회원 본인확인 등): `html.ping-ui .ping-flow-cta-slate` — [assets/css/ping-ui.css](../assets/css/ping-ui.css) 주석 참고.

---

## 3. 검수 체크리스트 (PR·자가 점검)

- [ ] `npm run check` 통과
- [ ] 새 사용자 입력이 `innerHTML`/템플릿 문자열에 그대로 들어가지 않음
- [ ] 새 API 경로에 적절한 상태 코드·에러 처리
- [ ] 민감 정보·API 키가 커밋에 추가되지 않음
- [ ] 인터랙티브 요소에 키보드·스크린리더 고려 (필요 시 `aria-label` 등)
- [ ] UI는 `ping-ui` 계약 / UI-GUIDE와 충돌 없음

---

## 4. 초기 전체 점검 요약 (2026-04-10)

| 구분 | 상태 | 메모 |
|------|------|------|
| Node 구문 | 통과 | `npm run check` Exit 0 |
| `guest-sms-auth.js` 등 | 양호 | `'use strict'`, 해시 저장 등 패턴 일관 |
| `innerHTML` 사용 | 주의 다수 | 정적 마크업·관리자 테이블 렌더링에 광범위 사용. **사용자·외부 데이터 삽입 구간**은 건별 XSS 리뷰 필요 (MDN/OWASP). |
| `server.js` / `index.js` 공공데이터 API 키 | 개선됨 | [funeral-odms-config.js](../funeral-odms-config.js)로 단일화 — **env 우선** (`DATA_GO_KR_SERVICE_KEY`, `FUNERAL_API_KEY`). 레거시 폴백 키는 제거 예정(`.env.example` 참고). |
| CORS | 정보 | `app.use(cors())` 전역 — 배포 환경에서 출처 제한 검토 권장. |
| HTML/CSS 표준 | 참고 | 페이지별로 Tailwind CDN·인라인 스타일 혼재 — UI-GUIDE의 신규 권장안(가능하면 `ping-ui`만) 점진 적용. |

**권장 후속 작업 (우선순위)**  
1. `funeral-odms-config.js` 내 레거시 폴백 키 삭제 및 전 환경 `.env`/Secrets 설정 확인.  
2. `innerHTML` + 외부 데이터 조합 구간 목록화 후 `textContent`/DOMPurify 등 방어층 적용.  
3. 선택: ESLint (`eslint:recommended`) + 브라우저 글로벌용 env로 프런트 스크립트 정적 점검.

---

## 5. 문서 유지

- 아키텍처·배포: [deployment-playbook.md](./deployment-playbook.md)
- UI 페이지 계약: [UI-GUIDE.md](./UI-GUIDE.md)
- Cursor 에이전트 규칙: [.cursor/rules/](../.cursor/rules/)

이 표준을 바꿀 때는 **본 문서와 공식 링크 테이블**을 함께 갱신한다.
