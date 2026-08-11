import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeServerEnv } from '@lib/env/answerlatticeServerEnv';
import { requireAnswerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash, createSign } from 'crypto';
import { z } from 'zod';
import {
    addKnowledgeSource,
    ensureKnowledgeIntakeJob,
} from './knowledgeIntake';
import { hasActiveAnswerlatticeKnowledgeIntakeLicense } from './knowledgeIntakeApi';
import {
    buildAnswerlatticeIntegrationConfigIdentity,
    classifyAnswerlatticeIntegrationConfigOwnership,
} from './integrationConfigOwnership';
import {
    ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS,
    ANSWERLATTICE_GITHUB_CONNECTION_STATUSES,
    AnswerlatticeGitHubConnectionSettingsSchema,
    AnswerlatticeGitHubRepositorySchema,
    buildAnswerlatticeGitHubPullRequestEvidence,
    buildAnswerlatticeGitHubReleaseEvidence,
    getAnswerlatticeGitHubBindingId,
    getAnswerlatticeGitHubRollingJobId,
    hashAnswerlatticeGitHubDeliveryId,
    shouldAcceptAnswerlatticeGitHubPullRequest,
    shouldAcceptAnswerlatticeGitHubRelease,
    type AnswerlatticeGitHubChangedFile,
    type AnswerlatticeGitHubConnectionSettings,
    type AnswerlatticeGitHubConnectionStatus,
    type AnswerlatticeGitHubConnectionUpdate,
    type AnswerlatticeGitHubConnectionView,
    type AnswerlatticeGitHubEvidence,
    type AnswerlatticeGitHubPullRequestWebhook,
    type AnswerlatticeGitHubReleaseWebhook,
    type AnswerlatticeGitHubRepository,
} from './githubChangeIntakeContracts';

const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_PROVIDER_TIMEOUT_MS = 12_000;
const GITHUB_PROVIDER_RESPONSE_MAX_BYTES = 512 * 1024;
const GITHUB_GRAPHQL_RESPONSE_MAX_BYTES = 128 * 1024;
const GITHUB_BINDING_QUERY_LIMIT = 21;
const GITHUB_JOB_SLOT_LIMIT = 64;

type GitHubConnectionEventKind = 'release' | 'pull_request';
type GitHubDeliveryResult = 'imported' | 'duplicate' | 'ignored' | 'capped' | 'failed';
type GitHubDeliveryStatus = 'processing' | GitHubDeliveryResult;

type StoredDelivery = {
    idHash: string;
    repositoryId: number;
    kind: GitHubConnectionEventKind;
    status: GitHubDeliveryStatus;
    claimedAt: string;
    completedAt: string | null;
};

type StoredGitHubChangeIntake = {
    schemaVersion: 1;
    status: AnswerlatticeGitHubConnectionStatus;
    installationId: number | null;
    accountLogin: string | null;
    accountType: string | null;
    selectedRepositories: AnswerlatticeGitHubRepository[];
    pendingInstallationId: number | null;
    pendingAccountLogin: string | null;
    pendingAccountType: string | null;
    pendingRepositories: AnswerlatticeGitHubRepository[];
    pendingExpiresAt: string | null;
    settings: AnswerlatticeGitHubConnectionSettings;
    recentDeliveries: StoredDelivery[];
    dailyEventDate: string | null;
    dailyEventCount: number;
    connectedAt: string | null;
    connectedBy: string | null;
    modifiedAt: string;
    modifiedBy: string | null;
    lastEventAt: string | null;
    lastEventKind: GitHubConnectionEventKind | null;
    lastEventRepository: string | null;
    lastEventResult: GitHubDeliveryResult | null;
    lastImportedJobId: string | null;
    rollingJobMonth: string | null;
    rollingJobSlot: number;
};

type GitHubBinding = {
    id: string;
    pId: typeof PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    scopeKey: string;
    installationId: number;
    repository: AnswerlatticeGitHubRepository;
    settings: AnswerlatticeGitHubConnectionSettings;
    status: 'connected' | 'suspended';
};

type GitHubProviderConfig = {
    appClientId: string;
    appClientSecret: string;
    appId: number;
    appPrivateKey: string;
    appSlug: string;
    stateSecret: string;
    webhookSecret: string;
};

const defaultSettings = (): AnswerlatticeGitHubConnectionSettings => ({
    importPublishedReleases: true,
    importMergedPullRequests: false,
    requiredPullRequestLabels: [],
});

const nowIso = () => new Date().toISOString();
const utcDateKey = (value = new Date()) => value.toISOString().slice(0, 10);
const utcMonthKey = (value = new Date()) => value.toISOString().slice(0, 7);
const scopeKey = (scope: { tId: number; sId: number }) => `${scope.tId}:${scope.sId}`;
const configDocId = (scope: { tId: number; sId: number }) => `integrationConfig_${scope.tId}_${scope.sId}`;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const normalizeIso = (value: unknown): string | null => {
    if (typeof value === 'string' && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
    try {
        if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
            return (value as { toDate: () => Date }).toDate().toISOString();
        }
    } catch {
        return null;
    }
    return null;
};

const normalizeConnectionStatus = (value: unknown): AnswerlatticeGitHubConnectionStatus => (
    ANSWERLATTICE_GITHUB_CONNECTION_STATUSES.includes(value as AnswerlatticeGitHubConnectionStatus)
        ? value as AnswerlatticeGitHubConnectionStatus
        : 'disconnected'
);

const normalizeRepositories = (value: unknown, max: number): AnswerlatticeGitHubRepository[] => {
    const result: AnswerlatticeGitHubRepository[] = [];
    const seen = new Set<number>();
    for (const candidate of Array.isArray(value) ? value : []) {
        const parsed = AnswerlatticeGitHubRepositorySchema.safeParse(candidate);
        if (!parsed.success || seen.has(parsed.data.id)) continue;
        seen.add(parsed.data.id);
        result.push(parsed.data);
        if (result.length >= max) break;
    }
    return result;
};

const normalizeDeliveries = (value: unknown): StoredDelivery[] => {
    const deliveries: StoredDelivery[] = [];
    const seen = new Set<string>();
    for (const candidate of Array.isArray(value) ? value : []) {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
        const item = candidate as Record<string, unknown>;
        const idHash = typeof item.idHash === 'string' && /^[a-f0-9]{64}$/.test(item.idHash) ? item.idHash : '';
        const repositoryId = typeof item.repositoryId === 'number' && Number.isSafeInteger(item.repositoryId) && item.repositoryId > 0
            ? item.repositoryId
            : 0;
        const kind = item.kind === 'release' || item.kind === 'pull_request' ? item.kind : null;
        const status = ['processing', 'imported', 'duplicate', 'ignored', 'capped', 'failed'].includes(String(item.status || ''))
            ? item.status as GitHubDeliveryStatus
            : null;
        const claimedAt = normalizeIso(item.claimedAt);
        if (!idHash || !repositoryId || !kind || !status || !claimedAt || seen.has(idHash)) continue;
        seen.add(idHash);
        deliveries.push({
            idHash,
            repositoryId,
            kind,
            status,
            claimedAt,
            completedAt: normalizeIso(item.completedAt),
        });
    }
    return deliveries.slice(-ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_RECENT_DELIVERIES);
};

const normalizeStoredConnection = (value: unknown): StoredGitHubChangeIntake => {
    const data = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const settings = AnswerlatticeGitHubConnectionSettingsSchema.safeParse(data.settings);
    const installationId = typeof data.installationId === 'number'
        && Number.isSafeInteger(data.installationId)
        && data.installationId > 0
        ? data.installationId
        : null;
    const pendingInstallationId = typeof data.pendingInstallationId === 'number'
        && Number.isSafeInteger(data.pendingInstallationId)
        && data.pendingInstallationId > 0
        ? data.pendingInstallationId
        : null;
    const eventKind = data.lastEventKind === 'release' || data.lastEventKind === 'pull_request'
        ? data.lastEventKind
        : null;
    const eventResult = ['imported', 'duplicate', 'ignored', 'capped', 'failed'].includes(String(data.lastEventResult || ''))
        ? data.lastEventResult as GitHubDeliveryResult
        : null;
    return {
        schemaVersion: 1,
        status: normalizeConnectionStatus(data.status),
        installationId,
        accountLogin: typeof data.accountLogin === 'string' ? data.accountLogin.slice(0, 180) : null,
        accountType: typeof data.accountType === 'string' ? data.accountType.slice(0, 80) : null,
        selectedRepositories: normalizeRepositories(
            data.selectedRepositories,
            ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_SELECTED_REPOSITORIES,
        ),
        pendingInstallationId,
        pendingAccountLogin: typeof data.pendingAccountLogin === 'string' ? data.pendingAccountLogin.slice(0, 180) : null,
        pendingAccountType: typeof data.pendingAccountType === 'string' ? data.pendingAccountType.slice(0, 80) : null,
        pendingRepositories: normalizeRepositories(
            data.pendingRepositories,
            ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_PENDING_REPOSITORIES,
        ),
        pendingExpiresAt: normalizeIso(data.pendingExpiresAt),
        settings: settings.success ? settings.data : defaultSettings(),
        recentDeliveries: normalizeDeliveries(data.recentDeliveries),
        dailyEventDate: typeof data.dailyEventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.dailyEventDate)
            ? data.dailyEventDate
            : null,
        dailyEventCount: typeof data.dailyEventCount === 'number'
            && Number.isSafeInteger(data.dailyEventCount)
            && data.dailyEventCount >= 0
            ? Math.min(data.dailyEventCount, ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.DAILY_ACCEPTED_EVENTS)
            : 0,
        connectedAt: normalizeIso(data.connectedAt),
        connectedBy: typeof data.connectedBy === 'string' ? data.connectedBy.slice(0, 180) : null,
        modifiedAt: normalizeIso(data.modifiedAt) || nowIso(),
        modifiedBy: typeof data.modifiedBy === 'string' ? data.modifiedBy.slice(0, 180) : null,
        lastEventAt: normalizeIso(data.lastEventAt),
        lastEventKind: eventKind,
        lastEventRepository: typeof data.lastEventRepository === 'string'
            ? data.lastEventRepository.slice(0, 200)
            : null,
        lastEventResult: eventResult,
        lastImportedJobId: typeof data.lastImportedJobId === 'string' && /^[A-Za-z0-9]{20}$/.test(data.lastImportedJobId)
            ? data.lastImportedJobId
            : null,
        rollingJobMonth: typeof data.rollingJobMonth === 'string' && /^\d{4}-\d{2}$/.test(data.rollingJobMonth)
            ? data.rollingJobMonth
            : null,
        rollingJobSlot: typeof data.rollingJobSlot === 'number'
            && Number.isSafeInteger(data.rollingJobSlot)
            && data.rollingJobSlot >= 0
            && data.rollingJobSlot < GITHUB_JOB_SLOT_LIMIT
            ? data.rollingJobSlot
            : 0,
    };
};

const projectConnectionView = (
    connection: StoredGitHubChangeIntake,
    available: boolean,
): AnswerlatticeGitHubConnectionView => {
    const pendingIsActive = Boolean(
        connection.pendingInstallationId
        && connection.pendingExpiresAt
        && Date.parse(connection.pendingExpiresAt) > Date.now()
        && connection.pendingRepositories.length > 0,
    );
    const status = connection.status === 'pending_repository_selection' && !pendingIsActive
        ? 'disconnected'
        : connection.status;
    return {
        available,
        status,
        accountLogin: pendingIsActive ? connection.pendingAccountLogin : connection.accountLogin,
        accountType: pendingIsActive ? connection.pendingAccountType : connection.accountType,
        selectedRepositories: connection.selectedRepositories,
        pendingRepositories: pendingIsActive ? connection.pendingRepositories : [],
        pendingExpiresAt: pendingIsActive ? connection.pendingExpiresAt : null,
        settings: connection.settings,
        lastEventAt: connection.lastEventAt,
        lastEventKind: connection.lastEventKind,
        lastEventRepository: connection.lastEventRepository,
        lastEventResult: connection.lastEventResult,
        lastImportedJobId: connection.lastImportedJobId,
    };
};

const readProviderConfig = (): GitHubProviderConfig | null => {
    const appId = Number(answerlatticeServerEnv.githubAppId || '');
    const config = {
        appClientId: answerlatticeServerEnv.githubAppClientId?.trim() || '',
        appClientSecret: answerlatticeServerEnv.githubAppClientSecret?.trim() || '',
        appId,
        appPrivateKey: (answerlatticeServerEnv.githubAppPrivateKey || '').replace(/\\n/g, '\n').trim(),
        appSlug: answerlatticeServerEnv.githubAppSlug?.trim() || '',
        stateSecret: answerlatticeServerEnv.githubStateSecret?.trim() || '',
        webhookSecret: answerlatticeServerEnv.githubWebhookSecret?.trim() || '',
    };
    return config.appClientId
        && config.appClientId.length <= 200
        && /^[A-Za-z0-9._-]+$/.test(config.appClientId)
        && config.appClientSecret
        && config.appClientSecret.length >= 20
        && config.appClientSecret.length <= 500
        && Number.isSafeInteger(config.appId)
        && config.appId > 0
        && config.appPrivateKey.length <= 20_000
        && /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(config.appPrivateKey)
        && config.appSlug.length <= 100
        && /^[A-Za-z0-9-]+$/.test(config.appSlug)
        && config.stateSecret.length >= 32
        && config.stateSecret.length <= 500
        && config.webhookSecret.length >= 32
        && config.webhookSecret.length <= 500
        && config.stateSecret !== config.webhookSecret
        ? config
        : null;
};

export const isAnswerlatticeGitHubChangeIntakeConfigured = () => Boolean(readProviderConfig());

export const requireAnswerlatticeGitHubChangeIntakeConfig = (): GitHubProviderConfig => {
    if (
        !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS
    ) throw new Error('Answerlattice GitHub change intake is not enabled.');
    const config = readProviderConfig();
    if (!config) throw new Error('Answerlattice GitHub change intake is not configured.');
    return config;
};

const buildGitHubAppJwt = (config: GitHubProviderConfig): string => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' }), 'utf8').toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iat: nowSeconds - 30,
        exp: nowSeconds + 9 * 60,
        iss: config.appId,
    }), 'utf8').toString('base64url');
    const unsigned = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    return `${unsigned}.${signer.sign(config.appPrivateKey).toString('base64url')}`;
};

class GitHubProviderError extends Error {
    constructor(public readonly status: number, message = 'GitHub provider request failed.') {
        super(message);
        this.name = 'GitHubProviderError';
    }
}

const readGitHubJson = async (response: Response, maxBytes = GITHUB_PROVIDER_RESPONSE_MAX_BYTES): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(response, maxBytes);
    } catch {
        throw new GitHubProviderError(502);
    }
};

const githubFetch = async (url: string, init: RequestInit): Promise<Response> => {
    const response = await fetch(url, {
        ...init,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(GITHUB_PROVIDER_TIMEOUT_MS),
        headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Answerlattice-GitHub-Change-Intake',
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
            ...(init.headers || {}),
        },
    });
    if (!response.ok) throw new GitHubProviderError(response.status);
    return response;
};

const GitHubInstallationSchema = z.object({
    id: z.number().int().positive(),
    app_id: z.number().int().positive(),
    account: z.object({
        login: z.string().trim().min(1).max(180),
        type: z.string().trim().min(1).max(80),
    }).passthrough(),
}).passthrough();

const GitHubRepositoryResponseSchema = z.object({
    id: z.number().int().positive(),
    full_name: z.string().trim().min(3).max(200),
    private: z.boolean(),
    default_branch: z.string().trim().min(1).max(180),
    html_url: z.string().trim().url().max(500),
}).passthrough();

const GitHubRepositoriesResponseSchema = z.object({
    total_count: z.number().int().min(0),
    repositories: z.array(GitHubRepositoryResponseSchema).max(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_PENDING_REPOSITORIES),
}).passthrough();

export const buildAnswerlatticeGitHubInstallUrl = (state: string): string => {
    const config = requireAnswerlatticeGitHubChangeIntakeConfig();
    const url = new URL(`https://github.com/apps/${config.appSlug}/installations/new`);
    url.searchParams.set('state', state);
    return url.toString();
};

export const buildAnswerlatticeGitHubAuthorizationUrl = (params: {
    redirectUri: string;
    state: string;
}): string => {
    const config = requireAnswerlatticeGitHubChangeIntakeConfig();
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', config.appClientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('state', params.state);
    url.searchParams.set('allow_signup', 'false');
    return url.toString();
};

export const exchangeAnswerlatticeGitHubUserCode = async (params: {
    code: string;
    redirectUri: string;
}): Promise<string> => {
    const config = requireAnswerlatticeGitHubChangeIntakeConfig();
    const response = await githubFetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: config.appClientId,
            client_secret: config.appClientSecret,
            code: params.code,
            redirect_uri: params.redirectUri,
        }),
    });
    const parsed = z.object({ access_token: z.string().min(20).max(500) }).passthrough().safeParse(await readGitHubJson(response));
    if (!parsed.success) throw new GitHubProviderError(502);
    return parsed.data.access_token;
};

export const verifyAnswerlatticeGitHubUserInstallation = async (params: {
    installationId: number;
    userAccessToken: string;
}) => {
    const config = requireAnswerlatticeGitHubChangeIntakeConfig();
    const response = await githubFetch(`https://api.github.com/user/installations/${params.installationId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${params.userAccessToken}` },
    });
    const parsed = GitHubInstallationSchema.safeParse(await readGitHubJson(response));
    if (!parsed.success || parsed.data.id !== params.installationId || parsed.data.app_id !== config.appId) {
        throw new GitHubProviderError(403);
    }
    return parsed.data;
};

const createInstallationAccessToken = async (installationId: number): Promise<string> => {
    const config = requireAnswerlatticeGitHubChangeIntakeConfig();
    const response = await githubFetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${buildGitHubAppJwt(config)}` },
            body: JSON.stringify({}),
        },
    );
    const parsed = z.object({ token: z.string().min(20).max(500) }).passthrough().safeParse(await readGitHubJson(response));
    if (!parsed.success) throw new GitHubProviderError(502);
    return parsed.data.token;
};

export const listAnswerlatticeGitHubInstallationRepositories = async (
    installationId: number,
): Promise<AnswerlatticeGitHubRepository[]> => {
    const token = await createInstallationAccessToken(installationId);
    const response = await githubFetch('https://api.github.com/installation/repositories?per_page=100', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
    const parsed = GitHubRepositoriesResponseSchema.safeParse(await readGitHubJson(response));
    if (!parsed.success || parsed.data.total_count > ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_PENDING_REPOSITORIES) {
        throw new GitHubProviderError(422, 'Narrow the GitHub App installation to 100 repositories or fewer.');
    }
    return parsed.data.repositories.map(repository => AnswerlatticeGitHubRepositorySchema.parse({
        id: repository.id,
        fullName: repository.full_name,
        private: repository.private,
        defaultBranch: repository.default_branch,
        htmlUrl: repository.html_url,
    }));
};

const assertConfigOwnership = (
    data: Record<string, unknown>,
    scope: { tId: number; sId: number },
) => {
    const ownership = classifyAnswerlatticeIntegrationConfigOwnership(data, scope);
    if (ownership === 'invalid') throw new Error('GitHub connection ownership mismatch.');
};

export const getAnswerlatticeGitHubConnection = async (
    scope: { tId: number; sId: number },
): Promise<AnswerlatticeGitHubConnectionView> => {
    const available = Boolean(
        FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
        && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS
        && readProviderConfig(),
    );
    const snapshot = await requireAnswerlatticeFirestoreAdmin()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(configDocId(scope))
        .get();
    const data = snapshot.data() || {};
    if (snapshot.exists) assertConfigOwnership(data, scope);
    return projectConnectionView(normalizeStoredConnection(data.githubChangeIntake), available);
};

export const saveAnswerlatticeGitHubPendingConnection = async (params: {
    accountLogin: string;
    accountType: string;
    actorId: string;
    installationId: number;
    repositories: AnswerlatticeGitHubRepository[];
    scope: { tId: number; sId: number };
}): Promise<AnswerlatticeGitHubConnectionView> => {
    requireAnswerlatticeGitHubChangeIntakeConfig();
    const db = requireAnswerlatticeFirestoreAdmin();
    const ref = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(params.scope));
    const identity = buildAnswerlatticeIntegrationConfigIdentity(params.scope);
    if (!identity) throw new Error('Invalid Answerlattice workspace scope.');
    const repositories = normalizeRepositories(
        params.repositories,
        ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_PENDING_REPOSITORIES,
    );
    if (repositories.length !== params.repositories.length || repositories.length === 0) {
        throw new Error('GitHub did not return a valid repository selection.');
    }
    const timestamp = nowIso();
    const pendingExpiresAt = new Date(
        Date.now() + ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.SETUP_STATE_SECONDS * 1000,
    ).toISOString();

    const connection = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const data = snapshot.data() || {};
        if (snapshot.exists) assertConfigOwnership(data, params.scope);
        const current = normalizeStoredConnection(data.githubChangeIntake);
        const preservesActiveConnection = Boolean(
            current.installationId
            && current.selectedRepositories.length > 0
            && ['connected', 'needs_reconnect', 'suspended'].includes(current.status),
        );
        const next: StoredGitHubChangeIntake = {
            ...current,
            status: preservesActiveConnection ? current.status : 'pending_repository_selection',
            pendingInstallationId: params.installationId,
            pendingAccountLogin: params.accountLogin.slice(0, 180),
            pendingAccountType: params.accountType.slice(0, 80),
            pendingRepositories: repositories,
            pendingExpiresAt,
            modifiedAt: timestamp,
            modifiedBy: params.actorId.slice(0, 180),
        };
        transaction.set(ref, {
            ...identity,
            githubChangeIntake: next,
            modifiedOn: FieldValue.serverTimestamp(),
            updatedBy: params.actorId.slice(0, 180),
        }, { merge: true });
        return next;
    });
    return projectConnectionView(connection, true);
};

const GitHubBindingSchema = z.object({
    pId: z.literal(PRODUCT_IDS.ANSWERLATTICE),
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
    scopeKey: z.string().trim().min(3).max(80),
    installationId: z.number().int().positive(),
    repository: AnswerlatticeGitHubRepositorySchema,
    settings: AnswerlatticeGitHubConnectionSettingsSchema,
    status: z.enum(['connected', 'suspended']),
}).passthrough();

const parseBinding = (id: string, value: unknown): GitHubBinding | null => {
    const parsed = GitHubBindingSchema.safeParse(value);
    if (!parsed.success || parsed.data.scopeKey !== scopeKey(parsed.data)) return null;
    return { id, ...parsed.data };
};

const auditDocument = (params: {
    action: string;
    actorId: string;
    scope: { tId: number; sId: number };
    metadata?: Record<string, unknown>;
}) => ({
    action: params.action,
    createdOn: FieldValue.serverTimestamp(),
    entityId: String(params.scope.sId),
    entityType: 'github_change_intake',
    metadata: params.metadata || {},
    pId: PRODUCT_IDS.ANSWERLATTICE,
    performedBy: params.actorId.slice(0, 180),
    sId: params.scope.sId,
    tId: params.scope.tId,
});

export const saveAnswerlatticeGitHubConnection = async (params: {
    actorId: string;
    input: AnswerlatticeGitHubConnectionUpdate;
    scope: { tId: number; sId: number };
}): Promise<AnswerlatticeGitHubConnectionView> => {
    requireAnswerlatticeGitHubChangeIntakeConfig();
    const db = requireAnswerlatticeFirestoreAdmin();
    const ref = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(params.scope));
    const bindingsQuery = db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS)
        .where('scopeKey', '==', scopeKey(params.scope))
        .limit(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_SELECTED_REPOSITORIES + 1);
    const identity = buildAnswerlatticeIntegrationConfigIdentity(params.scope);
    if (!identity) throw new Error('Invalid Answerlattice workspace scope.');
    const settings = AnswerlatticeGitHubConnectionSettingsSchema.parse(params.input.settings);
    const selectedIds = new Set(params.input.selectedRepositoryIds);
    const timestamp = nowIso();

    const connection = await db.runTransaction(async transaction => {
        const [snapshot, bindingsSnapshot] = await Promise.all([
            transaction.get(ref),
            transaction.get(bindingsQuery),
        ]);
        const data = snapshot.data() || {};
        if (snapshot.exists) assertConfigOwnership(data, params.scope);
        if (bindingsSnapshot.size > ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_SELECTED_REPOSITORIES) {
            throw new Error('GitHub repository binding limit was exceeded.');
        }
        const current = normalizeStoredConnection(data.githubChangeIntake);
        const pendingAvailable = Boolean(
            current.pendingInstallationId
            && current.pendingExpiresAt
            && Date.parse(current.pendingExpiresAt) > Date.now()
            && current.pendingRepositories.length > 0,
        );
        if (!pendingAvailable && ['needs_reconnect', 'suspended'].includes(current.status)) {
            throw new Error('Reconnect GitHub before saving repository access.');
        }
        const installationId = pendingAvailable ? current.pendingInstallationId : current.installationId;
        if (!installationId) throw new Error('Reconnect GitHub before selecting repositories.');
        const availableRepositories = pendingAvailable
            ? current.pendingRepositories
            : current.selectedRepositories;
        const selectedRepositories = availableRepositories.filter(repository => selectedIds.has(repository.id));
        if (
            selectedRepositories.length !== selectedIds.size
            || selectedRepositories.length === 0
            || selectedRepositories.length > ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_SELECTED_REPOSITORIES
        ) throw new Error('Select only repositories verified for this GitHub installation.');

        bindingsSnapshot.docs.forEach(document => transaction.delete(document.ref));
        selectedRepositories.forEach(repository => {
            const bindingId = getAnswerlatticeGitHubBindingId({ repositoryId: repository.id, scope: params.scope });
            transaction.set(db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS).doc(bindingId), {
                ...identity,
                scopeKey: scopeKey(params.scope),
                installationId,
                repository,
                settings,
                status: 'connected',
                createdOn: FieldValue.serverTimestamp(),
                modifiedOn: FieldValue.serverTimestamp(),
            });
        });
        const next: StoredGitHubChangeIntake = {
            ...current,
            status: 'connected',
            installationId,
            accountLogin: pendingAvailable ? current.pendingAccountLogin : current.accountLogin,
            accountType: pendingAvailable ? current.pendingAccountType : current.accountType,
            selectedRepositories,
            pendingInstallationId: null,
            pendingAccountLogin: null,
            pendingAccountType: null,
            pendingRepositories: [],
            pendingExpiresAt: null,
            settings,
            connectedAt: current.connectedAt || timestamp,
            connectedBy: current.connectedBy || params.actorId.slice(0, 180),
            modifiedAt: timestamp,
            modifiedBy: params.actorId.slice(0, 180),
        };
        transaction.set(ref, {
            ...identity,
            githubChangeIntake: next,
            modifiedOn: FieldValue.serverTimestamp(),
            updatedBy: params.actorId.slice(0, 180),
        }, { merge: true });
        transaction.set(db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(), auditDocument({
            action: current.status === 'connected'
                ? 'github_change_intake_policy_updated'
                : 'github_change_intake_connected',
            actorId: params.actorId,
            scope: params.scope,
            metadata: {
                repositoryCount: selectedRepositories.length,
                releasesEnabled: settings.importPublishedReleases,
                pullRequestsEnabled: settings.importMergedPullRequests,
                requiredLabelCount: settings.requiredPullRequestLabels.length,
            },
        }));
        return next;
    });
    return projectConnectionView(connection, true);
};

export const disconnectAnswerlatticeGitHubConnection = async (params: {
    actorId: string;
    scope: { tId: number; sId: number };
}): Promise<AnswerlatticeGitHubConnectionView> => {
    requireAnswerlatticeGitHubChangeIntakeConfig();
    const db = requireAnswerlatticeFirestoreAdmin();
    const ref = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(params.scope));
    const bindingsQuery = db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS)
        .where('scopeKey', '==', scopeKey(params.scope))
        .limit(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_SELECTED_REPOSITORIES + 1);
    const identity = buildAnswerlatticeIntegrationConfigIdentity(params.scope);
    if (!identity) throw new Error('Invalid Answerlattice workspace scope.');
    const timestamp = nowIso();

    const connection = await db.runTransaction(async transaction => {
        const [snapshot, bindingsSnapshot] = await Promise.all([
            transaction.get(ref),
            transaction.get(bindingsQuery),
        ]);
        const data = snapshot.data() || {};
        if (snapshot.exists) assertConfigOwnership(data, params.scope);
        if (bindingsSnapshot.size > ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_SELECTED_REPOSITORIES) {
            throw new Error('GitHub repository binding limit was exceeded.');
        }
        const current = normalizeStoredConnection(data.githubChangeIntake);
        bindingsSnapshot.docs.forEach(document => transaction.delete(document.ref));
        const next: StoredGitHubChangeIntake = {
            ...current,
            status: 'disconnected',
            installationId: null,
            accountLogin: null,
            accountType: null,
            selectedRepositories: [],
            pendingInstallationId: null,
            pendingAccountLogin: null,
            pendingAccountType: null,
            pendingRepositories: [],
            pendingExpiresAt: null,
            recentDeliveries: [],
            dailyEventDate: null,
            dailyEventCount: 0,
            connectedAt: null,
            connectedBy: null,
            modifiedAt: timestamp,
            modifiedBy: params.actorId.slice(0, 180),
        };
        transaction.set(ref, {
            ...identity,
            githubChangeIntake: next,
            modifiedOn: FieldValue.serverTimestamp(),
            updatedBy: params.actorId.slice(0, 180),
        }, { merge: true });
        transaction.set(db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(), auditDocument({
            action: 'github_change_intake_disconnected',
            actorId: params.actorId,
            scope: params.scope,
            metadata: { repositoryCount: current.selectedRepositories.length },
        }));
        return next;
    });
    return projectConnectionView(connection, true);
};

const listBindingsForRepository = async (
    repositoryId: number,
    installationId: number,
): Promise<GitHubBinding[]> => {
    const snapshot = await requireAnswerlatticeFirestoreAdmin()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS)
        .where('repository.id', '==', repositoryId)
        .limit(GITHUB_BINDING_QUERY_LIMIT)
        .get();
    if (snapshot.size >= GITHUB_BINDING_QUERY_LIMIT) throw new Error('GitHub repository binding fanout requires review.');
    return snapshot.docs
        .map(document => parseBinding(document.id, document.data()))
        .filter((binding): binding is GitHubBinding => Boolean(
            binding
            && binding.installationId === installationId
            && binding.repository.id === repositoryId
            && binding.status === 'connected',
        ));
};

type DeliveryClaim = {
    status: 'claimed' | 'duplicate' | 'capped' | 'not_connected';
    connection?: StoredGitHubChangeIntake;
};

const claimGitHubDelivery = async (params: {
    binding: GitHubBinding;
    deliveryHash: string;
    kind: GitHubConnectionEventKind;
}): Promise<DeliveryClaim> => {
    const db = requireAnswerlatticeFirestoreAdmin();
    const ref = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(params.binding));
    const timestamp = nowIso();
    const today = utcDateKey();
    return db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return { status: 'not_connected' };
        const data = snapshot.data() || {};
        assertConfigOwnership(data, params.binding);
        const current = normalizeStoredConnection(data.githubChangeIntake);
        const selected = current.selectedRepositories.some(repository => (
            repository.id === params.binding.repository.id
            && current.installationId === params.binding.installationId
        ));
        if (current.status !== 'connected' || !selected) return { status: 'not_connected' };

        const existing = current.recentDeliveries.find(delivery => delivery.idHash === params.deliveryHash);
        const processingIsFresh = existing?.status === 'processing'
            && Date.now() - Date.parse(existing.claimedAt)
                < ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.PROCESSING_LEASE_SECONDS * 1000;
        if (existing && existing.status !== 'failed' && processingIsFresh) return { status: 'duplicate' };
        if (existing && existing.status !== 'failed' && existing.status !== 'processing') return { status: 'duplicate' };

        const dailyEventCount = current.dailyEventDate === today ? current.dailyEventCount : 0;
        const isRetry = Boolean(existing);
        if (!isRetry && dailyEventCount >= ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.DAILY_ACCEPTED_EVENTS) {
            const cappedDelivery: StoredDelivery = {
                idHash: params.deliveryHash,
                repositoryId: params.binding.repository.id,
                kind: params.kind,
                status: 'capped',
                claimedAt: timestamp,
                completedAt: timestamp,
            };
            const recentDeliveries = [
                ...current.recentDeliveries.filter(delivery => delivery.idHash !== params.deliveryHash),
                cappedDelivery,
            ].slice(-ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_RECENT_DELIVERIES);
            transaction.set(ref, {
                githubChangeIntake: {
                    ...current,
                    recentDeliveries,
                    lastEventAt: timestamp,
                    lastEventKind: params.kind,
                    lastEventRepository: params.binding.repository.fullName,
                    lastEventResult: 'capped',
                    modifiedAt: timestamp,
                },
                modifiedOn: FieldValue.serverTimestamp(),
            }, { merge: true });
            return { status: 'capped' };
        }

        const claimed: StoredDelivery = {
            idHash: params.deliveryHash,
            repositoryId: params.binding.repository.id,
            kind: params.kind,
            status: 'processing',
            claimedAt: timestamp,
            completedAt: null,
        };
        const recentDeliveries = [
            ...current.recentDeliveries.filter(delivery => delivery.idHash !== params.deliveryHash),
            claimed,
        ].slice(-ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_RECENT_DELIVERIES);
        const next: StoredGitHubChangeIntake = {
            ...current,
            recentDeliveries,
            dailyEventDate: today,
            dailyEventCount: isRetry ? dailyEventCount : dailyEventCount + 1,
            modifiedAt: timestamp,
        };
        transaction.set(ref, {
            githubChangeIntake: next,
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
        return { status: 'claimed', connection: next };
    });
};

const completeGitHubDelivery = async (params: {
    binding: GitHubBinding;
    deliveryHash: string;
    jobId?: string;
    jobMonth?: string;
    jobSlot?: number;
    kind: GitHubConnectionEventKind;
    result: GitHubDeliveryResult;
}) => {
    const db = requireAnswerlatticeFirestoreAdmin();
    const ref = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(params.binding));
    const timestamp = nowIso();
    await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return;
        const data = snapshot.data() || {};
        assertConfigOwnership(data, params.binding);
        const current = normalizeStoredConnection(data.githubChangeIntake);
        const recentDeliveries = current.recentDeliveries.map(delivery => (
            delivery.idHash === params.deliveryHash
                ? { ...delivery, status: params.result, completedAt: timestamp }
                : delivery
        ));
        const hasValidRollingJob = params.jobMonth
            && /^\d{4}-\d{2}$/.test(params.jobMonth)
            && Number.isInteger(params.jobSlot)
            && Number(params.jobSlot) >= 0
            && Number(params.jobSlot) < GITHUB_JOB_SLOT_LIMIT;
        const rollingJobUpdate = hasValidRollingJob
            && (!current.rollingJobMonth || params.jobMonth! >= current.rollingJobMonth)
            ? {
                rollingJobMonth: params.jobMonth!,
                rollingJobSlot: params.jobMonth === current.rollingJobMonth
                    ? Math.max(current.rollingJobSlot, Number(params.jobSlot))
                    : Number(params.jobSlot),
            }
            : {};
        transaction.set(ref, {
            githubChangeIntake: {
                ...current,
                ...rollingJobUpdate,
                recentDeliveries,
                lastEventAt: timestamp,
                lastEventKind: params.kind,
                lastEventRepository: params.binding.repository.fullName,
                lastEventResult: params.result,
                lastImportedJobId: params.jobId || current.lastImportedJobId,
                modifiedAt: timestamp,
            },
            modifiedOn: FieldValue.serverTimestamp(),
        }, { merge: true });
    });
};

const importGitHubEvidence = async (params: {
    binding: GitHubBinding;
    connection?: StoredGitHubChangeIntake;
    deliveryHash: string;
    evidence: AnswerlatticeGitHubEvidence;
}): Promise<{ duplicate: boolean; jobId: string; jobMonth: string; jobSlot: number }> => {
    const monthKey = utcMonthKey();
    const startSlot = params.connection?.rollingJobMonth === monthKey
        ? params.connection.rollingJobSlot
        : 0;
    const scope = { tId: params.binding.tId, sId: params.binding.sId };
    const actor = {
        id: `github-app:${params.binding.installationId}`,
        name: 'GitHub Change Intake',
    };
    for (let slot = startSlot; slot < GITHUB_JOB_SLOT_LIMIT; slot += 1) {
        const jobId = getAnswerlatticeGitHubRollingJobId({ scope, monthKey, slot });
        await ensureKnowledgeIntakeJob(scope, jobId, {
            title: `GitHub changes - ${monthKey}`,
            description: 'Read-only product change evidence collected from selected GitHub repositories.',
        }, actor);
        try {
            const source = await addKnowledgeSource(scope, jobId, {
                type: params.evidence.type,
                title: params.evidence.title,
                originUrl: params.evidence.originUrl,
                contentText: params.evidence.contentText,
                dedupeContentHash: params.evidence.dedupeContentHash,
                tags: params.evidence.tags,
                metadata: {
                    ...params.evidence.metadata,
                    deliveryIdHash: params.deliveryHash,
                    sourceAccess: 'workspace_private',
                    sourceApproval: 'unreviewed',
                },
            }, actor);
            return {
                duplicate: 'duplicate' in source && source.duplicate === true,
                jobId,
                jobMonth: monthKey,
                jobSlot: slot,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (
                message === 'This intake job can no longer accept new sources.'
                || /^One intake job can hold up to \d+ sources\.$/.test(message)
            ) continue;
            throw error;
        }
    }
    throw new Error('GitHub change intake job capacity was exceeded.');
};

const fetchPullRequestFiles = async (
    event: AnswerlatticeGitHubPullRequestWebhook,
): Promise<AnswerlatticeGitHubChangedFile[]> => {
    const token = await createInstallationAccessToken(event.installation.id);
    const [owner, repository] = event.repository.full_name.split('/');
    if (!owner || !repository) throw new GitHubProviderError(422);
    const response = await githubFetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: `
                query AnswerlatticeChangedFilePaths($owner: String!, $repository: String!, $number: Int!) {
                    repository(owner: $owner, name: $repository) {
                        pullRequest(number: $number) {
                            files(first: 100) {
                                nodes { path }
                            }
                        }
                    }
                }
            `,
            variables: {
                owner,
                repository,
                number: event.pull_request.number,
            },
        }),
    });
    const parsed = z.object({
        data: z.object({
            repository: z.object({
                pullRequest: z.object({
                    files: z.object({
                        nodes: z.array(z.object({ path: z.string().trim().min(1).max(500) }).strict())
                            .max(ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_CHANGED_FILE_PATHS),
                    }).strict(),
                }).strict(),
            }).strict(),
        }).strict(),
        errors: z.never().optional(),
    }).passthrough().safeParse(await readGitHubJson(response, GITHUB_GRAPHQL_RESPONSE_MAX_BYTES));
    if (!parsed.success) throw new GitHubProviderError(502);
    return parsed.data.data.repository.pullRequest.files.nodes.map(file => ({ filename: file.path }));
};

type GitHubWebhookProcessingResult = {
    accepted: number;
    capped: number;
    duplicate: number;
    failed: number;
    ignored: number;
};

const emptyProcessingResult = (): GitHubWebhookProcessingResult => ({
    accepted: 0,
    capped: 0,
    duplicate: 0,
    failed: 0,
    ignored: 0,
});

export const processAnswerlatticeGitHubReleaseWebhook = async (params: {
    deliveryId: string;
    event: AnswerlatticeGitHubReleaseWebhook;
}): Promise<GitHubWebhookProcessingResult> => {
    const result = emptyProcessingResult();
    const bindings = await listBindingsForRepository(params.event.repository.id, params.event.installation.id);
    const deliveryHash = hashAnswerlatticeGitHubDeliveryId(params.deliveryId);
    for (const binding of bindings) {
        const policy = { ...binding.repository, settings: binding.settings };
        if (!shouldAcceptAnswerlatticeGitHubRelease(params.event, policy)) {
            result.ignored += 1;
            continue;
        }
        const license = await hasActiveAnswerlatticeKnowledgeIntakeLicense(binding.tId, binding.sId);
        if (!license.allowed) {
            result.ignored += 1;
            continue;
        }
        const claim = await claimGitHubDelivery({ binding, deliveryHash, kind: 'release' });
        if (claim.status === 'duplicate') {
            result.duplicate += 1;
            continue;
        }
        if (claim.status === 'capped') {
            result.capped += 1;
            continue;
        }
        if (claim.status !== 'claimed') {
            result.ignored += 1;
            continue;
        }
        try {
            const imported = await importGitHubEvidence({
                binding,
                connection: claim.connection,
                deliveryHash,
                evidence: buildAnswerlatticeGitHubReleaseEvidence(params.event),
            });
            await completeGitHubDelivery({
                binding,
                deliveryHash,
                jobId: imported.jobId,
                jobMonth: imported.jobMonth,
                jobSlot: imported.jobSlot,
                kind: 'release',
                result: imported.duplicate ? 'duplicate' : 'imported',
            });
            if (imported.duplicate) result.duplicate += 1;
            else result.accepted += 1;
        } catch (error) {
            result.failed += 1;
            await completeGitHubDelivery({ binding, deliveryHash, kind: 'release', result: 'failed' });
        }
    }
    return result;
};

export const processAnswerlatticeGitHubPullRequestWebhook = async (params: {
    deliveryId: string;
    event: AnswerlatticeGitHubPullRequestWebhook;
}): Promise<GitHubWebhookProcessingResult> => {
    const result = emptyProcessingResult();
    const bindings = await listBindingsForRepository(params.event.repository.id, params.event.installation.id);
    const deliveryHash = hashAnswerlatticeGitHubDeliveryId(params.deliveryId);
    let changedFilesPromise: Promise<AnswerlatticeGitHubChangedFile[]> | null = null;
    for (const binding of bindings) {
        const policy = { ...binding.repository, settings: binding.settings };
        if (!shouldAcceptAnswerlatticeGitHubPullRequest(params.event, policy)) {
            result.ignored += 1;
            continue;
        }
        const license = await hasActiveAnswerlatticeKnowledgeIntakeLicense(binding.tId, binding.sId);
        if (!license.allowed) {
            result.ignored += 1;
            continue;
        }
        const claim = await claimGitHubDelivery({ binding, deliveryHash, kind: 'pull_request' });
        if (claim.status === 'duplicate') {
            result.duplicate += 1;
            continue;
        }
        if (claim.status === 'capped') {
            result.capped += 1;
            continue;
        }
        if (claim.status !== 'claimed') {
            result.ignored += 1;
            continue;
        }
        try {
            changedFilesPromise ||= fetchPullRequestFiles(params.event);
            const imported = await importGitHubEvidence({
                binding,
                connection: claim.connection,
                deliveryHash,
                evidence: buildAnswerlatticeGitHubPullRequestEvidence({
                    changedFiles: await changedFilesPromise,
                    event: params.event,
                }),
            });
            await completeGitHubDelivery({
                binding,
                deliveryHash,
                jobId: imported.jobId,
                jobMonth: imported.jobMonth,
                jobSlot: imported.jobSlot,
                kind: 'pull_request',
                result: imported.duplicate ? 'duplicate' : 'imported',
            });
            if (imported.duplicate) result.duplicate += 1;
            else result.accepted += 1;
        } catch (error) {
            result.failed += 1;
            await completeGitHubDelivery({ binding, deliveryHash, kind: 'pull_request', result: 'failed' });
        }
    }
    return result;
};

export const updateAnswerlatticeGitHubInstallationState = async (params: {
    action: 'deleted' | 'suspend' | 'unsuspend';
    installationId: number;
}) => {
    const db = requireAnswerlatticeFirestoreAdmin();
    const snapshot = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS)
        .where('installationId', '==', params.installationId)
        .limit(101)
        .get();
    if (snapshot.size >= 101) throw new Error('GitHub installation binding fanout requires review.');
    const bindings = snapshot.docs
        .map(document => parseBinding(document.id, document.data()))
        .filter((binding): binding is GitHubBinding => Boolean(binding));
    const grouped = new Map<string, GitHubBinding[]>();
    bindings.forEach(binding => {
        const key = scopeKey(binding);
        grouped.set(key, [...(grouped.get(key) || []), binding]);
    });

    for (const workspaceBindings of Array.from(grouped.values())) {
        const scope = workspaceBindings[0];
        if (!scope) continue;
        const configRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(scope));
        await db.runTransaction(async transaction => {
            const configSnapshot = await transaction.get(configRef);
            if (!configSnapshot.exists) {
                workspaceBindings.forEach((binding: GitHubBinding) => transaction.delete(
                    db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS).doc(binding.id),
                ));
                return;
            }
            const data = configSnapshot.data() || {};
            assertConfigOwnership(data, scope);
            const current = normalizeStoredConnection(data.githubChangeIntake);
            if (current.installationId !== params.installationId) return;
            const timestamp = nowIso();
            const nextStatus: AnswerlatticeGitHubConnectionStatus = params.action === 'deleted'
                ? 'disconnected'
                : params.action === 'suspend'
                    ? 'suspended'
                    : 'connected';
            const next: StoredGitHubChangeIntake = {
                ...current,
                status: nextStatus,
                ...(params.action === 'deleted' ? {
                    installationId: null,
                    accountLogin: null,
                    accountType: null,
                    selectedRepositories: [],
                    pendingInstallationId: null,
                    pendingAccountLogin: null,
                    pendingAccountType: null,
                    pendingRepositories: [],
                    pendingExpiresAt: null,
                    recentDeliveries: [],
                    dailyEventDate: null,
                    dailyEventCount: 0,
                    connectedAt: null,
                    connectedBy: null,
                } : {}),
                modifiedAt: timestamp,
            };
            transaction.set(configRef, {
                githubChangeIntake: next,
                modifiedOn: FieldValue.serverTimestamp(),
            }, { merge: true });
            workspaceBindings.forEach((binding: GitHubBinding) => {
                const bindingRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS).doc(binding.id);
                if (params.action === 'deleted') transaction.delete(bindingRef);
                else transaction.set(bindingRef, {
                    status: params.action === 'suspend' ? 'suspended' : 'connected',
                    modifiedOn: FieldValue.serverTimestamp(),
                }, { merge: true });
            });
        });
    }
};

export const removeAnswerlatticeGitHubRepositoryBindings = async (params: {
    installationId: number;
    repositoryIds: number[];
}) => {
    const db = requireAnswerlatticeFirestoreAdmin();
    const repositoryIds = new Set(Array.from(new Set(params.repositoryIds)).slice(0, 100));
    if (repositoryIds.size === 0) return;
    const snapshot = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS)
        .where('installationId', '==', params.installationId)
        .limit(101)
        .get();
    if (snapshot.size >= 101) throw new Error('GitHub installation binding fanout requires review.');
    const bindings = snapshot.docs
        .map(document => parseBinding(document.id, document.data()))
        .filter((binding): binding is GitHubBinding => Boolean(
            binding
            && binding.installationId === params.installationId
            && repositoryIds.has(binding.repository.id),
        ));
    const grouped = new Map<string, GitHubBinding[]>();
    bindings.forEach(binding => {
        const key = scopeKey(binding);
        grouped.set(key, [...(grouped.get(key) || []), binding]);
    });

    for (const workspaceBindings of Array.from(grouped.values())) {
        const scope = workspaceBindings[0];
        if (!scope) continue;
        const configRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(scope));
        await db.runTransaction(async transaction => {
            const configSnapshot = await transaction.get(configRef);
            if (configSnapshot.exists) {
                const data = configSnapshot.data() || {};
                assertConfigOwnership(data, scope);
                const current = normalizeStoredConnection(data.githubChangeIntake);
                const nextRepositories = current.selectedRepositories.filter(repository => !repositoryIds.has(repository.id));
                const pendingRepositories = current.pendingInstallationId === params.installationId
                    ? current.pendingRepositories.filter(repository => !repositoryIds.has(repository.id))
                    : current.pendingRepositories;
                const pendingSelectionIsActive = Boolean(
                    current.pendingInstallationId
                    && current.pendingExpiresAt
                    && Date.parse(current.pendingExpiresAt) > Date.now()
                    && pendingRepositories.length > 0,
                );
                transaction.set(configRef, {
                    githubChangeIntake: {
                        ...current,
                        status: nextRepositories.length
                            ? 'needs_reconnect'
                            : pendingSelectionIsActive
                                ? 'pending_repository_selection'
                                : 'disconnected',
                        selectedRepositories: nextRepositories,
                        pendingRepositories,
                        modifiedAt: nowIso(),
                    },
                    modifiedOn: FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            workspaceBindings.forEach(binding => transaction.delete(
                db.collection(DB_COLLECTIONS.ANSWERLATTICE_GITHUB_INTAKE_BINDINGS).doc(binding.id),
            ));
        });
    }
};

export const getAnswerlatticeGitHubWebhookSecret = (): string => (
    requireAnswerlatticeGitHubChangeIntakeConfig().webhookSecret
);

export const getAnswerlatticeGitHubStateSecret = (): string => (
    requireAnswerlatticeGitHubChangeIntakeConfig().stateSecret
);

export const isGitHubProviderError = (error: unknown): error is GitHubProviderError => error instanceof GitHubProviderError;

export const getGitHubProviderErrorStatus = (error: unknown): number | null => (
    error instanceof GitHubProviderError ? error.status : null
);
