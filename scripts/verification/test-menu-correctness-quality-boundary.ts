import assert from 'node:assert/strict';
import { getTrustSignalFreshnessText } from '../../src/lib/menu/trustSignalFreshness';
import {
    computeQualitySignals,
} from '../../src/lib/mce/qualitySignals';
import { mceValidate } from '../../src/lib/mce';
import {
    isMenuSnapshotPayloadWithinLimit,
    MENU_SNAPSHOT_MAX_ESTIMATED_BYTES,
} from '../../src/lib/menu/menuSnapshotBoundary';
import { parseSingleMenuPrice } from '../../src/lib/pricing/formatMenuPrice';
import type { ProjectFileType } from '../../src/components/templates/main-app/projects/types/project.types';

const category = { active: true, id: 'category-1', name: { en: 'Main' } };
const file = (items: Array<Record<string, unknown>>, languages = ['en']): ProjectFileType => ({
    active: true,
    extractedData: {
        data: {
            categories: [category],
            items,
            languages: languages.map((code, index) => ({ code, isPrimary: index === 0, name: code })),
        },
    },
    name: 'menu',
    type: 'image/png',
    uid: 'file-1',
    url: 'https://example.com/menu.png',
} as unknown as ProjectFileType);

const item = (id: string, price: string, extra: Record<string, unknown> = {}) => ({
    active: true,
    available: true,
    category: 'category-1',
    description: { en: 'Description' },
    id,
    name: { en: `Item ${id}` },
    price,
    ...extra,
});

const validDisplayPrices = [
    item('currency', '₹299'),
    item('text', 'Market Price'),
    item('range', '199-249'),
];
const validProject = { files: [file(validDisplayPrices)], languages: ['en'] };
assert.equal(
    mceValidate({ projectData: validProject, isOutlet: false }).verified,
    true,
    'supported currency, text, and range prices must not be false MCE failures',
);

for (const [price, expectedRule] of [['₹-10', 'NO_NEGATIVE_PRICE'], ['₹0', 'NO_ZERO_PRICE_ACTIVE']] as const) {
    const result = mceValidate({
        projectData: { files: [file([item('bad-price', price)])], languages: ['en'] },
        isOutlet: false,
    });
    assert.equal(result.verified, false);
    assert(result.errors.some((error) => error.ruleId === expectedRule));
}

const malformedPrice = mceValidate({
    projectData: { files: [file([item('malformed', '<script>10')])], languages: ['en'] },
    isOutlet: false,
});
assert(malformedPrice.errors.some((error) => error.ruleId === 'VALID_PRICE_FORMAT'));
assert.equal(parseSingleMenuPrice('₹299'), 299);
assert.equal(parseSingleMenuPrice('Market Price'), null);
assert.equal(parseSingleMenuPrice('199-249'), null);

const hindiOnlyProject = {
    files: [file([{
        active: true,
        available: true,
        category: 'category-1',
        id: 'hindi-item',
        name: { hi: 'वस्तु' },
        price: '100',
    }], ['hi'])],
};
assert.equal(
    mceValidate({ projectData: hindiOnlyProject, isOutlet: false }).verified,
    true,
    'legacy projects without project.languages must use extracted primary-language evidence',
);

const missingItemId = mceValidate({
    projectData: {
        files: [file([{
            active: true,
            available: true,
            category: 'category-1',
            name: { en: 'Missing identifier' },
            price: '100',
        }])],
        languages: ['en'],
    },
    isOutlet: false,
});
assert(
    missingItemId.errors.some((error) => (
        error.ruleId === 'NO_DUPLICATE_IDS'
        && error.affectedItems.includes('item:0:0')
    )),
    'MCE must not verify items without stable identifiers',
);

const malformedAvailability = mceValidate({
    projectData: {
        files: [file([item('malformed-availability', '100', { available: 'yes' })])],
        languages: ['en'],
    },
    isOutlet: false,
});
assert(
    malformedAvailability.errors.some((error) => error.ruleId === 'DISABLED_ITEM_HIDDEN'),
    'MCE must reject non-boolean item availability flags',
);

const malformedOutletOverrides = mceValidate({
    projectData: {
        ...validProject,
        overrides: { items: [] },
    },
    isOutlet: true,
    masterProjectId: 'master-1',
});
assert(
    malformedOutletOverrides.errors.some((error) => error.ruleId === 'OVERRIDE_PRESERVED'),
    'MCE must reject malformed outlet override maps',
);

assert.doesNotThrow(
    () => mceValidate({ projectData: 'malformed-project', isOutlet: false }),
    'MCE must failure-contain malformed persisted project input',
);
assert.equal(
    mceValidate({ projectData: 'malformed-project', isOutlet: false }).verified,
    false,
    'MCE must not verify malformed persisted project input',
);

const multilingualFiles = [file([
    item('one', '100', { description: { en: 'English only' }, name: { en: 'One' } }),
    item('two', '110', { description: { en: 'English', hi: 'हिंदी' }, name: { en: 'Two', hi: 'दो' } }),
    item('three', '120', { description: { en: 'English', hi: 'हिंदी' }, name: { en: 'Three', hi: 'तीन' } }),
    item('range', '999-1299', { description: { en: 'English', hi: 'हिंदी' }, name: { en: 'Range', hi: 'सीमा' } }),
], ['en', 'hi'])];
const signals = computeQualitySignals(multilingualFiles, ['en', 'hi']);
assert.equal(signals.find((signal) => signal.id === 'descriptions')?.count, 0);
assert.equal(signals.find((signal) => signal.id === 'translations')?.count, 1);
assert.equal(signals.some((signal) => signal.id === 'priceOutliers'), false);

const now = new Date('2026-07-16T12:00:00.000Z');
assert.equal(getTrustSignalFreshnessText('2026-07-16T11:00:00.000Z', now), 'Updated today');
assert.equal(getTrustSignalFreshnessText('2026-07-16T13:00:00.000Z', now), null);
assert.equal(getTrustSignalFreshnessText('2026-05-01T12:00:00.000Z', now), null);

assert.equal(isMenuSnapshotPayloadWithinLimit({ items: [{ id: 'small' }] }), true);
assert.equal(isMenuSnapshotPayloadWithinLimit(undefined), false);
assert.equal(isMenuSnapshotPayloadWithinLimit(() => undefined), false);
assert.equal(
    isMenuSnapshotPayloadWithinLimit({ text: 'x'.repeat(MENU_SNAPSHOT_MAX_ESTIMATED_BYTES + 1) }),
    false,
);

console.log('Menu correctness, quality, trust, and snapshot boundary tests passed.');
