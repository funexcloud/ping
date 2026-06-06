'use strict';

const fs = require('fs');
const path = require('path');

let firestoreSingleton = null;

/**
 * Express·로컬 API용 Firestore Admin (Functions index.js 와 동일 프로젝트).
 * GOOGLE_APPLICATION_CREDENTIALS 또는 PING_FIREBASE_SERVICE_ACCOUNT_PATH 필요.
 */
function parseServiceAccountFromEnv() {
    const inline = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
    if (!inline) return null;
    try {
        return JSON.parse(inline);
    } catch (e) {
        console.warn('[ping-firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON parse failed', e.message);
        return null;
    }
}

function getPingFirestoreAdmin() {
    if (firestoreSingleton) return firestoreSingleton;
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        const saPath = String(process.env.PING_FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
        const saInline = parseServiceAccountFromEnv();
        if (saInline) {
            admin.initializeApp({ credential: admin.credential.cert(saInline) });
        } else if (saPath && fs.existsSync(saPath)) {
            const abs = path.isAbsolute(saPath) ? saPath : path.join(__dirname, saPath);
            // eslint-disable-next-line import/no-dynamic-require, global-require
            const cred = require(abs);
            admin.initializeApp({ credential: admin.credential.cert(cred) });
        } else {
            admin.initializeApp();
        }
    }
    firestoreSingleton = admin.firestore();
    return firestoreSingleton;
}

module.exports = { getPingFirestoreAdmin };
