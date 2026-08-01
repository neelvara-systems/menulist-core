import assert from 'node:assert/strict';
import { buildQrCodeFilename, generateBrandedQrCodeDataUrl, generateQrCodeDataUrl } from '@lib/utils/qrCode';

async function run(): Promise<void> {
    for (const payload of ['', '   ', 'x'.repeat(2_049)]) {
        await assert.rejects(generateQrCodeDataUrl(payload), /Invalid QR payload/);
        await assert.rejects(generateBrandedQrCodeDataUrl(payload), /Invalid QR payload/);
    }

    const normalized = await generateQrCodeDataUrl('https://cafe.example/menu', {
        darkColor: 'not-a-color',
        lightColor: 'javascript:white',
        margin: Number.NaN,
        width: Number.POSITIVE_INFINITY,
    });
    assert.match(normalized, /^data:image\/png;base64,/);

    const clamped = await generateQrCodeDataUrl('plain text payload', {
        margin: -10,
        width: 1,
    });
    assert.match(clamped, /^data:image\/png;base64,/);
    assert.equal(buildQrCodeFilename('../../Cafe', '../evil'), 'cafe-evil');
    assert.equal(buildQrCodeFilename('Cafe', ''), 'cafe');

    console.log('QR code boundary tests passed.');
}

void run();
