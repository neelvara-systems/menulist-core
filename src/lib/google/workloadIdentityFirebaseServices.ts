import { Storage as GoogleCloudStorage } from '@google-cloud/storage';
import type { App } from 'firebase-admin/app';
import { Firestore, type Settings as FirestoreSettings } from 'firebase-admin/firestore';
import type { Storage as FirebaseAdminStorage } from 'firebase-admin/storage';
import type { AuthClient, GoogleAuth } from 'google-auth-library';

type FirestoreSettingsWithAuth = FirestoreSettings & {
    auth: GoogleAuth;
    databaseId?: string;
};

type FirebaseAdminStorageSurface = Pick<FirebaseAdminStorage, 'app' | 'bucket'>;
type StorageAuthClient = NonNullable<ConstructorParameters<typeof GoogleCloudStorage>[0]>['authClient'];

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
    authClient,
    defaultBucket,
    projectId,
}: {
    app: App;
    authClient: AuthClient;
    defaultBucket: string | undefined;
    projectId: string;
}): FirebaseAdminStorageSurface => {
    const bucketName = defaultBucket?.trim();
    if (!bucketName) {
        throw new Error('Workload Identity Storage requires a default Firebase Storage bucket.');
    }

    const storage = new GoogleCloudStorage({
        // Storage currently carries google-auth-library v9 types, while the
        // root WIF client is v10. Pass the actual AuthClient so Storage's v9
        // GoogleAuth wrapper does not mistake a v10 GoogleAuth instance for an
        // AuthClient and attempt to use the wrapper itself as a credential.
        authClient: authClient as unknown as StorageAuthClient,
        projectId,
    });

    return {
        app,
        bucket: (name?: string) => storage.bucket(name?.trim() || bucketName),
    };
};
