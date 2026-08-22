import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signOut } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { getExpectedFirebaseProjectId } from "@constant/deploymentTargets";
import { isAnswerlatticeProductHostname } from "@constant/answerlattice/domains";
import firebaseConfig from "./config";
import { logFirebaseBootstrapFailure } from "./firebaseDiagnostics";
import { resolveMenuListFirebaseClientBoundary } from "./menuListFirebaseClientBoundary";
import { menulistPublicEnv } from '@lib/env/menulistPublicEnv';

const appCheckDebugToken = menulistPublicEnv.firebaseAppCheckDebugToken;
const expectedMenuListProjectId = getExpectedFirebaseProjectId('menulist');

const isLocalAppCheckHost = (hostname: string): boolean => {
    const normalizedHost = hostname.toLowerCase();

    if (
        normalizedHost === 'localhost' ||
        normalizedHost === '0.0.0.0' ||
        normalizedHost.endsWith('.local')
    ) {
        return true;
    }

    if (/^127(?:\.\d{1,3}){3}$/.test(normalizedHost)) return true;
    if (/^192\.168(?:\.\d{1,3}){2}$/.test(normalizedHost)) return true;
    if (/^10(?:\.\d{1,3}){3}$/.test(normalizedHost)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(normalizedHost)) return true;

    return false;
};

const defaultFirebaseApp = getApps().find((app) => app.name === '[DEFAULT]');
const firebaseClientBoundary = resolveMenuListFirebaseClientBoundary({
    configuredOptions: firebaseConfig,
    existingDefaultApp: defaultFirebaseApp,
    expectedProjectId: expectedMenuListProjectId,
});

if (!firebaseClientBoundary.valid && firebaseClientBoundary.errorCode !== 'INCOMPLETE_CONFIGURATION') {
    logFirebaseBootstrapFailure('menulist_client_configuration_rejected', undefined, {
        boundaryErrorCode: firebaseClientBoundary.errorCode,
        existingProjectMatchesExpected:
            defaultFirebaseApp?.options.projectId === expectedMenuListProjectId,
        product: 'menulist',
        projectMatchesExpected:
            firebaseConfig.projectId === expectedMenuListProjectId,
    });
}

let firebaseApp = firebaseClientBoundary.existingApp;
if (firebaseClientBoundary.valid && !firebaseApp) {
    try {
        firebaseApp = initializeApp(firebaseConfig);
    } catch (error) {
        logFirebaseBootstrapFailure('menulist_client_initialize_failed', error, {
            hasApiKey: Boolean(firebaseConfig.apiKey),
            hasAppId: Boolean(firebaseConfig.appId),
            product: 'menulist',
            projectMatchesExpected:
                firebaseConfig.projectId === expectedMenuListProjectId,
        });
    }
}

const firebaseClient = firebaseApp ? getFirestore(firebaseApp) : null as any;
const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null as any;
const firebaseStorage = firebaseApp ? getStorage(firebaseApp) : null as any;
const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null as any;
const firebaseStorageUrl = firebaseConfig.storageBucket
    ? `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o`
    : '';
const signOutFirebaseAuth = () => firebaseAuth ? signOut(firebaseAuth) : Promise.resolve();
const functions = firebaseApp ? getFunctions(firebaseApp) : null as any;
const useFirebaseEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

const isFirebaseEmulatorAlreadyConfigured = (error: unknown): boolean => {
    const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    return code === 'failed-precondition' || code.endsWith('/failed-precondition');
};

const connectMenuListEmulator = (connect: () => void, service: string): void => {
    try {
        connect();
    } catch (error) {
        if (isFirebaseEmulatorAlreadyConfigured(error)) return;
        logFirebaseBootstrapFailure('firebase_emulator_connect_failed', error, {
            isDevelopment: true,
            service,
            useFirebaseEmulators,
        });
    }
};

// Initialize App Check (bot protection)
// Call this after firebaseApp is initialized
if (firebaseApp && typeof window !== 'undefined') {
    const isAnswerlatticeHost = isAnswerlatticeProductHostname(window.location.hostname);
    const shouldLoadAppCheck = !isAnswerlatticeHost
        && (!isLocalAppCheckHost(window.location.hostname) || Boolean(appCheckDebugToken));

    if (shouldLoadAppCheck) {
        import('./appCheck')
            .then(({ initAppCheck }) => {
                initAppCheck(firebaseApp);
            })
            .catch((error) => {
                logFirebaseBootstrapFailure('app_check_module_load_failed', error, {
                    isLocalHost: isLocalAppCheckHost(window.location.hostname),
                    isAnswerlatticeHost,
                    hasDebugToken: Boolean(appCheckDebugToken),
                });
            });
    }
}

if (firebaseApp && process.env.NODE_ENV === 'development') {
    connectMenuListEmulator(
        () => connectFunctionsEmulator(functions, '127.0.0.1', 5001),
        'functions',
    );
    if (useFirebaseEmulators) {
        connectMenuListEmulator(
            () => connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true }),
            'auth',
        );
        connectMenuListEmulator(
            () => connectFirestoreEmulator(firebaseClient, '127.0.0.1', 8080),
            'firestore',
        );
        connectMenuListEmulator(
            () => connectStorageEmulator(firebaseStorage, '127.0.0.1', 9199),
            'storage',
        );
    }
}

export { firebaseApp, firebaseAuth, firebaseClient, firebaseDatabase, firebaseStorage, firebaseStorageUrl, functions, signOutFirebaseAuth };
