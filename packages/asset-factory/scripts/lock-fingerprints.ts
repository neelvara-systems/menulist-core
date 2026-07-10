#!/usr/bin/env ts-node

import {
  allAssetSlots,
  getWatchedSourceHashes,
  loadManifest,
  MANIFEST_PATH,
  writeText,
} from './lib/asset-runtime';

const manifest = loadManifest();
const slotsById = new Map(allAssetSlots().map((slot) => [slot.id, slot]));
const today = new Date().toISOString().slice(0, 10);
const requestedSlotIds = new Set<string>();
let updated = 0;

const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--slot') {
    const slotId = args[index + 1];
    if (!slotId) {
      throw new Error('Missing value for --slot.');
    }
    requestedSlotIds.add(slotId);
    index += 1;
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

for (const slotId of Array.from(requestedSlotIds)) {
  if (!manifest.assets[slotId]) {
    throw new Error(`Unknown manifest slot: ${slotId}`);
  }
  if (!slotsById.has(slotId)) {
    throw new Error(`No slot declaration found for: ${slotId}`);
  }
}

for (const [slotId, entry] of Object.entries(manifest.assets)) {
  if (requestedSlotIds.size > 0 && !requestedSlotIds.has(slotId)) continue;

  const slot = slotsById.get(slotId);
  if (!slot) continue;
  if (entry.status === 'missing' || entry.status === 'retired') continue;

  entry.sourceFingerprint = {
    files: getWatchedSourceHashes(slot),
    notes: `Locked by assets:fingerprint on ${today}.`,
  };
  updated += 1;
}

manifest.updatedAt = today;
writeText(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Locked source fingerprints for ${updated} asset slot(s).`);
