# UI · 코딩 규칙

## UI 가이드

- [`docs/UI-GUIDE.md`](https://github.com/funexcloud/ping/blob/main/docs/UI-GUIDE.md)
- Toss blue `#3182F6`, zinc/shadcn New York
- 아이콘: **lucide-react** only

## 패널 (`ping-bordered-panel`)

위저드·폼·로그인 선택 — `ping-bordered-panel` + `assets/css/ping-ui.css`

| 셸 | 헤더 | 본문 |
|----|------|------|
| `/start`, `/send/payments` | `ping-top-nav` (blend 없음) | surface |
| `/login` 등 | `ping-top-nav--blend` | `ping-main--tight-top` |

규칙: [`.cursor/rules/ping-bordered-panel.mdc`](https://github.com/funexcloud/ping/blob/main/.cursor/rules/ping-bordered-panel.mdc)

---

## 코딩

- [`docs/CODING-STANDARD.md`](https://github.com/funexcloud/ping/blob/main/docs/CODING-STANDARD.md)
- 최소 diff, 기존 패턴 따르기
- `#hex` 하드코딩 대신 `--ping-*` 토큰

---

## 모바일 셸

기본 max-width ~400px — **`/admin/*` 제외** (full width PC)

---

## 관련

- [Development-Guide](Development-Guide)
