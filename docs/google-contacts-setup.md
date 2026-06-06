# Google 연락처 연동 설정 가이드 (People API · OAuth)

이 문서는 **ping_mobile** 프로젝트에서 `index.html`이 사용하는 **Google 연락처 가져오기** 기능을 위해 Google Cloud에서 필요한 설정을 정리한 것입니다.  
브라우저에서는 **People API**와 OAuth 범위 **`https://www.googleapis.com/auth/contacts.readonly`** 를 사용합니다.

**네이버 주소록**은 이 OAuth 흐름과 무관하며, 내보낸 CSV·엑셀만 업로드합니다. 사용자 안내는 [naver-contacts-setup.md](./naver-contacts-setup.md)를 참고하세요.

> 비밀값(client secret 등)은 브라우저에 두지 마세요. 아래 예시는 모두 플레이스홀더(`YOUR_CLIENT_ID` 등)입니다.

---

## 사전 준비

- **Google Cloud 프로젝트** 하나를 준비합니다 (신규 생성 또는 기존 프로젝트 사용).
- **결제(Billing) 계정:** People API 일반적인 읽기 호출은 무료 할당량 범위에서 동작하는 경우가 많습니다. 다만 조직 정책이나 다른 API와 같은 프로젝트를 쓸 때는 **결제 계정 연결을 요구**할 수 있습니다. 콘솔에서 API 사용 설정 시 안내가 나오면 따르시면 됩니다.
- 이 저장소 기준 **운영 도메인:** `https://ping.funexcloud.com` ([배포 플레이북](./deployment-playbook.md)과 동일).
- 로컬 개발 시 **`npm run dev`** 로 `server.js`가 뜨며 기본 포트는 **`3000`** 입니다 (`PORT` 환경 변수로 변경 가능).

---

## People API와 Contacts API 구분

| 구분 | 설명 |
|------|------|
| **People API** | 사용자 연락처 목록 등을 다루는 **현재 권장** API입니다. 이 프로젝트의 Discovery 문서도 `people.googleapis.com` v1을 사용합니다. |
| **Contacts API** (구글 연락처 레거시 표면) | 새 연동에서는 보통 **People API로 통합**합니다. **연락처 읽기 전용(`contacts.readonly`) + People API** 조합이면 별도의 “Contacts API만” 활성화가 필수인 경우는 많지 않습니다. |

**정리:** Google Cloud Console → **API 및 서비스** → **라이브러리**에서 **People API**를 **사용 설정**하면 됩니다. (콘솔에서 해당 프로젝트에 대해 활성화되어 있는지 확인하세요.)

---

## OAuth 동의 화면

1. Console → **API 및 서비스** → **OAuth 동의 화면**.
2. **사용자 유형**
   - 내부/테스트 단계: **외부(External)** 가 일반적이며, 검증 전에는 **테스트 사용자** 목록에 로그인할 Gmail 계정을 추가해야 합니다.
   - Google Workspace 조직만 쓰는 경우 **내부(Internal)** 가 선택 가능할 수 있습니다 (조직 정책에 따름).
3. **범위(Scopes)** 에 다음을 추가합니다.
   - `https://www.googleapis.com/auth/contacts.readonly`  
     (`index.html`의 `GOOGLE_SCOPES`와 동일해야 합니다.)
4. **테스트 vs 프로덕션**
   - **검증 전:** 동의 화면이 “테스트” 상태면 **테스트 사용자로 등록된 계정**만 로그인·동의가 가능합니다.
   - **공개 서비스:** 민감·제한 범위에 따라 Google 검증(Verification) 절차가 필요할 수 있습니다. 자세한 정책은 Google Cloud 도움말 및 검증 안내를 참고하세요.

---

## 사용자 인증 정보 (OAuth 2.0 클라이언트 ID)

1. Console → **API 및 서비스** → **사용자 인증 정보** → **만들기** → **OAuth 클라이언트 ID**.
2. 애플리케이션 유형: **웹 애플리케이션**.
3. **승인된 JavaScript 원본** 예시 (실제 배포 URL에 맞게 조정):

   | 환경 | 예시 |
   |------|------|
   | 운영 | `https://ping.funexcloud.com` |
   | 로컬 | `http://localhost:3000` |

   다른 포트로 `npm run dev`를 실행했다면 **`http://localhost:<실제포트>`** 로 등록합니다.

4. **승인된 리디렉션 URI**  
   Google Identity Services의 토큰 클라이언트 사용 시에도 콘솔에서 리디렉션 URI를 요구하는 설정이 있습니다. 다음을 참고해 **실제 앱 출처와 동일한 스킴·호스트·포트**로 맞춥니다.

   - 운영: `https://ping.funexcloud.com` (또는 콘솔 안내에 따른 경로 포함 형태)
   - 로컬: `http://localhost:3000` (또는 사용 중인 포트)

   저장 후에도 오류가 나면 오류 메시지에 표시된 **정확한 URI**를 그대로 추가합니다.

5. 생성 후 표시되는 **클라이언트 ID**를 복사합니다 (형태: `YOUR_CLIENT_ID.apps.googleusercontent.com`).  
   **클라이언트 보안 비밀번호**는 이 앱의 브라우저 플로우에는 사용하지 않습니다.

---

## API 키 (브라우저용 · `gapi` 초기화)

`index.html`은 `gapi.client.init`에 **API 키**도 넘깁니다. 별도로 **API 키**를 만들고 제한을 거는 것을 권장합니다.

- **API 제한:** **People API**만 허용.
- **애플리케이션 제한:** **HTTP 리퍼러**  
  예: `http://localhost:3000/*`, `https://ping.funexcloud.com/*`

값은 코드가 아니라 환경 변수로 주입합니다 (아래 참고).

---

## 앱에 클라이언트 ID·API 키 넣는 위치

| 방법 | 설명 |
|------|------|
| **권장 (로컬·Express)** | 프로젝트 루트 `.env`에 설정 후 `npm run dev`로 `server.js` 실행. |
| **정적 호스팅만** | `/api/google-oauth-config.js`가 없으면 `index.html` 내 **폴백 상수**가 사용될 수 있습니다. 운영에서는 **환경 주입 또는 빌드 단계에서 설정**하는 방식을 권장합니다. |

**.env 변수 이름** (`.env.example`과 동일):

```env
GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_API_KEY=YOUR_BROWSER_API_KEY
```

호환 별칭으로 **`GOOGLE_CLIENT_ID`** 도 `server.js`에서 읽습니다.

`server.js`는 다음 스크립트를 내려줍니다.

- 경로: **`GET /api/google-oauth-config.js`**
- 내용: `window.__PING_GOOGLE_CONFIG__ = { clientId, apiKey }`

`index.html`은 위 설정을 우선 사용하고, 없으면 폴백 값으로 동작합니다. 운영에서는 **반드시 자신의 클라이언트 ID/API 키로 교체**하세요.

---

## Firebase와의 관계 (Authorized domains)

**Firebase Authentication**에서 Google 로그인 등을 쓰는 경우, Firebase Console → **Authentication** → 설정 → **승인된 도메인**에 예를 들어 `ping.funexcloud.com`, `localhost` 등을 등록합니다.

중요한 점:

- **Firebase Authorized domains**와 **Google Cloud OAuth 클라이언트의 “JavaScript 원본”**은 **서로 다른 설정**입니다.
- 연락처 가져오기는 **GCP OAuth 클라이언트 + People API** 쪽 설정이 맞아야 하며, Firebase 도메인만 맞춰서는 OAuth 리디렉션/출처 오류가 해결되지 않을 수 있습니다.

자세한 운영 도메인 정리는 [deployment-playbook.md](./deployment-playbook.md)를 참고하세요.

---

## 문제 해결

| 증상 | 점검 |
|------|------|
| **`redirect_uri_mismatch`** 또는 출처 관련 오류 | OAuth 클라이언트의 **JavaScript 원본**·**리디렉션 URI**가 브라우저 주소창의 **스킴(https/http)·호스트·포트**와 일치하는지 확인합니다. |
| **People API has not been used / API not enabled** | 해당 GCP 프로젝트에서 **People API 사용 설정** 여부를 확인합니다. |
| **403 / 접근 거부 / 할당량** | 할당량·제한은 Console → **People API** → 할당량에서 확인합니다. API 키·OAuth 범위가 올바른지 함께 봅니다. |
| **팝업 차단** | GIS 토큰 요청이 팝업을 사용합니다. 브라우저에서 팝업 허용, 확장 프로그램 차단 해제 후 재시도합니다. |
| **테스트 사용자만 되고 다른 사용자는 안 됨** | 동의 화면이 테스트 모드인 경우 **테스트 사용자 추가** 또는 앱 게시·검증 절차가 필요합니다. |
| **설정했는데도 플레이스홀더 알림** | `.env` 키 이름이 `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_API_KEY`인지, 서버 재시작 후 `/api/google-oauth-config.js` 응답에 값이 채워지는지 확인합니다. |

---

## 코드 참고 (저장소 내)

- OAuth 범위: `https://www.googleapis.com/auth/contacts.readonly`
- Discovery: `https://people.googleapis.com/$discovery/rest?version=v1`
- 설정 주입: `GET /api/google-oauth-config.js` (`server.js`)

공식 참고:

- [People API](https://developers.google.com/people)
- [Google Identity Services (웹)](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google API 자바스크립트 클라이언트](https://developers.google.com/api-client-library/javascript/start/start-js)
