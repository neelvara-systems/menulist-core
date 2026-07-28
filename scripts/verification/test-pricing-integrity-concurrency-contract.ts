import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string): string => fs.readFileSync(
    path.resolve(process.cwd(), relativePath),
    'utf8',
);

const engine = read('src/lib/pricing/integrityEngine.ts');
const molLogger = read('src/lib/pricing/molLogger.ts');
const pdfQueue = read('src/lib/pricing/pdfQueue.ts');

assert.match(
    engine,
    /transaction\.update\(dataRef, \{ "extractedData\.data\.items": nextItems \}\)/,
    'Firestore array items must be replaced atomically rather than addressed by numeric field paths',
);
assert.doesNotMatch(
    engine,
    /items\.\$\{itemIndex\}/,
    'Firestore field paths must not attempt to address array indexes',
);

const transactionResultIndex = engine.indexOf('return { oldPrice, newVersion };');
const postCommitLogIndex = engine.indexOf('await logPriceChange({');
const postCommitQueueIndex = engine.indexOf('await enqueuePDFRegen({');
assert.ok(transactionResultIndex >= 0, 'the transaction must return committed side-effect context');
assert.ok(
    postCommitLogIndex > transactionResultIndex,
    'MOL logging must occur after the retryable transaction callback',
);
assert.ok(
    postCommitQueueIndex > transactionResultIndex,
    'PDF queue insertion must occur after the retryable transaction callback',
);

assert.match(
    molLogger,
    /export function logPriceChange[\s\S]*?\): Promise<void> \{\s*return logMOLEvent\(/,
    'price-change logging must expose its completion promise',
);
assert.match(
    engine,
    /currentVersion !== version\) return false;/,
    'PDF result writes must reject stale generation versions',
);
assert.match(
    engine,
    /export async function markPDFFailed[\s\S]*?version: number;/,
    'PDF failure writes must carry the generated version for stale-result rejection',
);
assert.match(
    pdfQueue,
    /export async function enqueuePDFRegen[\s\S]*?logPricingDiagnostic\("pricing_pdf_regen_disabled"[\s\S]*?\n\}/,
    'the unavailable PDF queue must fail closed as a visible no-effect boundary',
);
assert.doesNotMatch(
    pdfQueue,
    /\b(?:doc|setDoc|createRegenJob)\b/,
    'the unavailable PDF queue must not retain a broken Firestore writer',
);

console.log('Pricing integrity concurrency contract tests passed.');
