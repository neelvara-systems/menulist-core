/**
 * Safe local Knowledge Base generation verification entry point.
 *
 * The former helper wrote a malformed, unscoped job through the Firebase
 * browser SDK and then exited successfully even when the write failed. Current
 * generation behavior is exercised by the maintained boundary plus isolated
 * demo-project Firestore emulator suites instead.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS","target":"ES2022"}' scripts/trigger-kb-generation.ts
 */

import { spawnSync } from 'node:child_process';

if (process.argv.length > 2) {
    process.stderr.write('This verifier accepts no arguments and never writes to a live Firebase project.\n');
    process.exitCode = 1;
} else {
    const result = spawnSync('npm', ['run', 'verify:shared-kb-generation-boundary'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: {
            ...process.env,
            FIREBASE_PROJECT_ID: '',
            GCLOUD_PROJECT: '',
            GOOGLE_CLOUD_PROJECT: '',
        },
    });

    if (result.error) {
        process.stderr.write(`Unable to start the maintained KB generation verifier: ${result.error.message.slice(0, 180)}\n`);
        process.exitCode = 1;
    } else {
        process.exitCode = result.status === 0 ? 0 : 1;
    }
}
