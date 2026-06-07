# Wiki Setup — GitHub에 올리기

PING Wiki 원본은 저장소 **`docs/wiki/`** 에 있습니다. GitHub Wiki는 별도 git 저장소입니다.

## 방법 A — 웹 UI (페이지 적을 때)

1. GitHub → `funexcloud/ping` → **Wiki** → **Create the first page**
2. `docs/wiki/Home.md` 내용 붙여넣기 → Save
3. 나머지 페이지도 동일하게 생성
4. **Edit sidebar** → `docs/wiki/_Sidebar.md` 붙여넣기

## 방법 B — Wiki git clone (권장)

```bash
# 1) Wiki 저장소 클론 (최초 1회 Wiki 생성 후)
git clone https://github.com/funexcloud/ping.wiki.git
cd ping.wiki

# 2) docs/wiki 내용 복사
cp ../ping/docs/wiki/*.md .

# 3) 커밋·푸시
git add .
git commit -m "Sync wiki from docs/wiki"
git push origin master
```

Wiki 기본 브랜치가 `main`이면 `master` → `main`으로 바꿉니다.

## 방법 C — 스크립트 (저장소에 포함)

```bash
npm run wiki:push
```

(`scripts/push-github-wiki.mjs` — `GITHUB_TOKEN` 필요)

---

## 페이지 목록

| Wiki 파일 | 제목 |
|-----------|------|
| `Home.md` | 홈 |
| `_Sidebar.md` | 사이드바 |
| `Roadmap-and-Status.md` | 로드맵·현황 |
| `Bulk-Flow-9-Steps.md` | 9단계 플로 |
| `Product-Positioning.md` | 제품 포지셔닝 |
| `Architecture.md` | 아키텍처 |
| `Development-Guide.md` | 로컬 개발 |
| `Deployment.md` | 배포 |
| `Admin-and-Operations.md` | 관리자 |
| `Security-and-Auth.md` | 보안 |
| `API-Overview.md` | API |
| `UI-and-Standards.md` | UI 규칙 |
| `Legal-and-License.md` | 법무 |
| `Troubleshooting.md` | 트러블슈팅 |

---

## 갱신 규칙

1. **Wiki SoT:** `docs/wiki/*.md` 에 먼저 수정
2. `wiki:push` 또는 수동 clone push로 GitHub Wiki 동기화
3. README는 짧게 유지, 상세·로드맵은 Wiki
