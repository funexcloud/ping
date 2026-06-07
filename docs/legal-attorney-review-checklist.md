# 변호사 법률 검토 체크리스트 (PING)

> **본 문서는 법률 자문이 아닙니다.**  
> 한국AIBC융합원은 아래 항목을 **대한민국 변호사(전자상거래·개인정보·지식재산 분야)** 에게 검토받은 뒤, 수정·시행일·공지 절차를 완료해야 합니다.

**운영 주체:** 한국AIBC융합원 (대표 송지훈)  
**서비스:** PING — https://ping.funexcloud.com  
**소스:** `funexcloud/ping` — [`LICENSE`](../LICENSE) (독점)

---

## 1. 제출할 자료 (미리 준비)

| # | 자료 | 경로 |
|---|------|------|
| 1 | 이용약관 | `src/content/legal/terms-of-service.ts` → `/legal/terms-of-service` |
| 2 | 개인정보처리방침 | `src/content/legal/privacy-policy.ts` |
| 3 | 환불·취소 정책 | `src/content/legal/refund-policy.ts` |
| 4 | 서비스·결제 안내 | `src/content/legal/service-payment-guide.ts` |
| 5 | 지식재산권 정책 | `src/content/legal/copyright.ts` |
| 6 | 사업자 표기 | `src/lib/ping-company-legal.ts`, 사이트 푸터 |
| 7 | 소스 코드 LICENSE | [`LICENSE`](../LICENSE) |
| 8 | 실제 서비스 화면 | 결제·발송·환불·무통장·부분실패 UI 캡처 |
| 9 | 데이터 처리 흐름 | Firestore 필드, Solapi 발송, 24h 파기 cron (`/api/cron/purge-sensitive-data`) |

---

## 2. 검토 요청 사항 (체크리스트)

검토 후 `[ ]` → `[x]` 로 기록하세요.

### A. 전자상거래·약관

- [ ] 「약관의 규제에 관한 법률」 — 필수 표기·불공정 약관 해당 여부
- [ ] 「전자상거래법」 — 청약철회 제한(발송 개시 후) 문구의 적법성·고지 방법
- [ ] 무통장 입금·카드·포인트 등 결제 수단별 환불·취소 절차
- [ ] 부분 발송 실패 시 환불/재발송 표현과 실제 API 동작 일치
- [ ] 관할법원·준거법 (본점: 울산) 문구
- [ ] 약관 개정 시 7일/30일 전 공지 절차와 사이트 공지 방법

### B. 개인정보

- [ ] 수집 항목·목적·보유기간이 **실제 코드**와 일치 (회원, 비회원 OTP, 주문, 마케팅 cookie 등)
- [ ] 제3자 제공·위탁 (Solapi, Toss, Firebase/Google, Resend, Kakao) 고지
- [ ] 주소록 24시간 파기 vs 법정 보관 주문·결제 기록 구분
- [ ] 개인정보 보호책임자·민원 연락처 (송지훈 / 052-286-4440 등)

### C. 통신·문자·스팸

- [ ] 전기통신사업법·정보통신망법 — 대량 문자 발송, 발신번호 표시, 이용자 책임 조항
- [ ] 수신자 동의·스팸 신고 대응 절차 (이용자 의무 조항과 운영 매뉴얼)

### D. 지식재산·과장 표현 (중요)

`copyright.ts` 에 아래 **사실 관계**를 변호사·대표가 확인하고, **미등록·미출원이면 문구 수정 또는 삭제**해야 합니다.

- [ ] 「저작권위원회 프로그램 등록」 — 실제 등록증 유무
- [ ] 「특허청 임시명세서 출원」 — 실제 출원번호·상태
- [ ] 「등록 상표 / 출원 중 상표 'PING'」 — 실제 상표 등록·출원 유무
- [ ] 「전담 법무팀 24시간 감시」 등 운영 실태와 맞는 표현인지

**허위·과장은 표시광고법·약관법 리스크** — 검토 전까지 마케팅·법적 고지에 단정적 표현 사용 자제 권장.

### E. 소스 코드 LICENSE

- [ ] [`LICENSE`](../LICENSE) 독점 조항 — 협력 개발자·외주·오픈소스 의존성( npm )과 충돌 없음
- [ ] GitHub Public/Private 전략과 내부 기여·NDA

### F. 통신판매업·사업자 표기

- [ ] 통신판매업신고 2024울산북구0108호 — 신고 내용과 실제 판매 품목(PING 유료 발송) 일치
- [ ] 사이트 푸터·약관 부칙·결제 페이지 사업자 정보 동일 ([`ping-company-legal.ts`](../src/lib/ping-company-legal.ts))

---

## 3. 검토 완료 후 할 일

1. 변호사 수정안 반영 → `src/content/legal/*.ts` 및 `LICENSE` 개정
2. **최종 수정일** 각 문서 `last-updated` 갱신
3. 중요 변경 시 이용자 공지 (이메일·사이트 배너·약관 재동의 필요 여부는 변호사 지시)
4. 검토일·담당 변호사·버전을 아래 표에 기록 (내부용)

| 검토일 | 변호사/법률사무소 | 버전 | 비고 |
|--------|-------------------|------|------|
| | | | |

---

## 4. GitHub 저장소 About (기술)

Description (복사용): [`.github/repository-description.txt`](../.github/repository-description.txt)

```bash
GITHUB_TOKEN=... node scripts/set-github-repo-description.mjs
```

또는 GitHub 웹 → **Settings → General → About → Description** 에 위 파일 1줄 붙여넣기.

---

## 5. 관련 내부 문서

- [`README.md`](../README.md) — 라이선스·사업자 요약
- [`docs/vercel-production-handoff.md`](./vercel-production-handoff.md) — 운영 배포
