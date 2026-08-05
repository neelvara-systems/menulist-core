import assert from 'node:assert/strict';
import { CHANGELOG_TAG_OPTIONS } from '../../src/constants/changelog';
import {
    ANSWERLATTICE_CHANGELOG_MAX_FILES,
    AnswerlatticeChangelogActionResultSchema,
    isAnswerlatticeChangelogEntryPublished,
    normalizeAnswerlatticeStoredChangelogPage,
    parseAnswerlatticeChangelogAction,
} from '../../src/lib/answerlattice/changelogContracts';
import {
    ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY,
    ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_TTL_MS,
    buildAnswerlatticeReleaseEvidenceDocument,
    consumeAnswerlatticeReleaseEvidenceHandoff,
    createAnswerlatticeReleaseEvidenceHandoff,
    storeAnswerlatticeReleaseEvidenceHandoff,
} from '../../src/lib/answerlattice/releaseEvidenceHandoff';
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

const releaseEvidenceInput = {
    scopeKey: '1:101',
    sourceJobId: 'job12345678901234567',
    sourceId: 'kis_release_evidence_1',
    sourceTitle: 'Release 2.4.1',
    provider: 'github_export' as const,
    title: 'Faster imports',
    contentText: 'Imports are faster.\n\nNo migration is required.',
    versionLabel: '2.4.1',
    releasedAt: '2026-08-05T08:30:00.000Z',
    entityIds: ['imports', 'workspace-settings'],
    originUrl: 'https://github.com/example/product/releases/tag/2.4.1',
};
const handoffNow = Date.parse('2026-08-05T09:00:00.000Z');
const handoff = createAnswerlatticeReleaseEvidenceHandoff(releaseEvidenceInput, handoffNow);
assert.equal(handoff?.versionLabel, '2.4.1');
assert.equal(Date.parse(handoff?.expiresAt || '') - Date.parse(handoff?.preparedAt || ''), ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_TTL_MS);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, versionLabel: 'release-2.4.1' }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, entityIds: ['imports', 'imports'] }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, originUrl: 'javascript:alert(1)' }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, originUrl: 'http://localhost/release' }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, originUrl: 'https://github.com/example/product/releases?access_token=secret' }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, sourceId: 'unsafe/path' }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, contentText: 'x'.repeat(40_001) }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, title: '   ' }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, contentText: '\n\t' }, handoffNow), null);
assert.equal(createAnswerlatticeReleaseEvidenceHandoff({ ...releaseEvidenceInput, releasedAt: 'not-a-date' }, handoffNow), null);

const storageValues = new Map<string, string>();
const releaseEvidenceStorage = {
    getItem: (key: string) => storageValues.get(key) ?? null,
    setItem: (key: string, value: string) => { storageValues.set(key, value); },
    removeItem: (key: string) => { storageValues.delete(key); },
};
assert.equal(storeAnswerlatticeReleaseEvidenceHandoff(releaseEvidenceInput, releaseEvidenceStorage, handoffNow), true);
assert.equal(storageValues.has(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY), true);
assert.equal(
    consumeAnswerlatticeReleaseEvidenceHandoff('1:101', releaseEvidenceStorage, handoffNow + 1_000)?.sourceId,
    releaseEvidenceInput.sourceId,
);
assert.equal(consumeAnswerlatticeReleaseEvidenceHandoff('1:101', releaseEvidenceStorage, handoffNow + 1_001), null, 'handoff is one-time');

assert.equal(storeAnswerlatticeReleaseEvidenceHandoff(releaseEvidenceInput, releaseEvidenceStorage, handoffNow), true);
assert.equal(consumeAnswerlatticeReleaseEvidenceHandoff('1:102', releaseEvidenceStorage, handoffNow + 1_000), null, 'workspace mismatch fails closed');
assert.equal(storageValues.has(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY), false, 'wrong-workspace handoff is removed');

assert.equal(storeAnswerlatticeReleaseEvidenceHandoff(releaseEvidenceInput, releaseEvidenceStorage, handoffNow), true);
assert.equal(
    consumeAnswerlatticeReleaseEvidenceHandoff('1:101', releaseEvidenceStorage, handoffNow - 60_001),
    null,
    'handoffs issued too far in the future fail closed',
);

assert.equal(storeAnswerlatticeReleaseEvidenceHandoff(releaseEvidenceInput, releaseEvidenceStorage, handoffNow), true);
assert.equal(
    consumeAnswerlatticeReleaseEvidenceHandoff('1:101', releaseEvidenceStorage, handoffNow + ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_TTL_MS),
    null,
    'expired handoff is rejected',
);
releaseEvidenceStorage.setItem(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY, '{bad-json');
assert.equal(consumeAnswerlatticeReleaseEvidenceHandoff('1:101', releaseEvidenceStorage, handoffNow), null);
assert.equal(storageValues.has(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY), false, 'malformed handoff is removed');
assert.equal(storeAnswerlatticeReleaseEvidenceHandoff(releaseEvidenceInput, {
    getItem: () => null,
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => undefined,
}, handoffNow), false, 'browser storage failure is recoverable');
assert.equal(storeAnswerlatticeReleaseEvidenceHandoff(releaseEvidenceInput, releaseEvidenceStorage, handoffNow), true);
assert.equal(storeAnswerlatticeReleaseEvidenceHandoff({
    ...releaseEvidenceInput,
    contentText: '\u0001'.repeat(40_000),
}, releaseEvidenceStorage, handoffNow), false, 'serialized browser envelope remains bounded');
assert.equal(
    storageValues.has(ANSWERLATTICE_RELEASE_EVIDENCE_HANDOFF_STORAGE_KEY),
    false,
    'a failed store cannot leave an older release envelope available for later consumption',
);

assert.deepEqual(buildAnswerlatticeReleaseEvidenceDocument('<script>alert(1)</script>\n\nNo migration.'), {
    type: 'doc',
    content: [
        { type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'No migration.' }] },
    ],
}, 'release evidence is represented as text nodes, not interpreted HTML');

process.stdout.write('Answerlattice changelog contract tests passed.\n');
