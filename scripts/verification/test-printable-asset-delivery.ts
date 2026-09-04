import assert from 'node:assert/strict';

import JSZip from 'jszip';

import { preparePrintableAssetDelivery } from '../../src/lib/printable-asset-templates/assetDelivery';

async function main() {
    const single = await preparePrintableAssetDelivery([
        { blob: new Blob(['front']), filename: 'business-card-front.png' },
    ], 'Business Card');
    assert.equal(single.filename, 'business-card-front.png');
    assert.equal(await single.blob.text(), 'front');

    const bundled = await preparePrintableAssetDelivery([
        { blob: new Blob(['front']), filename: 'business-card-front.png' },
        { blob: new Blob(['back']), filename: 'business-card-back.png' },
    ], 'Business Card - Midnight Gold');
    assert.equal(bundled.filename, 'business-card-midnight-gold.zip');

    const archive = await JSZip.loadAsync(await bundled.blob.arrayBuffer());
    assert.deepEqual(Object.keys(archive.files).sort(), [
        'business-card-back.png',
        'business-card-front.png',
    ]);
    assert.equal(await archive.file('business-card-front.png')?.async('text'), 'front');
    assert.equal(await archive.file('business-card-back.png')?.async('text'), 'back');

    await assert.rejects(
        () => preparePrintableAssetDelivery([], 'Empty'),
        /No printable asset files were generated/,
    );

    console.log('Printable asset delivery checks passed.');
}

void main();
