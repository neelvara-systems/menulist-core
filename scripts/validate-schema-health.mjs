#!/usr/bin/env node

/**
 * Runs behavioral schema.org validation against the production builders.
 *
 * This wrapper intentionally contains no mirrored schema implementation; the
 * maintained TypeScript test imports src/lib/schema directly so validation
 * cannot pass while production behavior drifts.
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npx',
  [
    'ts-node',
    '--compiler-options',
    '{"module":"CommonJS","target":"ES2022"}',
    '-r',
    'tsconfig-paths/register',
    'scripts/verification/test-schema-health.ts',
  ],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
  },
);

if (result.error) {
  process.stderr.write(`Unable to start schema health validation: ${result.error.message.slice(0, 180)}\n`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status === 0 ? 0 : 1;
}
