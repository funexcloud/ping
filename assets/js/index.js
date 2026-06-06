/**
 * Firebase Cloud Functions - PING 결제 승인 백엔드
 * 
 * 배포 방법:
 * 1. Firebase CLI 설치: npm install -g firebase-tools
 * 2. 로그인: firebase login
 * 3. 프로젝트 초기화: firebase init functions
 * 4. 배포: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

// Firebase Admin 초기화
admin.initializeApp();

// Firestore 참조
const db = admin.firestore();

// crypto 모듈 (웹훅 검증용)
const crypto = require('crypto');

/**
 * Toss Payments 결제 승인 처리
 * 
 * 요청 형식:
 * POST /approvePayment
 * Body: { paymentKey: string, orderId: string, amount: number }
 */
exports.approvePayment = functions.https.onRequest(async (req, res) => {
    // CORS 설정 (필요한 도메인 추가)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { paymentKey, orderId, amount } = req.body;

        // 필수 파라미터 검증 (아임포트 방식)
        const { imp_uid, merchant_uid, orderId, amount } = req.body;
        
        if (!imp_uid || !merchant_uid || !amount) {
            res.status(400).json({ 
                error: 'Missing required parameters: imp_uid, merchant_uid, amount' 
            });
            return;
        }
        
        const finalOrderId = orderId || merchant_uid;

        // Firestore에서 주문 정보 조회
        const orderRef = db.collection('ping_orders').doc(finalOrderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const orderData = orderDoc.data();

        // 이미 결제 완료된 주문인지 확인
        if (orderData.status === 'paid') {
            res.status(400).json({ error: 'Order already paid' });
            return;
        }

        // 금액 검증
        if (orderData.totalAmount !== amount) {
            res.status(400).json({ 
                error: 'Amount mismatch',
                expected: orderData.totalAmount,
                received: amount
            });
            return;
        }

        // 아임포트(포트원) API 키 설정
        // 환경 변수에서 API 키 가져오기 (Firebase Functions 설정에서 설정 필요)
        const IMP_API_KEY = functions.config().imp?.api_key || process.env.IMP_API_KEY || 'channel-key-52cc4618-9f19-4d43-99e6-c6d3229f6533';
        const IMP_API_SECRET = functions.config().imp?.api_secret || process.env.IMP_API_SECRET;
        
        // 포트원 웹훅 시크릿 키 (웹훅 검증용)
        const WEBHOOK_SECRET = functions.config().portone?.webhook_secret || process.env.PORTONE_WEBHOOK_SECRET;
        
        if (!IMP_API_KEY || !IMP_API_SECRET) {
            console.error('IMP_API_KEY or IMP_API_SECRET is not configured');
            res.status(500).json({ error: 'Server configuration error: IMP_API_KEY and IMP_API_SECRET required' });
            return;
        }

        // 1. 아임포트 Access Token 발급
        const tokenResponse = await axios.post(
            'https://api.iamport.kr/users/getToken',
            {
                imp_key: IMP_API_KEY,
                imp_secret: IMP_API_SECRET
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!tokenResponse.data.response || !tokenResponse.data.response.access_token) {
            res.status(500).json({ 
                error: 'Failed to get access token',
                details: tokenResponse.data 
            });
            return;
        }

        const accessToken = tokenResponse.data.response.access_token;

        // 2. 아임포트 결제 정보 조회 및 검증
        const paymentResponse = await axios.get(
            `https://api.iamport.kr/payments/${imp_uid}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const paymentInfo = paymentResponse.data.response;

        if (!paymentInfo) {
            res.status(404).json({ error: 'Payment information not found' });
            return;
        }

        // 주문번호 검증
        if (paymentInfo.merchant_uid !== merchant_uid) {
            res.status(400).json({
                error: 'Merchant UID mismatch',
                expected: merchant_uid,
                received: paymentInfo.merchant_uid
            });
            return;
        }

        // 금액 검증
        if (Number(paymentInfo.amount) !== amount) {
            res.status(400).json({
                error: 'Amount mismatch',
                expected: amount,
                received: paymentInfo.amount
            });
            return;
        }

        // 결제 상태 검증
        if (paymentInfo.status === 'paid') {
            // Firestore 주문 상태 업데이트
            await orderRef.update({
                status: 'paid',
                imp_uid: imp_uid,
                paymentData: paymentInfo,
                paidAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 성공 응답
            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                orderId: finalOrderId,
                merchant_uid: merchant_uid,
                imp_uid: imp_uid,
                amount: amount,
                paymentData: paymentInfo
            });
        } else {
            // 결제 상태가 paid가 아닌 경우
            res.status(400).json({
                error: 'Payment not completed',
                status: paymentInfo.status,
                paymentData: paymentInfo
            });
        }

    } catch (error) {
        console.error('Payment approval error:', error);

        // 아임포트 API 에러 처리
        if (error.response) {
            res.status(error.response.status).json({
                error: error.response.data?.message || 'Payment verification failed',
                details: error.response.data
            });
        } else {
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
});

/**
 * 주문 상태 조회 API (선택사항)
 * GET /getOrderStatus?orderId=xxx
 */
exports.getOrderStatus = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    try {
        const orderId = req.query.orderId;

        if (!orderId) {
            res.status(400).json({ error: 'orderId parameter is required' });
            return;
        }

        const orderDoc = await db.collection('ping_orders').doc(orderId).get();

        if (!orderDoc.exists) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const orderData = orderDoc.data();
        
        // 민감한 정보 제외하고 응답
        res.status(200).json({
            orderId: orderData.orderId,
            status: orderData.status,
            totalAmount: orderData.totalAmount,
            count: orderData.count,
            createdAt: orderData.createdAt,
            paidAt: orderData.paidAt || null
        });

    } catch (error) {
        console.error('Get order status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * 포트원 웹훅 핸들러
 * 
 * 포트원 관리자 콘솔에서 웹훅 URL로 설정:
 * https://REGION-PROJECT_ID.cloudfunctions.net/webhookHandler
 * 
 * 웹훅 이벤트:
 * - payment.succeeded: 결제 성공
 * - payment.failed: 결제 실패
 * - payment.cancelled: 결제 취소
 */
exports.webhookHandler = functions.https.onRequest(async (req, res) => {
    // CORS 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-portone-signature');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // 웹훅 시크릿 키 가져오기
        const WEBHOOK_SECRET = functions.config().portone?.webhook_secret || process.env.PORTONE_WEBHOOK_SECRET;
        
        if (!WEBHOOK_SECRET) {
            console.error('PORTONE_WEBHOOK_SECRET is not configured');
            res.status(500).json({ error: 'Webhook secret not configured' });
            return;
        }

        // 웹훅 서명 검증
        const signature = req.headers['x-portone-signature'];
        if (!signature) {
            res.status(401).json({ error: 'Missing signature' });
            return;
        }

        const payload = JSON.stringify(req.body);
        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        const digest = hmac.update(payload).digest('hex');
        
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        // 웹훅 이벤트 처리
        const event = req.body;
        console.log('Webhook event received:', event.type, event.data);

        // 이벤트 타입에 따른 처리
        switch (event.type) {
            case 'payment.succeeded':
                // 결제 성공 처리
                const paymentId = event.data.paymentId || event.data.id;
                const orderId = event.data.orderId || event.data.merchant_uid;
                
                // Firestore 주문 상태 업데이트
                if (orderId) {
                    const orderRef = db.collection('ping_orders').doc(orderId);
                    await orderRef.update({
                        status: 'paid',
                        paidAt: admin.firestore.FieldValue.serverTimestamp(),
                        webhookData: event.data
                    });
                    console.log('Order updated:', orderId);
                    
                    // 문자 발송 자동화 트리거
                    try {
                        const smsService = require('./sms-service');
                        const smsConfig = {
                            service: functions.config().sms?.service || process.env.SMS_SERVICE || 'aligo',
                            apiKey: functions.config().sms?.api_key || process.env.SMS_API_KEY,
                            userId: functions.config().sms?.user_id || process.env.SMS_USER_ID,
                            sender: functions.config().sms?.sender || process.env.SMS_SENDER,
                            senderKey: functions.config().sms?.sender_key || process.env.SMS_SENDER_KEY,
                            testMode: functions.config().sms?.test_mode || process.env.SMS_TEST_MODE || 'N'
                        };
                        
                        if (smsConfig.apiKey && smsConfig.userId) {
                            console.log('SMS 자동 발송 시작:', orderId);
                            const smsResult = await smsService.sendSMSAutomation(orderId, smsConfig);
                            console.log('SMS 발송 결과:', smsResult);
                        } else {
                            console.warn('SMS 설정이 없어 자동 발송을 건너뜁니다.');
                        }
                    } catch (smsError) {
                        console.error('SMS 자동 발송 오류:', smsError);
                        // SMS 오류는 주문 상태에 영향을 주지 않음
                    }
                }
                break;

            case 'payment.failed':
            case 'payment.cancelled':
                // 결제 실패/취소 처리
                const failedOrderId = event.data.orderId || event.data.merchant_uid;
                if (failedOrderId) {
                    const orderRef = db.collection('ping_orders').doc(failedOrderId);
                    await orderRef.update({
                        status: 'cancelled',
                        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                        webhookData: event.data
                    });
                    console.log('Order cancelled:', failedOrderId);
                }
                break;

            default:
                console.log('Unhandled webhook event type:', event.type);
        }

        // 웹훅 처리 성공 응답
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

