import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';

export const ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS = {
    DAILY_ACCEPTED_EVENTS: 100,
    MAX_CHANGED_FILE_PATHS: 100,
    MAX_EVENT_BODY_CHARS: 20_000,
    MAX_PENDING_REPOSITORIES: 100,
    MAX_PULL_REQUEST_LABELS: 10,
    MAX_RECENT_DELIVERIES: 50,
    MAX_SELECTED_REPOSITORIES: 10,
    MAX_WEBHOOK_BYTES: 1024 * 1024,
    PROCESSING_LEASE_SECONDS: 10 * 60,
    SETUP_STATE_SECONDS: 10 * 60,
} as const;

const boundedText = (value: unknown, maxLength: number): string => String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const boundedMultilineText = (value: unknown, maxLength: number): string => String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLength);

const GitHubRepositoryFullNameSchema = z.string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

const GitHubHttpsUrlSchema = z.string()
    .trim()
    .max(500)
    .url()
    .refine((value) => {
        try {
            const parsed = new URL(value);
            return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'github.com';
        } catch {
            return false;
        }
    });

export const AnswerlatticeGitHubRepositorySchema = z.object({
    id: z.number().int().positive(),
    fullName: GitHubRepositoryFullNameSchema,
    private: z.boolean(),
    defaultBranch: z.string().trim().min(1).max(180),
    htmlUrl: GitHubHttpsUrlSchema,
}).strict();

export type AnswerlatticeGitHubRepository = z.infer<typeof AnswerlatticeGitHubRepositorySchema>;

export const AnswerlatticeGitHubConnectionSettingsSchema = z.object({
    importPublishedReleases: z.boolean().default(true),
    importMergedPullRequests: z.boolean().default(false),
    requiredPullRequestLabels: z.array(z.string().trim().min(1).max(80))
        .max(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_PULL_REQUEST_LABELS)
        .default([]),
}).strict().superRefine((value, context) => {
    if (!value.importPublishedReleases && !value.importMergedPullRequests) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enable published releases or merged pull requests.',
        });
    }
    const normalized = value.requiredPullRequestLabels.map(label => label.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pull request labels must be unique.',
        });
    }
});

export type AnswerlatticeGitHubConnectionSettings = z.infer<typeof AnswerlatticeGitHubConnectionSettingsSchema>;

export const AnswerlatticeGitHubConnectionUpdateSchema = z.object({
    selectedRepositoryIds: z.array(z.number().int().positive())
        .min(1)
        .max(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_SELECTED_REPOSITORIES),
    settings: AnswerlatticeGitHubConnectionSettingsSchema,
}).strict().superRefine((value, context) => {
    if (new Set(value.selectedRepositoryIds).size !== value.selectedRepositoryIds.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Repositories must be unique.',
        });
    }
});

export type AnswerlatticeGitHubConnectionUpdate = z.infer<typeof AnswerlatticeGitHubConnectionUpdateSchema>;

export const ANSWERLATTICE_GITHUB_CONNECTION_STATUSES = [
    'disconnected',
    'pending_repository_selection',
    'connected',
    'needs_reconnect',
    'suspended',
] as const;

export type AnswerlatticeGitHubConnectionStatus = typeof ANSWERLATTICE_GITHUB_CONNECTION_STATUSES[number];

export type AnswerlatticeGitHubConnectionView = {
    available: boolean;
    status: AnswerlatticeGitHubConnectionStatus;
    accountLogin: string | null;
    accountType: string | null;
    selectedRepositories: AnswerlatticeGitHubRepository[];
    pendingRepositories: AnswerlatticeGitHubRepository[];
    pendingExpiresAt: string | null;
    settings: AnswerlatticeGitHubConnectionSettings;
    lastEventAt: string | null;
    lastEventKind: 'release' | 'pull_request' | null;
    lastEventRepository: string | null;
    lastEventResult: 'imported' | 'duplicate' | 'ignored' | 'capped' | 'failed' | null;
    lastImportedJobId: string | null;
};

const ANSWERLATTICE_GITHUB_SETUP_PURPOSES = ['install', 'verify_installation'] as const;
type AnswerlatticeGitHubSetupPurpose = typeof ANSWERLATTICE_GITHUB_SETUP_PURPOSES[number];

type AnswerlatticeGitHubSetupStatePayload = {
    sub: 'answerlattice_github_change_intake';
    purpose: AnswerlatticeGitHubSetupPurpose;
    actorId: string;
    tId: number;
    sId: number;
    nonce: string;
    installationId?: number;
    iat: number;
    exp: number;
};

const parseSetupStatePayload = (value: unknown, nowSeconds: number): AnswerlatticeGitHubSetupStatePayload | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const payload = value as Record<string, unknown>;
    const allowedKeys = new Set(['sub', 'purpose', 'actorId', 'tId', 'sId', 'nonce', 'installationId', 'iat', 'exp']);
    if (Object.keys(payload).some(key => !allowedKeys.has(key))) return null;
    if (payload.sub !== 'answerlattice_github_change_intake') return null;
    if (!ANSWERLATTICE_GITHUB_SETUP_PURPOSES.includes(payload.purpose as AnswerlatticeGitHubSetupPurpose)) return null;
    if (typeof payload.actorId !== 'string' || !payload.actorId.trim() || payload.actorId.length > 180) return null;
    if (
        typeof payload.tId !== 'number'
        || typeof payload.sId !== 'number'
        || !Number.isSafeInteger(payload.tId)
        || !Number.isSafeInteger(payload.sId)
        || payload.tId <= 0
        || payload.sId <= 0
    ) return null;
    if (typeof payload.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(payload.nonce)) return null;
    if (
        typeof payload.iat !== 'number'
        || typeof payload.exp !== 'number'
        || !Number.isSafeInteger(payload.iat)
        || !Number.isSafeInteger(payload.exp)
        || payload.iat > nowSeconds + 60
        || payload.exp <= nowSeconds
        || payload.exp <= payload.iat
        || payload.exp - payload.iat > ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.SETUP_STATE_SECONDS
    ) return null;
    if (payload.purpose === 'verify_installation') {
        if (
            typeof payload.installationId !== 'number'
            || !Number.isSafeInteger(payload.installationId)
            || payload.installationId <= 0
        ) return null;
    } else if (payload.installationId !== undefined) {
        return null;
    }
    return payload as AnswerlatticeGitHubSetupStatePayload;
};

const setupStateSignature = (payloadPart: string, secret: string) => createHmac('sha256', secret)
    .update(payloadPart)
    .digest('base64url');

export const createAnswerlatticeGitHubSetupState = (params: {
    actorId: string;
    purpose: AnswerlatticeGitHubSetupPurpose;
    scope: { tId: number; sId: number };
    installationId?: number;
    secret: string;
    nowSeconds?: number;
}): string => {
    const secret = params.secret.trim();
    if (secret.length < 32) throw new Error('GitHub setup state secret must contain at least 32 characters.');
    const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);
    const payload: AnswerlatticeGitHubSetupStatePayload = {
        sub: 'answerlattice_github_change_intake',
        purpose: params.purpose,
        actorId: boundedText(params.actorId, 180),
        tId: params.scope.tId,
        sId: params.scope.sId,
        nonce: randomBytes(16).toString('hex'),
        ...(params.installationId ? { installationId: params.installationId } : {}),
        iat: nowSeconds,
        exp: nowSeconds + ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.SETUP_STATE_SECONDS,
    };
    if (!parseSetupStatePayload(payload, nowSeconds)) throw new Error('GitHub setup state is invalid.');
    const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${payloadPart}.${setupStateSignature(payloadPart, secret)}`;
};

export const verifyAnswerlatticeGitHubSetupState = (params: {
    expectedPurpose: AnswerlatticeGitHubSetupPurpose;
    secret: string;
    token: string | null | undefined;
    nowSeconds?: number;
}): AnswerlatticeGitHubSetupStatePayload | null => {
    const secret = params.secret.trim();
    const token = params.token || '';
    if (secret.length < 32 || !token || token.length > 4096) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadPart, signature] = parts;
    if (
        !payloadPart
        || !signature
        || payloadPart.length > 3072
        || signature.length > 128
        || !/^[A-Za-z0-9_-]+$/.test(payloadPart)
        || !/^[A-Za-z0-9_-]+$/.test(signature)
    ) return null;
    const expected = setupStateSignature(payloadPart, secret);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    try {
        const payload = parseSetupStatePayload(
            JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')),
            params.nowSeconds ?? Math.floor(Date.now() / 1000),
        );
        return payload?.purpose === params.expectedPurpose ? payload : null;
    } catch {
        return null;
    }
};

const GitHubWebhookRepositorySchema = z.object({
    id: z.number().int().positive(),
    full_name: GitHubRepositoryFullNameSchema,
    private: z.boolean(),
    default_branch: z.string().trim().min(1).max(180),
    html_url: GitHubHttpsUrlSchema,
}).passthrough();

const GitHubWebhookInstallationSchema = z.object({
    id: z.number().int().positive(),
}).passthrough();

export const AnswerlatticeGitHubReleaseWebhookSchema = z.object({
    action: z.string().trim().max(80),
    installation: GitHubWebhookInstallationSchema,
    repository: GitHubWebhookRepositorySchema,
    release: z.object({
        id: z.number().int().positive(),
        tag_name: z.string().trim().min(1).max(180),
        name: z.string().max(300).nullable().optional(),
        body: z.string().max(500_000).nullable().optional(),
        html_url: GitHubHttpsUrlSchema,
        target_commitish: z.string().max(180).nullable().optional(),
        published_at: z.string().datetime().nullable().optional(),
        draft: z.boolean(),
        prerelease: z.boolean(),
    }).passthrough(),
}).passthrough();

export const AnswerlatticeGitHubPullRequestWebhookSchema = z.object({
    action: z.string().trim().max(80),
    installation: GitHubWebhookInstallationSchema,
    repository: GitHubWebhookRepositorySchema,
    pull_request: z.object({
        id: z.number().int().positive(),
        number: z.number().int().positive(),
        title: z.string().trim().min(1).max(500),
        body: z.string().max(500_000).nullable().optional(),
        html_url: GitHubHttpsUrlSchema,
        merged: z.boolean().nullable(),
        merged_at: z.string().datetime().nullable().optional(),
        merge_commit_sha: z.string().max(100).nullable().optional(),
        changed_files: z.number().int().min(0).max(1_000_000).optional(),
        base: z.object({ ref: z.string().trim().min(1).max(180) }).passthrough(),
        user: z.object({ login: z.string().trim().min(1).max(180) }).passthrough(),
        labels: z.array(z.object({ name: z.string().trim().min(1).max(80) }).passthrough()).max(100),
    }).passthrough(),
}).passthrough();

export const AnswerlatticeGitHubInstallationWebhookSchema = z.object({
    action: z.enum(['deleted', 'suspend', 'unsuspend']),
    installation: GitHubWebhookInstallationSchema,
}).passthrough();

const GitHubWebhookRepositoryIdentitySchema = z.object({
    id: z.number().int().positive(),
}).passthrough();

export const AnswerlatticeGitHubInstallationRepositoriesWebhookSchema = z.object({
    action: z.enum(['added', 'removed']),
    installation: GitHubWebhookInstallationSchema,
    repositories_added: z.array(GitHubWebhookRepositoryIdentitySchema)
        .max(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_PENDING_REPOSITORIES)
        .default([]),
    repositories_removed: z.array(GitHubWebhookRepositoryIdentitySchema)
        .max(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_PENDING_REPOSITORIES)
        .default([]),
}).passthrough();

export type AnswerlatticeGitHubReleaseWebhook = z.infer<typeof AnswerlatticeGitHubReleaseWebhookSchema>;
export type AnswerlatticeGitHubPullRequestWebhook = z.infer<typeof AnswerlatticeGitHubPullRequestWebhookSchema>;

export type AnswerlatticeGitHubChangedFile = {
    filename: string;
};

export type AnswerlatticeGitHubSelectedRepositoryPolicy = AnswerlatticeGitHubRepository & {
    settings: AnswerlatticeGitHubConnectionSettings;
};

export const shouldAcceptAnswerlatticeGitHubRelease = (
    event: AnswerlatticeGitHubReleaseWebhook,
    policy: AnswerlatticeGitHubSelectedRepositoryPolicy,
): boolean => policy.settings.importPublishedReleases
    && event.action === 'published'
    && event.release.draft === false
    && event.repository.id === policy.id;

export const shouldAcceptAnswerlatticeGitHubPullRequest = (
    event: AnswerlatticeGitHubPullRequestWebhook,
    policy: AnswerlatticeGitHubSelectedRepositoryPolicy,
): boolean => {
    if (
        !policy.settings.importMergedPullRequests
        || event.action !== 'closed'
        || event.pull_request.merged !== true
        || !event.pull_request.merged_at
        || event.repository.id !== policy.id
        || event.pull_request.base.ref !== policy.defaultBranch
    ) return false;
    const requiredLabels = policy.settings.requiredPullRequestLabels.map(label => label.toLowerCase());
    if (requiredLabels.length === 0) return true;
    const labels = new Set(event.pull_request.labels.map(label => label.name.toLowerCase()));
    return requiredLabels.some(label => labels.has(label));
};

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const hashAnswerlatticeGitHubDeliveryId = (deliveryId: string): string => sha256(deliveryId.trim());

export const getAnswerlatticeGitHubRollingJobId = (params: {
    scope: { tId: number; sId: number };
    monthKey: string;
    slot: number;
}): string => {
    if (!/^\d{4}-\d{2}$/.test(params.monthKey)) throw new Error('Invalid GitHub intake month key.');
    if (!Number.isInteger(params.slot) || params.slot < 0 || params.slot > 99) throw new Error('Invalid GitHub intake job slot.');
    return `GH${sha256(`${params.scope.tId}:${params.scope.sId}:${params.monthKey}:${params.slot}`).slice(0, 18)}`;
};

export const getAnswerlatticeGitHubBindingId = (params: {
    repositoryId: number;
    scope: { tId: number; sId: number };
}): string => `ghb_${sha256(`${params.repositoryId}:${params.scope.tId}:${params.scope.sId}`).slice(0, 28)}`;

export type AnswerlatticeGitHubEvidence = {
    dedupeContentHash: string;
    title: string;
    originUrl: string;
    type: 'changelog' | 'product_note';
    contentText: string;
    tags: string[];
    metadata: Record<string, unknown>;
};

export const buildAnswerlatticeGitHubReleaseEvidence = (
    event: AnswerlatticeGitHubReleaseWebhook,
): AnswerlatticeGitHubEvidence => {
    const release = event.release;
    const title = boundedText(release.name || release.tag_name, 160) || release.tag_name;
    const contentText = [
        'GitHub published release',
        `Repository: ${event.repository.full_name}`,
        `Version: ${release.tag_name}`,
        `Title: ${title}`,
        `Published: ${release.published_at || 'Not provided'}`,
        `Target branch: ${boundedText(release.target_commitish || event.repository.default_branch, 180)}`,
        `Prerelease: ${release.prerelease ? 'Yes' : 'No'}`,
        '',
        'Release notes:',
        boundedMultilineText(release.body || 'No release notes provided.', ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_EVENT_BODY_CHARS),
    ].join('\n');
    return {
        dedupeContentHash: sha256(`release:${event.repository.id}:${release.id}:${release.published_at || release.tag_name}`),
        title: `Release ${release.tag_name}: ${title}`.slice(0, 160),
        originUrl: release.html_url,
        type: 'changelog',
        contentText,
        tags: ['github', 'release', ...(release.prerelease ? ['prerelease'] : [])],
        metadata: {
            provider: 'github',
            eventKind: 'release',
            repositoryId: event.repository.id,
            repository: event.repository.full_name,
            releaseId: release.id,
            tag: release.tag_name,
            publishedAt: release.published_at || null,
            targetBranch: release.target_commitish || event.repository.default_branch,
            prerelease: release.prerelease,
        },
    };
};

export const buildAnswerlatticeGitHubPullRequestEvidence = (params: {
    changedFiles: AnswerlatticeGitHubChangedFile[];
    event: AnswerlatticeGitHubPullRequestWebhook;
}): AnswerlatticeGitHubEvidence => {
    const pullRequest = params.event.pull_request;
    const files = params.changedFiles
        .map(file => boundedText(file.filename, 500))
        .filter(Boolean)
        .slice(0, ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_CHANGED_FILE_PATHS);
    const contentText = [
        'GitHub merged pull request',
        `Repository: ${params.event.repository.full_name}`,
        `Pull request: #${pullRequest.number} ${boundedText(pullRequest.title, 500)}`,
        `Merged: ${pullRequest.merged_at || 'Not provided'}`,
        `Author: ${pullRequest.user.login}`,
        `Base branch: ${pullRequest.base.ref}`,
        `Merge commit: ${boundedText(pullRequest.merge_commit_sha || 'Not provided', 100)}`,
        `Labels: ${pullRequest.labels.map(label => label.name).join(', ') || 'None'}`,
        `Changed files: ${pullRequest.changed_files ?? files.length}${(pullRequest.changed_files || 0) > files.length ? ` (showing first ${files.length})` : ''}`,
        '',
        'Description:',
        boundedMultilineText(pullRequest.body || 'No pull request description provided.', ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_EVENT_BODY_CHARS),
        '',
        'Changed file paths:',
        ...(files.length ? files.map(filename => `- ${filename}`) : ['- Not available']),
    ].join('\n');
    return {
        dedupeContentHash: sha256(`pull_request:${params.event.repository.id}:${pullRequest.id}:${pullRequest.merge_commit_sha || pullRequest.merged_at}`),
        title: `Merged #${pullRequest.number}: ${boundedText(pullRequest.title, 130)}`.slice(0, 160),
        originUrl: pullRequest.html_url,
        type: 'product_note',
        contentText,
        tags: ['github', 'merged-pr', ...pullRequest.labels.map(label => boundedText(label.name, 80))].slice(0, 20),
        metadata: {
            provider: 'github',
            eventKind: 'pull_request',
            repositoryId: params.event.repository.id,
            repository: params.event.repository.full_name,
            pullRequestId: pullRequest.id,
            pullRequestNumber: pullRequest.number,
            author: pullRequest.user.login,
            mergedAt: pullRequest.merged_at || null,
            mergeCommitSha: pullRequest.merge_commit_sha || null,
            baseBranch: pullRequest.base.ref,
            changedFileCount: pullRequest.changed_files ?? files.length,
            changedFilePathsStored: files.length,
            changedFilePathsTruncated: (pullRequest.changed_files || 0) > files.length,
        },
    };
};
