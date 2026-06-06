'use strict';

const fs = require('fs');
const path = require('path');

/** 프로젝트 루트 `.env` — server.js 와 동일 규칙 */
function loadPingLocalEnv(rootDir = path.join(__dirname, '..')) {
    const envPath = path.join(rootDir, '.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (key && (process.env[key] === undefined || process.env[key] === '')) {
            process.env[key] = val;
        }
    }
}

module.exports = { loadPingLocalEnv };
