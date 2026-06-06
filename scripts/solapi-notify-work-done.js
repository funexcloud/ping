'use strict';

/**
 * 작업/배포 완료 시 Solapi LMS 알림 (프로젝트 표준 SDK · Messages API).
 *   node scripts/solapi-notify-work-done.js [수신번호]
 * 수신번호 생략 시 01031030282 (또는 SOLAPI_TEST_TO).
 *
 * 필요: SOLAPI_API_KEY, SOLAPI_API_SECRET
 * SOLAPI_FROM 생략 시 ACTIVE 등록 발신번호 자동 선택 (solapi-auth-fetch).
 */

const { loadPingLocalEnv } = require('./load-local-env');
const { pickDefaultFromNumber } = require('./solapi-auth-fetch');
const { SolapiMessageService } = require('solapi');

loadPingLocalEnv();

const key = (process.env.SOLAPI_API_KEY || '').trim();
const secret = (process.env.SOLAPI_API_SECRET || '').trim();
const toArg = process.argv[2];
let from = (process.env.SOLAPI_FROM || '').trim().replace(/\D/g, '');
const testToRaw = toArg || process.env.SOLAPI_TEST_TO || '01031030282';

function normalizeTo(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('82') && d.length >= 10) d = '0' + d.slice(2);
    return d;
}

async function main() {
    if (!key || !secret) {
        console.error('[실패] SOLAPI_API_KEY, SOLAPI_API_SECRET 이 필요합니다 (.env 참고)');
        process.exit(1);
    }

    const svc = new SolapiMessageService(key, secret);

    if (!from) {
        try {
            from = (await pickDefaultFromNumber({ apiKey: key, apiSecret: secret })) || '';
        } catch (e) {
            console.error('[실패] 발신번호 조회:', e && e.message ? e.message : e);
            process.exit(1);
        }
    }

    const to = normalizeTo(testToRaw);
    if (!from) {
        console.error('[실패] SOLAPI_FROM 또는 계정 ACTIVE 발신번호 필요');
        process.exit(1);
    }
    if (!to) {
        console.error('[실패] 수신번호 없음');
        process.exit(1);
    }

    const ts = new Date().toISOString();
    const text = `[핑] 배포/작업 완료 알림 (${ts})`;

    const messages = [{ to, from, type: 'LMS', text }];
    try {
        const res = await svc.send(messages, { showMessageList: true });
        const failed = res.failedMessageList || [];
        if (failed.length) {
            console.error('[실패] 접수 거절:', JSON.stringify(failed, null, 2));
            process.exit(1);
        }
        console.log('[ OK ] Solapi 접수 성공');
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error('[실패] send:', e && e.message ? e.message : e);
        if (e && e.failedMessageList) console.error(JSON.stringify(e.failedMessageList, null, 2));
        process.exit(1);
    }
}

main();
