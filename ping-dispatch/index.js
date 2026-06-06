'use strict';

const { loadDispatchConfigFromEnv, solapiCredentialsReady, kakaoTemplateReady } = require('./config');
const { normalizeKRPhone } = require('./normalizePhone');
const { buildBackupManifest } = require('./backupManifest');
const { dispatchPaidOrder } = require('./dispatchPaidOrder');
const { buildKakaoVariables, buildSolapiMessagesForPhones } = require('./buildMessages');
const { sendInChunks, sendSolapiMessageBatch, chunk } = require('./solapiChunks');

module.exports = {
    loadDispatchConfigFromEnv,
    solapiCredentialsReady,
    kakaoTemplateReady,
    normalizeKRPhone,
    buildBackupManifest,
    dispatchPaidOrder,
    buildKakaoVariables,
    buildSolapiMessagesForPhones,
    sendInChunks,
    sendSolapiMessageBatch,
    chunk,
};
