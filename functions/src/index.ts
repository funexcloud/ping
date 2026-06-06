/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// 간단한 XML 파서 유틸리티 (외부 라이브러리 의존성 제거용)
const parseXMLtoArr = (xmlStr: string) => {
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xmlStr)) !== null) {
        const itemStr = match[1];
        const obj: any = {};
        const tagRegex = /<([a-zA-Z0-9_\-]+)>([^<]*)<\/\1>/g;
        let tagMatch;
        while ((tagMatch = tagRegex.exec(itemStr)) !== null) {
            obj[tagMatch[1]] = tagMatch[2].trim();
        }
        items.push(obj);
    }
    return items;
};

/**
 * 장례식장 공공데이터 연동 징검다리(Proxy) API
 * 내부적으로 .env 환경변수에서 키를 읽고 보건복지부 서버를 찌른 후 가공하여 프론트엔드로 전달합니다.
 */
export const searchFuneralHome = onRequest({ cors: true }, async (req, res) => {
    try {
        const keyword = req.query.keyword as string || "";
        
        // .env 파일의 환경변수 로드 (사용자가 넣었을 키 이름 찾기 지원)
        const apiKey = process.env.FUNERAL_API_KEY || process.env.PUBLIC_DATA_API_KEY || process.env.API_KEY || "";
        
        if (!apiKey || apiKey.trim() === '') {
            logger.error("서버 .env 환경변수에 인증키가 비어있습니다.");
            res.status(500).json({ error: "서버 환경변수에 공공데이터 인증키가 설정되지 않았습니다." });
            return;
        }

        // 공공데이터 요청 엔드포인트 구성 (전국 장례식장 현황)
        const endpoint = `https://apis.data.go.kr/1352000/ODMS_DATA_04_1?serviceKey=${apiKey}&pageNo=1&numOfRows=1000`;
        
        const response = await fetch(endpoint);
        const textData = await response.text();
        
        // 반환 타입 체크 (오류 시 JSON 텍스트일 수 있음)
        if (textData.trim().startsWith('{')) {
            logger.error("공공데이터 API 통신 오류 반환:", textData);
            res.status(502).json({ error: "공공데이터 API 연결 오류", details: JSON.parse(textData) });
            return;
        }

        // XML 수동 파싱
        const rawItems = parseXMLtoArr(textData);
        
        // 키워드 필터링 및 포맷팅
        // (주의: XML 태그명이 향후 바뀔 가능성을 고려해 Object Values 안에서 검색)
        const results = rawItems.filter(item => {
            if (!keyword) return true;
            return Object.values(item).some(val => 
                String(val).includes(keyword)
            );
        }).map(item => {
            // 보건복지부 ODMS_DATA_04_1 추정 필드명 매핑 (기관명, 주소, 전화번호 대응)
            return {
                name: item.fcltyNm || item.yadmNm || item.NM || item.TITLE || Object.values(item)[0] || "이름없음", 
                address: item.rdnmadr || item.addr || item.ADRES || item.locplcLotnoAdres || "주소 정보 없음",
                phone: item.telno || item.TEL || "전화번호 정보 없음"
            };
        });

        res.status(200).json({ success: true, count: results.length, results });

    } catch (error) {
        logger.error("API Fetch Error:", error);
        res.status(500).json({ error: "공공데이터 연동 중 백엔드 오류가 발생했습니다." });
    }
});
