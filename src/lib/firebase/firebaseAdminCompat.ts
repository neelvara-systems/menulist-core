import {
    applicationDefault as firebaseApplicationDefault,
    cert as firebaseCert,
    getApp as getFirebaseApp,
    getApps as getFirebaseApps,
    initializeApp as initializeFirebaseApp,
    type App as FirebaseApp,
    type AppOptions as FirebaseAppOptions,
    type Credential as FirebaseCredential,
    type ServiceAccount as FirebaseServiceAccount,
} from 'firebase-admin/app';
import {
    FieldPath as FirebaseFieldPath,
    FieldValue as FirebaseFieldValue,
    Timestamp as FirebaseTimestamp,
    getFirestore,
    type DocumentData as FirebaseDocumentData,
    type DocumentReference as FirebaseDocumentReference,
    type DocumentSnapshot as FirebaseDocumentSnapshot,
    type Firestore as FirebaseFirestore,
    type QueryDocumentSnapshot as FirebaseQueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { getAuth, type Auth as FirebaseAuth, type UpdateRequest as FirebaseUpdateRequest } from 'firebase-admin/auth';
import { getStorage, type Storage as FirebaseStorage } from 'firebase-admin/storage';

const DEFAULT_FIREBASE_APP_NAME = '[DEFAULT]';
const firestoreCompatInstances = new Map<string, FirebaseFirestore>();

export const registerFirebaseFirestoreCompatInstance = (
    firebaseApp: FirebaseApp,
    firestore: FirebaseFirestore,
): void => {
    firestoreCompatInstances.set(firebaseApp.name, firestore);
};

/**
 * Narrow compatibility surface for repository code that still consumes
 * `admin.firestore.*` values and types. Runtime initialization and services use
 * Firebase Admin's supported modular entry points, so the removed v14 root
 * namespace is never imported.
 */
export namespace admin {
    export type AppOptions = FirebaseAppOptions;

    export function initializeApp(options?: FirebaseAppOptions, appName?: string): FirebaseApp {
        return initializeFirebaseApp(options, appName);
    }

    export function app(appName?: string): FirebaseApp {
        return getFirebaseApp(appName);
    }

    export function getApps(): FirebaseApp[] {
        return getFirebaseApps();
    }

    export namespace app {
        export type App = FirebaseApp;
    }

    export namespace credential {
        export type Credential = FirebaseCredential;
        export type ServiceAccount = FirebaseServiceAccount;
        export const applicationDefault = firebaseApplicationDefault;
        export const cert = firebaseCert;
    }

    export function firestore(firebaseApp?: FirebaseApp): FirebaseFirestore {
        const registeredFirestore = firestoreCompatInstances.get(
            firebaseApp?.name || DEFAULT_FIREBASE_APP_NAME,
        );
        if (registeredFirestore) return registeredFirestore;
        return firebaseApp ? getFirestore(firebaseApp) : getFirestore();
    }

    export namespace firestore {
        export const FieldPath = FirebaseFieldPath;
        export type FieldPath = FirebaseFieldPath;
        export const FieldValue = FirebaseFieldValue;
        export type FieldValue = FirebaseFieldValue;
        export const Timestamp = FirebaseTimestamp;
        export type Timestamp = FirebaseTimestamp;
        export type DocumentData = FirebaseDocumentData;
        export type DocumentReference<
            AppModelType = FirebaseDocumentData,
            DbModelType extends FirebaseDocumentData = FirebaseDocumentData,
        > = FirebaseDocumentReference<AppModelType, DbModelType>;
        export type DocumentSnapshot<
            AppModelType = FirebaseDocumentData,
            DbModelType extends FirebaseDocumentData = FirebaseDocumentData,
        > = FirebaseDocumentSnapshot<AppModelType, DbModelType>;
        export type Firestore = FirebaseFirestore;
        export type QueryDocumentSnapshot<
            AppModelType = FirebaseDocumentData,
            DbModelType extends FirebaseDocumentData = FirebaseDocumentData,
        > = FirebaseQueryDocumentSnapshot<AppModelType, DbModelType>;
    }

    export function auth(firebaseApp?: FirebaseApp): FirebaseAuth {
        return getAuth(firebaseApp);
    }

    export namespace auth {
        export type Auth = FirebaseAuth;
        export type UpdateRequest = FirebaseUpdateRequest;
    }

    export function storage(firebaseApp?: FirebaseApp): FirebaseStorage {
        return getStorage(firebaseApp);
    }

    export namespace storage {
        export type Storage = FirebaseStorage;
    }
}
