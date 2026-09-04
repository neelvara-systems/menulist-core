#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const stickyCtaPath = path.join(ROOT, 'src/components/website/shared/StickyCta.tsx');
const stickyCta = fs.readFileSync(stickyCtaPath, 'utf8');

function assertIncludes(needle, label) {
  if (!stickyCta.includes(needle)) {
    throw new Error(`${label} must include ${needle}`);
  }
}

assertIncludes(
  "window.matchMedia('(min-width: 1024px) and (min-height: 780px)')",
  'MenuList sticky CTA viewport boundary',
);
assertIncludes(
  "window.addEventListener('scroll', scheduleSync, { passive: true });",
  'MenuList sticky CTA scroll recovery boundary',
);
assertIncludes(
  "window.addEventListener('resize', scheduleSync);",
  'MenuList sticky CTA resize recovery boundary',
);
assertIncludes(
  "window.addEventListener('pageshow', scheduleSync);",
  'MenuList sticky CTA history recovery boundary',
);
assertIncludes(
  'window.requestAnimationFrame(() => {',
  'MenuList sticky CTA scroll throttling boundary',
);
assertIncludes(
  'window.cancelAnimationFrame(syncFrame)',
  'MenuList sticky CTA pending-frame cleanup boundary',
);
assertIncludes(
  "window.removeEventListener('scroll', scheduleSync);",
  'MenuList sticky CTA scroll-listener cleanup boundary',
);
assertIncludes(
  "window.removeEventListener('resize', scheduleSync);",
  'MenuList sticky CTA resize-listener cleanup boundary',
);
assertIncludes(
  "window.removeEventListener('pageshow', scheduleSync);",
  'MenuList sticky CTA history-listener cleanup boundary',
);

console.log('MenuList website sticky CTA boundary verified.');
