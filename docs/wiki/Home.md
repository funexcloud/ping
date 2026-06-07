# PING Wiki

**PING**은 한국AIBC융합원이 운영하는 **부고 커뮤니케이션 플랫폼**입니다.  
부고 URL → 연락처 → 결제 → 문자·알림톡 발송 → 안심 링크 → 부의금 명단까지 **한 흐름**으로 연결합니다.

| | |
|---|---|
| **공개 서비스** | https://ping.funexcloud.com |
| **소스 코드** | https://github.com/funexcloud/ping |
| **운영 주체** | 한국AIBC융합원 (대표 송지훈) |
| **고객센터** | 052-286-4440 |

---

## 이 Wiki에서 찾을 수 있는 것

| 페이지 | 내용 |
|--------|------|
| [Roadmap-and-Status](Roadmap-and-Status) | 무엇이 끝났고, 무엇이 진행 중인지 |
| [Bulk-Flow-9-Steps](Bulk-Flow-9-Steps) | 대량 발송 제품 플로 (SoT) |
| [Architecture](Architecture) | Next · Express · Firebase · Vercel |
| [Development-Guide](Development-Guide) | `npm run dev`, env, 검증 |
| [Deployment](Deployment) | Vercel / Functions / Cloud Run |
| [Admin-and-Operations](Admin-and-Operations) | `/admin`, 입금 확인, 발송 상태 |
| [Security-and-Auth](Security-and-Auth) | 안심 링크 JWT, 관리자 세션 |
| [Legal-and-License](Legal-and-License) | 약관, LICENSE, 변호사 검토 |

저장소 루트 [README](https://github.com/funexcloud/ping/blob/main/README.md)는 **클론·빌드 빠른 참조**용, Wiki는 **로드맵·운영·온보딩**용입니다.

---

## 30초 요약

```
사용자 → Vercel (Next.js UI)
           ├─ Firebase Functions / Firestore (주문·결제·import)
           ├─ Express Cloud Run (회원·게스트 인증, 폴백)
           └─ Solapi + Toss (발송·결제)
```

- **캐논 UI:** `src/app` (App Router)
- **캐논 대량 플로:** `/start` → `/login` → `/checkout` → `/payment-success`
- **로컬:** Express `:3000` + Next `:3002` (`npm run dev`)

---

## 빠른 링크 (저장소)

- [`.env.example`](https://github.com/funexcloud/ping/blob/main/.env.example)
- [`docs/ping-bulk-send-process.md`](https://github.com/funexcloud/ping/blob/main/docs/ping-bulk-send-process.md) — 9단계 상세
- [`docs/vercel-production-handoff.md`](https://github.com/funexcloud/ping/blob/main/docs/vercel-production-handoff.md) — 배포 체크리스트
- [`LICENSE`](https://github.com/funexcloud/ping/blob/main/LICENSE) — 소스 독점 라이선스

---

## Wiki 올리기

> **왜 https://github.com/funexcloud/ping/wiki 가 비어 있나?**  
> Wiki는 `main` 브랜치와 **별도 git 저장소**입니다. `docs/wiki/`만 커밋해도 Wiki 탭에는 **자동으로 안 나옵니다.**

### 0단계 — 저장소에 원본 올리기 (권장)

```bash
git add docs/wiki scripts/push-github-wiki.mjs
git commit -m "Add PING wiki source under docs/wiki"
git push origin main
```

→ 브라우저: https://github.com/funexcloud/ping/tree/main/docs/wiki

### 1단계 — GitHub에서 Wiki 켜기

1. https://github.com/funexcloud/ping/settings  
2. **Features** → **Wikis** ✅  
3. **Wiki** 탭 → **Create the first page** → 제목 `Home` → 아무 내용 저장 (이때 `ping.wiki.git` 생성)

### 2단계 — 내용 푸시

```bash
GITHUB_TOKEN=ghp_... npm run wiki:push
```

토큰 권한: `repo` (또는 Wiki 쓰기 가능한 fine-grained token)

### 3단계 — Sidebar

Wiki → **Edit sidebar** → `_Sidebar.md` 내용 붙여넣기

---

이 폴더(`docs/wiki/`)를 GitHub Wiki에 반영하는 방법은 아래도 참고하세요.
