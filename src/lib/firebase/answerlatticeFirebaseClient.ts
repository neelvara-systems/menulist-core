/**
 * Answerlattice Firebase Client — shared or separate Firebase runtime.
 *
 * Answerlattice DAL files import from this file so local, preview, and production
 * use the Answerlattice Firebase target configured for that deployment stage.
 * Shared mode is only an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { isAnswerlatticeProductHostname } from '@constant/answerlattice/domains';
import answerlatticeFirebaseConfig, {
    answerlatticeFirebaseMode,
    answerlatticeFirestoreDatabaseId,
    isAnswerlatticeFirebaseConfigured,
    shouldUseSharedAnswerlatticeFirebase,
} from "./answerlatticeConfig";
import {
    firebaseApp,
    firebaseAuth,
    firebaseClient,
    firebaseStorage,
    functions,
} from "./firebaseClient";
import { logFirebaseBootstrapFailure } from './firebaseDiagnostics';
import { resolveAnswerlatticeEmulatorPorts } from './answerlatticeEmulatorPorts';

const ANSWERLATTICE_APP_NAME = 'answerlattice';

const getAnswerlatticeFirestore = (app: NonNullable<typeof firebaseApp>) => {
    return answerlatticeFirestoreDatabaseId
        ? getFirestore(app, answerlatticeFirestoreDatabaseId)
        : getFirestore(app);
};

const answerlatticeApp = isAnswerlatticeFirebaseConfigured
    ? (shouldUseSharedAnswerlatticeFirebase
        ? firebaseApp
        : (getApps().find(app => app.name === ANSWERLATTICE_APP_NAME)
            ? getApp(ANSWERLATTICE_APP_NAME)
            : initializeApp(answerlatticeFirebaseConfig, ANSWERLATTICE_APP_NAME)))
    : null;

const answerlatticeFirebaseClient = answerlatticeApp
    ? (shouldUseSharedAnswerlatticeFirebase && !answerlatticeFirestoreDatabaseId
        ? firebaseClient
        : getAnswerlatticeFirestore(answerlatticeApp))
    : null as any;
const answerlatticeAuth = answerlatticeApp ? (shouldUseSharedAnswerlatticeFirebase ? firebaseAuth : getAuth(answerlatticeApp)) : null as any;
const answerlatticeStorage = answerlatticeApp ? (shouldUseSharedAnswerlatticeFirebase ? firebaseStorage : getStorage(answerlatticeApp)) : null as any;
const answerlatticeFunctions = answerlatticeApp ? (shouldUseSharedAnswerlatticeFirebase ? functions : getFunctions(answerlatticeApp)) : null as any;
const useFirebaseEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const answerlatticeEmulatorPorts = resolveAnswerlatticeEmulatorPorts({
    auth: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_EMULATOR_PORT,
    firestore: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_FIRESTORE_EMULATOR_PORT,
    functions: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_FUNCTIONS_EMULATOR_PORT,
    storage: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_EMULATOR_PORT,
});

const isFirebaseEmulatorAlreadyConfigured = (error: unknown): boolean => {
    const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    return code === 'failed-precondition' || code.endsWith('/failed-precondition');
};

const connectAnswerlatticeEmulator = (connect: () => void, service: string): void => {
    try {
        connect();
    } catch (error) {
        if (isFirebaseEmulatorAlreadyConfigured(error)) return;
        logFirebaseBootstrapFailure('answerlattice_emulator_connect_failed', error, {
            product: 'answerlattice',
            service,
            useFirebaseEmulators,
        });
    }
};

if (
    answerlatticeApp &&
    !shouldUseSharedAnswerlatticeFirebase &&
    useFirebaseEmulators &&
    process.env.NODE_ENV === 'development'
) {
    connectAnswerlatticeEmulator(
        () => connectAuthEmulator(answerlatticeAuth, `http://127.0.0.1:${answerlatticeEmulatorPorts.auth}`, { disableWarnings: true }),
        'auth',
    );
    connectAnswerlatticeEmulator(
        () => connectFirestoreEmulator(answerlatticeFirebaseClient, '127.0.0.1', answerlatticeEmulatorPorts.firestore),
        'firestore',
    );
    connectAnswerlatticeEmulator(
        () => connectFunctionsEmulator(answerlatticeFunctions, '127.0.0.1', answerlatticeEmulatorPorts.functions),
        'functions',
    );
    connectAnswerlatticeEmulator(
        () => connectStorageEmulator(answerlatticeStorage, '127.0.0.1', answerlatticeEmulatorPorts.storage),
        'storage',
    );
}

if (
    answerlatticeApp &&
    !shouldUseSharedAnswerlatticeFirebase &&
    typeof window !== 'undefined' &&
    isAnswerlatticeProductHostname(window.location.hostname) &&
    !(process.env.NODE_ENV === 'development' && useFirebaseEmulators)
) {
    import('./answerlatticeAppCheck')
        .then(({ initAnswerlatticeAppCheck }) => {
            initAnswerlatticeAppCheck(answerlatticeApp);
        })
        .catch((error) => {
            logFirebaseBootstrapFailure('answerlattice_app_check_module_load_failed', error, {
                product: 'answerlattice',
            });
        });
}

export {
    answerlatticeApp,
    answerlatticeAuth,
    answerlatticeFirebaseMode,
    answerlatticeFirebaseClient,
    answerlatticeFunctions,
    answerlatticeFirestoreDatabaseId,
    answerlatticeStorage,
    isAnswerlatticeFirebaseConfigured,
    shouldUseSharedAnswerlatticeFirebase,
};
