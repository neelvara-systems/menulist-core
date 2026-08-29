import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getNextSlashCommandIndex } from '../../src/lib/editor/slashCommandNavigation';
import {
    normalizeTiptapImageUrl,
    normalizeTiptapLinkUrl,
    normalizeTiptapTextAlign,
    normalizeTiptapTextColor,
} from '../../src/lib/tiptap/urlPolicy';

assert.equal(getNextSlashCommandIndex(0, 0, 1), null);
assert.equal(getNextSlashCommandIndex(0, -1, -1), null);
assert.equal(getNextSlashCommandIndex(0, Number.NaN, 1), null);
assert.equal(getNextSlashCommandIndex(0, 3, -1), 2);
assert.equal(getNextSlashCommandIndex(2, 3, 1), 0);
assert.equal(getNextSlashCommandIndex(Number.NaN, 3, 1), 1);
assert.equal(getNextSlashCommandIndex(-1, 3, 1), 0);
assert.equal(normalizeTiptapLinkUrl('example.com/docs', { assumeHttps: true }), 'https://example.com/docs');
assert.equal(normalizeTiptapLinkUrl('/docs?q=menu#pricing'), '/docs?q=menu#pricing');
assert.equal(normalizeTiptapLinkUrl('#pricing'), '#pricing');
assert.equal(normalizeTiptapLinkUrl('mailto:owner@example.com'), 'mailto:owner@example.com');
assert.equal(normalizeTiptapLinkUrl('ftp://example.com/menu.pdf'), '');
assert.equal(normalizeTiptapLinkUrl('https://user:secret@example.com/menu'), '');
assert.equal(normalizeTiptapLinkUrl('java\nscript:alert(1)'), '');
assert.equal(normalizeTiptapLinkUrl('//example.com/menu'), '');
assert.equal(normalizeTiptapImageUrl('https://cdn.example.com/menu.png'), 'https://cdn.example.com/menu.png');
assert.equal(normalizeTiptapImageUrl('/images/menu.png'), '/images/menu.png');
assert.equal(normalizeTiptapImageUrl('data:image/svg+xml,<svg></svg>'), '');
assert.equal(normalizeTiptapImageUrl('javascript:alert(1)'), '');
assert.equal(normalizeTiptapTextColor('#12aBcD'), '#12aBcD');
assert.equal(normalizeTiptapTextColor('red; background-image: url(https://attacker.invalid/pixel)'), '');
assert.equal(normalizeTiptapTextAlign(' CENTER '), 'center');
assert.equal(normalizeTiptapTextAlign('left; background-image: url(https://attacker.invalid/pixel)'), '');

const extensionSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/atoms/TiptapEditor/SlashCommandsExtension.ts'),
    'utf8',
);
assert.equal(extensionSource.includes('@ts-nocheck'), false);
assert.match(extensionSource, /popup\[0\]\?\.hide\(\)/);
assert.match(extensionSource, /popup\[0\]\?\.destroy\(\)/);
assert.match(extensionSource, /component\?\.ref\?\.onKeyDown\(props\) \?\? false/);

const tiptapConfigSource = fs.readFileSync(
    path.join(process.cwd(), 'src/config/tiptap.ts'),
    'utf8',
);
const menuBarSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/atoms/TiptapEditor/MenuBar.tsx'),
    'utf8',
);
assert.match(tiptapConfigSource, /isAllowedUri: \(url\) => Boolean\(normalizeTiptapLinkUrl\(url\)\)/);
assert.match(tiptapConfigSource, /const src = normalizeTiptapImageUrl\(HTMLAttributes\.src\)/);
assert.match(tiptapConfigSource, /const color = normalizeTiptapTextColor\(attributes\.color\)/);
assert.match(tiptapConfigSource, /const textAlign = normalizeTiptapTextAlign\(attributes\.textAlign\)/);
assert.match(
    menuBarSource,
    /aria-pressed=\{options\.active === undefined \? undefined : options\.active\}/,
    'Tiptap toggle controls must expose their active state to assistive technology',
);

process.stdout.write('Tiptap slash-command navigation boundary tests passed.\n');
