/**
 * 문자 발송 서비스 자동화 모듈
 * 
 * 지원 서비스:
 * - 알리고 (Aligo)
 * - 카카오 알림톡
 * - 네이버 클라우드 플랫폼
 * - 기타 SMS API 서비스
 */

const axios = require('axios');
const admin = require('firebase-admin');

/**
 * 알리고 SMS 발송
 * @param {Object} config - 알리고 설정
 * @param {Array} contacts - 발송할 연락처 목록
 * @param {String} message - 발송할 메시지
 * @returns {Promise<Object>} 발송 결과
 */
async function sendAligoSMS(config, contacts, message) {
    const { apiKey, userId, sender } = config;
    
    try {
        // 알리고 API 엔드포인트
        const apiUrl = 'https://apis.aligo.in/send/';
        
        // 연락처를 알리고 형식으로 변환
        const phoneNumbers = contacts.map(contact => {
            // 전화번호 정규화 (하이픈 제거, 010 형식)
            let phone = String(contact).replace(/-/g, '').trim();
            if (phone.startsWith('0')) {
                phone = phone.substring(1);
            }
            return phone;
        }).filter(phone => phone.length >= 10); // 유효한 전화번호만

        if (phoneNumbers.length === 0) {
            throw new Error('유효한 연락처가 없습니다.');
        }

        // 알리고 API 요청
        const response = await axios.post(apiUrl, null, {
            params: {
                key: apiKey,
                user_id: userId,
                sender: sender,
                receiver: phoneNumbers.join(','),
                msg: message,
                testmode_yn: config.testMode || 'N'
            }
        });

        return {
            success: true,
            service: 'aligo',
            sentCount: phoneNumbers.length,
            result: response.data
        };

    } catch (error) {
        console.error('Aligo SMS 발송 오류:', error);
        return {
            success: false,
            service: 'aligo',
            error: error.message
        };
    }
}

/**
 * 카카오 알림톡 발송
 * @param {Object} config - 카카오 설정
 * @param {Array} contacts - 발송할 연락처 목록
 * @param {String} templateCode - 알림톡 템플릿 코드
 * @param {Object} templateData - 템플릿 변수 데이터
 * @returns {Promise<Object>} 발송 결과
 */
async function sendKakaoTalk(config, contacts, templateCode, templateData) {
    const { apiKey, apiSecret, senderKey } = config;
    
    try {
        // 카카오 알림톡 API 엔드포인트
        const apiUrl = 'https://kakaoapi.aligo.in/akv10/talk/send/';
        
        // 연락처 정규화
        const phoneNumbers = contacts.map(contact => {
            let phone = String(contact).replace(/-/g, '').trim();
            if (phone.startsWith('0')) {
                phone = phone.substring(1);
            }
            return phone;
        }).filter(phone => phone.length >= 10);

        if (phoneNumbers.length === 0) {
            throw new Error('유효한 연락처가 없습니다.');
        }

        // 카카오 알림톡 API 요청
        const response = await axios.post(apiUrl, null, {
            params: {
                key: apiKey,
                user_id: apiSecret,
                senderkey: senderKey,
                receiver_1: phoneNumbers[0],
                rec_1_name: '고객',
                template_code: templateCode,
                message: JSON.stringify(templateData),
                testmode_yn: config.testMode || 'N'
            }
        });

        return {
            success: true,
            service: 'kakao',
            sentCount: phoneNumbers.length,
            result: response.data
        };

    } catch (error) {
        console.error('카카오 알림톡 발송 오류:', error);
        return {
            success: false,
            service: 'kakao',
            error: error.message
        };
    }
}

/**
 * 주소록 파일을 문자 발송 형식으로 변환
 * @param {Object} orderData - 주문 데이터 (Firestore 문서)
 * @returns {Promise<Array>} 발송할 연락처 목록
 */
async function convertAddressBookToContacts(orderData) {
    try {
        // Firestore에서 주소록 파일 정보 가져오기
        // storagePath가 가장 우선 (Firebase Storage 경로)
        // fileUrl은 다운로드 URL (경로 추출 가능)
        const storagePath = orderData.storagePath;
        const fileUrl = orderData.fileUrl;
        
        if (!storagePath && !fileUrl) {
            throw new Error('주소록 파일 정보가 없습니다.');
        }

        // Firebase Storage에서 파일 다운로드
        const bucket = admin.storage().bucket();
        let file;
        
        // storagePath가 있으면 직접 사용 (가장 정확)
        if (storagePath) {
            file = bucket.file(storagePath);
            console.log('Storage 경로로 파일 접근:', storagePath);
        } else if (fileUrl) {
            // URL에서 경로 추출
            // 예: https://firebasestorage.googleapis.com/v0/b/PROJECT.appspot.com/o/orders%2FORDER_ID%2Ffile.xlsx?alt=media&token=...
            try {
                const urlParts = fileUrl.split('/o/');
                if (urlParts.length > 1) {
                    const encodedPath = urlParts[1].split('?')[0];
                    const decodedPath = decodeURIComponent(encodedPath);
                    file = bucket.file(decodedPath);
                    console.log('URL에서 경로 추출:', decodedPath);
                } else {
                    throw new Error('URL 형식을 인식할 수 없습니다.');
                }
            } catch (urlError) {
                console.error('URL 파싱 오류:', urlError);
                throw new Error('파일 URL에서 경로를 추출할 수 없습니다.');
            }
        }
        
        if (!file) {
            throw new Error('파일 경로를 찾을 수 없습니다.');
        }

        const [fileBuffer] = await file.download();

        // 엑셀 파일 파싱 (SheetJS 사용)
        const XLSX = require('xlsx');
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // 전화번호 컬럼 찾기
        const phoneKey = Object.keys(jsonData[0] || {}).find(key => 
            key.includes('휴대폰') || 
            key.includes('Mobile') || 
            key.toLowerCase().includes('phone') || 
            key === '전화번호'
        );

        if (!phoneKey) {
            throw new Error('전화번호 컬럼을 찾을 수 없습니다.');
        }

        // 유효한 전화번호만 추출
        const contacts = jsonData
            .map(row => {
                const phone = String(row[phoneKey] || '').trim();
                return phone.replace(/-/g, '');
            })
            .filter(phone => phone.length >= 10 && phone.length <= 11);

        return contacts;

    } catch (error) {
        console.error('주소록 변환 오류:', error);
        throw error;
    }
}

/**
 * 문자 발송 자동화 메인 함수
 * @param {String} orderId - 주문 ID
 * @param {Object} smsConfig - SMS 서비스 설정
 * @returns {Promise<Object>} 발송 결과
 */
async function sendSMSAutomation(orderId, smsConfig) {
    try {
        const db = admin.firestore();
        const orderRef = db.collection('ping_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            throw new Error('주문을 찾을 수 없습니다.');
        }

        const orderData = orderDoc.data();

        // 주문 상태 확인
        if (orderData.status !== 'paid') {
            throw new Error('결제가 완료되지 않은 주문입니다.');
        }

        // 이미 발송된 주문인지 확인
        if (orderData.smsStatus === 'sent' || orderData.smsStatus === 'sending') {
            return {
                success: false,
                message: '이미 발송 중이거나 발송 완료된 주문입니다.'
            };
        }

        // 발송 상태 업데이트
        await orderRef.update({
            smsStatus: 'sending',
            smsStartedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 주소록 변환
        const contacts = await convertAddressBookToContacts(orderData);
        
        if (contacts.length === 0) {
            throw new Error('발송할 연락처가 없습니다.');
        }

        // 플랜에 따른 메시지 설정
        const plan = orderData.plan || 'standard';
        const applicantName = orderData.name || '고객'; // 신청자명
        
        // 기본 메시지: 신청자명 포함 + 결제 완료 메시지
        const defaultMessage = `${applicantName}님의 요청으로 대량으로 부고를 전송해드렸어요. 결제가 완료되었습니다.`;
        
        let message = '';
        let templateCode = '';

        if (plan === 'premium') {
            // 프리미엄 플랜: 부고 알림 + 답례 문자
            message = orderData.premiumMessage || defaultMessage;
            templateCode = orderData.premiumTemplateCode || '';
        } else {
            // 표준 플랜: 부고 알림만
            message = orderData.message || defaultMessage;
        }
        
        console.log('발송 메시지:', message);

        // SMS 서비스에 따라 발송
        let result;
        if (smsConfig.service === 'aligo') {
            result = await sendAligoSMS(smsConfig, contacts, message);
        } else if (smsConfig.service === 'kakao') {
            result = await sendKakaoTalk(
                smsConfig, 
                contacts, 
                templateCode, 
                orderData.templateData || {}
            );
        } else {
            throw new Error(`지원하지 않는 SMS 서비스: ${smsConfig.service}`);
        }

        // 발송 결과 업데이트
        if (result.success) {
            await orderRef.update({
                smsStatus: 'sent',
                smsSentAt: admin.firestore.FieldValue.serverTimestamp(),
                smsSentCount: result.sentCount,
                smsResult: result
            });
        } else {
            await orderRef.update({
                smsStatus: 'failed',
                smsError: result.error,
                smsFailedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return result;

    } catch (error) {
        console.error('SMS 자동화 오류:', error);
        
        // 에러 상태 업데이트
        const db = admin.firestore();
        const orderRef = db.collection('ping_orders').doc(orderId);
        await orderRef.update({
            smsStatus: 'failed',
            smsError: error.message,
            smsFailedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    sendSMSAutomation,
    sendAligoSMS,
    sendKakaoTalk,
    convertAddressBookToContacts
};

