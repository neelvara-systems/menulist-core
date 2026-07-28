#!/usr/bin/env node

/**
 * Compatibility entry for the retired hand-authored "159 case" simulation.
 *
 * The historical script marked design assumptions and manually seeded state as
 * passing tests. Use the maintained production-source and isolated-emulator
 * aggregate instead, and preserve its exact exit status.
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
