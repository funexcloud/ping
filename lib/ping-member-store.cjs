'use strict';

/**
 * 회원·게스트 인증 JSON — 로컬 디스크 또는 GCS(운영·Vercel).
 * 요청 단위: beginRequest() → read/write → endRequest()
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const STORE_FILES = {
    members: 'members.local.json',
    sessions: 'auth-sessions.local.json',
    guestSettings: 'admin-app-settings.local.json',
    guestCodes: 'guest-sms-codes.local.json',
};

let cache = {};
let dirty = {};
let loadPromise = null;

function stripEnvQuotes(value) {
    let v = String(value || '').trim();
    if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
    ) {
        v = v.slice(1, -1).trim();
    }
    return v;
}

function localStoreDir() {
    const explicit = stripEnvQuotes(process.env.PING_MEMBER_DATA_DIR);
    if (explicit) return explicit;
    if (String(process.env.VERCEL || '') === '1') {
        return path.join(os.tmpdir(), 'ping-member-auth');
    }
    return path.join(__dirname, '..');
}

function gcsBucketName() {
    return (
        stripEnvQuotes(process.env.PING_MEMBER_GCS_BUCKET) ||
        `${stripEnvQuotes(process.env.GCP_PROJECT) || 'ping-3a510'}-member-auth`
    );
}

function hasGcsCredentials() {
    return Boolean(
        stripEnvQuotes(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
            stripEnvQuotes(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    );
}

function useGcs() {
    if (String(process.env.PING_MEMBER_STORE_LOCAL || '') === '1') return false;
    if (!hasGcsCredentials()) return false;
    if (stripEnvQuotes(process.env.PING_MEMBER_GCS_BUCKET)) return true;
    if (String(process.env.VERCEL || '') === '1') return true;
    return false;
}

function getAdminStorage() {
    if (global.__pingMemberStoreBucket) return global.__pingMemberStoreBucket;
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        const json = stripEnvQuotes(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        if (json) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(json)),
            });
        } else {
            admin.initializeApp({
                projectId:
                    stripEnvQuotes(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ||
                    'ping-3a510',
            });
        }
    }
    const bucket = admin.storage().bucket(gcsBucketName());
    global.__pingMemberStoreBucket = bucket;
    return bucket;
}

async function readJsonFromGcs(fileName) {
    const bucket = getAdminStorage();
    const file = bucket.file(fileName);
    const [exists] = await file.exists();
    if (!exists) return getDefault(fileName);
    const [buf] = await file.download();
    return parseJson(buf.toString('utf8'), fileName);
}

async function writeJsonToGcs(fileName, data) {
    const bucket = getAdminStorage();
    await bucket.file(fileName).save(JSON.stringify(data, null, 2), {
        contentType: 'application/json',
        resumable: false,
    });
}

function readJsonFromLocal(fileName) {
    const p = path.join(localStoreDir(), fileName);
    fs.mkdirSync(localStoreDir(), { recursive: true });
    if (!fs.existsSync(p)) return getDefault(fileName);
    return parseJson(fs.readFileSync(p, 'utf8'), fileName);
}

function writeJsonToLocal(fileName, data) {
    const p = path.join(localStoreDir(), fileName);
    fs.mkdirSync(localStoreDir(), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function getDefault(fileName) {
    if (fileName === STORE_FILES.guestCodes) return { pending: {} };
    if (fileName === STORE_FILES.guestSettings) {
        return { guestSmsVerificationEnabled: true, guestIdentityProvider: 'solapi_sms' };
    }
    return [];
}

function parseJson(raw, fileName) {
    try {
        const parsed = JSON.parse(raw);
        if (fileName === STORE_FILES.guestCodes) {
            if (!parsed.pending || typeof parsed.pending !== 'object') parsed.pending = {};
            return parsed;
        }
        if (fileName === STORE_FILES.guestSettings) {
            return { ...getDefault(fileName), ...parsed };
        }
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return getDefault(fileName);
    }
}

async function loadAll() {
    const keys = Object.keys(STORE_FILES);
    if (useGcs()) {
        const rows = await Promise.all(
            keys.map(async (key) => {
                const fileName = STORE_FILES[key];
                const data = await readJsonFromGcs(fileName);
                return [key, data];
            }),
        );
        cache = Object.fromEntries(rows);
    } else {
        cache = Object.fromEntries(
            keys.map((key) => [key, readJsonFromLocal(STORE_FILES[key])]),
        );
    }
    dirty = {};
}

async function flushAll() {
    const keys = Object.keys(dirty).filter((k) => dirty[k]);
    if (!keys.length) return;
    if (useGcs()) {
        await Promise.all(
            keys.map((key) => writeJsonToGcs(STORE_FILES[key], cache[key])),
        );
    } else {
        for (const key of keys) {
            writeJsonToLocal(STORE_FILES[key], cache[key]);
        }
    }
    dirty = {};
}

function beginRequest() {
    if (!loadPromise) {
        loadPromise = loadAll().finally(() => {
            loadPromise = null;
        });
    }
    return loadPromise;
}

async function endRequest() {
    await flushAll();
}

function getStore(key) {
    if (!(key in cache)) cache[key] = getDefault(STORE_FILES[key]);
    return cache[key];
}

function setStore(key, value) {
    cache[key] = value;
    dirty[key] = true;
}

module.exports = {
    beginRequest,
    endRequest,
    getStore,
    setStore,
    STORE_FILES,
    useGcs,
    hasGcsCredentials,
    localStoreDir,
};
