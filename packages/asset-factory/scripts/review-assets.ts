#!/usr/bin/env ts-node

import { buildAuditReport } from './lib/asset-audit';
import type { AssetBrand } from '../schemas/asset-schema';
import {
  allAssetSlots,
  fileExists,
  formatKb,
  getFileSizeBytes,
  loadManifest,
} from './lib/asset-runtime';

const brandIndex = process.argv.indexOf('--brand');
const brand = brandIndex >= 0 ? process.argv[brandIndex + 1] : undefined;
if (brand && brand !== 'menulist' && brand !== 'answerlattice') {
  throw new Error(`Unsupported asset brand filter: ${brand}`);
}
const report = buildAuditReport({ brand: brand as AssetBrand | undefined });
const manifest = loadManifest();
const slots = brand ? allAssetSlots().filter((slot) => slot.brand === brand) : allAssetSlots();

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
if (brand) console.log(`Asset brand filter: ${brand}`);
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
