const admin = require('firebase-admin');

// 1. 공공 데이터(e하늘) API 연동/정규화 스케줄러 (매일 새벽 3시 구동)
exports.syncFuneralHallsData = async (req, res) => {
    console.log("Starting Funex Funeral Hall Data Normalization Pipeline...");
    const db = admin.firestore();
    
    try {
        // [MVP Mock] 기존 수집 모듈 연동 또는 e하늘 API Call
        const mockRawData = [
            { id: "h1", rawName: "울산 시립 승화원", rawFacilityFee: "1일 65만원", rawMeal: "16,000", isPublic: false },
            { id: "h2", rawName: "울산 영락원", rawFacilityFee: "1일 85만원", rawMeal: "18,000", isPublic: true },
        ];

        for (let item of mockRawData) {
            // Data Normalization (텍스트 파싱 로직)
            const facilityFeeNum = parseInt(item.rawFacilityFee.replace(/[^0-9]/g, '')) * 10000;
            const mealFeeNum = parseInt(item.rawMeal.replace(/[^0-9]/g, ''));

            const docRef = db.collection('ulsan_halls').doc(item.id);
            const docSnap = await docRef.get();
            
            // 수동 오버라이드(manual_override: true) 체크 후 병합
            if (!docSnap.exists || docSnap.data().manual_override !== true) {
                await docRef.set({
                    name: item.rawName,
                    facility_fee_per_hour: Math.round(facilityFeeNum / 24),
                    meal_fee_per_person: mealFeeNum,
                    is_public_data: item.isPublic,
                    last_synced: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
        if (res) res.status(200).send("Sync Complete");
    } catch(err) {
        console.error("Pipeline Error:", err);
        if (res) res.status(500).send("Error");
    }
};

// 2. 관리자 결제 승인 리스너 (기존 SolAPI SMS Fallback 발송 유도)
exports.onQuoteChangeTrigger = async (change, context) => {
    const afterData = change.after.data();
    const beforeData = change.before.data();

    // 이력 추적이 필요할 때 트리거 (예: 총액 변경 또는 승인 플래그 발생시)
    if (afterData.is_approved === true && (!beforeData || beforeData.is_approved !== true)) {
        console.log(`Sending SolAPI SMS Fallback for Quote ID: ${context.params.quoteId}`);
        // TODO: require('./sms-service.js') 연동
    }
};
