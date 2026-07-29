import { SIGNALDESK_CLIENT_FIREBASE_APP_NAME } from "@constant/signaldesk/firebase";
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { logFirebaseBootstrapFailure } from "./firebaseDiagnostics";
import signaldeskFirebaseConfig, {
    isSignalDeskFirebaseClientConfigured,
    isSignalDeskFirebaseConfigured,
    signaldeskFirebaseBoundary,
    signaldeskFirebaseMode,
    signaldeskFirebaseProjectId,
    signaldeskFirestoreDatabaseId,
} from "./signaldeskConfig";

type SignalDeskClientBootstrapState = {
    app: FirebaseApp;
    fingerprint: string;
};

type SignalDeskClientBootstrapGlobal = typeof globalThis & {
    __SIGNALDESK_FIREBASE_CLIENT_BOOTSTRAP__?: SignalDeskClientBootstrapState;
};

const signaldeskClientBootstrapGlobal = globalThis as SignalDeskClientBootstrapGlobal;

const getSignalDeskClientFingerprint = (options: FirebaseOptions): string => JSON.stringify([
    options.apiKey || null,
    options.appId || null,
    options.authDomain || null,
    options.messagingSenderId || null,
    options.projectId || null,
    options.storageBucket || null,
]);

const signaldeskClientAppOptionsMatch = (app: FirebaseApp): boolean => (
    app.name === SIGNALDESK_CLIENT_FIREBASE_APP_NAME
    && app.options.apiKey === signaldeskFirebaseConfig.apiKey
    && app.options.appId === signaldeskFirebaseConfig.appId
    && app.options.authDomain === signaldeskFirebaseConfig.authDomain
    && app.options.messagingSenderId === signaldeskFirebaseConfig.messagingSenderId
    && app.options.projectId === signaldeskFirebaseConfig.projectId
    && app.options.storageBucket === signaldeskFirebaseConfig.storageBucket
);

const getSignalDeskClientApp = (): FirebaseApp | null => {
    if (
        !signaldeskFirebaseBoundary.valid
        || !isSignalDeskFirebaseClientConfigured
        || !signaldeskFirebaseProjectId
    ) {
        return null;
    }
    const fingerprint = getSignalDeskClientFingerprint(signaldeskFirebaseConfig);

    const existing = getApps().find((app) => app.name === SIGNALDESK_CLIENT_FIREBASE_APP_NAME);
    if (existing) {
        const bootstrapState = signaldeskClientBootstrapGlobal.__SIGNALDESK_FIREBASE_CLIENT_BOOTSTRAP__;
        if (
            bootstrapState?.app === existing
            && bootstrapState.fingerprint === fingerprint
            && signaldeskClientAppOptionsMatch(existing)
        ) {
            return existing;
        }

        logFirebaseBootstrapFailure("signaldesk_client_existing_app_authority_mismatch", undefined, {
            appNameMatches: true,
            product: "signaldesk",
            projectMatchesExpected: existing.options.projectId === signaldeskFirebaseProjectId,
            storageBucketMatchesExpected: existing.options.storageBucket === signaldeskFirebaseConfig.storageBucket,
        });
        return null;
    }

    try {
        const app = initializeApp(signaldeskFirebaseConfig, SIGNALDESK_CLIENT_FIREBASE_APP_NAME);
        if (!signaldeskClientAppOptionsMatch(app)) return null;
        signaldeskClientBootstrapGlobal.__SIGNALDESK_FIREBASE_CLIENT_BOOTSTRAP__ = {
            app,
            fingerprint,
        };
        return app;
    } catch (error) {
        logFirebaseBootstrapFailure("signaldesk_client_initialize_failed", error, {
            hasApiKey: Boolean(signaldeskFirebaseConfig.apiKey),
            hasAppId: Boolean(signaldeskFirebaseConfig.appId),
            product: "signaldesk",
            projectMatchesExpected: signaldeskFirebaseConfig.projectId === signaldeskFirebaseProjectId,
        });
        return null;
    }
};

const signaldeskApp = getSignalDeskClientApp();
const signaldeskFirebaseClient = signaldeskApp ? getFirestore(signaldeskApp) : null;
const signaldeskAuth = signaldeskApp ? getAuth(signaldeskApp) : null;
const signaldeskStorage = signaldeskApp ? getStorage(signaldeskApp) : null;
const signaldeskFunctions = signaldeskApp ? getFunctions(signaldeskApp) : null;

export {
    isSignalDeskFirebaseClientConfigured,
    isSignalDeskFirebaseConfigured,
    signaldeskApp,
    signaldeskAuth,
    signaldeskFirebaseBoundary,
    signaldeskFirebaseClient,
    signaldeskFirebaseMode,
    signaldeskFirestoreDatabaseId,
    signaldeskFunctions,
    signaldeskStorage,
};
