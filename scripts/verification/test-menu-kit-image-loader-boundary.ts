import assert = require('node:assert/strict');

import { loadLogo } from '../../src/lib/menu-kit/imageLoader';

async function main(): Promise<void> {
    assert.equal(await loadLogo('', 200), null);
    assert.equal(await loadLogo('https://example.com/logo.png', 0), null);
    assert.equal(await loadLogo('https://example.com/logo.png', 1.5), null);
    assert.equal(await loadLogo('https://example.com/logo.png', Number.NaN), null);
    assert.equal(await loadLogo('https://example.com/logo.png', 4_097), null);
    assert.equal(await loadLogo('x'.repeat(4_097), 200), null);
    process.stdout.write('Menu Kit image-loader boundary tests passed.\n');
}

void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
