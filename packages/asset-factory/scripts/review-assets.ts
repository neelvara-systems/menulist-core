#!/usr/bin/env ts-node

import { buildAuditReport } from './lib/asset-audit';
import {
  allAssetSlots,
  fileExists,
  formatKb,
  getFileSizeBytes,
  loadManifest,
} from './lib/asset-runtime';

const report = buildAuditReport();
const manifest = loadManifest();
const slots = allAssetSlots();

function hasBlockingFinding(slotId: string): boolean {
  return Object.values(report.groups)
    .flat()
    .some((finding) => finding.severity === 'error' && finding.slotId === slotId);
}

function getFileSummary(files: Record<string, string | undefined>): string {
  const parts = Object.entries(files)
    .filter(([, repoPath]) => Boolean(repoPath))
    .map(([role, repoPath]) => {
      if (!repoPath) return '';
      if (!fileExists(repoPath)) return `${role}:missing`;
      return `${role}:${formatKb(getFileSizeBytes(repoPath))}`;
    });

  return parts.length ? parts.join(', ') : 'no files';
}

console.log('Website Asset Operating System Review');
console.log('Boundary: internal only, no public runtime');
console.log('');
console.log('| Slot | Status | Decision | Score | Files |');
console.log('| --- | --- | --- | ---: | --- |');

let blocked = 0;
let needsReview = 0;

for (const slot of slots) {
  const entry = manifest.assets[slot.id];
  if (!entry) {
    blocked += 1;
    console.log(`| ${slot.id} | missing-manifest | blocked | 0 | no manifest entry |`);
    continue;
  }

  const score = entry.review.strategicFit + entry.review.brandFit + entry.review.narrativeClarity;
  const decision = hasBlockingFinding(slot.id)
    ? 'blocked'
    : slot.approval !== 'automatic' && entry.review.decision !== 'approved'
      ? 'needs-founder-review'
      : entry.status === 'missing'
        ? 'planned-missing'
        : entry.review.decision;

  if (decision === 'blocked') blocked += 1;
  if (decision === 'needs-founder-review') needsReview += 1;

  console.log(`| ${slot.id} | ${entry.status} | ${decision} | ${score} | ${getFileSummary(entry.files)} |`);
}

console.log('');
console.log(`Summary: ${blocked} blocked, ${needsReview} need founder review, ${report.warningCount} audit warning(s).`);

if (blocked > 0 || report.errorCount > 0) {
  process.exit(1);
}

