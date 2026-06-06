/**
 * 공공데이터포털 장례식장 정보 API 통신 제어 모듈
 * 
 * [보안 권고]
 * API 키(서비스키)를 프론트엔드 자바스크립트 파일에 하드코딩하여 바로 호출하면
 * 사용자가 코드를 열어 키를 탈취해 무단 남용할(할당량 소진) 위험이 큽니다.
 * 
 * 가장 올바른 아키텍처:
 * 프론트엔드는 -> PING의 Firebase 백엔드 함수(Cloud Functions)를 찌름
 * PING의 백엔드가 -> 환경변수에 숨겨둔 API 키를 꺼내 공공데이터 서버와 통신 후 결과를 넘겨줌.
 */

// 향후 사용할 수 있는 실제 공공데이터 API 엔드포인트 예시
// const API_BASE_URL = "http://apis.data.go.kr/B552657/ErmctInfoInqireService/getSbjiListInfoInqire";

/**
 * 텍스트를 기반으로 장례식장 데이터를 검색합니다.
 * @param {string} keyword 사용자가 입력한 검색어
 * @returns {Promise<Array>} 검색 결과 리스트 객체 배열
 */
export const searchFuneralHomes = async (keyword) => {
    // 네트워크 통신 중 오류를 잡아내는 try-catch 블록
    try {
        // [1] 백엔드 호출 통일 (로컬/운영 모두 firebase.json rewrite 또는 server.js 통해 라우팅 됨)
        let endpointUrl = "/api/funeralHalls";
        
        const response = await fetch(`${endpointUrl}?searchQuery=${encodeURIComponent(keyword)}`);
        
        if (!response.ok) {
            throw new Error(`백엔드 서버 응답 오류 (상태 코드: ${response.status})`);
        }

        const data = await response.json();
        
        if (data.error) {
            console.error("서버 내부 에러 메시지:", data.error);    
            return [];
        }

        // 성공적으로 정제된 배열(results 또는 data.data)을 반환
        return data.data || [];

    } catch (e) {
        console.error("장례식장 검색 통신 오류:", e);
        // 사용자 화면에 에러를 띄우지 않고 빈 리스트로 대응
        return [];
    }
};
