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
let updated = 0;

for (const [slotId, entry] of Object.entries(manifest.assets)) {
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

