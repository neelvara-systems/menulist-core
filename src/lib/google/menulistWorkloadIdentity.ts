import { getVercelOidcToken } from '@vercel/oidc';
import type { Credential } from 'firebase-admin/app';
import type { AuthClient, BaseExternalAccountClient } from 'google-auth-library';
import { logFirebaseAdminFailure } from '@lib/firebase/firebaseAdminDiagnostics';
import {
    attachWorkloadIdentityAccessTokenFailureDiagnostic,
    createFirebaseWorkloadIdentityCredential,
    createProviderAudienceTokenSupplier,
    createWorkloadIdentityAuthClient,
    readWorkloadIdentityTokenDiagnostics,
    readProductWorkloadIdentityConfig,
    resolveProductGoogleCredentialMode,
    type GoogleCredentialMode,
    type OidcTokenSupplier,
    type WorkloadIdentityConfig,
    type WorkloadIdentityEnvironment,
} from './vercelWorkloadIdentity';

export type MenulistGoogleCredentialMode = GoogleCredentialMode;
export type MenulistWorkloadIdentityConfig = WorkloadIdentityConfig;

const CREDENTIAL_DESCRIPTOR = {
    authModeVar: 'MENULIST_FIREBASE_ADMIN_AUTH_MODE',
    clientEmailVars: ['MENULIST_FIREBASE_CLIENT_EMAIL', 'FIREBASE_CLIENT_EMAIL'],
    privateKeyVars: ['MENULIST_FIREBASE_PRIVATE_KEY', 'FIREBASE_PRIVATE_KEY'],
    productName: 'MenuList',
} as const;

const WORKLOAD_IDENTITY_DESCRIPTOR = {
    productName: 'MenuList',
    projectIdVars: [
        'NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID',
        'MENULIST_FIREBASE_PROJECT_ID',
        'FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ],
    projectNumberVar: 'MENULIST_GCP_PROJECT_NUMBER',
    providerIdVar: 'MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID',
    poolIdVar: 'MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID',
    serviceAccountEmailVar: 'MENULIST_GCP_SERVICE_ACCOUNT_EMAIL',
} as const;

export const resolveMenulistGoogleCredentialMode = (
    env: WorkloadIdentityEnvironment = process.env,
): MenulistGoogleCredentialMode => resolveProductGoogleCredentialMode(CREDENTIAL_DESCRIPTOR, env);

export const readMenulistWorkloadIdentityConfig = (
    env: WorkloadIdentityEnvironment = process.env,
): MenulistWorkloadIdentityConfig => readProductWorkloadIdentityConfig(WORKLOAD_IDENTITY_DESCRIPTOR, env);

export const createMenulistWorkloadIdentityAuthClient = (
    config: MenulistWorkloadIdentityConfig,
    getSubjectToken: OidcTokenSupplier,
): BaseExternalAccountClient => createWorkloadIdentityAuthClient(config, getSubjectToken);

let workloadIdentityAuthClient: BaseExternalAccountClient | null = null;

export const getMenulistWorkloadIdentityAuthClient = (): BaseExternalAccountClient => {
    if (workloadIdentityAuthClient) return workloadIdentityAuthClient;
    const config = readMenulistWorkloadIdentityConfig();
    let oidcDiagnostics = readWorkloadIdentityTokenDiagnostics('', config);
    const tokenSupplier = createProviderAudienceTokenSupplier(config, async (options) => {
        const token = await getVercelOidcToken(options);
        oidcDiagnostics = readWorkloadIdentityTokenDiagnostics(token, config);
        return token;
    });
    const client = attachWorkloadIdentityAccessTokenFailureDiagnostic(
        createMenulistWorkloadIdentityAuthClient(config, tokenSupplier),
        (error) => {
            logFirebaseAdminFailure('menulist_workload_identity_exchange_failed', error, {
                audienceMatchesProvider: oidcDiagnostics.audienceMatchesProvider,
                credentialSource: 'vercel_oidc',
                environmentMatchesRuntimeTarget: oidcDiagnostics.environmentMatchesRuntimeTarget,
                issuerHost: oidcDiagnostics.issuerHost,
                projectIdMatchesRuntime: oidcDiagnostics.projectIdMatchesRuntime,
                teamIdMatchesRuntime: oidcDiagnostics.teamIdMatchesRuntime,
                tokenClaimsReadable: oidcDiagnostics.tokenClaimsReadable,
                oidcEnvironment: oidcDiagnostics.tokenEnvironment,
            });
        },
    );
    workloadIdentityAuthClient = client;
    return workloadIdentityAuthClient;
};

export const createMenulistFirebaseWorkloadIdentityCredential = (
    client: AuthClient,
): Credential => createFirebaseWorkloadIdentityCredential(client);

export const getMenulistFirebaseWorkloadIdentityCredential = (): Credential => (
    createMenulistFirebaseWorkloadIdentityCredential(getMenulistWorkloadIdentityAuthClient())
);
