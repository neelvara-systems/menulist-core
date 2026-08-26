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

const toLegacyStorageHeaders = (headers: unknown): Record<string, string> => {
    if (!headers || typeof headers !== 'object') return {};

    const entries = (headers as { entries?: () => Iterable<[string, string]> }).entries;
    if (typeof entries === 'function') {
        return Object.fromEntries(entries.call(headers));
    }

    return Object.fromEntries(
        Object.entries(headers as Record<string, unknown>)
            .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
};

const createLegacyStorageAuthClient = (authClient: AuthClient): StorageAuthClient => (
    new Proxy(authClient, {
        get(target, property) {
            if (property === 'getRequestHeaders') {
                return async (url?: string | URL) => toLegacyStorageHeaders(
                    await target.getRequestHeaders(url),
                );
            }

            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
        },
    }) as unknown as StorageAuthClient
);

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
        // Storage currently carries google-auth-library v9, whose GoogleAuth
        // implementation copies request headers with Object.assign. The root
        // v10 WIF client returns a WHATWG Headers instance, which has no
        // enumerable authorization field. Preserve the actual v10 client for
        // token exchange while adapting only its header result to v9's plain
        // object contract.
        authClient: createLegacyStorageAuthClient(authClient),
        projectId,
    });

    return {
        app,
        bucket: (name?: string) => storage.bucket(name?.trim() || bucketName),
    };
};
