#!/usr/bin/env ts-node

import path from 'path';
import {
  allAssetSlots,
  getAssetBriefPath,
  getBrandContextPath,
  listKnownSlotIds,
  loadManifest,
  readTextIfExists,
  writeText,
} from './lib/asset-runtime';

function getArgValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function firstHeading(content: string | null): string {
  if (!content) return 'Missing source file';
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Source file';
}

function sourceSummary(repoPath: string): string {
  const content = readTextIfExists(repoPath);
  if (!content) return `- ${repoPath}: missing`;
  return `- ${repoPath}: ${firstHeading(content)}`;
}

function buildBrief(slotId: string): string {
  const slot = allAssetSlots().find((candidate) => candidate.id === slotId);
  const manifest = loadManifest();
  const entry = manifest.assets[slotId];

  if (!slot) {
    throw new Error(`Unknown slot ${slotId}.\nKnown slots:\n${listKnownSlotIds().map((id) => `- ${id}`).join('\n')}`);
  }

  const brandContextPath = getBrandContextPath(slot.brand);
  const brandContext = readTextIfExists(brandContextPath);
  if (!brandContext) {
    throw new Error(`Missing brand context file: ${brandContextPath}`);
  }

  const outputPath = getAssetBriefPath(slot.id, entry?.brief);
  const files = entry?.files ? Object.entries(entry.files) : [];
  const existingFiles = files.length
    ? files.map(([role, repoPath]) => `- ${role}: ${repoPath}`).join('\n')
    : '- none yet';

  const outputs = slot.outputs
    .map((output) => `- ${output.role}: ${output.format}${output.ratio ? `, ${output.ratio}` : ''}, max ${output.maxKb} KB`)
    .join('\n');

  return `# Asset Brief - ${slot.id}

**Generated:** ${new Date().toISOString().slice(0, 10)}
**Brand:** ${slot.brand}
**Status:** ${entry?.status ?? 'not in manifest'}
**Approval:** ${slot.approval}
**Autonomy level:** ${slot.autonomyLevel}
**Output file:** ${outputPath}

## Intent

${slot.intent}

## Placement

- Page: ${slot.page}
- Route: ${slot.route}
- Placement: ${slot.placement}
- Component: ${slot.component ?? 'not runtime-mounted'}
- Destination: ${slot.destination}

## Output Contract

${outputs}

## Existing Files

${existingFiles}

## Narrative Rules

${slot.narrativeRules.map((rule) => `- ${rule}`).join('\n')}

## Rejection Rules

${slot.rejectionRules.map((rule) => `- ${rule}`).join('\n')}

## Mobile Requirements

- Mobile required: ${slot.mobile.required ? 'yes' : 'no'}
- Mobile max KB: ${slot.mobile.maxKb ?? 'slot-level output budgets apply'}
- Notes: ${slot.mobile.notes}

## Source Files To Inspect

${[brandContextPath, ...slot.sources].map(sourceSummary).join('\n')}

## Brand Context Snapshot

${brandContext.split('\n').slice(0, 36).join('\n')}

## Safe Next Action

${slot.autonomyLevel === 1
    ? 'Audit only. Do not generate an asset from this brief.'
    : slot.autonomyLevel === 2
      ? 'Safe deterministic generation is allowed if all rejection rules pass.'
      : 'Prepare draft material only. Founder review is required before publishing.'}
`;
}

function writeBrief(slotId: string): string {
  const manifest = loadManifest();
  const outputPath = getAssetBriefPath(slotId, manifest.assets[slotId]?.brief);
  writeText(outputPath, buildBrief(slotId));
  return outputPath;
}

const slotArg = getArgValue('--slot');

if (!slotArg && !hasFlag('--all')) {
  console.error('Usage: npm run assets:brief -- --slot <slot-id>');
  console.error('Known slots:');
  for (const slotId of listKnownSlotIds()) {
    console.error(`- ${slotId}`);
  }
  process.exit(1);
}

if (hasFlag('--all')) {
  for (const slot of allAssetSlots()) {
    const outputPath = writeBrief(slot.id);
    console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
  }
} else if (slotArg) {
  const outputPath = writeBrief(slotArg);
  console.log(`Generated ${outputPath}`);
}
