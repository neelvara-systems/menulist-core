import { getVercelOidcToken } from '@vercel/oidc';
import type { Credential } from 'firebase-admin/app';
import type { AuthClient, BaseExternalAccountClient } from 'google-auth-library';
import {
    createFirebaseWorkloadIdentityCredential,
    createProviderAudienceTokenSupplier,
    createWorkloadIdentityAuthClient,
    readProductWorkloadIdentityConfig,
    resolveProductGoogleCredentialMode,
    type GoogleCredentialMode,
    type OidcTokenSupplier,
    type WorkloadIdentityConfig,
    type WorkloadIdentityEnvironment,
} from './vercelWorkloadIdentity';

export type AnswerlatticeGoogleCredentialMode = GoogleCredentialMode;
export type AnswerlatticeWorkloadIdentityConfig = WorkloadIdentityConfig;

const CREDENTIAL_DESCRIPTOR = {
    authModeVar: 'ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE',
    clientEmailVars: ['ANSWERLATTICE_FIREBASE_CLIENT_EMAIL'],
    credentialFileVars: ['ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS'],
    privateKeyVars: ['ANSWERLATTICE_FIREBASE_PRIVATE_KEY'],
    productName: 'Answerlattice',
} as const;

const WORKLOAD_IDENTITY_DESCRIPTOR = {
    productName: 'Answerlattice',
    projectIdVars: [
        'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID',
        'ANSWERLATTICE_FIREBASE_PROJECT_ID',
    ],
    projectNumberVar: 'ANSWERLATTICE_GCP_PROJECT_NUMBER',
    providerIdVar: 'ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID',
    poolIdVar: 'ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID',
    serviceAccountEmailVar: 'ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL',
} as const;

export const resolveAnswerlatticeGoogleCredentialMode = (
    env: WorkloadIdentityEnvironment = process.env,
): AnswerlatticeGoogleCredentialMode => resolveProductGoogleCredentialMode(CREDENTIAL_DESCRIPTOR, env);

export const readAnswerlatticeWorkloadIdentityConfig = (
    env: WorkloadIdentityEnvironment = process.env,
): AnswerlatticeWorkloadIdentityConfig => readProductWorkloadIdentityConfig(WORKLOAD_IDENTITY_DESCRIPTOR, env);

export const createAnswerlatticeWorkloadIdentityAuthClient = (
    config: AnswerlatticeWorkloadIdentityConfig,
    getSubjectToken: OidcTokenSupplier,
): BaseExternalAccountClient => createWorkloadIdentityAuthClient(config, getSubjectToken);

let workloadIdentityAuthClient: BaseExternalAccountClient | null = null;

export const getAnswerlatticeWorkloadIdentityAuthClient = (): BaseExternalAccountClient => {
    if (workloadIdentityAuthClient) return workloadIdentityAuthClient;
    const config = readAnswerlatticeWorkloadIdentityConfig();
    workloadIdentityAuthClient = createAnswerlatticeWorkloadIdentityAuthClient(
        config,
        createProviderAudienceTokenSupplier(config, getVercelOidcToken),
    );
    return workloadIdentityAuthClient;
};

export const createAnswerlatticeFirebaseWorkloadIdentityCredential = (
    client: AuthClient,
): Credential => createFirebaseWorkloadIdentityCredential(client);

export const getAnswerlatticeFirebaseWorkloadIdentityCredential = (): Credential => (
    createAnswerlatticeFirebaseWorkloadIdentityCredential(getAnswerlatticeWorkloadIdentityAuthClient())
);
