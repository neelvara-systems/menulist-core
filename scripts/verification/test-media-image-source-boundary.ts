import assert from 'node:assert/strict';
import { getMediaImageProfile } from '../../src/lib/media/imageProfiles';
import { buildLegacyImageValidationInput } from '../../src/lib/media/legacyImageUploadBoundary';
import { validateMediaImageDataUrl } from '../../src/lib/media/prepareMediaImage';
import { validateImageFile } from '../../src/lib/security/magicBytesValidator';

const profile = getMediaImageProfile('menuItem');
const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngPayload = Buffer.from(pngBytes).toString('base64');

async function main(): Promise<void> {
    assert.equal(
        await validateMediaImageDataUrl(`data:image/png;base64,${pngPayload}`, profile),
        `data:image/png;base64,${pngPayload}`,
    );

    await assert.rejects(
        validateMediaImageDataUrl(`data:image/jpeg;base64,${pngPayload}`, profile),
        /Use a valid image file/,
    );
    await assert.rejects(
        validateMediaImageDataUrl('https://example.com/image.png', profile),
        /Use a valid image file/,
    );
    await assert.rejects(
        validateMediaImageDataUrl('data:text/html;base64,PGgxPm5vdCBhbiBpbWFnZTwvaDE+', profile),
        /Use a JPG, PNG, or WebP image/,
    );

    const compressedJpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01]);
    const compressedJpegDataUrl = `data:image/jpeg;base64,${Buffer.from(compressedJpegBytes).toString('base64')}`;
    const compressedValidationInput = buildLegacyImageValidationInput(
        compressedJpegDataUrl,
        'image/png',
    );
    assert.deepEqual(compressedValidationInput, {
        base64: compressedJpegDataUrl,
        mimeType: 'image/jpeg',
        size: compressedJpegBytes.byteLength,
    });
    assert.equal(
        (await validateImageFile(compressedValidationInput)).valid,
        true,
        'compressed legacy uploads must validate their emitted bytes, MIME type and size rather than the source file metadata',
    );
    assert.throws(
        () => buildLegacyImageValidationInput('data:image/png;base64,not-base64', 'image/png'),
        /legacy_image_upload_data_url_invalid/,
    );

    console.log('Media image source boundary tests passed');
}

void main();
