#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertNoDuplicateJsonObjectKeys } from './json-object-key-integrity.mjs';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, '__docs__/audits/data-flow-pipeline-deep-audit.manifest.csv');
const REVIEW_STATE_PATH = path.join(ROOT, '__docs__/audits/data-flow-pipeline-deep-audit.review-state.json');
const REVIEW_STATE_FILE = '__docs__/audits/data-flow-pipeline-deep-audit.review-state.json';

const valuesFor = (flag) => process.argv.flatMap((value, index, args) => (
  value === flag && args[index + 1] ? [args[index + 1]] : []
));
const valueFor = (flag) => valuesFor(flag).at(-1);
const categories = new Set(valuesFor('--category'));
const auditPass = Number(valueFor('--pass'));
const reviewedAt = valueFor('--reviewed-at');
const note = valueFor('--note');
const tests = valuesFor('--test');
const apply = process.argv.includes('--apply');

if (!categories.size || !Number.isSafeInteger(auditPass) || auditPass < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt || '') || !note || !tests.length) {
  throw new Error('Usage: record-category-review-fingerprints --category <name> [--category <name>] --pass <positive integer> --reviewed-at YYYY-MM-DD --note <review scope> --test <command/evidence> [--test <command/evidence>] [--apply]');
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (quoted) throw new Error('Coverage manifest contains an unterminated CSV field.');
  cells.push(current);
  return cells;
}

const manifestLines = readFileSync(MANIFEST_PATH, 'utf8').trimEnd().split(/\r?\n/);
const headers = parseCsvLine(manifestLines[0]);
const fileIndex = headers.indexOf('file_path');
const categoryIndex = headers.indexOf('category');
const digestIndex = headers.indexOf('sha256');
if ([fileIndex, categoryIndex, digestIndex].some((index) => index < 0)) {
  throw new Error('Coverage manifest is missing required fingerprint columns.');
}

const selected = manifestLines.slice(1)
  .map(parseCsvLine)
  .filter((row) => categories.has(row[categoryIndex]));
if (!selected.length) throw new Error('No manifest rows matched the requested categories.');

for (const row of selected) {
  const file = row[fileIndex];
  const absolutePath = path.join(ROOT, file);
  if (!existsSync(absolutePath)) throw new Error(`Reviewed category file disappeared: ${file}`);
  const currentContent = readFileSync(absolutePath);
  let currentDigest;
  if (file === REVIEW_STATE_FILE) {
    const source = currentContent.toString('utf8');
    assertNoDuplicateJsonObjectKeys(source, 'Audit review state');
    const canonical = JSON.parse(source);
    if (canonical[REVIEW_STATE_FILE] && typeof canonical[REVIEW_STATE_FILE] === 'object') {
      canonical[REVIEW_STATE_FILE].reviewedSha256 = '<canonical-self-fingerprint>';
    }
    currentDigest = createHash('sha256').update(`${JSON.stringify(canonical, null, 2)}\n`).digest('hex');
  } else {
    currentDigest = createHash('sha256').update(currentContent).digest('hex');
  }
  if (currentDigest !== row[digestIndex]) {
    throw new Error(`Coverage manifest fingerprint is stale for ${file}; regenerate the manifest and repeat the review.`);
  }
}

const reviewSource = readFileSync(REVIEW_STATE_PATH, 'utf8');
assertNoDuplicateJsonObjectKeys(reviewSource, 'Audit review state');
const reviewState = JSON.parse(reviewSource);
for (const row of selected) {
  const file = row[fileIndex];
  const category = row[categoryIndex];
  const defaults = reviewState.$categoryDefaults?.[category] || {};
  const existing = reviewState[file] || {};
  reviewState[file] = {
    ...defaults,
    ...existing,
    reviewStatus: 'reviewed',
    reviewedSha256: row[digestIndex],
    auditPass,
    reviewedFunctionsOrRanges: existing.reviewedFunctionsOrRanges || defaults.reviewedFunctionsOrRanges || note,
    findings: Array.from(new Set([...(defaults.findings || []), ...(existing.findings || [])])),
    tests: Array.from(new Set([...(defaults.tests || []), ...(existing.tests || []), ...tests])),
    reviewedAt,
    reviewNotes: (existing.reviewNotes || defaults.reviewNotes || '').includes(note)
      ? (existing.reviewNotes || defaults.reviewNotes)
      : [existing.reviewNotes || defaults.reviewNotes, note].filter(Boolean).join(' '),
  };
}

if (selected.some((row) => row[fileIndex] === REVIEW_STATE_FILE)) {
  const canonical = JSON.parse(JSON.stringify(reviewState));
  canonical[REVIEW_STATE_FILE].reviewedSha256 = '<canonical-self-fingerprint>';
  reviewState[REVIEW_STATE_FILE].reviewedSha256 = createHash('sha256')
    .update(`${JSON.stringify(canonical, null, 2)}\n`)
    .digest('hex');
}

if (apply) writeFileSync(REVIEW_STATE_PATH, `${JSON.stringify(reviewState, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ apply, auditPass, categories: [...categories], reviewedAt, selectedFiles: selected.length }, null, 2)}\n`);
