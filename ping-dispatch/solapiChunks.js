'use strict';

const { SolapiMessageService, MessageNotReceivedError } = require('solapi');

/**
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/**
 * @param {import('./config').PingDispatchConfig} cfg
 * @param {object[]} messages
 * @returns {Promise<{ failedMessageList: object[], groupInfo: object, messageList?: object[] }>}
 */
async function sendSolapiMessageBatch(cfg, messages) {
    const svc = new SolapiMessageService(cfg.apiKey, cfg.apiSecret);
    try {
        return await svc.send(messages, { showMessageList: true });
    } catch (e) {
        if (e instanceof MessageNotReceivedError) {
            return {
                failedMessageList: e.failedMessageList ? [...e.failedMessageList] : [],
                groupInfo: { count: { total: e.totalCount || messages.length } },
            };
        }
        throw e;
    }
}

/**
 * @param {import('./config').PingDispatchConfig} cfg
 * @param {object[]} allMessages
 * @returns {Promise<{ responses: object[], aggregatedFailed: object[], acceptedTotal: number }>}
 */
async function sendInChunks(cfg, allMessages) {
    const parts = chunk(allMessages, cfg.batchSize);
    const responses = [];
    /** @type {object[]} */
    const aggregatedFailed = [];
    let acceptedTotal = 0;

    for (const batch of parts) {
        const res = await sendSolapiMessageBatch(cfg, batch);
        responses.push(res);
        const failed = res.failedMessageList || [];
        aggregatedFailed.push(...failed);
        const total = batch.length;
        acceptedTotal += Math.max(0, total - failed.length);
    }

    return { responses, aggregatedFailed, acceptedTotal };
}

module.exports = {
    chunk,
    sendSolapiMessageBatch,
    sendInChunks,
};
