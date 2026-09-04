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
import {
    hasCompletePublicMenuDraftSourceAttribution,
    normalizePublicMenuDraftExtractedData,
} from '@data/shared/publicMenuDraftData';
import { resolvePublicMenuClaimUserAuthority } from '@lib/public-menu-entry/claimUserAuthority';
import {
    normalizePublicDraftLinkSourceMetadataForProject,
    normalizePublicDraftSourcesForProject,
} from '@lib/public-menu-entry/publicDraftSource';
import { PUBLIC_CREATE_MENU_UPLOAD_LIMITS } from '@data/shared/menuExtractionJob';
import { PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION } from '@data/shared/publicMenuDraftSource';

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
const indexedDraftInput = {
    categories: [{ id: 'breakfast', active: true, name: { en: 'Breakfast' }, sourceFileIndex: 1 }],
    items: [{
        id: 'tea',
        category: 'breakfast',
        active: true,
        available: true,
        name: { en: 'Tea' },
        sourceFileIndex: 1,
    }],
    languages: ['en'],
};
assert.equal(
    normalizePublicMenuDraftExtractedData(indexedDraftInput)?.items[0].sourceFileIndex,
    undefined,
    'Preview-safe normalization must not expose private source-page indexes by default',
);
assert.equal(
    normalizePublicMenuDraftExtractedData(indexedDraftInput, {
        maxSourceFiles: 2,
        preserveSourceFileIndex: true,
    })?.items[0].sourceFileIndex,
    1,
    'The private worker-to-claim projection must retain a bounded source-page index',
);
assert.equal(
    normalizePublicMenuDraftExtractedData(indexedDraftInput, {
        maxSourceFiles: 1,
        preserveSourceFileIndex: true,
    })?.items[0].sourceFileIndex,
    undefined,
    'An out-of-range source-page index must be stripped before persistence',
);
const attributedDraft = normalizePublicMenuDraftExtractedData(indexedDraftInput, {
    maxSourceFiles: 2,
    preserveSourceFileIndex: true,
});
assert.equal(
    attributedDraft ? hasCompletePublicMenuDraftSourceAttribution(attributedDraft, 2) : false,
    true,
    'A fully bounded page attribution must be accepted for project redistribution',
);
const partiallyAttributedDraft = normalizePublicMenuDraftExtractedData({
    ...indexedDraftInput,
    items: [{ ...indexedDraftInput.items[0], sourceFileIndex: undefined }],
}, {
    maxSourceFiles: 2,
    preserveSourceFileIndex: true,
});
assert.equal(
    partiallyAttributedDraft
        ? hasCompletePublicMenuDraftSourceAttribution(partiallyAttributedDraft, 2)
        : true,
    false,
    'A versioned source cannot silently drop content that lacks page attribution',
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

const sourceDraftId = '123e4567-e89b-42d3-a456-426614174000';
const sourceBucket = 'menulist-qa.appspot.com';
const sourceFile = (page: number, size = 2_048) => {
    const storagePath = `publicMenuDrafts/${sourceDraftId}/menu-page-${String(page).padStart(2, '0')}.jpg`;
    return {
        downloadUrl: `https://firebasestorage.googleapis.com/v0/b/${sourceBucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=page-${page}`,
        fileName: `menu-page-${String(page).padStart(2, '0')}.jpg`,
        fileSize: size,
        fileType: 'image/jpeg',
        storagePath,
    };
};
const firstSourceFile = sourceFile(1);
const secondSourceFile = sourceFile(2);
const versionedSourceDraft = {
    token: sourceDraftId,
    sourceType: 'image_upload',
    sourceFilesVersion: PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION,
    sourceFiles: [firstSourceFile, secondSourceFile],
    imageUrl: firstSourceFile.downloadUrl,
    imagePath: firstSourceFile.storagePath,
    originalFileName: firstSourceFile.fileName,
    fileType: firstSourceFile.fileType,
    fileSize: firstSourceFile.fileSize,
};
const normalizedSources = normalizePublicDraftSourcesForProject(versionedSourceDraft, sourceDraftId, {
    allowedBucket: sourceBucket,
    allowLocalEmulator: false,
});
assert.equal(normalizedSources?.length, 2, 'Every ordered PDF page source must survive project promotion validation');
assert.equal(normalizedSources?.[1].storagePath, secondSourceFile.storagePath);
assert.equal(
    normalizePublicDraftSourcesForProject({
        ...versionedSourceDraft,
        sourceFiles: [firstSourceFile, { ...secondSourceFile, storagePath: firstSourceFile.storagePath }],
    }, sourceDraftId, { allowedBucket: sourceBucket, allowLocalEmulator: false }),
    null,
    'Duplicate source paths must fail closed',
);
assert.equal(
    normalizePublicDraftSourcesForProject({
        ...versionedSourceDraft,
        imageUrl: secondSourceFile.downloadUrl,
    }, sourceDraftId, { allowedBucket: sourceBucket, allowLocalEmulator: false }),
    null,
    'Legacy primary aliases must match the first ordered source exactly',
);
assert.equal(
    normalizePublicDraftSourcesForProject({
        ...versionedSourceDraft,
        sourceFiles: [
            sourceFile(1, PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES),
            sourceFile(2, PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES),
            sourceFile(3, PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES),
            sourceFile(4, 1),
        ],
        fileSize: PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES,
    }, sourceDraftId, { allowedBucket: sourceBucket, allowLocalEmulator: false }),
    null,
    'Aggregate converted PDF payloads above the shared cap must fail closed',
);
assert.equal(
    normalizePublicDraftSourcesForProject({
        ...versionedSourceDraft,
        sourceFilesVersion: undefined,
    }, sourceDraftId, { allowedBucket: sourceBucket, allowLocalEmulator: false }),
    null,
    'A partial versioned source envelope must not fall back to legacy admission',
);

const linkStoragePath = `publicMenuDrafts/${sourceDraftId}/source.txt`;
const linkSource = {
    fileName: 'Imported menu link.txt',
    fileSize: 2_048,
    fileType: 'text/plain',
    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${sourceBucket}/o/${encodeURIComponent(linkStoragePath)}?alt=media&token=link-source`,
    storagePath: linkStoragePath,
};
const linkDraft = {
    sourceType: 'menu_link_import',
    sourceMetadata: {
        acquisitionProvider: 'direct-http',
        contentHash: 'a'.repeat(64),
        finalUrl: 'https://example.com/app/#/menu',
        permissionConfirmed: true,
        sourceKind: 'rendered_html_text',
        sourceTextLength: 2_000,
        sourceTextPresent: true,
        sourceUrl: 'https://example.com/app/#/menu',
        storagePath: linkStoragePath,
    },
};
assert.deepEqual(
    normalizePublicDraftLinkSourceMetadataForProject(linkDraft, linkSource),
    {
        acquisitionProvider: 'direct-http',
        contentHash: 'a'.repeat(64),
        finalUrl: 'https://example.com/app/#/menu',
        sourceKind: 'rendered_html_text',
        sourceTextLength: 2_000,
        sourceTextPresent: true,
        sourceUrl: 'https://example.com/app/#/menu',
        storagePath: linkStoragePath,
    },
    'A promoted link source must retain only validated bounded provenance',
);
assert.equal(
    normalizePublicDraftLinkSourceMetadataForProject({
        ...linkDraft,
        sourceMetadata: { ...linkDraft.sourceMetadata, storagePath: `publicMenuDrafts/${sourceDraftId}/other.txt` },
    }, linkSource),
    null,
    'Link provenance must match the validated promoted Storage object',
);
assert.equal(
    normalizePublicDraftLinkSourceMetadataForProject({
        ...linkDraft,
        sourceMetadata: { ...linkDraft.sourceMetadata, sourceUrl: 'https://user:pass@example.com/menu' },
    }, linkSource),
    null,
    'Credential-bearing provenance URLs must fail closed',
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
