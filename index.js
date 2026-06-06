const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');
const { parseStringPromise } = require('xml2js');

admin.initializeApp();

const db = admin.firestore();
const smsService = require('./sms-service');
const sendCouponApi = require('./send-coupon-api');
const bugoImport = require('./bugo-import');
const {
    FUNERAL_API_ENDPOINT,
    getFuneralApiServiceKey,
} = require('./funeral-odms-config');

function setCors(res, methods = 'GET, OPTIONS', headers = 'Content-Type') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', methods);
    res.set('Access-Control-Allow-Headers', headers);
}

function normalizePhoneNumber(value) {
    return String(value || '').replace(/[^0-9]/g, '');
}

function formatDateTimeText(data, prefix) {
    const date = data?.[`${prefix}Date`] || '';
    const hour = data?.[`${prefix}Hour`] || '';
    const minute = data?.[`${prefix}Minute`] || '';

    if (!date) {
        return '';
    }

    const timeParts = [];
    if (hour) timeParts.push(`${hour}시`);
    if (minute) timeParts.push(`${minute}분`);

    return `${date}${timeParts.length ? ` ${timeParts.join(' ')}` : ''}`;
}

function getFamilyNotificationLabel(status) {
    const labels = {
        sent: '발송 완료',
        failed: '발송 실패',
        skipped: '발송 건너뜀',
        requires_kakao_config: '카카오 연동 필요',
        requires_sms_config: '문자 연동 필요',
        saved_only: '저장 완료'
    };

    return labels[status] || '확인 필요';
}

function createObituaryToken() {
    return crypto.randomBytes(16).toString('hex');
}

function serializeTimestamp(value) {
    if (!value) {
        return null;
    }

    if (typeof value.toDate === 'function') {
        return value.toDate().toISOString();
    }

    return value;
}

function getConfigValue(getter, fallback) {
    try {
        const value = getter();
        return value === undefined ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

function getObituaryAppBaseUrl(req) {
    const configuredBaseUrl = getConfigValue(() => functions.config().app.base_url, '') || process.env.APP_BASE_URL;
    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/$/, '');
    }

    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';

    if (host) {
        return `${protocol}://${host}`.replace(/\/$/, '');
    }

    const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        admin.app().options.projectId ||
        'ping-3a510';

    return `https://${projectId}.web.app`;
}

function buildObituaryLinks(req, obituaryData) {
    const baseUrl = getObituaryAppBaseUrl(req);
    const obituaryId = obituaryData.obituaryId || '';
    const reviewToken = obituaryData.reviewToken || '';
    const publicToken = obituaryData.publicToken || '';
    const sendUrl =
        obituaryId && reviewToken
            ? `${baseUrl}/obituary/send/${obituaryId}?token=${reviewToken}`
            : '';
    const salesUrl =
        obituaryId && reviewToken
            ? `${baseUrl}/obituary/sales?bugoCode=${encodeURIComponent(obituaryId)}&token=${encodeURIComponent(reviewToken)}`
            : '';
    const mortuaryUrl =
        obituaryId && reviewToken
            ? `${baseUrl}/obituary/mortuary/${encodeURIComponent(obituaryId)}?token=${encodeURIComponent(reviewToken)}`
            : '';

    return {
        reviewUrl: `${baseUrl}/obituary/review?mode=family&token=${encodeURIComponent(reviewToken)}`,
        publicUrl: `${baseUrl}/obituary/public?token=${encodeURIComponent(publicToken)}`,
        sendUrl: sendUrl || null,
        salesUrl: salesUrl || null,
        mortuaryUrl: mortuaryUrl || null
    };
}

function buildObituaryViewModel(obituaryData) {
    return {
        deceasedName: obituaryData.deceasedName || '',
        gender: obituaryData.gender || '',
        age: obituaryData.age || '',
        ageUnit: obituaryData.ageUnit || '',
        exposeGender: obituaryData.exposeGender || false,
        hideAge: obituaryData.hideAge || false,
        funeralHall: obituaryData.funeralHall || obituaryData.funeralSearch || '',
        funeralRoom: obituaryData.funeralRoom || '',
        deathDate: obituaryData.deathDate || '',
        deathHour: obituaryData.deathHour || '',
        deathMinute: obituaryData.deathMinute || '',
        entryDate: obituaryData.entryDate || '',
        entryHour: obituaryData.entryHour || '',
        entryMinute: obituaryData.entryMinute || '',
        viewingDate: obituaryData.viewingDate || '',
        viewingHour: obituaryData.viewingHour || '',
        viewingMinute: obituaryData.viewingMinute || '',
        departureDate: obituaryData.departureDate || '',
        departureHour: obituaryData.departureHour || '',
        departureMinute: obituaryData.departureMinute || '',
        burialPlace: obituaryData.burialPlace || obituaryData.burialPlaceDirect || '',
        bankName: obituaryData.bankName || '',
        accountNumber: obituaryData.accountNumber || '',
        accountHolder: obituaryData.accountHolder || '',
        accountInfo: obituaryData.accountInfo || '',
        hideAccountLastDigits: obituaryData.hideAccountLastDigits || false,
        mournerMessageText: obituaryData.mournerMessageText || '',
        notificationMessageText: obituaryData.notificationMessageText || '',
        hideMournerContact: obituaryData.hideMournerContact || false,
        designType: obituaryData.designType || 'general',
        mourners: Array.isArray(obituaryData.mourners) ? obituaryData.mourners : []
    };
}

function buildObituaryResponse(obituaryData, req, mode = 'family') {
    const links = buildObituaryLinks(req, obituaryData);
    const canViewFull = mode === 'family' || obituaryData.status === 'published';
    const exposeFamilyData = mode !== 'public';

    return {
        success: true,
        obituaryId: obituaryData.obituaryId,
        status: obituaryData.status,
        statusLabel: obituaryData.statusLabel,
        previewUrl: links.reviewUrl,
        reviewUrl: links.reviewUrl,
        publicUrl: links.publicUrl,
        sendUrl: exposeFamilyData ? links.sendUrl : null,
        salesUrl: exposeFamilyData ? links.salesUrl : null,
        mortuaryUrl: exposeFamilyData ? links.mortuaryUrl : null,
        canViewFull,
        notice: canViewFull ? '' : '유가족 확인 후 공개되는 부고입니다.',
        familyPrimaryContact: exposeFamilyData ? obituaryData.familyPrimaryContact || null : null,
        familyNotification: exposeFamilyData ? obituaryData.familyNotification || null : null,
        approvedAt: serializeTimestamp(obituaryData.approvedAt),
        createdAt: serializeTimestamp(obituaryData.createdAt),
        updatedAt: serializeTimestamp(obituaryData.updatedAt),
        obituary: canViewFull ? buildObituaryViewModel(obituaryData) : null
    };
}

function buildFamilyNotificationMessage(obituaryData, obituaryId) {
    const deceasedName = obituaryData.deceasedName || '고인';
    const funeralHall = obituaryData.funeralHall || '장례식장 미정';
    const departureDateTime = formatDateTimeText(obituaryData, 'departure') || '미정';
    const reviewLine = obituaryData.reviewUrl ? `\n확인 링크: ${obituaryData.reviewUrl}` : '';

    return `[PING] 부고 초안이 등록되었습니다.\n고인: ${deceasedName}\n장례식장: ${funeralHall}\n발인: ${departureDateTime}\n초안 ID: ${obituaryId}${reviewLine}\n확인 후 가족 발송을 진행해주세요.`;
}

async function notifyFamilyFirst(obituaryData, obituaryId) {
    const familyPrimaryContact = obituaryData.familyPrimaryContact || {};
    const channel = familyPrimaryContact.channel === 'sms' ? 'sms' : 'kakao';
    const recipientPhone = normalizePhoneNumber(familyPrimaryContact.phone);

    if (!recipientPhone) {
        return {
            channel,
            status: 'skipped',
            statusLabel: getFamilyNotificationLabel('skipped'),
            message: '대표 유가족 연락처가 없어 최초 안내를 보내지 않았습니다.'
        };
    }

    const defaultMessage = buildFamilyNotificationMessage(obituaryData, obituaryId);

    try {
        if (channel === 'kakao') {
            const kakaoConfig = {
                service: 'kakao',
                apiKey: getConfigValue(() => functions.config().kakao.api_key, '') || getConfigValue(() => functions.config().sms.api_key, '') || process.env.KAKAO_API_KEY || process.env.SMS_API_KEY,
                apiSecret: getConfigValue(() => functions.config().kakao.user_id, '') || getConfigValue(() => functions.config().sms.user_id, '') || process.env.KAKAO_USER_ID || process.env.SMS_USER_ID,
                senderKey: getConfigValue(() => functions.config().kakao.sender_key, '') || getConfigValue(() => functions.config().sms.sender_key, '') || process.env.KAKAO_SENDER_KEY || process.env.SMS_SENDER_KEY,
                testMode: getConfigValue(() => functions.config().kakao.test_mode, '') || getConfigValue(() => functions.config().sms.test_mode, '') || process.env.KAKAO_TEST_MODE || process.env.SMS_TEST_MODE || 'N'
            };
            const templateCode = getConfigValue(() => functions.config().obituary.family_template_code, '') || process.env.OBITUARY_FAMILY_TEMPLATE_CODE;

            if (!kakaoConfig.apiKey || !kakaoConfig.apiSecret || !kakaoConfig.senderKey || !templateCode) {
                return {
                    channel,
                    status: 'requires_kakao_config',
                    statusLabel: getFamilyNotificationLabel('requires_kakao_config'),
                    message: '카카오 알림톡 설정이 없어 초안만 저장했습니다.'
                };
            }

            const result = await smsService.sendKakaoTalk(
                kakaoConfig,
                [recipientPhone],
                templateCode,
                {
                    recipientName: familyPrimaryContact.name || '유가족',
                    deceasedName: obituaryData.deceasedName || '고인',
                    funeralHall: obituaryData.funeralHall || '장례식장 미정',
                    departureDateTime: formatDateTimeText(obituaryData, 'departure') || '미정',
                    obituaryId,
                    reviewUrl: obituaryData.reviewUrl || '',
                    message: defaultMessage
                }
            );

            if (result.success) {
                return {
                    channel,
                    status: 'sent',
                    statusLabel: getFamilyNotificationLabel('sent'),
                    message: '대표 유가족에게 카카오 알림톡을 보냈습니다.',
                    providerResult: result
                };
            }

            return {
                channel,
                status: 'failed',
                statusLabel: getFamilyNotificationLabel('failed'),
                message: result.error || '카카오 알림톡 발송에 실패했습니다.',
                providerResult: result
            };
        }

        const smsConfig = {
            service: 'aligo',
            apiKey: getConfigValue(() => functions.config().sms.api_key, '') || process.env.SMS_API_KEY,
            userId: getConfigValue(() => functions.config().sms.user_id, '') || process.env.SMS_USER_ID,
            sender: getConfigValue(() => functions.config().sms.sender, '') || process.env.SMS_SENDER,
            testMode: getConfigValue(() => functions.config().sms.test_mode, '') || process.env.SMS_TEST_MODE || 'N'
        };

        if (!smsConfig.apiKey || !smsConfig.userId || !smsConfig.sender) {
            return {
                channel,
                status: 'requires_sms_config',
                statusLabel: getFamilyNotificationLabel('requires_sms_config'),
                message: '문자 발송 설정이 없어 초안만 저장했습니다.'
            };
        }

        const result = await smsService.sendAligoSMS(smsConfig, [recipientPhone], defaultMessage);

        if (result.success) {
            return {
                channel,
                status: 'sent',
                statusLabel: getFamilyNotificationLabel('sent'),
                message: '대표 유가족에게 안내 문자를 보냈습니다.',
                providerResult: result
            };
        }

        return {
            channel,
            status: 'failed',
            statusLabel: getFamilyNotificationLabel('failed'),
            message: result.error || '문자 발송에 실패했습니다.',
            providerResult: result
        };
    } catch (error) {
        console.error('notifyFamilyFirst error:', error);
        return {
            channel,
            status: 'failed',
            statusLabel: getFamilyNotificationLabel('failed'),
            message: error.message || '대표 유가족 안내 중 오류가 발생했습니다.'
        };
    }
}

function parseFuneralHallItems(result) {
    const body = result?.response?.body?.[0] || result?.body?.[0] || {};
    const itemsData = body?.items?.[0]?.item || [];
    const items = Array.isArray(itemsData) ? itemsData : [itemsData];

    return items
        .filter(Boolean)
        .map(item => ({
            name:
                item?.fcltNm?.[0] ||
                item?.facltNm?.[0] ||
                item?.facilityName?.[0] ||
                item?.funeralHallName?.[0] ||
                item?.funeralHallNm?.[0] ||
                item?.name?.[0] ||
                '',
            address:
                item?.rdnmadr?.[0] ||
                item?.lnmadr?.[0] ||
                item?.address?.[0] ||
                item?.addr?.[0] ||
                '',
            phone:
                item?.telno?.[0] ||
                item?.phone?.[0] ||
                item?.tel?.[0] ||
                ''
        }))
        .map(item => ({
            name: item.name.trim(),
            address: item.address.trim(),
            phone: item.phone.trim()
        }))
        .filter(item => item.name);
}

let globalFuneralHallsCache = null;

async function fetchAllFuneralHallsFromAPI() {
    console.log('Firebase: Fetching ALL funeral halls from public API into memory cache...');
    const allHalls = [];
    const maxPages = 4;
    const numOfRows = 500;

    for(let pageNo = 1; pageNo <= maxPages; pageNo++) {
        const apiUrl = `${FUNERAL_API_ENDPOINT}?serviceKey=${encodeURIComponent(getFuneralApiServiceKey())}&pageNo=${pageNo}&numOfRows=${numOfRows}&apiType=JSON`;
        try {
            const response = await axios.get(apiUrl, { headers: { Accept: 'application/json' }, timeout: 10000 });
            const itemsData = response.data?.items;
            
            if (!itemsData || itemsData.length === 0) break;
            
            const items = Array.isArray(itemsData) ? itemsData : [itemsData];
            const parsedItems = items.filter(Boolean).map(item => ({
                name:
                    item?.fcltNm ||
                    item?.facltNm ||
                    item?.facilityName ||
                    item?.funeralHallName ||
                    item?.funeralHallNm ||
                    item?.name ||
                    '',
                address:
                    item?.rdnmadr ||
                    item?.lnmadr ||
                    item?.address ||
                    item?.addr ||
                    '',
                phone:
                    item?.telno ||
                    item?.phone ||
                    item?.tel ||
                    ''
            })).map(item => ({
                name: String(item.name).trim(),
                address: String(item.address).trim(),
                phone: String(item.phone).trim()
            })).filter(item => item.name);
            
            allHalls.push(...parsedItems);
        } catch (error) {
            console.error(`Error fetching page ${pageNo}:`, error.message);
            break;
        }
    }
    
    const uniqueHalls = Array.from(new Map(allHalls.map(item => [item.name + item.address, item])).values());
    console.log(`Firebase Cache populated strictly with ${uniqueHalls.length} funeral halls.`);
    return uniqueHalls;
}

// 명시적으로 실행 환경(Firebase Cold Start)을 고려하여 별도로 예약 실행
fetchAllFuneralHallsFromAPI().then(halls => {
    globalFuneralHallsCache = halls;
}).catch(console.error);

async function getFuneralHalls(searchQuery = '') {
    if (!globalFuneralHallsCache || globalFuneralHallsCache.length === 0) {
        globalFuneralHallsCache = await fetchAllFuneralHallsFromAPI();
    }
    
    if (!searchQuery || searchQuery.length < 2) {
        return globalFuneralHallsCache.slice(0, 50); // 안전을 위해 50개 제한
    }

    const lowered = searchQuery.toLowerCase();
    const results = globalFuneralHallsCache.filter(item =>
        item.name.toLowerCase().includes(lowered) ||
        item.address.toLowerCase().includes(lowered)
    );
    return results.slice(0, 100);
}

async function findObituaryByToken(token, mode = 'family') {
    const tokenField = mode === 'public' ? 'publicToken' : 'reviewToken';
    const snapshot = await db.collection('obituaries').where(tokenField, '==', token).limit(1).get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return {
        ref: doc.ref,
        data: {
            obituaryId: doc.id,
            ...doc.data()
        }
    };
}

async function verifyObituaryBugoAccess(bugoCode, token) {
    const id = String(bugoCode || '').trim();
    const t = String(token || '').trim();
    if (!id || !t) {
        return null;
    }

    let entry = await findObituaryByToken(t, 'family');
    if (entry && entry.data.obituaryId === id) {
        return { ...entry, access: 'family' };
    }

    entry = await findObituaryByToken(t, 'public');
    if (entry && entry.data.obituaryId === id) {
        return { ...entry, access: 'public' };
    }

    return null;
}

function getMortuaryMessageTemplates() {
    return {
        during: [
            {
                id: 'd_thanks',
                label: '조문 감사',
                body: '바쁘신 와중 빈소를 찾아 주시고 위로의 말씀 전해 주셔서 진심으로 감사드립니다. 장례 진행 중 연락이 늦을 수 있어 양해 부탁드립니다.'
            },
            {
                id: 'd_guide',
                label: '빈소·동선 안내',
                body: '빈소 위치 및 주차 안내는 장례식장 로비 데스크에서 도와드리고 있습니다. 문의사항은 상주에게 부탁드립니다.'
            },
            {
                id: 'd_meal',
                label: '식사 안내',
                body: '근조 식사가 준비되어 있사오니 안내에 따라 편히 이용해 주시면 감사하겠습니다.'
            }
        ],
        after: [
            {
                id: 'a_thanks',
                label: '장례 후 감사',
                body: '장례 기간 동안 깊은 위로와 도움을 주신 모든 분께 진심으로 감사드립니다. 덕분에 마지막을 잘 모실 수 있었습니다.'
            },
            {
                id: 'a_followup',
                label: '추후 인사',
                body: '감사 인사와 정리된 내용은 순차적으로 연락드리겠습니다. 너그러이 양해 부탁드립니다.'
            },
            {
                id: 'a_memorial',
                label: '추모 부탁',
                body: '故인을 기리는 마음으로 조용한 추모 부탁드리며, 추후 기일·제사 일정은 상주를 통해 안내드리겠습니다.'
            }
        ]
    };
}

function resolveMortuaryMessageBody(phase, templateId, customBody) {
    const trimmedCustom = String(customBody || '').trim();
    if (trimmedCustom) {
        return trimmedCustom;
    }
    const tid = String(templateId || '').trim();
    if (!tid) {
        return '';
    }
    const tpl = getMortuaryMessageTemplates();
    const list = phase === 'after' ? tpl.after : tpl.during;
    const found = list.find(t => t.id === tid);
    return found ? found.body : '';
}

function getWebhookSecret() {
    return getConfigValue(() => functions.config().portone.webhook_secret, '') || process.env.PORTONE_WEBHOOK_SECRET;
}

function getImpCredentials() {
    return {
        apiKey: getConfigValue(() => functions.config().imp.api_key, '') || process.env.IMP_API_KEY,
        apiSecret: getConfigValue(() => functions.config().imp.api_secret, '') || process.env.IMP_API_SECRET
    };
}

function getPortOneApiSecret() {
    return getConfigValue(() => functions.config().portone.api_secret, '') || process.env.PORTONE_API_SECRET;
}

function createHttpError(statusCode, message, details = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
}

async function getImpAccessToken() {
    const credentials = getImpCredentials();
    if (!credentials.apiKey || !credentials.apiSecret) {
        throw createHttpError(500, 'Server configuration error: IMP_API_KEY and IMP_API_SECRET required');
    }

    const tokenResponse = await axios.post(
        'https://api.iamport.kr/users/getToken',
        {
            imp_key: credentials.apiKey,
            imp_secret: credentials.apiSecret
        },
        {
            headers: { 'Content-Type': 'application/json' }
        }
    );

    const accessToken = tokenResponse.data?.response?.access_token;
    if (!accessToken) {
        throw createHttpError(500, 'Failed to get access token', tokenResponse.data);
    }

    return accessToken;
}

async function fetchImpPayment({ impUid, merchantUid }) {
    const accessToken = await getImpAccessToken();
    const requestUrl = impUid
        ? `https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`
        : `https://api.iamport.kr/payments/find/${encodeURIComponent(merchantUid)}/paid`;

    const paymentResponse = await axios.get(requestUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    const paymentInfo = paymentResponse.data?.response;
    if (!paymentInfo) {
        throw createHttpError(404, 'Payment information not found');
    }

    return paymentInfo;
}

async function fetchPortOnePayment(paymentId) {
    const apiSecret = getPortOneApiSecret();
    if (!apiSecret) {
        throw createHttpError(500, 'Server configuration error: PORTONE_API_SECRET required');
    }

    const paymentResponse = await axios.get(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
        headers: {
            Authorization: `PortOne ${apiSecret}`,
            'Content-Type': 'application/json'
        }
    });

    return paymentResponse.data?.payment || paymentResponse.data?.response || paymentResponse.data;
}

exports.approvePayment = functions.https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { paymentId, imp_uid, merchant_uid, orderId, amount } = req.body || {};
        const finalOrderId = String(orderId || merchant_uid || paymentId || '').trim();

        if (!finalOrderId) {
            res.status(400).json({ error: 'Missing required parameters: paymentId, merchant_uid, or orderId' });
            return;
        }

        const orderRef = db.collection('ping_orders').doc(finalOrderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const orderData = orderDoc.data();
        if (orderData.status === 'paid') {
            res.status(200).json({
                success: true,
                message: 'Order already paid',
                orderId: finalOrderId,
                paymentId: orderData.paymentId || paymentId || null,
                merchant_uid: orderData.merchant_uid || merchant_uid || finalOrderId,
                imp_uid: orderData.imp_uid || imp_uid || null,
                amount: Number(orderData.totalAmount || amount || 0),
                paymentData: orderData.paymentData || null
            });
            return;
        }

        const expectedAmount = Number(orderData.totalAmount);
        const requestedAmount = amount === undefined || amount === null ? expectedAmount : Number(amount);

        if (!Number.isFinite(requestedAmount)) {
            res.status(400).json({ error: 'amount parameter is required' });
            return;
        }

        if (expectedAmount !== requestedAmount) {
            res.status(400).json({
                error: 'Amount mismatch',
                expected: expectedAmount,
                received: requestedAmount
            });
            return;
        }

        let approvedPaymentId = paymentId || null;
        let approvedImpUid = imp_uid || null;
        let approvedMerchantUid = merchant_uid || finalOrderId;
        let paymentData = null;

        if (paymentId) {
            paymentData = await fetchPortOnePayment(paymentId);

            const paymentStatus = String(paymentData?.status || '').toUpperCase();
            const paidAmount = Number(paymentData?.amount?.total ?? paymentData?.amount ?? 0);

            if (paymentStatus !== 'PAID') {
                res.status(400).json({
                    error: 'Payment not completed',
                    status: paymentData?.status || null,
                    paymentData
                });
                return;
            }

            if (paidAmount !== requestedAmount) {
                res.status(400).json({
                    error: 'Amount mismatch',
                    expected: requestedAmount,
                    received: paidAmount
                });
                return;
            }
        } else {
            if (!merchant_uid && !imp_uid) {
                res.status(400).json({ error: 'Missing required parameters: paymentId or merchant_uid/imp_uid' });
                return;
            }

            paymentData = await fetchImpPayment({
                impUid: imp_uid,
                merchantUid: merchant_uid || finalOrderId
            });

            approvedImpUid = paymentData.imp_uid || approvedImpUid;
            approvedMerchantUid = paymentData.merchant_uid || approvedMerchantUid;

            if (approvedMerchantUid !== (merchant_uid || finalOrderId)) {
                res.status(400).json({
                    error: 'Merchant UID mismatch',
                    expected: merchant_uid || finalOrderId,
                    received: approvedMerchantUid
                });
                return;
            }

            if (Number(paymentData.amount) !== requestedAmount) {
                res.status(400).json({
                    error: 'Amount mismatch',
                    expected: requestedAmount,
                    received: paymentData.amount
                });
                return;
            }

            if (String(paymentData.status || '').toLowerCase() !== 'paid') {
                res.status(400).json({
                    error: 'Payment not completed',
                    status: paymentData.status,
                    paymentData
                });
                return;
            }
        }

        const linkedBugo = String(req.body?.obituaryId || req.body?.bugoCode || orderData.obituaryId || '').trim();

        await orderRef.set(
            {
                status: 'paid',
                paymentId: approvedPaymentId,
                merchant_uid: approvedMerchantUid,
                imp_uid: approvedImpUid,
                paymentData,
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                ...(linkedBugo ? { obituaryId: linkedBugo } : {}),
                ...(req.body?.productTitle || req.body?.saleTitle
                    ? {
                          productTitle: String(req.body.productTitle || req.body.saleTitle).trim()
                      }
                    : {})
            },
            { merge: true }
        );

        if (linkedBugo) {
            const saleDocId = `${linkedBugo}_${finalOrderId}`;
            await db
                .collection('ping_obituary_sales')
                .doc(saleDocId)
                .set(
                    {
                        obituaryId: linkedBugo,
                        kind: 'payment',
                        orderId: finalOrderId,
                        title: orderData.productTitle || req.body?.productTitle || req.body?.saleTitle || '온라인 결제',
                        amount: requestedAmount,
                        quantity: Number(orderData.count) || 1,
                        status: 'paid',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        paidAt: admin.firestore.FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            orderId: finalOrderId,
            paymentId: approvedPaymentId,
            merchant_uid: approvedMerchantUid,
            imp_uid: approvedImpUid,
            amount: requestedAmount,
            paymentData
        });
    } catch (error) {
        console.error('approvePayment error:', error);
        if (error.statusCode) {
            res.status(error.statusCode).json({
                error: error.message,
                details: error.details || null
            });
            return;
        }

        if (error.response) {
            res.status(error.response.status).json({
                error: error.response.data?.message || 'Payment verification failed',
                details: error.response.data
            });
            return;
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

exports.getOrderStatus = functions.https.onRequest(async (req, res) => {
    setCors(res, 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const orderId = String(req.query.orderId || '').trim();
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
        res.status(200).json({
            orderId: orderData.orderId || orderId,
            status: orderData.status,
            totalAmount: orderData.totalAmount,
            count: orderData.count,
            createdAt: serializeTimestamp(orderData.createdAt),
            paidAt: serializeTimestamp(orderData.paidAt)
        });
    } catch (error) {
        console.error('getOrderStatus error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.createObituaryDraft = functions.https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const payload = req.body || {};
        const familyPrimaryContact = {
            name: String(payload.familyPrimaryContact?.name || payload.familyRecipientName || '').trim(),
            phone: normalizePhoneNumber(payload.familyPrimaryContact?.phone || payload.familyRecipientPhone || ''),
            channel: payload.familyPrimaryContact?.channel === 'sms' ? 'sms' : 'kakao'
        };

        if (!familyPrimaryContact.name || !familyPrimaryContact.phone) {
            res.status(400).json({ error: '대표 유가족 이름과 연락처를 입력해주세요.' });
            return;
        }

        const obituaryRef = db.collection('obituaries').doc();
        const obituaryId = obituaryRef.id;
        const reviewToken = createObituaryToken();
        const publicToken = createObituaryToken();
        const links = buildObituaryLinks(req, { obituaryId, reviewToken, publicToken });
        const familyNotification = payload.notifyFamilyFirst === false
            ? {
                channel: familyPrimaryContact.channel,
                status: 'saved_only',
                statusLabel: getFamilyNotificationLabel('saved_only'),
                message: '초안만 저장하고 최초 안내는 보내지 않았습니다.'
            }
            : await notifyFamilyFirst(
                {
                    ...payload,
                    familyPrimaryContact,
                    reviewUrl: links.reviewUrl,
                    publicUrl: links.publicUrl
                },
                obituaryId
            );

        await obituaryRef.set({
            ...payload,
            obituaryId,
            reviewToken,
            publicToken,
            familyPrimaryContact,
            mourners: Array.isArray(payload.mourners) ? payload.mourners : [],
            familyNotification,
            status: 'family_review_pending',
            statusLabel: '가족 확인 대기',
            approvedAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const savedSnapshot = await obituaryRef.get();
        res.status(200).json(
            buildObituaryResponse(
                {
                    obituaryId,
                    ...savedSnapshot.data()
                },
                req,
                'family'
            )
        );
    } catch (error) {
        console.error('createObituaryDraft error:', error);
        res.status(500).json({
            error: '부고 초안 저장 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

exports.getObituaryEntry = functions.https.onRequest(async (req, res) => {
    setCors(res, 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const token = String(req.query.token || '').trim();
        const mode = req.query.mode === 'public' ? 'public' : 'family';

        if (!token) {
            res.status(400).json({ error: '확인 토큰이 필요합니다.' });
            return;
        }

        const obituaryEntry = await findObituaryByToken(token, mode);
        if (!obituaryEntry) {
            res.status(404).json({ error: '부고 초안을 찾을 수 없습니다.' });
            return;
        }

        res.status(200).json(buildObituaryResponse(obituaryEntry.data, req, mode));
    } catch (error) {
        console.error('getObituaryEntry error:', error);
        res.status(500).json({
            error: '부고 정보를 불러오지 못했습니다.',
            message: error.message
        });
    }
});

exports.getObituarySales = functions.https.onRequest(async (req, res) => {
    setCors(res, 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const bugoCode = String(req.query.bugoCode || req.query.obituaryId || '').trim();
        const token = String(req.query.token || '').trim();
        const verified = await verifyObituaryBugoAccess(bugoCode, token);

        if (!verified) {
            res.status(403).json({ error: '접근 권한이 없습니다. 부고 코드와 링크 토큰을 확인해주세요.' });
            return;
        }

        const snapshot = await db.collection('ping_obituary_sales').where('obituaryId', '==', bugoCode).get();

        const items = snapshot.docs
            .map(doc => ({
                ...doc.data(),
                saleId: doc.id
            }))
            .map(row => ({
                ...row,
                createdAt: serializeTimestamp(row.createdAt),
                paidAt: serializeTimestamp(row.paidAt)
            }))
            .sort((a, b) => String(b.paidAt || b.createdAt || '').localeCompare(String(a.paidAt || a.createdAt || '')));

        const totalAmount = items.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

        res.status(200).json({
            success: true,
            obituaryId: bugoCode,
            access: verified.access,
            canManage: verified.access === 'family',
            deceasedName: verified.data.deceasedName || '',
            statusLabel: verified.data.statusLabel || '',
            summary: {
                totalAmount,
                saleCount: items.length,
                paymentLinkedCount: items.filter(s => s.kind === 'payment').length,
                manualCount: items.filter(s => s.kind === 'manual').length
            },
            items
        });
    } catch (error) {
        console.error('getObituarySales error:', error);
        res.status(500).json({
            error: '판매 내역을 불러오지 못했습니다.',
            message: error.message
        });
    }
});

exports.postObituarySale = functions.https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const bugoCode = String(req.body?.bugoCode || req.body?.obituaryId || '').trim();
        const token = String(req.body?.token || '').trim();
        const verified = await verifyObituaryBugoAccess(bugoCode, token);

        if (!verified || verified.access !== 'family') {
            res.status(403).json({ error: '내역 추가는 유가족 확인 링크(토큰)에서만 가능합니다.' });
            return;
        }

        const amount = Number(req.body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            res.status(400).json({ error: '금액을 올바르게 입력해주세요.' });
            return;
        }

        const title = String(req.body?.title || req.body?.productTitle || '장부 기록').trim() || '장부 기록';
        const payerName = String(req.body?.payerName || '').trim() || null;
        const note = String(req.body?.note || '').trim() || null;

        await db.collection('ping_obituary_sales').add({
            obituaryId: bugoCode,
            kind: 'manual',
            orderId: null,
            title,
            amount,
            quantity: 1,
            status: 'recorded',
            payerName,
            note,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paidAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ success: true, message: '내역이 추가되었습니다.' });
    } catch (error) {
        console.error('postObituarySale error:', error);
        res.status(500).json({
            error: '내역 추가 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

exports.getMortuaryMessages = functions.https.onRequest(async (req, res) => {
    setCors(res, 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    res.status(200).json({
        success: true,
        templates: getMortuaryMessageTemplates()
    });
});

exports.getMortuaryMessageLogs = functions.https.onRequest(async (req, res) => {
    setCors(res, 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const bugoCode = String(req.query.bugoCode || req.query.obituaryId || '').trim();
        const token = String(req.query.token || '').trim();
        const verified = await verifyObituaryBugoAccess(bugoCode, token);

        if (!verified || verified.access !== 'family') {
            res.status(403).json({ error: '발송 이력은 유가족 확인 링크로만 확인할 수 있습니다.' });
            return;
        }

        const snapshot = await db.collection('ping_mortuary_message_logs').where('obituaryId', '==', bugoCode).get();
        const logs = snapshot.docs
            .map(doc => ({
                ...doc.data(),
                logId: doc.id
            }))
            .map(row => ({
                ...row,
                createdAt: serializeTimestamp(row.createdAt)
            }))
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .slice(0, 50);

        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('getMortuaryMessageLogs error:', error);
        res.status(500).json({
            error: '이력을 불러오지 못했습니다.',
            message: error.message
        });
    }
});

exports.sendMortuaryMessage = functions.https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const bugoCode = String(req.body?.bugoCode || req.body?.obituaryId || '').trim();
        const token = String(req.body?.token || '').trim();
        const verified = await verifyObituaryBugoAccess(bugoCode, token);

        if (!verified || verified.access !== 'family') {
            res.status(403).json({ error: '메시지 발송은 유가족 확인 링크에서만 가능합니다.' });
            return;
        }

        const phase = String(req.body?.phase || '').toLowerCase() === 'after' ? 'after' : 'during';
        const templateId = String(req.body?.templateId || '').trim();
        const customBody = String(req.body?.customBody || '').trim();
        const messageBody = resolveMortuaryMessageBody(phase, templateId, customBody);

        if (!messageBody) {
            res.status(400).json({ error: '보낼 메시지를 선택하거나 직접 입력해주세요.' });
            return;
        }

        const mourners = Array.isArray(verified.data.mourners) ? verified.data.mourners : [];
        const sendToAll = req.body?.sendToAllMourners !== false;
        let selected = mourners;
        if (!sendToAll && Array.isArray(req.body?.mournerIndices)) {
            const idxSet = new Set(req.body.mournerIndices.map(n => Number(n)).filter(n => !Number.isNaN(n)));
            selected = mourners.filter((_, i) => idxSet.has(i));
        }

        if (!selected.length) {
            res.status(400).json({ error: '메시지를 보낼 상주를 선택해주세요.' });
            return;
        }

        const preview = messageBody.length > 120 ? `${messageBody.slice(0, 120)}…` : messageBody;
        const docRef = await db.collection('ping_mortuary_message_logs').add({
            obituaryId: bugoCode,
            phase,
            templateId: templateId || null,
            messagePreview: preview,
            recipientCount: selected.length,
            recipientNames: selected.map(m => m.name || '상주').slice(0, 20),
            status: 'demo_simulated',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({
            success: true,
            message: '요청이 접수되었습니다. 실제 카카오·문자 발송은 알림 연동 후 전송됩니다.',
            logId: docRef.id,
            phase,
            recipientCount: selected.length,
            demoMode: true
        });
    } catch (error) {
        console.error('sendMortuaryMessage error:', error);
        res.status(500).json({
            error: '메시지 처리 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

exports.approveObituaryEntry = functions.https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const token = String(req.body?.token || req.query.token || '').trim();
        if (!token) {
            res.status(400).json({ error: '확인 토큰이 필요합니다.' });
            return;
        }

        const obituaryEntry = await findObituaryByToken(token, 'family');
        if (!obituaryEntry) {
            res.status(404).json({ error: '부고 초안을 찾을 수 없습니다.' });
            return;
        }

        const approvedAt = obituaryEntry.data.approvedAt || admin.firestore.FieldValue.serverTimestamp();
        await obituaryEntry.ref.set(
            {
                status: 'published',
                statusLabel: '공개 완료',
                approvedAt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
        );

        const updatedSnapshot = await obituaryEntry.ref.get();
        res.status(200).json(
            buildObituaryResponse(
                {
                    obituaryId: updatedSnapshot.id,
                    ...updatedSnapshot.data()
                },
                req,
                'family'
            )
        );
    } catch (error) {
        console.error('approveObituaryEntry error:', error);
        res.status(500).json({
            error: '부고 승인 처리 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

exports.webhookHandler = functions.https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS', 'Content-Type, x-portone-signature');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const webhookSecret = getWebhookSecret();
        if (!webhookSecret) {
            res.status(500).json({ error: 'Webhook secret not configured' });
            return;
        }

        const signature = req.headers['x-portone-signature'];
        if (!signature) {
            res.status(401).json({ error: 'Missing signature' });
            return;
        }

        const payload = JSON.stringify(req.body || {});
        const digest = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
        if (signature.length !== digest.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        const event = req.body || {};
        switch (event.type) {
            case 'payment.succeeded': {
                const orderId = event.data?.orderId || event.data?.merchant_uid;
                if (orderId) {
                    const orderRef = db.collection('ping_orders').doc(orderId);
                    await orderRef.set(
                        {
                            status: 'paid',
                            paidAt: admin.firestore.FieldValue.serverTimestamp(),
                            webhookData: event.data
                        },
                        { merge: true }
                    );

                    try {
                        const smsConfig = {
                            service: getConfigValue(() => functions.config().sms.service, '') || process.env.SMS_SERVICE || 'aligo',
                            apiKey: getConfigValue(() => functions.config().sms.api_key, '') || process.env.SMS_API_KEY,
                            userId: getConfigValue(() => functions.config().sms.user_id, '') || process.env.SMS_USER_ID,
                            sender: getConfigValue(() => functions.config().sms.sender, '') || process.env.SMS_SENDER,
                            senderKey: getConfigValue(() => functions.config().sms.sender_key, '') || process.env.SMS_SENDER_KEY,
                            testMode: getConfigValue(() => functions.config().sms.test_mode, '') || process.env.SMS_TEST_MODE || 'N'
                        };

                        if (smsConfig.apiKey && smsConfig.userId) {
                            await smsService.sendSMSAutomation(orderId, smsConfig);
                        }
                    } catch (smsError) {
                        console.error('sendSMSAutomation error:', smsError);
                    }
                }
                break;
            }

            case 'payment.failed':
            case 'payment.cancelled': {
                const orderId = event.data?.orderId || event.data?.merchant_uid;
                if (orderId) {
                    await db.collection('ping_orders').doc(orderId).set(
                        {
                            status: 'cancelled',
                            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                            webhookData: event.data
                        },
                        { merge: true }
                    );
                }
                break;
            }

            default:
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('webhookHandler error:', error);
        res.status(500).json({ error: error.message });
    }
});

function getCouponAdminSecret() {
    return (
        getConfigValue(() => functions.config().coupon.admin_secret, '') ||
        process.env.PING_COUPON_ADMIN_SECRET ||
        ''
    );
}

const firestoreSendCouponHandlers = sendCouponApi.createFirestoreHandlers(db, admin, getCouponAdminSecret);

exports.sendCouponAdmin = functions.https.onRequest(async (req, res) => {
    await firestoreSendCouponHandlers.adminHandler(req, res);
});

exports.validateSendCoupon = functions.https.onRequest(async (req, res) => {
    await firestoreSendCouponHandlers.validateHandler(req, res);
});

exports.consumeSendCoupon = functions.https.onRequest(async (req, res) => {
    await firestoreSendCouponHandlers.consumeHandler(req, res);
});

exports.funeralHalls = functions.https.onRequest(async (req, res) => {
    setCors(res, 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const searchQuery = String(req.query.searchQuery || '').trim();
        const funeralHalls = await getFuneralHalls(searchQuery);

        res.status(200).json({
            success: true,
            data: funeralHalls,
            totalCount: funeralHalls.length
        });
    } catch (error) {
        console.error('funeralHalls error:', error);
        res.status(500).json({
            error: '장례식장 목록 호출에 실패했습니다.',
            message: error.message
        });
    }
});

/** Firebase Hosting `POST /api/import/bugo-funeral` — 로컬 server.js와 동일 부고 가져오기 핸들러 */
exports.importBugoFuneral = functions.https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const url = req.body && req.body.url;
        if (!url || typeof url !== 'string') {
            res.status(400).json({ ok: false, error: 'url이 필요합니다.' });
            return;
        }
        const result = await bugoImport.importFuneralPageFromUrl(url);
        res.status(200).json({
            ok: true,
            provider: result.provider || bugoImport.PROVIDER_ID,
            url: result.url,
            parsed: result.parsed,
            messageBody: result.messageBody,
            messageBodyTemplate2: result.messageBodyTemplate2
        });
    } catch (e) {
        console.warn('부고 가져오기(bugo):', e && e.message ? e.message : e);
        res.status(400).json({
            ok: false,
            error: (e && e.message) || '부고 정보를 가져오지 못했습니다.'
        });
    }
});
// index.js에서
const funex = require('./funex-pipeline');
exports.syncFuneralHallsData = funex.syncFuneralHallsData;
exports.onQuoteChangeTrigger = funex.onQuoteChangeTrigger;
