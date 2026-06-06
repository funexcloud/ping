# ping-dispatch

PING **결제 완료 주문**에 대한 실발송 어댑터입니다. **Solapi**로 **SMS(LMS)**와 **카카오 알림톡**을 보낼 수 있으며, 기본 전략은 **알림톡 우선**·대량 시 Solapi `send` API **최대 10,000건/요청** 청크로 처리합니다.

## 백업·이관

- 이 폴더 전체를 저장소/압축으로 보관하거나,
- 상위 프로젝트에서: `npm pack ping-dispatch` 로 `ping-dispatch-1.0.0.tgz` 생성.

운영 시크릿은 **저장하지 않습니다**. 환경 변수만 별도 백업(1Password 등)하세요.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `PING_DISPATCH_USE_SOLAPI` | `1` 이면 이 모듈 경로 사용 (Solapi 키 필수) |
| `SOLAPI_API_KEY` | Solapi API Key |
| `SOLAPI_API_SECRET` | Solapi API Secret |
| `SOLAPI_FROM` | 발신번호 (Solapi에 등록된 번호) |
| `PING_DISPATCH_PRIMARY_CHANNEL` | `kakao_alimtalk`(기본) 또는 `sms` |
| `SOLAPI_KAKAO_PF_ID` | 카카오 채널 ID (구 pfId) |
| `SOLAPI_KAKAO_TEMPLATE_ID` | 승인된 알림톡 템플릿 ID |
| `PING_DISPATCH_BATCH_SIZE` | 한 요청당 최대 수신 건수 (기본 1000, 최대 10000) |
| `PING_DISPATCH_FALLBACK_SMS` | `1`이면 알림톡 접수 실패 건에 한해 동일 문구 LMS로 재시도(Solapi 알림톡 대체 문자는 끔) |

알림톡 템플릿 변수는 주문 문서의 `templateData`(객체)와 자동 매핑됩니다. 템플릿 치환 키는 카카오 검수 본문과 맞춰 주문 데이터에 넣어야 합니다.

## 레거시 (알리고 등)

`PING_DISPATCH_USE_SOLAPI`가 비어 있으면 기존 `sms-service.js`의 알리고·구 알림톡 분기만 사용합니다.

## 참고

- [Solapi Node SDK](https://developers.solapi.com/developers/sdk/nodejs)
- 알림톡: 템플릿·채널은 카카오·Solapi 콘솔에서 사전 등록 필요.
