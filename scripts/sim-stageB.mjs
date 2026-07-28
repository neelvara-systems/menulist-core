#!/usr/bin/env node

/**
 * Compatibility entry for the retired Stage B messaging simulation.
 *
 * The historical script mutated emulator documents directly and then treated
 * those mutations as proof of production behavior. Delegate to the maintained
 * production-source and isolated-emulator aggregate and propagate its status.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const childEnvironment = { ...process.env };
delete childEnvironment.GOOGLE_APPLICATION_CREDENTIALS;

if (process.argv.length !== 2) {
  console.error('This verification command does not accept arguments.');
  process.exitCode = 1;
} else {
  const result = spawnSync('npm', ['run', 'verify:menu-extraction-pipeline'], {
    cwd: root,
    env: childEnvironment,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Unable to run the maintained messaging verification: ${result.error.message.slice(0, 180)}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status === 0 ? 0 : 1;
  }
}
