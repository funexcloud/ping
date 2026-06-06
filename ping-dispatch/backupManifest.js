'use strict';

const { loadDispatchConfigFromEnv, solapiCredentialsReady, kakaoTemplateReady } = require('./config');

/**
 * 시크릿 없이 운영 설정 스냅샷(JSON) — 백업·감사용.
 * @returns {object}
 */
function buildBackupManifest() {
    const cfg = loadDispatchConfigFromEnv();
    return {
        generatedAt: new Date().toISOString(),
        module: 'ping-dispatch',
        version: '1.0.0',
        pingDispatch: {
            useSolapiFlag: cfg.useSolapi,
            solapiCredentialsConfigured: solapiCredentialsReady(cfg),
            kakaoTemplateConfigured: kakaoTemplateReady(cfg),
            primaryChannel: cfg.primaryChannel,
            batchSize: cfg.batchSize,
            fallbackSms: cfg.fallbackSms,
            fromConfigured: !!cfg.from,
        },
    };
}

module.exports = { buildBackupManifest };
