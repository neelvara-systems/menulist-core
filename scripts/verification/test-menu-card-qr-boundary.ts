import assert from 'node:assert/strict';
import { checkQrSafety } from '@lib/menu-card-export/preflight/checkQrSafety';
import { renderQr } from '@lib/menu-card-export/render/renderQr';
import {
    buildQrDestination,
    buildShortUrl,
    normalizeMenuCardQrDestination,
} from '@lib/menu-card-export/source/buildQrDestination';
import type { MenuCardExportSettings } from '@lib/menu-card-export/models/exportTypes';
import type { MenuCardPrintSource } from '@lib/menu-card-export/models/printModel';

const settings = {
    includeQr: true,
} as MenuCardExportSettings;

const source = {
    qr: {
        destinationUrl: 'https://demo.menulist.online/menu',
    },
} as MenuCardPrintSource;

assert.equal(
    buildQrDestination('https://demo.menulist.online/menu', 'home_print'),
    'https://demo.menulist.online/menu?entry_source=qr',
);
assert.equal(
    buildQrDestination('https://demo.menulist.online/menu?lang=en#items', 'whatsapp'),
    'https://demo.menulist.online/menu?lang=en&entry_source=whatsapp#items',
);
assert.equal(buildShortUrl('https://demo.menulist.online/menu?lang=en'), 'demo.menulist.online/menu?lang=en');

[
    '',
    'javascript:alert(1)',
    '/client/menu',
    'https://menulist.ai:secret@attacker.example/menu',
    'ftp://menulist.ai/menu',
    'https://',
].forEach((candidate) => {
    assert.equal(normalizeMenuCardQrDestination(candidate), null);
    assert.equal(buildQrDestination(candidate, 'home_print'), '');
    assert.equal(buildShortUrl(candidate), '');
    assert.equal(
        checkQrSafety(
            {
                ...source,
                qr: { ...source.qr, destinationUrl: candidate },
            },
            settings,
        ).some((warning) => warning.severity === 'blocker'),
        true,
    );
});

async function main(): Promise<void> {
    await assert.rejects(
        () => renderQr('https://menulist.ai:secret@attacker.example/menu'),
        /Invalid QR destination URL/,
    );

    const rendered = await renderQr('https://demo.menulist.online/menu');
    assert.equal(rendered.startsWith('data:image/png;base64,'), true);

    console.log('Menu Card Export QR boundary tests passed.');
}

void main();
