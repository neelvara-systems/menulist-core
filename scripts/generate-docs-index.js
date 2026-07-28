#!/usr/bin/env node

/**
 * Compatibility entry point for the retired legacy `docs/` index generator.
 *
 * Active documentation lives in `__docs__/`, whose curated constitutional
 * master index must not be mechanically overwritten. This command therefore
 * validates the active index and all maintained internal links without writing.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const activeIndex = path.join(root, '__docs__', 'index.md');

if (!fs.existsSync(activeIndex)) {
  console.error('Active documentation index is missing: __docs__/index.md');
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ['scripts/check-docs-links.js'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`Unable to validate the active documentation index: ${result.error.message.slice(0, 180)}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status === 0 ? 0 : 1;
    if (result.status === 0) {
      console.log('Active curated index preserved: __docs__/index.md');
    }
  }
}
