#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import {
    detectFileType,
    validateFileUpload,
} from '@lib/security/fileValidation';
import {
    getBase64FileSize,
    validateFileSize,
    validateImageFile,
    validateMagicBytes,
} from '@lib/security/magicBytesValidator';

async function main(): Promise<void> {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01]);
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
    ]);
    const nonWebpRiff = Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45,
    ]);

    assert.equal(detectFileType(jpeg), 'image/jpeg');
    assert.equal(detectFileType(png), 'image/png');
    assert.equal(detectFileType(webp), 'image/webp');
    assert.equal(detectFileType(nonWebpRiff), null);

    assert.deepEqual(await validateFileUpload(jpeg, 'image/jpeg', jpeg.byteLength), { valid: true });
    assert.equal((await validateFileUpload(jpeg, 'image/jpeg', 1)).valid, false);
    assert.equal((await validateFileUpload(jpeg, 'image/jpeg', Number.NaN)).valid, false);
    assert.equal((await validateFileUpload(nonWebpRiff, 'image/webp', nonWebpRiff.byteLength)).valid, false);

    const jpegBase64 = Buffer.from(jpeg).toString('base64');
    const jpegDataUrl = `data:image/jpeg;base64,${jpegBase64}`;
    assert.equal(getBase64FileSize(jpegDataUrl), jpeg.byteLength);
    assert.equal(getBase64FileSize('AQ'), 1);
    assert.equal(getBase64FileSize('not base64'), 0);
    assert.equal(validateMagicBytes(jpegDataUrl, 'image/jpg').valid, true);
    assert.equal(validateMagicBytes(`data:image/png;base64,${jpegBase64}`, 'image/jpeg').valid, false);
    assert.equal((await validateImageFile({
        base64: jpegDataUrl,
        mimeType: 'image/jpg',
        size: jpeg.byteLength,
    })).valid, true);
    assert.equal((await validateImageFile({
        base64: jpegDataUrl,
        mimeType: 'image/jpeg',
        size: 1,
    })).valid, false);
    assert.equal(validateFileSize(-1).valid, false);
    assert.equal(validateFileSize(Number.NaN).valid, false);
    assert.equal(validateFileSize(Number.POSITIVE_INFINITY).valid, false);
    assert.equal(validateFileSize(1.5).valid, false);
    assert.equal(validateFileSize(jpeg.byteLength).valid, true);

    process.stdout.write('File validation boundary tests passed.\n');
}

void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
