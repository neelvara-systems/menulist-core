import assert from 'node:assert/strict';
import {
    isValidMenuLinkBinarySignature,
    validateMenuLinkImportUrl,
} from '../../src/lib/menu-link-import/sourceAcquisition';
import {
    getMenuLinkHostnameForLog,
    validateMenuLinkInput,
} from '../../src/lib/menu-link-import/menuLinkInput';

async function assertRejectedUnsafeIp(url: string): Promise<void> {
    await assert.rejects(
        validateMenuLinkImportUrl(url),
        (error: unknown) => (
            error !== null
            && typeof error === 'object'
            && 'code' in error
            && error.code === 'UNSAFE_IP'
        ),
        `${url} must be rejected before any network request`,
    );
}

async function main(): Promise<void> {
    assert.deepEqual(validateMenuLinkInput('javascript:alert(1)'), {
        valid: false,
        message: 'Enter a valid public http or https menu link.',
    });
    assert.deepEqual(validateMenuLinkInput('https://user:pass@example.com/menu'), {
        valid: false,
        message: 'Use a public menu link without login details.',
    });
    assert.deepEqual(validateMenuLinkInput('not a URL'), {
        valid: false,
        message: 'Enter a valid public http or https menu link.',
    });
    assert.deepEqual(validateMenuLinkInput('https://example.com:8443/menu'), {
        valid: false,
        message: 'Use a standard public website link.',
    });
    assert.deepEqual(validateMenuLinkInput(' https://example.com/menu#section '), {
        valid: true,
        normalizedUrl: 'https://example.com/menu',
    });
    assert.deepEqual(validateMenuLinkInput(' https://example.com/app/#/menu '), {
        valid: true,
        normalizedUrl: 'https://example.com/app/#/menu',
    });
    assert.deepEqual(validateMenuLinkInput(' https://example.com/app/#!/catalog '), {
        valid: true,
        normalizedUrl: 'https://example.com/app/#!/catalog',
    });
    assert.equal(getMenuLinkHostnameForLog('https://example.com/menu?token=secret'), 'example.com');
    assert.equal(getMenuLinkHostnameForLog('https://user:pass@example.com/menu'), null);
    assert.equal(isValidMenuLinkBinarySignature(Buffer.from('%PDF-1.7'), 'application/pdf'), true);
    assert.equal(isValidMenuLinkBinarySignature(Buffer.from('<html>not a pdf</html>'), 'application/pdf'), false);
    assert.equal(
        isValidMenuLinkBinarySignature(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            'image/png',
        ),
        true,
    );
    assert.equal(isValidMenuLinkBinarySignature(Buffer.from('not an image'), 'image/png'), false);

    await assertRejectedUnsafeIp('http://[fe80::1]/menu');
    await assertRejectedUnsafeIp('http://[fe90::1]/menu');
    await assertRejectedUnsafeIp('http://[fea0::1]/menu');
    await assertRejectedUnsafeIp('http://[febf::1]/menu');
    await assertRejectedUnsafeIp('http://[fec0::1]/menu');
    await assertRejectedUnsafeIp('http://[::127.0.0.1]/menu');
    await assertRejectedUnsafeIp('http://[::ffff:7f00:1]/menu');
    await assertRejectedUnsafeIp('http://[64:ff9b::7f00:1]/menu');
    await assert.rejects(
        validateMenuLinkImportUrl('https://example.com:8443/menu'),
        (error: unknown) => (
            error !== null
            && typeof error === 'object'
            && 'code' in error
            && error.code === 'UNSAFE_PORT'
        ),
        'non-standard public ports must be rejected before any network request',
    );

    console.log('Menu link import URL boundary tests passed');
}

void main();
