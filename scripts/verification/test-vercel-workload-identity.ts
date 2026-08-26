import assert from 'node:assert/strict';
import type { App } from 'firebase-admin/app';
import type { BaseExternalAccountClient } from 'google-auth-library';
import {
    admin as firebaseAdminCompat,
    registerFirebaseFirestoreCompatInstance,
} from '../../src/lib/firebase/firebaseAdminCompat';
import {
    attachWorkloadIdentityAccessTokenFailureDiagnostic,
    createProviderAudienceTokenSupplier,
    createWorkloadIdentityGoogleAuth,
    readWorkloadIdentityTokenDiagnostics,
} from '../../src/lib/google/vercelWorkloadIdentity';
import {
    createWorkloadIdentityFirestore,
    createWorkloadIdentityStorageAdmin,
} from '../../src/lib/google/workloadIdentityFirebaseServices';
import {
    createAnswerlatticeWorkloadIdentityAuthClient,
    readAnswerlatticeWorkloadIdentityConfig,
    resolveAnswerlatticeGoogleCredentialMode,
} from '../../src/lib/google/answerlatticeWorkloadIdentity';
import {
    createMenulistWorkloadIdentityAuthClient,
    readMenulistWorkloadIdentityConfig,
    resolveMenulistGoogleCredentialMode,
} from '../../src/lib/google/menulistWorkloadIdentity';

const expectThrows = (run: () => unknown, expectedMessage: RegExp) => {
    assert.throws(run, expectedMessage);
};

async function main(): Promise<void> {
assert.equal(resolveMenulistGoogleCredentialMode({}), 'adc');
assert.equal(resolveAnswerlatticeGoogleCredentialMode({}), 'adc');
assert.equal(resolveMenulistGoogleCredentialMode({
    MENULIST_FIREBASE_CLIENT_EMAIL: 'local@example.invalid',
    MENULIST_FIREBASE_PRIVATE_KEY: 'private-key',
}), 'service_account_key');
assert.equal(resolveAnswerlatticeGoogleCredentialMode({
    ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS: '/local/service-account.json',
}), 'service_account_key');

for (const [label, resolveMode, authModeVar] of [
    ['MenuList', resolveMenulistGoogleCredentialMode, 'MENULIST_FIREBASE_ADMIN_AUTH_MODE'],
    ['Answerlattice', resolveAnswerlatticeGoogleCredentialMode, 'ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE'],
] as const) {
    assert.equal(resolveMode({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'qa',
        [authModeVar]: 'vercel_oidc',
    }), 'vercel_oidc', `${label} QA must use OIDC`);
    assert.equal(resolveMode({
        VERCEL: '1',
        VERCEL_ENV: 'production',
        VERCEL_TARGET_ENV: 'production',
        [authModeVar]: 'vercel_oidc',
    }), 'vercel_oidc', `${label} production must use OIDC`);
    expectThrows(
        () => resolveMode({
            VERCEL: '1',
            VERCEL_ENV: 'preview',
            [authModeVar]: 'vercel_oidc',
        }),
        /custom qa environment/,
    );
    expectThrows(
        () => resolveMode({
            VERCEL: '1',
            VERCEL_ENV: 'production',
            VERCEL_TARGET_ENV: 'production',
        }),
        /managed Vercel QA and production must use/,
    );
}

expectThrows(
    () => resolveMenulistGoogleCredentialMode({
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'qa',
        MENULIST_FIREBASE_ADMIN_AUTH_MODE: 'vercel_oidc',
        MENULIST_FIREBASE_CLIENT_EMAIL: 'stale@example.invalid',
        MENULIST_FIREBASE_PRIVATE_KEY: 'stale-key',
    }),
    /must not retain static service-account credentials/,
);
expectThrows(
    () => resolveAnswerlatticeGoogleCredentialMode({
        VERCEL: '1',
        VERCEL_ENV: 'production',
        VERCEL_TARGET_ENV: 'production',
        ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE: 'vercel_oidc',
        ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS: '/stale/key.json',
    }),
    /must not retain static service-account credentials/,
);
expectThrows(
    () => resolveMenulistGoogleCredentialMode({ MENULIST_FIREBASE_CLIENT_EMAIL: 'partial@example.invalid' }),
    /configuration is incomplete/,
);
expectThrows(
    () => resolveAnswerlatticeGoogleCredentialMode({ ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE: 'automatic' }),
    /must be adc, service_account_key, or vercel_oidc/,
);

const projectContracts = [
    {
        expectedProjectId: 'menulist-qa',
        expectedServiceAccount: 'menulist-vercel-qa@menulist-qa.iam.gserviceaccount.com',
        read: readMenulistWorkloadIdentityConfig,
        values: {
            NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID: 'menulist-qa',
            MENULIST_GCP_PROJECT_NUMBER: '100000000001',
            MENULIST_GCP_SERVICE_ACCOUNT_EMAIL: 'menulist-vercel-qa@menulist-qa.iam.gserviceaccount.com',
            MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID: 'menulist-vercel',
            MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'menulist-qa',
        },
    },
    {
        expectedProjectId: 'menulist-prod',
        expectedServiceAccount: 'menulist-vercel-prod@menulist-prod.iam.gserviceaccount.com',
        read: readMenulistWorkloadIdentityConfig,
        values: {
            NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID: 'menulist-prod',
            MENULIST_GCP_PROJECT_NUMBER: '233910481388',
            MENULIST_GCP_SERVICE_ACCOUNT_EMAIL: 'menulist-vercel-prod@menulist-prod.iam.gserviceaccount.com',
            MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID: 'menulist-vercel',
            MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'menulist-prod',
        },
    },
    {
        expectedProjectId: 'neelvara-answerlattice-qa',
        expectedServiceAccount: 'answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com',
        read: readAnswerlatticeWorkloadIdentityConfig,
        values: {
            NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID: 'neelvara-answerlattice-qa',
            ANSWERLATTICE_GCP_PROJECT_NUMBER: '100000000002',
            ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL: 'answerlattice-vercel-qa@neelvara-answerlattice-qa.iam.gserviceaccount.com',
            ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID: 'answerlattice-vercel',
            ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'answerlattice-qa',
        },
    },
    {
        expectedProjectId: 'neelvara-answerlattice-prod',
        expectedServiceAccount: 'answerlattice-vercel-prod@neelvara-answerlattice-prod.iam.gserviceaccount.com',
        read: readAnswerlatticeWorkloadIdentityConfig,
        values: {
            NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID: 'neelvara-answerlattice-prod',
            ANSWERLATTICE_GCP_PROJECT_NUMBER: '100000000003',
            ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL: 'answerlattice-vercel-prod@neelvara-answerlattice-prod.iam.gserviceaccount.com',
            ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID: 'answerlattice-vercel',
            ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'answerlattice-prod',
        },
    },
] as const;

for (const contract of projectContracts) {
    const config = contract.read(contract.values);
    assert.equal(config.projectId, contract.expectedProjectId);
    assert.equal(config.serviceAccountEmail, contract.expectedServiceAccount);
    assert.match(config.audience, /^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\//);
    assert.equal(
        config.serviceAccountImpersonationUrl,
        `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${contract.expectedServiceAccount}:generateAccessToken`,
    );

    let requestedAudience: string | undefined;
    const tokenSupplier = createProviderAudienceTokenSupplier(config, async ({ audience }) => {
        requestedAudience = audience;
        return 'provider-scoped-vercel-oidc-token';
    });
    assert.equal(await tokenSupplier(), 'provider-scoped-vercel-oidc-token');
    assert.equal(requestedAudience, config.audience);
}

const diagnosticConfig = projectContracts[0].read(projectContracts[0].values);
const diagnosticClaims = {
    aud: diagnosticConfig.audience,
    environment: 'qa',
    iss: 'https://oidc.vercel.com/neelvara-systems',
    owner_id: 'team_test',
    project_id: 'prj_test',
};
const diagnosticToken = [
    Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(diagnosticClaims)).toString('base64url'),
    'signature-not-inspected',
].join('.');
assert.deepEqual(
    readWorkloadIdentityTokenDiagnostics(diagnosticToken, diagnosticConfig, {
        VERCEL_ENV: 'preview',
        VERCEL_PROJECT_ID: 'prj_test',
        VERCEL_TARGET_ENV: 'qa',
        VERCEL_TEAM_ID: 'team_test',
    }),
    {
        audienceMatchesProvider: true,
        environmentMatchesRuntimeTarget: true,
        issuerHost: 'oidc.vercel.com',
        projectIdMatchesRuntime: true,
        teamIdMatchesRuntime: true,
        tokenClaimsReadable: true,
        tokenEnvironment: 'qa',
    },
);
assert.equal(
    readWorkloadIdentityTokenDiagnostics(diagnosticToken, diagnosticConfig, {
        VERCEL_ENV: 'preview',
        VERCEL_PROJECT_ID: 'different-project',
        VERCEL_TARGET_ENV: 'preview',
        VERCEL_TEAM_ID: 'different-team',
    }).environmentMatchesRuntimeTarget,
    false,
);
assert.deepEqual(
    readWorkloadIdentityTokenDiagnostics('not-a-token', diagnosticConfig),
    {
        audienceMatchesProvider: false,
        environmentMatchesRuntimeTarget: false,
        issuerHost: 'unavailable',
        projectIdMatchesRuntime: false,
        teamIdMatchesRuntime: false,
        tokenClaimsReadable: false,
        tokenEnvironment: 'unavailable',
    },
);
const expectedAccessTokenFailure = new Error('test exchange failure');
let observedAccessTokenFailure: unknown;
const diagnosedFailingClient = attachWorkloadIdentityAccessTokenFailureDiagnostic(
    {
        getAccessToken: async () => {
            throw expectedAccessTokenFailure;
        },
    } as unknown as BaseExternalAccountClient,
    (error) => {
        observedAccessTokenFailure = error;
    },
);
await assert.rejects(
    () => diagnosedFailingClient.getAccessToken(),
    (error) => error === expectedAccessTokenFailure,
);
assert.equal(observedAccessTokenFailure, expectedAccessTokenFailure);

let successDiagnosticCalled = false;
const diagnosedSuccessfulClient = attachWorkloadIdentityAccessTokenFailureDiagnostic(
    {
        getAccessToken: async () => ({ token: 'short-lived-test-token' }),
    } as unknown as BaseExternalAccountClient,
    () => {
        successDiagnosticCalled = true;
    },
);
assert.deepEqual(await diagnosedSuccessfulClient.getAccessToken(), { token: 'short-lived-test-token' });
assert.equal(successDiagnosticCalled, false);

const menulistClient = createMenulistWorkloadIdentityAuthClient(
    projectContracts[1].read(projectContracts[1].values),
    async () => 'test-vercel-oidc-token',
);
const answerlatticeClient = createAnswerlatticeWorkloadIdentityAuthClient(
    projectContracts[3].read(projectContracts[3].values),
    async () => 'test-vercel-oidc-token',
);
assert.ok(menulistClient);
assert.ok(answerlatticeClient);

const menulistConfig = projectContracts[1].read(projectContracts[1].values);
const menulistGoogleAuth = createWorkloadIdentityGoogleAuth(menulistConfig, menulistClient);
assert.equal(await menulistGoogleAuth.getClient(), menulistClient);

const workloadIdentityFirestore = createWorkloadIdentityFirestore({
    auth: menulistGoogleAuth,
    projectId: menulistConfig.projectId,
});
assert.equal(workloadIdentityFirestore.collection('workload-identity-test').id, 'workload-identity-test');

const firebaseApp = { name: '[DEFAULT]' } as App;
registerFirebaseFirestoreCompatInstance(firebaseApp, workloadIdentityFirestore);
assert.equal(firebaseAdminCompat.firestore(), workloadIdentityFirestore);
assert.equal(firebaseAdminCompat.firestore(firebaseApp), workloadIdentityFirestore);

const answerlatticeFirebaseApp = { name: 'answerlattice-admin' } as App;
const answerlatticeWorkloadIdentityFirestore = createWorkloadIdentityFirestore({
    auth: menulistGoogleAuth,
    projectId: 'neelvara-answerlattice-prod',
});
registerFirebaseFirestoreCompatInstance(
    answerlatticeFirebaseApp,
    answerlatticeWorkloadIdentityFirestore,
);
assert.equal(
    firebaseAdminCompat.firestore(answerlatticeFirebaseApp),
    answerlatticeWorkloadIdentityFirestore,
);
assert.equal(firebaseAdminCompat.firestore(), workloadIdentityFirestore);

const workloadIdentityStorage = createWorkloadIdentityStorageAdmin({
    app: firebaseApp,
    config: menulistConfig,
    defaultBucket: 'menulist-prod.firebasestorage.app',
    getSubjectToken: async () => 'storage-scoped-vercel-oidc-token',
});
assert.equal(workloadIdentityStorage.app, firebaseApp);
assert.equal(workloadIdentityStorage.bucket().name, 'menulist-prod.firebasestorage.app');
assert.equal(workloadIdentityStorage.bucket('explicit-bucket').name, 'explicit-bucket');
const storageAuth = (workloadIdentityStorage.bucket() as unknown as {
    storage: { authClient: {
        getClient: () => Promise<{
            subjectTokenSupplier?: { getSubjectToken: () => Promise<string> };
        }>;
    } };
}).storage.authClient;
const nativeStorageClient = await storageAuth.getClient();
assert.notEqual(nativeStorageClient, menulistClient);
assert.equal(nativeStorageClient.constructor.name, 'IdentityPoolClient');
assert.equal(
    await nativeStorageClient.subjectTokenSupplier?.getSubjectToken(),
    'storage-scoped-vercel-oidc-token',
);

expectThrows(
    () => readAnswerlatticeWorkloadIdentityConfig({}),
    /configuration is missing/,
);
expectThrows(
    () => readMenulistWorkloadIdentityConfig({
        NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID: 'menulist-prod',
        MENULIST_GCP_PROJECT_NUMBER: 'not-a-number',
        MENULIST_GCP_SERVICE_ACCOUNT_EMAIL: 'menulist-vercel-prod@menulist-prod.iam.gserviceaccount.com',
        MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID: 'menulist-vercel',
        MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'menulist-prod',
    }),
    /numeric Google Cloud project number/,
);
expectThrows(
    () => readAnswerlatticeWorkloadIdentityConfig({
        NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID: 'neelvara-answerlattice-prod',
        ANSWERLATTICE_GCP_PROJECT_NUMBER: '100000000003',
        ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL: 'wrong-project@example.iam.gserviceaccount.com',
        ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID: 'answerlattice-vercel',
        ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'answerlattice-prod',
    }),
    /must belong to the configured Answerlattice Firebase project/,
);

console.log('MenuList and Answerlattice QA/production Vercel OIDC contracts verified.');
}

void main();
