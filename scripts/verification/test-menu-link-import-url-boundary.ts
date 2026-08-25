import assert from 'node:assert/strict';
import {
    validateMenuLinkImportUrl,
} from '../../src/lib/menu-link-import/sourceAcquisition';
import { validateMenuLinkInput } from '../../src/lib/menu-link-import/menuLinkInput';

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
    assert.deepEqual(validateMenuLinkInput(' https://example.com/menu#section '), {
        valid: true,
        normalizedUrl: 'https://example.com/menu',
    });

    await assertRejectedUnsafeIp('http://[fe80::1]/menu');
    await assertRejectedUnsafeIp('http://[fe90::1]/menu');
    await assertRejectedUnsafeIp('http://[fea0::1]/menu');
    await assertRejectedUnsafeIp('http://[febf::1]/menu');
    await assertRejectedUnsafeIp('http://[fec0::1]/menu');

    console.log('Menu link import URL boundary tests passed');
}

void main();
