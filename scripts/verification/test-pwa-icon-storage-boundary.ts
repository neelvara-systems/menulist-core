import assert from 'node:assert/strict';

import {
    assertPreparedPWAIconFile,
    isPWAIconStoragePath,
} from '../../src/lib/pwa/pwaIconStorageBoundary';

assert.doesNotThrow(() => assertPreparedPWAIconFile({
    name: 'customer-app-icon.png',
    size: 1024,
    type: 'image/png',
}));
assert.throws(
    () => assertPreparedPWAIconFile({ name: 'icon.svg', size: 1024, type: 'image/svg+xml' }),
    /pwa_icon_file_invalid/,
);
assert.throws(
    () => assertPreparedPWAIconFile({ name: 'icon.png', size: Number.NaN, type: 'image/png' }),
    /pwa_icon_file_invalid/,
);
assert.throws(
    () => assertPreparedPWAIconFile({ name: 'icon.png', size: 6 * 1024 * 1024, type: 'image/png' }),
    /pwa_icon_file_invalid/,
);

assert.equal(isPWAIconStoragePath(
    'stores/pwa-icons/12/34/pwa_icon_abc.png',
    { tenantId: 12, storeId: 34 },
), true);
assert.equal(isPWAIconStoragePath(
    'stores/pwa-icons/12/35/pwa_icon_abc.png',
    { tenantId: 12, storeId: 34 },
), false);
assert.equal(isPWAIconStoragePath(
    'stores/obp-photos/12/34/pwa_icon_abc.png',
    { tenantId: 12, storeId: 34 },
), false);

process.stdout.write('PWA icon Storage boundary tests passed.\n');
