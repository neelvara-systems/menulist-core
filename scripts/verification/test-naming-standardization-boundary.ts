import assert from 'node:assert/strict';
import {
    isBrandSafe,
    standardizeName,
    standardizeNames,
} from '@lib/outputControl/namingStandardization';

for (const brand of ['KFC', 'BBQ', 'XL', 'KFC Bucket', 'McChicken', 'iPhone']) {
    assert.equal(isBrandSafe(brand), true, `${brand} must remain brand-safe`);
    assert.equal(standardizeName(brand).value, brand);
}

assert.deepEqual(standardizeName('  paneer   tikka!!! '), {
    normalizationType: 'capitalize',
    value: 'Paneer Tikka',
    wasModified: true,
});
assert.deepEqual(standardizeName('Fish and Chips'), {
    normalizationType: 'none',
    value: 'Fish and Chips',
    wasModified: false,
});
assert.deepEqual(standardizeNames({
    en: '  paneer   tikka!!! ',
    hi: 'KFC',
}), {
    en: 'Paneer Tikka',
    hi: 'KFC',
});

console.log('Naming standardization boundary tests passed.');
