import assert from 'node:assert/strict';
import type { App } from 'firebase-admin/app';
import {
    createProviderAudienceTokenSupplier,
    createWorkloadIdentityGoogleAuth,
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
        expectedProjectId: 'answerlattice-qa',
        expectedServiceAccount: 'answerlattice-vercel-qa@answerlattice-qa.iam.gserviceaccount.com',
        read: readAnswerlatticeWorkloadIdentityConfig,
        values: {
            NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID: 'answerlattice-qa',
            ANSWERLATTICE_GCP_PROJECT_NUMBER: '100000000002',
            ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL: 'answerlattice-vercel-qa@answerlattice-qa.iam.gserviceaccount.com',
            ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID: 'answerlattice-vercel',
            ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: 'answerlattice-qa',
        },
    },
    {
        expectedProjectId: 'answerlattice',
        expectedServiceAccount: 'answerlattice-vercel-prod@answerlattice.iam.gserviceaccount.com',
        read: readAnswerlatticeWorkloadIdentityConfig,
        values: {
            NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID: 'answerlattice',
            ANSWERLATTICE_GCP_PROJECT_NUMBER: '100000000003',
            ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL: 'answerlattice-vercel-prod@answerlattice.iam.gserviceaccount.com',
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

const firebaseApp = {} as App;
const workloadIdentityStorage = createWorkloadIdentityStorageAdmin({
    app: firebaseApp,
    auth: menulistGoogleAuth,
    defaultBucket: 'menulist-prod.firebasestorage.app',
    projectId: menulistConfig.projectId,
});
assert.equal(workloadIdentityStorage.app, firebaseApp);
assert.equal(workloadIdentityStorage.bucket().name, 'menulist-prod.firebasestorage.app');
assert.equal(workloadIdentityStorage.bucket('explicit-bucket').name, 'explicit-bucket');

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
        NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID: 'answerlattice',
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
