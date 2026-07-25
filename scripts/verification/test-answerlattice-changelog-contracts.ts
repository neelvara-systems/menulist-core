import assert from 'node:assert/strict';
import { CHANGELOG_TAG_OPTIONS } from '../../src/constants/changelog';
import {
    ANSWERLATTICE_CHANGELOG_MAX_FILES,
    AnswerlatticeChangelogActionResultSchema,
    isAnswerlatticeChangelogEntryPublished,
    normalizeAnswerlatticeStoredChangelogPage,
    parseAnswerlatticeChangelogAction,
} from '../../src/lib/answerlattice/changelogContracts';
import { Timestamp } from 'firebase/firestore';

const entry = {
    title: 'Billing retry guidance',
    description: { type: 'doc', content: [{ type: 'paragraph' }] },
    tags: [CHANGELOG_TAG_OPTIONS[0]],
    releasedOn: '2026-07-11T10:00:00.000Z',
    published: true,
    version: '1.0.0',
    contextKeys: ['billing'],
    kbSources: [{ categoryId: 'billing', articleId: 'invoice-retry' }],
    youtubeLinks: ['https://www.youtube.com/watch?v=abc123'],
    files: [{ name: 'billing.png', size: 100, type: 'image/png', url: 'https://example.com/billing.png', uid: 'file-1' }],
    entityChanges: ['billing'],
    releaseId: 'release-1',
};
const scope = { tId: 1, sId: 101 };

const create = parseAnswerlatticeChangelogAction({ action: 'create', requestId: 'change_request_1', scope, entry });
assert.equal(create?.action, 'create');
assert.equal(parseAnswerlatticeChangelogAction({ action: 'create', requestId: 'change_request_1', entry }), null, 'initiating scope is required');
assert.equal(parseAnswerlatticeChangelogAction({ action: 'create', requestId: 'change_request_1', scope: { tId: 0, sId: 101 }, entry }), null);
assert.equal(parseAnswerlatticeChangelogAction({ action: 'create', requestId: 'change_request_1', scope, entry: { ...entry, unknown: true } }), null);
assert.equal(parseAnswerlatticeChangelogAction({ action: 'create', requestId: 'change_request_1', scope, entry: { ...entry, entityChanges: [] } }), null);
assert.equal(parseAnswerlatticeChangelogAction({ action: 'create', requestId: 'change_request_1', scope, entry: { ...entry, releaseId: null } }), null);
assert.equal(parseAnswerlatticeChangelogAction({ action: 'create', requestId: 'change_request_1', scope, entry: { ...entry, published: false, releaseId: null } })?.action, 'create');
assert.equal(isAnswerlatticeChangelogEntryPublished(entry), true);
assert.equal(isAnswerlatticeChangelogEntryPublished({ ...entry, published: false }), false);
assert.equal(isAnswerlatticeChangelogEntryPublished({ ...entry, releaseId: null }), false);
assert.equal(parseAnswerlatticeChangelogAction({
    action: 'create', requestId: 'change_request_1', scope, entry: {
        ...entry,
        files: Array.from({ length: ANSWERLATTICE_CHANGELOG_MAX_FILES + 1 }, (_, index) => ({
            name: `${index}.png`, size: 100, type: 'image/png', url: `https://example.com/${index}.png`, uid: `file-${index}`,
        })),
    },
}), null);
assert.equal(parseAnswerlatticeChangelogAction({ action: 'delete', requestId: 'delete_request_1', scope, entryId: 'unsafe/path' }), null);

const now = Timestamp.now();
const page = normalizeAnswerlatticeStoredChangelogPage({
    pId: 'AL', tId: 1, sId: 101, pageNumber: 1, nextPageId: null,
    entries: [{
        id: 'entry-1', ...entry, releasedOn: now, likes: 0, dislikes: 0,
        createdOn: now, createdBy: 'Owner', modifiedOn: now, modifiedBy: 'Owner',
    }],
    entryIds: ['entry-1'], createdOn: now, createdBy: 'Owner', modifiedOn: now, modifiedBy: 'Owner',
}, 'page_000001', { tId: 1, sId: 101 });
assert.equal(page?.entries[0]?.id, 'entry-1');
const legacyUnlinkedPage = normalizeAnswerlatticeStoredChangelogPage({
    pId: 'AL', tId: 1, sId: 101, pageNumber: 1, nextPageId: null,
    entries: [{
        id: 'legacy-entry', ...entry, releaseId: null, releasedOn: now, likes: 0, dislikes: 0,
        createdOn: now, createdBy: 'Owner', modifiedOn: now, modifiedBy: 'Owner',
    }],
    entryIds: ['legacy-entry'], createdOn: now, createdBy: 'Owner', modifiedOn: now, modifiedBy: 'Owner',
}, 'page_000001', { tId: 1, sId: 101 });
assert.equal(legacyUnlinkedPage?.entries[0]?.published, false, 'legacy versioned entries without release linkage must reopen as drafts');
assert.equal(normalizeAnswerlatticeStoredChangelogPage({ ...page, pId: 'ML' }, 'page_000001', { tId: 1, sId: 101 }), null);
assert.equal(AnswerlatticeChangelogActionResultSchema.safeParse({
    success: true, action: 'create', entryId: 'entry-1', pageId: 'page_000001', replayed: false, removedFileUrls: [], scope,
}).success, true);
assert.equal(AnswerlatticeChangelogActionResultSchema.safeParse({
    success: true, action: 'create', entryId: 'entry-1', pageId: 'page_000001', replayed: false, removedFileUrls: [],
}).success, false, 'mutation responses must acknowledge their exact workspace');

process.stdout.write('Answerlattice changelog contract tests passed.\n');
