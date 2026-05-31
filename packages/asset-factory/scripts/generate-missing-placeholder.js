#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const manifestPath = path.join(ROOT, 'packages/asset-factory/manifest/assets.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

const slotId = argValue('--slot');

if (!slotId) {
  console.error('Usage: npm run assets:generate:missing -- --slot <slot-id>');
  process.exit(1);
}

const entry = manifest.assets[slotId];

if (!entry) {
  console.error(`Unknown asset slot: ${slotId}`);
  process.exit(1);
}

if (entry.status !== 'missing') {
  console.error(`Slot ${slotId} is ${entry.status}; placeholder generation is only for missing slots.`);
  process.exit(1);
}

const outDir = path.join(ROOT, 'packages/asset-factory/published/placeholders');
fs.mkdirSync(outDir, { recursive: true });

const safeId = slotId.replace(/[^a-z0-9.-]/g, '-');
const outPath = path.join(outDir, `${safeId}.svg`);
const title = slotId.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${title} placeholder">
  <rect width="1200" height="675" fill="#0b1020"/>
  <rect x="48" y="48" width="1104" height="579" rx="24" fill="none" stroke="#2dd4bf" stroke-opacity="0.4" stroke-width="2"/>
  <text x="600" y="318" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" fill="#d7fbf5">Asset slot pending</text>
  <text x="600" y="366" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" fill="#8aa2a8">${title}</text>
</svg>
`;

fs.writeFileSync(outPath, svg);
console.log(`Generated internal placeholder: ${path.relative(ROOT, outPath)}`);

