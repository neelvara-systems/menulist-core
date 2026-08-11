import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS,
    AnswerlatticeGitHubConnectionSettingsSchema,
    AnswerlatticeGitHubConnectionUpdateSchema,
    AnswerlatticeGitHubInstallationRepositoriesWebhookSchema,
    AnswerlatticeGitHubPullRequestWebhookSchema,
    AnswerlatticeGitHubReleaseWebhookSchema,
    buildAnswerlatticeGitHubPullRequestEvidence,
    buildAnswerlatticeGitHubReleaseEvidence,
    createAnswerlatticeGitHubSetupState,
    getAnswerlatticeGitHubBindingId,
    getAnswerlatticeGitHubRollingJobId,
    hashAnswerlatticeGitHubDeliveryId,
    shouldAcceptAnswerlatticeGitHubPullRequest,
    shouldAcceptAnswerlatticeGitHubRelease,
    verifyAnswerlatticeGitHubSetupState,
} from '../../src/lib/answerlattice/githubChangeIntakeContracts';

const secret = 'answerlattice-github-state-secret-for-contract-tests';
const scope = { tId: 21, sId: 34 };
const repository = {
    id: 987,
    fullName: 'answerlattice/product-app',
    private: true,
    defaultBranch: 'main',
    htmlUrl: 'https://github.com/answerlattice/product-app',
};
const defaultSettings = {
    importPublishedReleases: true,
    importMergedPullRequests: false,
    requiredPullRequestLabels: [] as string[],
};

const installState = createAnswerlatticeGitHubSetupState({
    actorId: 'owner_123',
    purpose: 'install',
    scope,
    secret,
    nowSeconds: 1_800_000_000,
});
const verifiedInstallState = verifyAnswerlatticeGitHubSetupState({
    expectedPurpose: 'install',
    secret,
    token: installState,
    nowSeconds: 1_800_000_100,
});
assert.equal(verifiedInstallState?.actorId, 'owner_123');
assert.deepEqual({ tId: verifiedInstallState?.tId, sId: verifiedInstallState?.sId }, scope);
assert.equal(verifyAnswerlatticeGitHubSetupState({
    expectedPurpose: 'verify_installation',
    secret,
    token: installState,
    nowSeconds: 1_800_000_100,
}), null, 'state purpose must be exact');
assert.equal(verifyAnswerlatticeGitHubSetupState({
    expectedPurpose: 'install',
    secret: `${secret}-wrong`,
    token: installState,
    nowSeconds: 1_800_000_100,
}), null, 'wrong state secret must fail');
assert.equal(verifyAnswerlatticeGitHubSetupState({
    expectedPurpose: 'install',
    secret,
    token: installState,
    nowSeconds: 1_800_001_000,
}), null, 'expired state must fail');
const tamperedState = `${installState.slice(0, -1)}${installState.endsWith('A') ? 'B' : 'A'}`;
assert.equal(verifyAnswerlatticeGitHubSetupState({
    expectedPurpose: 'install',
    secret,
    token: tamperedState,
    nowSeconds: 1_800_000_100,
}), null, 'tampered state must fail');

const release = AnswerlatticeGitHubReleaseWebhookSchema.parse({
    action: 'published',
    installation: { id: 456 },
    repository: {
        id: repository.id,
        full_name: repository.fullName,
        private: repository.private,
        default_branch: repository.defaultBranch,
        html_url: repository.htmlUrl,
    },
    release: {
        id: 765,
        tag_name: 'v2.4.0',
        name: 'Faster imports',
        body: `Owner-visible change. ${'x'.repeat(25_000)} OMITTED_RELEASE_SUFFIX`,
        html_url: 'https://github.com/answerlattice/product-app/releases/tag/v2.4.0',
        target_commitish: 'main',
        published_at: '2026-08-11T10:00:00.000Z',
        draft: false,
        prerelease: false,
    },
});
assert.equal(shouldAcceptAnswerlatticeGitHubRelease(release, { ...repository, settings: defaultSettings }), true);
assert.equal(shouldAcceptAnswerlatticeGitHubRelease(
    { ...release, action: 'edited' },
    { ...repository, settings: defaultSettings },
), false);
const releaseEvidence = buildAnswerlatticeGitHubReleaseEvidence(release);
assert.equal(releaseEvidence.type, 'changelog');
assert.equal(releaseEvidence.contentText.includes('OMITTED_RELEASE_SUFFIX'), false, 'release body must be bounded');
assert.equal(releaseEvidence.metadata.repository, repository.fullName);

const pullRequest = AnswerlatticeGitHubPullRequestWebhookSchema.parse({
    action: 'closed',
    installation: { id: 456 },
    repository: {
        id: repository.id,
        full_name: repository.fullName,
        private: repository.private,
        default_branch: repository.defaultBranch,
        html_url: repository.htmlUrl,
    },
    pull_request: {
        id: 111,
        number: 42,
        title: 'Change import validation',
        body: 'Customer-visible validation behavior changed.',
        html_url: 'https://github.com/answerlattice/product-app/pull/42',
        merged: true,
        merged_at: '2026-08-11T11:00:00.000Z',
        merge_commit_sha: 'abcdef1234567890',
        changed_files: 120,
        base: { ref: 'main' },
        user: { login: 'owner' },
        labels: [{ name: 'customer-facing' }],
    },
});
const pullRequestSettings = {
    importPublishedReleases: true,
    importMergedPullRequests: true,
    requiredPullRequestLabels: ['customer-facing'],
};
assert.equal(shouldAcceptAnswerlatticeGitHubPullRequest(
    pullRequest,
    { ...repository, settings: pullRequestSettings },
), true);
assert.equal(shouldAcceptAnswerlatticeGitHubPullRequest(
    pullRequest,
    { ...repository, defaultBranch: 'production', settings: pullRequestSettings },
), false, 'merged PR must target the selected default branch');
assert.equal(shouldAcceptAnswerlatticeGitHubPullRequest(
    pullRequest,
    { ...repository, settings: { ...pullRequestSettings, requiredPullRequestLabels: ['docs-only'] } },
), false, 'required labels must be enforced');

const changedFiles = Array.from({ length: 120 }, (_, index) => ({ filename: `src/change-${index}.ts` }));
const pullRequestEvidence = buildAnswerlatticeGitHubPullRequestEvidence({ changedFiles, event: pullRequest });
assert.equal(pullRequestEvidence.type, 'product_note');
assert.equal(pullRequestEvidence.metadata.changedFilePathsStored, ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_CHANGED_FILE_PATHS);
assert.equal(pullRequestEvidence.contentText.includes('src/change-99.ts'), true);
assert.equal(pullRequestEvidence.contentText.includes('src/change-100.ts'), false, 'changed paths must be capped');
assert.equal(pullRequestEvidence.contentText.includes('patch'), false, 'evidence must not contain patch content');

assert.equal(AnswerlatticeGitHubConnectionSettingsSchema.safeParse({
    importPublishedReleases: false,
    importMergedPullRequests: false,
    requiredPullRequestLabels: [],
}).success, false, 'at least one event kind must remain enabled');
assert.equal(AnswerlatticeGitHubConnectionSettingsSchema.safeParse({
    importPublishedReleases: true,
    importMergedPullRequests: true,
    requiredPullRequestLabels: ['Docs', 'docs'],
}).success, false, 'labels must be unique case-insensitively');
assert.equal(AnswerlatticeGitHubConnectionUpdateSchema.safeParse({
    selectedRepositoryIds: [repository.id, repository.id],
    settings: defaultSettings,
}).success, false, 'selected repositories must be unique');

assert.equal(AnswerlatticeGitHubInstallationRepositoriesWebhookSchema.safeParse({
    action: 'removed',
    installation: { id: 456 },
    repositories_added: [],
    repositories_removed: [{ id: repository.id }],
}).success, true);
assert.equal(AnswerlatticeGitHubInstallationRepositoriesWebhookSchema.safeParse({
    action: 'removed',
    installation: { id: 456 },
    repositories_removed: Array.from({ length: 101 }, (_, index) => ({ id: index + 1 })),
}).success, false, 'repository lifecycle fanout must be capped');

const jobId = getAnswerlatticeGitHubRollingJobId({ scope, monthKey: '2026-08', slot: 0 });
assert.match(jobId, /^[A-Za-z0-9]{20}$/);
assert.equal(jobId, getAnswerlatticeGitHubRollingJobId({ scope, monthKey: '2026-08', slot: 0 }));
assert.notEqual(jobId, getAnswerlatticeGitHubRollingJobId({ scope, monthKey: '2026-08', slot: 1 }));
assert.equal(
    getAnswerlatticeGitHubBindingId({ repositoryId: repository.id, scope }),
    getAnswerlatticeGitHubBindingId({ repositoryId: repository.id, scope }),
);
assert.match(hashAnswerlatticeGitHubDeliveryId('delivery-123'), /^[a-f0-9]{64}$/);

console.log('Answerlattice GitHub change intake contract tests passed.');
