import assert from 'node:assert/strict';
import {
    validateMenuLinkImportUrl,
} from '../../src/lib/menu-link-import/sourceAcquisition';

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
    await assertRejectedUnsafeIp('http://[fe80::1]/menu');
    await assertRejectedUnsafeIp('http://[fe90::1]/menu');
    await assertRejectedUnsafeIp('http://[fea0::1]/menu');
    await assertRejectedUnsafeIp('http://[febf::1]/menu');
    await assertRejectedUnsafeIp('http://[fec0::1]/menu');

    console.log('Menu link import URL boundary tests passed');
}

void main();
