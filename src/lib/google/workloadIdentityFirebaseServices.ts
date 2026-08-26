import { Storage as GoogleCloudStorage } from '@google-cloud/storage';
import type { App } from 'firebase-admin/app';
import { Firestore, type Settings as FirestoreSettings } from 'firebase-admin/firestore';
import type { Storage as FirebaseAdminStorage } from 'firebase-admin/storage';
import type { GoogleAuth } from 'google-auth-library';
import {
    createWorkloadIdentityExternalAccountCredentials,
    type OidcTokenSupplier,
    type WorkloadIdentityConfig,
} from './vercelWorkloadIdentity';

type FirestoreSettingsWithAuth = FirestoreSettings & {
    auth: GoogleAuth;
    databaseId?: string;
};

type FirebaseAdminStorageSurface = Pick<FirebaseAdminStorage, 'app' | 'bucket'>;
type StorageCredentials = NonNullable<ConstructorParameters<typeof GoogleCloudStorage>[0]>['credentials'];

export const createWorkloadIdentityFirestore = ({
    auth,
    databaseId,
    projectId,
}: {
    auth: GoogleAuth;
    databaseId?: string;
    projectId: string;
}): Firestore => new Firestore({
    auth,
    ...(databaseId ? { databaseId } : {}),
    projectId,
} as FirestoreSettingsWithAuth);

export const createWorkloadIdentityStorageAdmin = ({
    app,
    config,
    defaultBucket,
    getSubjectToken,
}: {
    app: App;
    config: WorkloadIdentityConfig;
    defaultBucket: string | undefined;
    getSubjectToken: OidcTokenSupplier;
}): FirebaseAdminStorageSurface => {
    const bucketName = defaultBucket?.trim();
    if (!bucketName) {
        throw new Error('Workload Identity Storage requires a default Firebase Storage bucket.');
    }

    const storage = new GoogleCloudStorage({
        // Storage carries google-auth-library v9 while Firestore uses the root
        // v10 runtime. Let Storage construct its own native v9 external-account
        // client from the same trusted WIF contract instead of bridging auth
        // objects across incompatible major versions.
        credentials: createWorkloadIdentityExternalAccountCredentials(
            config,
            getSubjectToken,
        ) as unknown as StorageCredentials,
        projectId: config.projectId,
    });

    return {
        app,
        bucket: (name?: string) => storage.bucket(name?.trim() || bucketName),
    };
};
