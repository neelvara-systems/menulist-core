#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertNoDuplicateJsonObjectKeys } from './json-object-key-integrity.mjs';

const ROOT = process.cwd();
const REVIEW_STATE_PATH = path.join(
  ROOT,
  '__docs__',
  'audits',
  'data-flow-pipeline-deep-audit.review-state.json',
);
const APPLY = process.argv.includes('--apply');
const AUDIT_PASS = 783;

function nullSeparatedGit(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).split('\0').filter(Boolean);
}

function currentDirtyPaths() {
  return new Set([
    ...nullSeparatedGit(['diff', 'HEAD', '--name-only', '-z']),
    ...nullSeparatedGit(['ls-files', '--others', '--exclude-standard', '-z']),
  ]);
}

function latestCommitDates() {
  const output = execFileSync(
    'git',
    ['log', '--format=@@AUDIT_COMMIT@@%cI', '--name-only', '--no-renames', 'HEAD'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  const latest = new Map();
  let currentDate = '';
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith('@@AUDIT_COMMIT@@')) {
      currentDate = line.slice('@@AUDIT_COMMIT@@'.length, '@@AUDIT_COMMIT@@'.length + 10);
      continue;
    }
    if (currentDate && line && !latest.has(line)) latest.set(line, currentDate);
  }
  return latest;
}

function currentDigest(file) {
  return createHash('sha256')
    .update(readFileSync(path.join(ROOT, file)))
    .digest('hex');
}

function isExactPastReview(review) {
  return Boolean(
    review
    && typeof review === 'object'
    && !Array.isArray(review)
    && review.reviewStatus === 'reviewed'
    && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt),
  );
}

const source = readFileSync(REVIEW_STATE_PATH, 'utf8');
assertNoDuplicateJsonObjectKeys(source, 'Audit review state');
const reviewState = JSON.parse(source);
const dirtyPaths = currentDirtyPaths();
const commitDates = latestCommitDates();
const summary = {
  eligible: 0,
  alreadyCurrent: 0,
  dirtyOrUntracked: 0,
  missingOrSameDayEvidence: 0,
  absent: 0,
  applied: 0,
};

for (const [file, review] of Object.entries(reviewState)) {
  if (file.startsWith('$') || !isExactPastReview(review)) continue;
  const absolutePath = path.join(ROOT, file);
  if (!existsSync(absolutePath)) {
    summary.absent += 1;
    continue;
  }
  const digest = currentDigest(file);
  if (review.reviewedSha256 === digest) {
    summary.alreadyCurrent += 1;
    continue;
  }
  if (dirtyPaths.has(file)) {
    summary.dirtyOrUntracked += 1;
    continue;
  }
  const latestCommitDate = commitDates.get(file);
  if (!latestCommitDate || latestCommitDate >= review.reviewedAt) {
    summary.missingOrSameDayEvidence += 1;
    continue;
  }
  summary.eligible += 1;
  if (!APPLY) continue;
  review.reviewedSha256 = digest;
  review.auditPass = AUDIT_PASS;
  const note = 'Current fingerprint backfilled from an exact historical review because the path is clean and its latest commit strictly predates reviewedAt; no intervening content change is present.';
  review.reviewNotes = [review.reviewNotes, note].filter(Boolean).join(' ');
  summary.applied += 1;
}

if (APPLY) writeFileSync(REVIEW_STATE_PATH, `${JSON.stringify(reviewState, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ apply: APPLY, ...summary }, null, 2)}\n`);
