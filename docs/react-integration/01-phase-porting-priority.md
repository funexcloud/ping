# 페이즈 ① — 포팅 우선순위 (초안)

`REACT-MIGRATION-TASKS.md` 페이즈 ①의 **“사용 빈도 높은 것부터”**를 구체화한 초안이다. 데이터 기반 트래픽이 있으면 이表를 대체한다.

## 우선순위 (높음 → 낮음)

| 순위 | 화면·기능 | 현재 형태 | 비고 |
|------|-----------|-----------|------|
| 1 | 마이페이지 허브 | Next `/mypage` | 진입·분기만 Next (진행 중) |
| 2 | 부의금 정리 | Next `/mypage/condolence` | API·템플릿 연동됨 |
| 3 | 포인트·혜택·초대 | `mypage.html` + JS | 스크립트·API 다수 — 후속 대형 포팅 |
| 4 | 회원 로그인 후 이동 | `obituary-member-login` | `next` 쿼리 → `/mypage`, `/mypage/condolence`, `mypage.html` 지원 |
| 5 | 부고 발송·신청 플로 | `index.html`, `checkout`, `obituary/*` | 주문·결제 연동 — 단계적 |
| 6 | 발송/결제 완료 뒤 화면 | `payment-success.html` 등 | 명단·다운로드 UX |
| 7 | 기타 공개 HTML | `pricing`, `guide-*` 등 | 페이즈 ②와 겹칠 수 있음 |

## 다음 액션 제안

1. `mypage.html` 본문(포인트·초대 위젯)을 Next 컴포넌트로 옮기기 — 또는 기존 JS를 `useEffect` 래퍼로 감싸기
2. 로그인·세션: `login?next=/mypage/condolence?bugoRequestId=` 형태로 통일 여부 검토
3. `index` / `overview` 등 **마이페이지 진입**은 `/mypage` 로 통일 (적용됨)
