import assert from 'node:assert/strict';
import { resolvePublicMenuEntryProjectSlug } from '@lib/public-menu-entry/claimProjectSlug';
import { normalizePublicMenuDraftId } from '@lib/public-menu-entry/publicDraftId';
import { normalizeExtractedMenuPriceTruth } from '@lib/pricing/projectPriceTruth';
import {
    MENULIST_TENANT_BASE_DOMAIN,
    PLATFORM_DOMAIN,
} from '@constant/urls';
import { normalizePublicCreateMenuPreviewDraft } from '@lib/publicCreateMenu/previewDraftResponse';
import { isPublicCreateMenuSuccessHostname } from '@lib/publicCreateMenu/successUrl';
import { normalizePublicMenuDraftExtractedData } from '@data/shared/publicMenuDraftData';
import { resolvePublicMenuClaimUserAuthority } from '@lib/public-menu-entry/claimUserAuthority';

const extracted = normalizeExtractedMenuPriceTruth({
    items: [{
        id: 'item-1',
        price: '  ₹299  ',
        attributes: [
            { id: 'small', price: ' 199 ' },
            { id: 'market', price: 'Market Price' },
        ],
    }],
});
assert.equal(extracted.items[0].price, '₹299');
assert.deepEqual(extracted.items[0].attributes.map((attribute) => attribute.price), ['199', 'Market Price']);
assert.throws(() => normalizeExtractedMenuPriceTruth({
    items: [{ id: 'item-1', price: '299 🎉' }],
}));

assert.equal(resolvePublicMenuEntryProjectSlug({}, 'Lunch Menu', '1-new-1'), 'lunch-menu');
assert.equal(resolvePublicMenuEntryProjectSlug({}, 'Feedback', '1-new-1'), 'feedback-menu');
assert.equal(resolvePublicMenuEntryProjectSlug({
    existing: { slug: 'lunch-menu' },
}, 'Lunch Menu', '1-new-1'), 'lunch-menu-1-new-1');
assert.equal(resolvePublicMenuEntryProjectSlug({
    existing: { previousSlugs: ['feedback-menu'] },
}, 'Feedback', '1-new-1'), 'feedback-menu-1-new-1');

const draftId = '123e4567-e89b-42d3-a456-426614174000';
assert.equal(normalizePublicMenuDraftId(draftId), draftId);
assert.equal(normalizePublicMenuDraftId(` ${draftId}`), null);
assert.equal(normalizePublicMenuDraftId(`${draftId}/child`), null);
assert.equal(normalizePublicMenuDraftId('not-a-draft'), null);

assert.equal(
    isPublicCreateMenuSuccessHostname(`owner.${MENULIST_TENANT_BASE_DOMAIN}`),
    true,
    'Claim success must accept the active MenuList tenant domain',
);
assert.equal(
    isPublicCreateMenuSuccessHostname(PLATFORM_DOMAIN),
    true,
    'Claim success may accept the active MenuList platform root',
);
assert.equal(
    isPublicCreateMenuSuccessHostname('demo.menulist.ai'),
    false,
    'Claim success must not treat MenuList marketing subdomains as customer links',
);
assert.equal(
    isPublicCreateMenuSuccessHostname(`${PLATFORM_DOMAIN}.attacker.example`),
    false,
    'A hostname containing the platform domain only as a prefix must fail closed',
);
assert.equal(
    isPublicCreateMenuSuccessHostname('attacker.example'),
    false,
    'An arbitrary HTTPS host must not become trusted success-page output',
);

const normalizedPreview = normalizePublicCreateMenuPreviewDraft({
    status: 'completed',
    detectedBusinessName: '  Example   Cafe ',
    detectedBrandAccentColor: 'javascript:alert(1)',
    extractedData: {
        categories: [{ id: 'breakfast', active: true, name: { en: 'Breakfast' } }],
        items: [{
            id: 'tea',
            category: 'breakfast',
            active: true,
            available: true,
            name: { en: 'Tea' },
            dietaryTags: [' vegan '],
        }],
        languages: ['en'],
    },
});
assert.equal(normalizedPreview?.detectedBusinessName, 'Example Cafe');
assert.equal(normalizedPreview?.detectedBrandAccentColor, null);
assert.equal(normalizedPreview?.extractedData?.items[0].name.en, 'Tea');
const maxLanguageDraft = normalizePublicMenuDraftExtractedData({
    categories: [{ id: 'breakfast', active: true, name: { en: 'Breakfast' } }],
    items: [{
        id: 'tea',
        category: 'breakfast',
        active: true,
        available: true,
        name: { en: 'Tea' },
    }],
    languages: ['hi', 'ar', 'fr', 'de', 'es', 'it', 'pt', 'ja'],
});
assert.equal(maxLanguageDraft?.languages.length, 8);
assert.equal(
    maxLanguageDraft?.languages.some(({ code }) => code === 'en'),
    true,
    'the required English fallback must survive the maximum language cap',
);
assert.equal(
    normalizePublicCreateMenuPreviewDraft({
        status: 'completed',
        extractedData: { categories: {}, items: 'not-an-array' },
    })?.extractedData,
    null,
    'Malformed nested response data must not cross into React state as typed arrays',
);
assert.equal(
    normalizePublicCreateMenuPreviewDraft({ status: 'not-a-status' }),
    null,
    'Unknown response states must fail closed',
);

const currentClaimSession = {
    authIssuedAt: 2_000,
    user: {
        authIssuedAt: 2_000,
        email: 'owner@example.com',
        id: 'owner-1',
        role: 'stale-role',
        storeId: 22,
        storeIds: [22],
        stores: [{ role: 'stale-role', storeId: 22 }],
        tenantId: 11,
    },
};
const currentClaimUser = {
    active: true,
    email: 'owner@example.com',
    id: 'owner-1',
    isVerified: true,
    role: 'owner-22',
    storeId: 22,
    storeIds: [22],
    stores: [{ role: 'owner-22', storeId: 22 }],
    tenantId: 11,
};
assert.deepEqual(
    resolvePublicMenuClaimUserAuthority({
        documentId: 'owner-1',
        expectedStoreId: 22,
        expectedTenantId: 11,
        session: currentClaimSession,
        userData: currentClaimUser,
    }),
    {
        role: 'owner-22',
        storeIds: [22],
        stores: [{ role: 'owner-22', storeId: 22 }],
    },
    'Existing-account claims must use the locked persisted store role rather than a stale session role',
);
assert.equal(
    resolvePublicMenuClaimUserAuthority({
        documentId: 'owner-1',
        expectedStoreId: 23,
        expectedTenantId: 11,
        session: currentClaimSession,
        userData: currentClaimUser,
    }),
    null,
    'A requested store absent from the current user record must fail closed',
);
assert.equal(
    resolvePublicMenuClaimUserAuthority({
        documentId: 'owner-1',
        expectedStoreId: 22,
        expectedTenantId: 11,
        session: currentClaimSession,
        userData: {
            ...currentClaimUser,
            sessionRevokedAt: 2_000,
        },
    }),
    null,
    'A session issued at or before current revocation must fail closed',
);
assert.equal(
    resolvePublicMenuClaimUserAuthority({
        documentId: 'owner-1',
        expectedStoreId: 22,
        expectedTenantId: 11,
        session: currentClaimSession,
        userData: {
            ...currentClaimUser,
            stores: [
                { role: 'owner-22', storeId: 22 },
                { role: 'viewer-22', storeId: 22 },
            ],
        },
    }),
    null,
    'Conflicting persisted roles for one store must fail closed',
);

console.log('Public Menu Entry boundary tests passed.');
