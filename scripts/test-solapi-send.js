'use strict';

/**
 * 로컬 `.env`의 SOLAPI_* 로 연결 확인 및 테스트 발송.
 *   node scripts/test-solapi-send.js [수신번호]
 * 수신번호 생략 시 SOLAPI_TEST_TO 환경변수 사용.
 *
 * 필요 변수: SOLAPI_API_KEY, SOLAPI_API_SECRET
 * LMS 테스트: SOLAPI_FROM 생략 시 senderid API로 ACTIVE 번호 자동선택.
 * 수신번호 생략 시 발신번호와 동일하게 자가 테스트(실제 과금·수신 가능).
 * 알림톡 테스트: SOLAPI_KAKAO_PF_ID, SOLAPI_KAKAO_TEMPLATE_ID, PING_TEST_KAKAO_ALIMTALK=1
 */

const { loadPingLocalEnv } = require('./load-local-env');
const { pickDefaultFromNumber } = require('./solapi-auth-fetch');
const { SolapiMessageService } = require('solapi');

loadPingLocalEnv();

const key = (process.env.SOLAPI_API_KEY || '').trim();
const secret = (process.env.SOLAPI_API_SECRET || '').trim();
const toArg = process.argv[2];
let from = (process.env.SOLAPI_FROM || '').trim().replace(/\D/g, '');
const testToRaw = toArg || process.env.SOLAPI_TEST_TO || '';
const testTo = testToRaw.replace(/\D/g, '');

function normalizeTo(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('82') && d.length >= 10) d = '0' + d.slice(2);
    return d;
}

async function main() {
    if (!key || !secret) {
        console.error('[실패] .env 에 SOLAPI_API_KEY, SOLAPI_API_SECRET 을 설정하세요.');
        process.exit(1);
    }

    console.log('[1/3] Solapi 잔액·연결 확인…');
    const svc = new SolapiMessageService(key, secret);

    if (!from) {
        console.log('       SOLAPI_FROM 없음 → API 로 등록 발신번호 조회…');
        try {
            from = (await pickDefaultFromNumber({ apiKey: key, apiSecret: secret })) || '';
            if (from) console.log('       사용 발신번호:', from);
        } catch (e) {
            console.error('[경고] 발신번호 자동조회 실패:', e.message || e);
        }
    }
    let balance;
    try {
        balance = await svc.getBalance();
    } catch (e) {
        console.error('[실패] getBalance:', e && e.message ? e.message : e);
        if (e && e.toString) console.error(String(e));
        process.exit(1);
    }
    console.log('[ OK ] getBalance:', JSON.stringify(balance, null, 0));

    let to = normalizeTo(testTo);
    if (!to && from) {
        to = from;
        console.log('       수신번호 미지정 → 발신번호로 자가 테스트 LMS 발송');
    }
    const wantKakao =
        String(process.env.PING_TEST_KAKAO_ALIMTALK || '').trim() === '1' ||
        String(process.env.PING_TEST_KAKAO_ALIMTALK || '').trim() === 'true';

    if (!from) {
        console.error('[실패] 발신번호를 .env SOLAPI_FROM 에 두거나, 계정에 ACTIVE 발신번호가 있어야 합니다.');
        process.exit(1);
    }

    if (!to) {
        console.error('[실패] 수신번호를 인자 또는 SOLAPI_TEST_TO 로 지정하세요.');
        process.exit(1);
    }

    if (wantKakao) {
        const pfId = (process.env.SOLAPI_KAKAO_PF_ID || '').trim();
        const templateId = (process.env.SOLAPI_KAKAO_TEMPLATE_ID || '').trim();
        if (!pfId || !templateId) {
            console.error('[실패] 알림톡 테스트에 SOLAPI_KAKAO_PF_ID, SOLAPI_KAKAO_TEMPLATE_ID 필요');
            process.exit(1);
        }
        const vars = {};
        const raw = process.env.PING_TEST_KAKAO_VARS;
        if (raw) {
            try {
                Object.assign(vars, JSON.parse(raw));
            } catch {
                console.error('[실패] PING_TEST_KAKAO_VARS 는 JSON 객체 문자열이어야 합니다.');
                process.exit(1);
            }
        }
        console.log('[2/3] 알림톡(ATA) 테스트 발송…');
        const messages = [
            {
                to,
                from,
                type: 'ATA',
                text: process.env.PING_TEST_ALIMTALK_TEXT || '(알림톡)',
                kakaoOptions: {
                    pfId,
                    templateId,
                    variables: vars,
                    disableSms: true,
                },
            },
        ];
        try {
            const res = await svc.send(messages, { showMessageList: true });
            console.log('[ OK ] send(alimtalk):', JSON.stringify(res, null, 2));
        } catch (e) {
            console.error('[실패] send(alimtalk):', e && e.message ? e.message : e);
            if (e && e.failedMessageList) console.error(JSON.stringify(e.failedMessageList, null, 2));
            process.exit(1);
        }
        process.exit(0);
    }

    console.log('[2/3] LMS 테스트 발송…');
    const body = `[PING] 솔라피 연동 테스트 ${new Date().toISOString()}`;
    const messages = [
        {
            to,
            from,
            type: 'LMS',
            text: body,
        },
    ];
    try {
        const res = await svc.send(messages, { showMessageList: true });
        console.log('[ OK ] send(LMS):', JSON.stringify(res, null, 2));
        const failed = res.failedMessageList || [];
        if (failed.length) {
            console.error('[경고] 일부 접수 실패:', failed.length, '건');
            process.exit(1);
        }
    } catch (e) {
        console.error('[실패] send(LMS):', e && e.message ? e.message : e);
        if (e && e.failedMessageList) console.error(JSON.stringify(e.failedMessageList, null, 2));
        process.exit(1);
    }

    console.log('[3/3] 완료.');
}

main();
