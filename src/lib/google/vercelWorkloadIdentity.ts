import type { Credential, GoogleOAuthAccessToken } from 'firebase-admin/app';
import {
    ExternalAccountClient,
    GoogleAuth,
    type AuthClient,
    type BaseExternalAccountClient,
} from 'google-auth-library';

export type GoogleCredentialMode = 'adc' | 'service_account_key' | 'vercel_oidc';
export type WorkloadIdentityEnvironment = Record<string, string | undefined>;
export type OidcTokenSupplier = () => Promise<string>;
export type AudienceOidcTokenFetcher = (options: { audience: string }) => Promise<string>;

export interface WorkloadIdentityTokenDiagnostics {
    audienceMatchesProvider: boolean;
    environmentMatchesRuntimeTarget: boolean;
    issuerHost: string;
    projectIdMatchesRuntime: boolean;
    teamIdMatchesRuntime: boolean;
    tokenClaimsReadable: boolean;
    tokenEnvironment: string;
}

export interface ProductGoogleCredentialDescriptor {
    authModeVar: string;
    clientEmailVars: readonly string[];
    credentialFileVars?: readonly string[];
    privateKeyVars: readonly string[];
    productName: string;
}

export interface ProductWorkloadIdentityDescriptor {
    productName: string;
    projectIdVars: readonly string[];
    projectNumberVar: string;
    providerIdVar: string;
    poolIdVar: string;
    serviceAccountEmailVar: string;
}

export interface WorkloadIdentityConfig {
    audience: string;
    projectId: string;
    projectNumber: string;
    providerId: string;
    poolId: string;
    serviceAccountEmail: string;
    serviceAccountImpersonationUrl: string;
}

export const createProviderAudienceTokenSupplier = (
    config: WorkloadIdentityConfig,
    getToken: AudienceOidcTokenFetcher,
): OidcTokenSupplier => () => getToken({ audience: config.audience });

const EMPTY_TOKEN_DIAGNOSTICS: WorkloadIdentityTokenDiagnostics = {
    audienceMatchesProvider: false,
    environmentMatchesRuntimeTarget: false,
    issuerHost: 'unavailable',
    projectIdMatchesRuntime: false,
    teamIdMatchesRuntime: false,
    tokenClaimsReadable: false,
    tokenEnvironment: 'unavailable',
};

const getBoundedDiagnosticClaim = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const normalized = value.trim();
    return /^[a-zA-Z0-9._-]{1,80}$/.test(normalized) ? normalized : '';
};

export const readWorkloadIdentityTokenDiagnostics = (
    token: string,
    config: WorkloadIdentityConfig,
    env: WorkloadIdentityEnvironment = process.env,
): WorkloadIdentityTokenDiagnostics => {
    try {
        const segments = token.split('.');
        if (segments.length !== 3 || !segments[1] || segments[1].length > 16_384) {
            return EMPTY_TOKEN_DIAGNOSTICS;
        }

        const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as Record<string, unknown>;
        if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
            return EMPTY_TOKEN_DIAGNOSTICS;
        }

        const audience = typeof claims.aud === 'string' ? claims.aud : '';
        const environment = getBoundedDiagnosticClaim(claims.environment);
        const issuer = typeof claims.iss === 'string' ? claims.iss : '';
        const projectId = getBoundedDiagnosticClaim(claims.project_id);
        const teamId = getBoundedDiagnosticClaim(claims.owner_id);
        const runtimeTarget = readWorkloadIdentityEnv(env, 'VERCEL_TARGET_ENV')
            || readWorkloadIdentityEnv(env, 'VERCEL_ENV')
            || '';
        const runtimeProjectId = readWorkloadIdentityEnv(env, 'VERCEL_PROJECT_ID') || '';
        const runtimeTeamId = readWorkloadIdentityEnv(env, 'VERCEL_TEAM_ID') || '';
        let issuerHost = 'invalid';
        try {
            issuerHost = new URL(issuer).hostname || 'invalid';
        } catch {
            // Keep the diagnostic bounded; never log the raw issuer value.
        }

        return {
            audienceMatchesProvider: audience === config.audience,
            environmentMatchesRuntimeTarget: Boolean(environment && runtimeTarget && environment === runtimeTarget),
            issuerHost,
            projectIdMatchesRuntime: Boolean(projectId && runtimeProjectId && projectId === runtimeProjectId),
            teamIdMatchesRuntime: Boolean(teamId && runtimeTeamId && teamId === runtimeTeamId),
            tokenClaimsReadable: true,
            tokenEnvironment: environment || 'invalid',
        };
    } catch {
        return EMPTY_TOKEN_DIAGNOSTICS;
    }
};

export const attachWorkloadIdentityAccessTokenFailureDiagnostic = (
    client: BaseExternalAccountClient,
    onFailure: (error: unknown) => void,
): BaseExternalAccountClient => {
    const getAccessToken = client.getAccessToken.bind(client);
    client.getAccessToken = async () => {
        try {
            return await getAccessToken();
        } catch (error) {
            onFailure(error);
            throw error;
        }
    };
    return client;
};

const FIREBASE_ADMIN_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/firebase.database',
    'https://www.googleapis.com/auth/firebase.messaging',
    'https://www.googleapis.com/auth/identitytoolkit',
    'https://www.googleapis.com/auth/userinfo.email',
] as const;

const SUPPORTED_MODES = new Set<GoogleCredentialMode>([
    'adc',
    'service_account_key',
    'vercel_oidc',
]);
const WORKLOAD_ID_PATTERN = /^[a-z](?:[a-z0-9-]{2,30}[a-z0-9])$/;
const PROJECT_NUMBER_PATTERN = /^\d{6,20}$/;

export const readWorkloadIdentityEnv = (
    env: WorkloadIdentityEnvironment,
    name: string,
): string | undefined => {
    const value = env[name];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const readFirst = (
    env: WorkloadIdentityEnvironment,
    names: readonly string[],
): string | undefined => names.map((name) => readWorkloadIdentityEnv(env, name)).find(Boolean);

export const isManagedVercelQaOrProduction = (
    env: WorkloadIdentityEnvironment = process.env,
): boolean => {
    const vercelEnv = readWorkloadIdentityEnv(env, 'VERCEL_ENV')?.toLowerCase();
    const targetEnv = readWorkloadIdentityEnv(env, 'VERCEL_TARGET_ENV')?.toLowerCase();
    return vercelEnv === 'preview'
        || vercelEnv === 'production'
        || targetEnv === 'qa'
        || targetEnv === 'production';
};

export const assertManagedVercelTargetEnvironment = (
    env: WorkloadIdentityEnvironment = process.env,
): void => {
    const vercelEnv = readWorkloadIdentityEnv(env, 'VERCEL_ENV')?.toLowerCase();
    const targetEnv = readWorkloadIdentityEnv(env, 'VERCEL_TARGET_ENV')?.toLowerCase();

    if (vercelEnv === 'preview' && targetEnv !== 'qa') {
        throw new Error('Vercel Preview must run through the custom qa environment before using QA Firebase projects.');
    }
    if (vercelEnv === 'production' && targetEnv !== 'production') {
        throw new Error('Vercel Production must expose VERCEL_TARGET_ENV=production.');
    }
};

export const resolveProductGoogleCredentialMode = (
    descriptor: ProductGoogleCredentialDescriptor,
    env: WorkloadIdentityEnvironment = process.env,
): GoogleCredentialMode => {
    const configuredMode = readWorkloadIdentityEnv(env, descriptor.authModeVar)?.toLowerCase();
    if (configuredMode && !SUPPORTED_MODES.has(configuredMode as GoogleCredentialMode)) {
        throw new Error(`${descriptor.authModeVar} must be adc, service_account_key, or vercel_oidc.`);
    }

    const hasClientEmail = Boolean(readFirst(env, descriptor.clientEmailVars));
    const hasPrivateKey = Boolean(readFirst(env, descriptor.privateKeyVars));
    const hasCredentialFile = Boolean(readFirst(env, descriptor.credentialFileVars || []));
    if (hasClientEmail !== hasPrivateKey) {
        throw new Error(`${descriptor.productName} Firebase service-account key configuration is incomplete.`);
    }

    if (isManagedVercelQaOrProduction(env)) {
        assertManagedVercelTargetEnvironment(env);
        if (configuredMode !== 'vercel_oidc') {
            throw new Error(`${descriptor.productName} managed Vercel QA and production must use ${descriptor.authModeVar}=vercel_oidc.`);
        }
        if (hasClientEmail || hasPrivateKey || hasCredentialFile) {
            throw new Error(`${descriptor.productName} managed Vercel QA and production must not retain static service-account credentials.`);
        }
        return 'vercel_oidc';
    }

    if (configuredMode) return configuredMode as GoogleCredentialMode;
    return hasClientEmail || hasCredentialFile ? 'service_account_key' : 'adc';
};

export const readProductWorkloadIdentityConfig = (
    descriptor: ProductWorkloadIdentityDescriptor,
    env: WorkloadIdentityEnvironment = process.env,
): WorkloadIdentityConfig => {
    const projectId = readFirst(env, descriptor.projectIdVars);
    const projectNumber = readWorkloadIdentityEnv(env, descriptor.projectNumberVar);
    const poolId = readWorkloadIdentityEnv(env, descriptor.poolIdVar);
    const providerId = readWorkloadIdentityEnv(env, descriptor.providerIdVar);
    const serviceAccountEmail = readWorkloadIdentityEnv(env, descriptor.serviceAccountEmailVar);
    const missing = [
        [descriptor.projectIdVars.join(' or '), projectId],
        [descriptor.projectNumberVar, projectNumber],
        [descriptor.poolIdVar, poolId],
        [descriptor.providerIdVar, providerId],
        [descriptor.serviceAccountEmailVar, serviceAccountEmail],
    ].filter(([, value]) => !value).map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(`${descriptor.productName} Workload Identity configuration is missing: ${missing.join(', ')}.`);
    }
    if (!PROJECT_NUMBER_PATTERN.test(projectNumber!)) {
        throw new Error(`${descriptor.projectNumberVar} must be a numeric Google Cloud project number.`);
    }
    if (!WORKLOAD_ID_PATTERN.test(poolId!)) {
        throw new Error(`${descriptor.poolIdVar} is not a valid workload identity pool ID.`);
    }
    if (!WORKLOAD_ID_PATTERN.test(providerId!)) {
        throw new Error(`${descriptor.providerIdVar} is not a valid workload identity provider ID.`);
    }
    if (!serviceAccountEmail!.endsWith(`@${projectId}.iam.gserviceaccount.com`)) {
        throw new Error(`${descriptor.serviceAccountEmailVar} must belong to the configured ${descriptor.productName} Firebase project.`);
    }

    const audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
    return {
        audience,
        projectId: projectId!,
        projectNumber: projectNumber!,
        providerId: providerId!,
        poolId: poolId!,
        serviceAccountEmail: serviceAccountEmail!,
        serviceAccountImpersonationUrl: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    };
};

export const createWorkloadIdentityAuthClient = (
    config: WorkloadIdentityConfig,
    getSubjectToken: OidcTokenSupplier,
): BaseExternalAccountClient => {
    const client = ExternalAccountClient.fromJSON({
        type: 'external_account',
        audience: config.audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        service_account_impersonation_url: config.serviceAccountImpersonationUrl,
        subject_token_supplier: { getSubjectToken },
        scopes: [...FIREBASE_ADMIN_SCOPES],
    });
    if (!client) throw new Error('Failed to initialize Google Workload Identity credentials.');
    return client;
};

export const createWorkloadIdentityGoogleAuth = (
    config: WorkloadIdentityConfig,
    client: AuthClient,
): GoogleAuth => new GoogleAuth({
    authClient: client,
    projectId: config.projectId,
    scopes: [...FIREBASE_ADMIN_SCOPES],
});

const toFirebaseAccessToken = async (
    client: AuthClient,
): Promise<GoogleOAuthAccessToken> => {
    const response = await client.getAccessToken();
    const token = response?.token;
    if (!token) throw new Error('Google Workload Identity exchange returned no access token.');

    const expiryDate = client.credentials.expiry_date;
    const expiresIn = expiryDate
        ? Math.max(1, Math.floor((expiryDate - Date.now()) / 1000))
        : 300;
    return { access_token: token, expires_in: expiresIn };
};

export const createFirebaseWorkloadIdentityCredential = (
    client: AuthClient,
): Credential => ({
    getAccessToken: () => toFirebaseAccessToken(client),
});
