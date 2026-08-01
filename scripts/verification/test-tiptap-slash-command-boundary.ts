import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getNextSlashCommandIndex } from '../../src/lib/editor/slashCommandNavigation';

assert.equal(getNextSlashCommandIndex(0, 0, 1), null);
assert.equal(getNextSlashCommandIndex(0, -1, -1), null);
assert.equal(getNextSlashCommandIndex(0, Number.NaN, 1), null);
assert.equal(getNextSlashCommandIndex(0, 3, -1), 2);
assert.equal(getNextSlashCommandIndex(2, 3, 1), 0);
assert.equal(getNextSlashCommandIndex(Number.NaN, 3, 1), 1);
assert.equal(getNextSlashCommandIndex(-1, 3, 1), 0);

const extensionSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/atoms/TiptapEditor/SlashCommandsExtension.ts'),
    'utf8',
);
assert.equal(extensionSource.includes('@ts-nocheck'), false);
assert.match(extensionSource, /popup\[0\]\?\.hide\(\)/);
assert.match(extensionSource, /popup\[0\]\?\.destroy\(\)/);
assert.match(extensionSource, /component\?\.ref\?\.onKeyDown\(props\) \?\? false/);

process.stdout.write('Tiptap slash-command navigation boundary tests passed.\n');
