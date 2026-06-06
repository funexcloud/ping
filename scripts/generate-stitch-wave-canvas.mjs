import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveLegacyHtmlArchiveRoot } = require('./legacy-html-archive-path.cjs');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const archiveRoot = resolveLegacyHtmlArchiveRoot(root);
const html = fs.readFileSync(path.join(archiveRoot, 'stitch-wave.html'), 'utf8');
// same logic as inline generator
