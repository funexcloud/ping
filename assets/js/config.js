/**
 * PING 프로젝트 환경 설정
 * 모든 API 키와 설정값을 중앙에서 관리
 */

// 환경 감지
const getEnvironment = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    } else if (hostname.includes('sjms.dothome.co.kr')) {
        return 'production';
    }
    return 'production';
};

// 기본 경로 계산 (현재 페이지 기준)
// 모든 HTML 파일이 루트에 있으므로 항상 './' 반환
const getBasePath = () => {
    return './';
};

// Firebase 설정
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB5qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq",
    authDomain: "ping-project.firebaseapp.com",
    projectId: "ping-project",
    storageBucket: "ping-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdefghijklmnop"
};

// 결제 설정
const PAYMENT_CONFIG = {
    channelKey: "YOUR_CHANNEL_KEY",
    storeId: "YOUR_STORE_ID",
    // PortOne 설정
    portone: {
        // 개발/프로덕션 환경별 설정 가능
    }
};

// Google API 설정
const GOOGLE_CONFIG = {
    clientId: "129688019008-qbej8nci11q95gunprhfr24ei5ssp92d.apps.googleusercontent.com",
    apiKey: "AIzaSyAG6rUlFKqvZCyLjuV9NxkcREUIpkroyag",
    scopes: [
        'https://www.googleapis.com/auth/contacts.readonly'
    ]
};

// API 엔드포인트
const API_ENDPOINTS = {
    approvePayment: '/api/approvePayment.php',
    // 다른 API 엔드포인트들...
};

// 앱 설정
const APP_CONFIG = {
    name: 'PING',
    slogan: '마음, 핑으로 정확하게',
    version: '1.0.0',
    supportEmail: 'kaibcmac@gmail.com',
    supportPhone: '010-3103-0282',
    kakaoChannel: 'http://pf.kakao.com/_jQZpn'
};

// 내보내기
export const config = {
    env: getEnvironment(),
    basePath: getBasePath(),
    firebase: FIREBASE_CONFIG,
    payment: PAYMENT_CONFIG,
    google: GOOGLE_CONFIG,
    api: API_ENDPOINTS,
    app: APP_CONFIG
};

// 전역으로도 사용 가능 (기존 코드 호환성)
if (typeof window !== 'undefined') {
    window.PING_CONFIG = config;
}

