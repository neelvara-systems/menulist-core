import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Timestamp } from 'firebase/firestore';
import { runComparisonEngine } from '../../src/lib/extraction/comparisonEngine';
import { cloneFirestoreData } from '../../src/lib/extraction/cloneFirestoreData';
import { validateSaveExtractionReview } from '../../src/lib/extraction/schemas';
import {
    createReviewPreviewSession,
    resolveReviewPreviewSession,
    setAllPreviewApprovals,
    updateReviewPreviewSession,
} from '../../src/lib/extraction/reviewPreview';
import {
    buildExtractedProfileProjectPatch,
    preserveExistingProjectVisualDefaults,
} from '../../src/lib/extraction/projectVisualDefaults';
import { normalizeMenuProcessingJobStatus } from '../../src/lib/menu-extraction/menuProcessingJobStatusBoundary';
import { mergeMissingBusinessAttributeDefaults } from '../../src/data/shared/businessAttributeDefaults';

const root = process.cwd();
const hookPath = path.join(root, 'src/hooks/useMenuProcessingJob.ts');
const source = fs.readFileSync(hookPath, 'utf8');
const applyChangesSource = fs.readFileSync(path.join(root, 'src/lib/extraction/applyChanges.ts'), 'utf8');
const outletSaveSource = fs.readFileSync(path.join(root, 'src/app/api/projects/outlet-save/route.ts'), 'utf8');
const desktopReviewSource = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx'), 'utf8');
const desktopReviewModalSource = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewModal.tsx'), 'utf8');
const mobileReviewSource = fs.readFileSync(path.join(root, 'src/components/mobile/sheets/ExtractionReviewSheet.tsx'), 'utf8');
const mobileMenuSource = fs.readFileSync(path.join(root, 'src/components/mobile/screens/MobileMenuScreen.tsx'), 'utf8');
const desktopProjectsSource = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/index.tsx'), 'utf8');
const projectsDalSource = fs.readFileSync(path.join(root, 'src/database/projects/index.ts'), 'utf8');
const storesDalSource = fs.readFileSync(path.join(root, 'src/database/stores/index.tsx'), 'utf8');
const jobId = 'A1234567890123456789';

const nestedTimestamp = Timestamp.fromMillis(123_456_789);
const originalFirestoreData = {
    files: [{ createdAt: nestedTimestamp, nested: { labels: ['one'] } }],
};
const clonedFirestoreData = cloneFirestoreData(originalFirestoreData);
assert.notEqual(clonedFirestoreData, originalFirestoreData);
assert.notEqual(clonedFirestoreData.files, originalFirestoreData.files);
assert.notEqual(clonedFirestoreData.files[0].nested, originalFirestoreData.files[0].nested);
assert.equal(clonedFirestoreData.files[0].createdAt instanceof Timestamp, true, 'review cloning must preserve nested Firestore Timestamp values');
assert.equal(clonedFirestoreData.files[0].createdAt.toMillis(), nestedTimestamp.toMillis());
const outletPatchReview = validateSaveExtractionReview({
    projectId: '1-1234567890-2',
    jobId,
    mode: 'OUTLET_LINKED',
    outletMutations: {
        upsertLocalCategories: [],
        upsertLocalItems: [{ id: 'L_I_1', price: '120' }],
        applyOverrides: [],
        stableIdAliases: { categoryAliases: [], itemAliases: [] },
    },
});
assert.equal(outletPatchReview.success, true, 'runtime save schema must accept patch-only local item updates');
assert.equal(validateSaveExtractionReview({
    projectId: '1-1234567890-2',
    jobId,
    mode: 'SINGLE_STORE',
    outletMutations: {
        upsertLocalCategories: [],
        upsertLocalItems: [],
        applyOverrides: [],
    },
}).success, false, 'runtime save schema must reject mutation buckets that disagree with mode');
assert.equal(validateSaveExtractionReview({
    projectId: '1-1234567890-2',
    jobId,
    mode: 'OUTLET_LINKED',
    outletMutations: {
        upsertLocalCategories: [],
        upsertLocalItems: [{ id: 'L_I_1', category: 'L_C_1' }],
        applyOverrides: [],
    },
}).success, false, 'partial local updates must not admit fields outside the patch contract');
assert.match(
    applyChangesSource,
    /runTransaction\(firebaseClient,[\s\S]*?transaction\.get\(projectRef\)[\s\S]*?transaction\.get\(jobRef\)[\s\S]*?assertOwnedPreviewJob\(currentJob,[\s\S]*?transaction\.update\(projectRef,[\s\S]*?transaction\.update\(jobRef,/,
    'standalone review apply must re-read and atomically update current project and job truth',
);
assert.doesNotMatch(applyChangesSource, /writeBatch\(firebaseClient\)/, 'review apply must not retain the stale pre-read batch path');
assert.match(
    applyChangesSource,
    /stats\.categoriesUpdated > 0[\s\S]*?stats\.itemsUpdated > 0[\s\S]*?linkedOutletProjectPayload = buildLinkedOutletProjectSavePayload/,
    'patch-only local category/item reviews must produce a linked-outlet save payload',
);
assert.match(
    applyChangesSource,
    /extractionReview:[\s\S]*?expectedChangeCount: appliedChangeCount,[\s\S]*?expectedLocalVersion,[\s\S]*?jobId/,
    'linked review save must send exact count, version and job identity to the server transaction',
);
assert.match(
    outletSaveSource,
    /extractionReviewJobRef[\s\S]*?transaction\.get\(extractionReviewJobRef\)[\s\S]*?reviewJob\.status !== "preview_ready"[\s\S]*?!reviewJob\.uId[\s\S]*?!sessionUserIds\.includes\(String\(reviewJob\.uId\)\)[\s\S]*?currentLocalVersion !== extractionReview\.expectedLocalVersion[\s\S]*?transaction\.update\(extractionReviewJobRef/,
    'linked review route must validate current job/version and complete the job in the project transaction',
);
assert.match(
    applyChangesSource,
    /if \(!jobData\.uId \|\| !sessionUserIds\.some\(\(userId\) => idsMatch\(jobData\.uId, userId\)\)\)/,
    'all client review apply/discard paths must fail closed when persisted owner identity is absent',
);
assert.match(desktopReviewModalSource, /key={getReviewPreviewIdentity\(projectId, jobId\)}/, 'desktop review state must remount for a different project/job identity');
assert.match(mobileMenuSource, /key={getReviewPreviewIdentity\(menuData\.projectId, activeProcessingJobId\)}/, 'mobile review state must remount for a different project/job identity');
assert.match(
    mobileMenuSource,
    /if \(jobIsFailed\) {[\s\S]*?logMobileMenuFailure\('mobile_menu_processing_job_failed', jobError,[\s\S]*?setFailureMessage\(t\('processingFailedMessage'\)\)/,
    'mobile terminal job failure must log bounded context and show only fixed translated owner copy',
);
assert.doesNotMatch(mobileMenuSource, /setFailureMessage\(jobError\?\.message/, 'mobile terminal job failure must not render persisted error text');
for (const reviewParentSource of [desktopProjectsSource, mobileMenuSource]) {
    assert.match(
        reviewParentSource,
        /updateProjectWithoutLoader\(patch, {[\s\S]*?preserveExistingVisualDefaults: true/,
        'extracted visual defaults must request transaction-current preserve-existing semantics',
    );
}
assert.match(
    projectsDalSource,
    /preserveExistingVisualDefaults[\s\S]*?preserveExistingProjectVisualDefaults\([\s\S]*?freshProject/,
    'standalone project persistence must resolve visual defaults against transaction-current project truth',
);
assert.match(
    outletSaveSource,
    /extractedVisualDefaults[\s\S]*?preserveExistingProjectVisualDefaults\(requestedVisualDefaultPatch, existingProject\)[\s\S]*?effectiveStandardProject\.aiPreferences/,
    'linked-outlet persistence must validate and resolve visual defaults against transaction-current project truth',
);
for (const reviewSource of [desktopReviewSource, mobileReviewSource]) {
    assert.match(reviewSource, /resolveReviewPreviewSession\(/, 'review surfaces must derive their preview from the current project/job identity');
    assert.match(reviewSource, /activeReviewIdentityRef\.current !== submittedReviewIdentity/, 'late review responses must not complete a replacement review');
}
for (const reviewParentSource of [desktopProjectsSource, mobileMenuSource]) {
    assert.match(
        reviewParentSource,
        /let comparisonEffectCancelled = false;[\s\S]*?await getLinkedMasterComparisonInput\([\s\S]*?if \(comparisonEffectCancelled\) return;[\s\S]*?setComparisonResult\(comparison\)[\s\S]*?comparisonEffectCancelled = true;/,
        'async comparison results must be cancelled before a replacement job/project can install stale review state',
    );
}

const validResult = {
    combinedData: {
        categories: [{ id: 1, sourceFileIndex: 0, name: { en: ' Starters ' } }],
        items: [{
            id: 2,
            sourceFileIndex: 0,
            name: ' Soup ',
            category: 1,
            price: 250,
            tags: { en: ' vegetarian, hot ' },
            attributes: [{ id: 1, name: { en: 'Large' }, price: 50 }],
        }],
        languages: [{ code: 'EN', name: 'English', isPrimary: true }],
        businessAttributeSuggestions: [{ key: 'vegetarian_options', value: true, confidence: 'high' }],
    },
    qualityScore: 95,
    qualityDetails: {
        categoryQuality: 90,
        itemQuality: 95,
        priceQuality: 100,
        descriptionQuality: 80,
    },
    processingTime: 1_250,
};

const visualDefaultsPatch = buildExtractedProfileProjectPatch({
    projectId: 'project_123',
    config: { design: { menu: { backgroundImage: 'owner-background.png' } } },
    aiPreferences: { image: { negativePrompt: 'owner prompt' } },
}, {
    visualBrand: {
        brandAccentColor: { field: 'brandAccentColor', value: '#123456', confidence: 'high' },
        imageBackgroundColor: { field: 'imageBackgroundColor', value: '#abcdef', confidence: 'high' },
    },
});
assert.deepEqual(visualDefaultsPatch, {
    projectId: 'project_123',
    config: { design: { brand: { accentColor: '#123456' } } },
    aiPreferences: { image: { backgroundColor: '#abcdef' } },
}, 'extracted defaults must not copy stale unrelated project maps into a later merge');
assert.ok(visualDefaultsPatch);
const preservedVisualDefaults = preserveExistingProjectVisualDefaults(
    visualDefaultsPatch,
    {
        projectId: 'project_123',
        config: { design: { brand: { accentColor: '#654321' } } },
        aiPreferences: { image: {} },
    },
);
assert.equal(preservedVisualDefaults.config?.design?.brand?.accentColor, undefined, 'a concurrent owner accent must win over an extracted default');
assert.equal(preservedVisualDefaults.aiPreferences?.image?.backgroundColor, '#abcdef');

const mergedBusinessAttributeDefaults = mergeMissingBusinessAttributeDefaults(
    { vegan_options: false, outdoor_seating: true },
    { vegan_options: true, delivery: true, forged_attribute: true },
    ['vegan_options', 'delivery'],
);
assert.deepEqual(mergedBusinessAttributeDefaults, {
    businessAttributes: {
        vegan_options: false,
        outdoor_seating: true,
        delivery: true,
    },
    changed: true,
}, 'transaction-current explicit choices and unrelated fields must survive allowed default insertion');
assert.deepEqual(
    mergeMissingBusinessAttributeDefaults(
        { vegan_options: false },
        { vegan_options: true },
        ['vegan_options'],
    ),
    { businessAttributes: { vegan_options: false }, changed: false },
    'an explicit transaction-current false value must block a stale inferred true default',
);
assert.match(storesDalSource, /transaction\.get\(storeRef\)[\s\S]*?mergeMissingBusinessAttributeDefaults\([\s\S]*?transaction\.update\(storeRef,/, 'business-attribute defaults must merge and write inside one current-store transaction');
assert.match(desktopProjectsSource, /applyStoreBusinessAttributeDefaults\(\{[\s\S]*?businessAttributes: nextBusinessAttributes/, 'desktop must use the current-store default DAL');
assert.match(mobileMenuSource, /applyStoreBusinessAttributeDefaults\(\{[\s\S]*?businessAttributes: nextBusinessAttributes/, 'mobile must use the current-store default DAL');
assert.doesNotMatch(desktopProjectsSource, /updateStore\(\{[\s\S]{0,180}?businessAttributes: nextBusinessAttributes/, 'desktop must not write a stale full business-attribute map');
assert.doesNotMatch(mobileMenuSource, /updateStore\(\{[\s\S]{0,180}?businessAttributes: nextBusinessAttributes/, 'mobile must not write a stale full business-attribute map');

const validPreview = normalizeMenuProcessingJobStatus(jobId, {
    projectId: 'project_123',
    status: 'preview_ready',
    progress: 100,
    currentStep: ' Ready ',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 2 },
    result: validResult,
});
assert.equal(validPreview.issueCode, undefined);
assert.equal(validPreview.job.status, 'preview_ready');
assert.equal(validPreview.job.currentStep, 'Ready');
assert.equal(validPreview.job.result?.combinedData?.categories[0].id, '1');
assert.deepEqual(validPreview.job.result?.combinedData?.items[0].name, { en: 'Soup' });
assert.equal(validPreview.job.result?.combinedData?.items[0].categoryId, '1');
assert.equal(validPreview.job.result?.combinedData?.items[0].categoryName, 'Starters');
assert.equal(validPreview.job.result?.combinedData?.items[0].price, '250');
assert.deepEqual(validPreview.job.result?.combinedData?.items[0].tags, ['vegetarian', 'hot']);
assert.equal(validPreview.job.result?.combinedData?.items[0].attributes?.[0].active, true);

for (const invalid of [
    null,
    { projectId: '../tenant-b', status: 'processing' },
    { projectId: 'project_123', status: 'unexpected' },
]) {
    const normalized = normalizeMenuProcessingJobStatus(jobId, invalid);
    assert.equal(normalized.issueCode, 'MENU_PROCESSING_JOB_DATA_INVALID');
    assert.equal(normalized.job.status, 'failed');
    assert.equal(normalized.job.projectId, '');
}

const malformedPreview = normalizeMenuProcessingJobStatus(jobId, {
    projectId: 'project_123',
    status: 'preview_ready',
    result: {
        ...validResult,
        combinedData: {
            ...validResult.combinedData,
            items: [{ ...validResult.combinedData.items[0], sourceFileIndex: 15 }],
        },
    },
});
assert.equal(malformedPreview.job.status, 'failed', 'untrusted preview data must never reach the comparison engine');
assert.equal(malformedPreview.job.result, undefined);

const coerciveQualityPreview = normalizeMenuProcessingJobStatus(jobId, {
    projectId: 'project_123',
    status: 'preview_ready',
    result: { ...validResult, qualityScore: '95' },
});
assert.equal(coerciveQualityPreview.job.status, 'failed', 'numeric strings must not satisfy the persisted result contract');

const validTwoBatchPreview = normalizeMenuProcessingJobStatus(jobId, {
    projectId: 'project_123',
    status: 'preview_ready',
    result: {
        ...validResult,
        combinedData: {
            ...validResult.combinedData,
            items: Array.from({ length: 1_001 }, (_, index) => ({
                id: index + 1,
                sourceFileIndex: index < 1_000 ? 0 : 10,
                name: { en: `Item ${index + 1}` },
                category: 1,
            })),
        },
    },
});
assert.equal(validTwoBatchPreview.job.status, 'preview_ready', 'the browser cap must admit the worker\'s valid aggregate across two provider batches');

const completedWithInvalidOptionalResult = normalizeMenuProcessingJobStatus(jobId, {
    projectId: 'project_123',
    status: 'completed',
    progress: 100,
    result: { ...validResult, processingTime: Number.NaN },
});
assert.equal(completedWithInvalidOptionalResult.issueCode, 'MENU_PROCESSING_JOB_DATA_INVALID');
assert.equal(completedWithInvalidOptionalResult.job.status, 'completed');
assert.equal(completedWithInvalidOptionalResult.job.result, undefined, 'bad optional metrics must be excluded without hiding a confirmed server save');

const comparison = runComparisonEngine({
    mode: 'SINGLE_STORE',
    primaryLang: 'en',
    extracted: {
        categories: [{ id: '1', name: { en: 'Starters' }, sourceFileIndex: 0 }],
        items: [
            {
                id: '1',
                name: { en: 'Soup' },
                categoryId: '1',
                categoryName: 'Starters',
                sourceFileIndex: 0,
                attributes: [{ id: 'large', name: { en: 'Large' }, price: '50', active: true }],
                tags: ['vegetarian'],
                dietaryTags: ['vegetarian'],
                spiceLevel: 'mild',
                duration: 10,
            },
            { id: '2', name: { en: 'Orphan' }, categoryId: 'missing', categoryName: '', sourceFileIndex: 0 },
            { id: '1', name: { en: 'Collision' }, categoryId: '1', categoryName: 'Starters', sourceFileIndex: 0 },
        ],
    },
    storeProject: { categories: [], items: [] },
});
assert.equal(comparison.preview.newItems.length, 1);
assert.equal(comparison.preview.ignored.length, 2);
assert.equal(comparison.preview.warnings.filter((warning) => warning.severity === 'HIGH').length, 2);
assert.equal(comparison.applyPlan.projectMutations?.upsertItems.length, 1, 'unsafe items must not enter the Firestore apply plan');
assert.deepEqual(
    comparison.applyPlan.projectMutations?.upsertItems[0].newItem,
    {
        id: '0i1',
        name: { en: 'Soup' },
        category: '0c1',
        attributes: [{ id: 'large', name: { en: 'Large' }, price: '50', active: true }],
        tags: ['vegetarian'],
        dietaryTags: ['vegetarian'],
        spiceLevel: 'mild',
        duration: 10,
        active: true,
        available: true,
    },
    're-extraction must preserve new-item metadata in the persisted apply plan',
);

const invalidPriceComparison = runComparisonEngine({
    mode: 'SINGLE_STORE',
    extracted: {
        categories: [{ id: '1', name: { en: 'Starters' }, sourceFileIndex: 0 }],
        items: [{ id: '1', name: { en: 'Soup' }, categoryId: '1', categoryName: 'Starters', price: 'Free 🎉', sourceFileIndex: 0 }],
    },
    storeProject: { categories: [], items: [] },
});
assert.equal(invalidPriceComparison.preview.warnings.length, 1);
assert.equal(invalidPriceComparison.applyPlan.projectMutations?.upsertItems[0].newItem?.price, undefined, 'a price reported as skipped must not enter a new-item write');

const firstReviewSession = updateReviewPreviewSession(
    createReviewPreviewSession('project-a', 'job-a', comparison.preview),
    'project-a',
    'job-a',
    comparison.preview,
    (preview) => setAllPreviewApprovals(preview, false),
);
assert.equal(firstReviewSession.preview.newItems[0].approved, false);
const replacementReviewSession = resolveReviewPreviewSession(
    firstReviewSession,
    'project-a',
    'job-b',
    invalidPriceComparison.preview,
);
assert.equal(replacementReviewSession.preview, invalidPriceComparison.preview, 'a replacement job must use its own preview instead of stale approval state');
const updatedReplacementSession = updateReviewPreviewSession(
    firstReviewSession,
    'project-a',
    'job-b',
    invalidPriceComparison.preview,
    (preview) => setAllPreviewApprovals(preview, false),
);
assert.equal(updatedReplacementSession.identity, replacementReviewSession.identity);
assert.equal(updatedReplacementSession.preview.newItems[0].extractedItem.name.en, 'Soup', 'the first replacement-job interaction must update the replacement preview');

const duplicateCategoryComparison = runComparisonEngine({
    mode: 'SINGLE_STORE',
    extracted: {
        categories: [
            { id: 'duplicate', name: { en: 'Starters' }, sourceFileIndex: 0 },
            { id: 'duplicate', name: { en: 'Mains' }, sourceFileIndex: 1 },
        ],
        items: [{ id: '1', name: { en: 'Soup' }, categoryId: 'duplicate', categoryName: 'Starters', sourceFileIndex: 0 }],
    },
    storeProject: { categories: [], items: [] },
});
assert.equal(duplicateCategoryComparison.applyPlan.projectMutations?.upsertCategories.length, 0);
assert.equal(duplicateCategoryComparison.applyPlan.projectMutations?.upsertItems.length, 0);
assert.equal(duplicateCategoryComparison.preview.warnings.filter((warning) => warning.severity === 'HIGH').length, 3);

const translatedUpdateComparison = runComparisonEngine({
    mode: 'SINGLE_STORE',
    matchConfig: { similarityThreshold: 0.8, weakMatchThreshold: 0.85 },
    extracted: {
        categories: [{ id: 'category-new', name: { en: 'Mains' }, sourceFileIndex: 0 }],
        items: [{
            id: 'item-new',
            name: { en: 'abcdefghix' },
            categoryId: 'category-new',
            categoryName: 'Mains',
            description: { en: 'New description' },
            sourceFileIndex: 0,
        }],
    },
    storeProject: {
        categories: [{ id: 'category-existing', name: { en: 'Mains', hi: 'मुख्य' }, fileUid: 'file-1' }],
        items: [{
            id: 'item-existing',
            name: { en: 'abcdefghij', hi: 'पुराना नाम' },
            category: 'category-existing',
            description: { en: 'Old description', hi: 'पुराना विवरण' },
            fileUid: 'file-1',
        }],
    },
});
assert.equal(translatedUpdateComparison.preview.updatedItems[0].matchType, 'strong', 'configured weak threshold must control match classification');
assert.deepEqual(translatedUpdateComparison.applyPlan.projectMutations?.upsertItems[0].patch, {
    name: { en: 'abcdefghix', hi: 'पुराना नाम' },
    description: { en: 'New description', hi: 'पुराना विवरण' },
});

const repeatedExistingMatch = runComparisonEngine({
    mode: 'SINGLE_STORE',
    matchConfig: { similarityThreshold: 0.8, weakMatchThreshold: 0.85 },
    extracted: {
        categories: [{ id: 'category-new', name: { en: 'Mains' }, sourceFileIndex: 0 }],
        items: [
            { id: '1', name: { en: 'abcdefghij' }, categoryId: 'category-new', categoryName: 'Mains', sourceFileIndex: 0 },
            { id: '2', name: { en: 'abcdefghix' }, categoryId: 'category-new', categoryName: 'Mains', sourceFileIndex: 0 },
        ],
    },
    storeProject: {
        categories: [{ id: 'category-existing', name: { en: 'Mains' }, fileUid: 'file-1' }],
        items: [{ id: 'item-existing', name: { en: 'abcdefghij' }, category: 'category-existing', fileUid: 'file-1' }],
    },
});
assert.equal(repeatedExistingMatch.preview.ignored.length, 1);
assert.equal(repeatedExistingMatch.applyPlan.projectMutations?.upsertItems.length, 0, 'a second extraction row must not update an already claimed persisted item');

const localPatchComparison = runComparisonEngine({
    mode: 'OUTLET_LINKED',
    extracted: {
        categories: [{ id: 'category-new', name: { en: 'Local' }, sourceFileIndex: 0 }],
        items: [{ id: 'item-new', name: { en: 'Local soup' }, categoryId: 'category-new', categoryName: 'Local', price: '120', sourceFileIndex: 0 }],
    },
    storeProject: {
        categories: [{ id: 'L_C_1', name: { en: 'Local' }, fileUid: 'local-file' }],
        items: [{
            id: 'L_I_1',
            name: { en: 'Local soup' },
            category: 'L_C_1',
            price: '100',
            description: { en: 'Owner description' },
            tags: ['owner-tag'],
            fileUid: 'local-file',
        }],
    },
    masterProject: { categories: [], items: [] },
});
assert.deepEqual(localPatchComparison.applyPlan.outletMutations?.upsertLocalItems, [{ id: 'L_I_1', price: '120' }], 'a local price review must not erase owner fields with undefined extraction values');

const preservedCategoryOrderComparison = runComparisonEngine({
    mode: 'SINGLE_STORE',
    extracted: {
        categories: [{ id: 'category-new', name: { en: 'Mains' }, sourceFileIndex: 0 }],
        items: [],
    },
    storeProject: {
        categories: [{ id: 'category-existing', name: { en: 'Mains' }, orderIndex: 5, fileUid: 'file-1' }],
        items: [],
    },
});
assert.equal(preservedCategoryOrderComparison.applyPlan.projectMutations?.upsertCategories.length, 0, 'an omitted extraction order must preserve the existing category order');

const weakCategoryNameComparison = runComparisonEngine({
    mode: 'SINGLE_STORE',
    matchConfig: { similarityThreshold: 0.8, weakMatchThreshold: 0.95 },
    extracted: {
        categories: [{ id: 'category-new', name: { en: 'abcdefghix' }, sourceFileIndex: 0 }],
        items: [],
    },
    storeProject: {
        categories: [{ id: 'category-existing', name: { en: 'abcdefghij', hi: 'पुराना' }, fileUid: 'file-1' }],
        items: [],
    },
});
assert.equal(weakCategoryNameComparison.preview.warnings.length, 1, 'a configured weak category match must remain owner-visible');
assert.equal(weakCategoryNameComparison.applyPlan.projectMutations?.upsertCategories.length, 0, 'a weak match must not rename a persisted category');

assert.match(
    source,
    /setJob\(null\);\s*setIsLoading\(true\);[\s\S]*?normalizeMenuExtractionJobId\(jobId\)/,
    'a new subscription must clear the previous listener value and validate the persisted job ID first',
);
assert.match(
    source,
    /normalizeMenuProcessingJobStatus\(snapshot\.id, snapshot\.data\(\)\)/,
    'Firestore snapshot data must cross the runtime normalization boundary',
);
assert.doesNotMatch(
    source,
    /snapshot\.data\(\)[\s\S]{0,120}as MenuProcessingJobStatus/,
    'the listener must not cast raw Firestore data into a trusted job contract',
);
assert.match(
    source,
    /menu_processing_listener_job_not_found[\s\S]*?setJob\(normalized\.job\)/,
    'a deleted remembered job must become a terminal local failure',
);
assert.match(
    source,
    /menu_processing_listener_failed[\s\S]*?setJob\(normalizeMenuProcessingJobStatus\(jobId, null\)\.job\);\s*setIsLoading\(false\);/,
    'listener errors must replace any previous value with a terminal local failure',
);
assert.match(
    source,
    /const currentJob = job\?\.id === jobId \? job : null;/,
    'render-time job selection must reject stale values from a prior job ID',
);
assert.match(source, /job: currentJob,/, 'consumers must receive only the ID-matched job');
assert.doesNotMatch(
    source.slice(source.indexOf('const currentJob ='), source.indexOf('export default')),
    /\bjob\?\.(?:status|progress|currentStep|result|error|fileResults|isFirstExtraction)/,
    'derived state must not bypass the ID-matched job projection',
);

console.log('Menu processing listener boundary checks passed.');
