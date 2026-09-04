import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import {
    canUseDeterministicMenuLinkTextExtraction,
    isAllowedMenuLinkTextArtifactPath,
} from '../../functions/src/logic/menuLinkTextExtraction';
import type { MenuImageProcessingJob } from '../../functions/src/types';

const buildJob = (overrides: Partial<MenuImageProcessingJob>): MenuImageProcessingJob => ({
    id: 'job-1',
    createdAt: Timestamp.fromMillis(0),
    files: [],
    jobMode: 'SINGLE_STORE',
    projectId: '14-default-22',
    sId: '22',
    status: 'pending',
    tId: '14',
    targetLanguages: [{ code: 'en', name: 'English' }],
    uId: 'owner-1',
    updatedAt: Timestamp.fromMillis(0),
    ...overrides,
});

const projectJob = buildJob({
    source: 'menu_link_import',
    sourceMetadata: {
        storagePath: 'menuLinkImports/14/22/14-default-22/job-1/source.txt',
    },
});

const publicDraftJob = buildJob({
    destination: {
        draftId: 'draft-2',
        sourceType: 'menu_link_import',
        type: 'public_menu_draft',
    },
    projectId: '0-public-draft-2-0',
    source: 'menu_link_import',
    sourceMetadata: {
        publicDraftId: 'draft-2',
        storagePath: 'publicMenuDrafts/draft-2/source.txt',
    },
});

assert.equal(
    isAllowedMenuLinkTextArtifactPath('job-1', projectJob, 'menuLinkImports/14/22/14-default-22/job-1/source.txt'),
    true,
);
assert.equal(
    isAllowedMenuLinkTextArtifactPath('job-2', publicDraftJob, 'publicMenuDrafts/draft-2/source.txt'),
    true,
);
assert.equal(
    isAllowedMenuLinkTextArtifactPath('job-2', publicDraftJob, 'publicMenuDrafts/draft-3/source.txt'),
    false,
);
assert.equal(
    isAllowedMenuLinkTextArtifactPath('job-2', {
        ...publicDraftJob,
        sourceMetadata: { ...publicDraftJob.sourceMetadata, publicDraftId: 'draft-3' },
    }, 'publicMenuDrafts/draft-2/source.txt'),
    false,
);
assert.equal(
    isAllowedMenuLinkTextArtifactPath('job-2', publicDraftJob, 'publicMenuDrafts/draft-2/../draft-3/source.txt'),
    false,
);
assert.equal(
    isAllowedMenuLinkTextArtifactPath('job-1', projectJob, 'projects/files/14/22/source.txt'),
    false,
);
assert.equal(
    isAllowedMenuLinkTextArtifactPath('job-2', projectJob, 'menuLinkImports/14/22/14-default-22/job-1/source.txt'),
    false,
);
assert.equal(canUseDeterministicMenuLinkTextExtraction(projectJob), true);
assert.equal(canUseDeterministicMenuLinkTextExtraction(buildJob({
    targetLanguages: [{ code: 'hi', name: 'Hindi' }],
})), false);
assert.equal(canUseDeterministicMenuLinkTextExtraction(buildJob({
    targetLanguages: [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
    ],
})), false);

console.log('Menu link import text artifact boundary tests passed');
