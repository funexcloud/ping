'use strict';

/**
 * 공공데이터포털 ODMS 장례 행정 API (callData04_1Api)
 *
 * 표준: 비밀은 소스에 두지 않음 — Node `process.env` 우선.
 * @see https://nodejs.org/docs/latest-v20.x/api/process.html#process_process_env
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
 *
 * 환경 변수 (먼저 적용):
 *   - DATA_GO_KR_SERVICE_KEY (권장 이름)
 *   - FUNERAL_API_KEY (기존 Functions·로컬과 호환)
 *
 * 로컬: `.env` 에 위 변수 설정. `.env.example` 참고.
 */

const FUNERAL_API_ENDPOINT =
    'https://apis.data.go.kr/1352000/ODMS_DATA_04_1/callData04_1Api';

/** 레거시 폴백 — 저장소에서 제거 예정. 운영·CI는 반드시 env 설정. */
const LEGACY_DEV_SERVICE_KEY =
    '6153e035323807a71b63e466d06ad78a7c48d8dbe3d26bfc325c2b017e7cdd35';

function getFuneralApiServiceKey() {
    const k = String(
        process.env.DATA_GO_KR_SERVICE_KEY || process.env.FUNERAL_API_KEY || ''
    ).trim();
    if (k) return k;
    if (process.env.NODE_ENV === 'production') {
        console.warn(
            '[funeral-odms] DATA_GO_KR_SERVICE_KEY / FUNERAL_API_KEY 미설정 — ODMS 호출이 실패할 수 있습니다.'
        );
    }
    return LEGACY_DEV_SERVICE_KEY;
}

module.exports = {
    FUNERAL_API_ENDPOINT,
    getFuneralApiServiceKey,
};
