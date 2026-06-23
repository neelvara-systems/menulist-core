import {
    getDeploymentStage,
    getExpectedFirebaseProjectId,
} from "@constant/deploymentTargets";
import {
    SIGNALDESK_FIREBASE_ENV,
    SIGNALDESK_FIREBASE_MODE_ALIASES,
    SIGNALDESK_FIREBASE_MODE_ENV_KEYS,
    SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS,
    SIGNALDESK_FIRESTORE_DATABASE_ID_ENV_KEYS,
    type SignalDeskFirebaseMode,
} from "@constant/signaldesk/firebase";
import firebaseConfig from "./config";

const normalizeSignalDeskFirebaseMode = (value?: string): SignalDeskFirebaseMode | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if ((SIGNALDESK_FIREBASE_MODE_ALIASES.shared as readonly string[]).includes(normalized)) return "shared";
    if ((SIGNALDESK_FIREBASE_MODE_ALIASES.separate as readonly string[]).includes(normalized)) return "separate";
    return null;
};

const expectedSignalDeskProjectId = getExpectedFirebaseProjectId("signaldesk", getDeploymentStage());

const signaldeskFirebaseConfig = {
    apiKey: process.env[SIGNALDESK_FIREBASE_ENV.API_KEY],
    authDomain: process.env[SIGNALDESK_FIREBASE_ENV.AUTH_DOMAIN],
    projectId: process.env[SIGNALDESK_FIREBASE_ENV.PUBLIC_PROJECT_ID] || expectedSignalDeskProjectId,
    storageBucket: process.env[SIGNALDESK_FIREBASE_ENV.PUBLIC_STORAGE_BUCKET],
    messagingSenderId: process.env[SIGNALDESK_FIREBASE_ENV.MESSAGING_SENDER_ID],
    appId: process.env[SIGNALDESK_FIREBASE_ENV.APP_ID],
};

const signaldeskFirestoreDatabaseId =
    SIGNALDESK_FIRESTORE_DATABASE_ID_ENV_KEYS.map((key) => process.env[key]).find(Boolean) ||
    undefined;

const signaldeskFirebaseModeOverride = normalizeSignalDeskFirebaseMode(
    SIGNALDESK_FIREBASE_MODE_ENV_KEYS.map((key) => process.env[key]).find(Boolean),
);

const defaultFirebaseProjectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID;
const signaldeskFirebaseProjectId =
    signaldeskFirebaseConfig.projectId ||
    SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS.map((key) => process.env[key]).find(Boolean) ||
    expectedSignalDeskProjectId;

const isSameFirebaseProject = Boolean(
    defaultFirebaseProjectId &&
    signaldeskFirebaseProjectId &&
    defaultFirebaseProjectId === signaldeskFirebaseProjectId,
);

const hasDefaultFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const hasSignalDeskFirebaseConfig = Boolean(
    signaldeskFirebaseConfig.apiKey &&
    signaldeskFirebaseConfig.projectId &&
    signaldeskFirebaseConfig.appId,
);
const hasSignalDeskAdminFirebaseConfig = Boolean(
    process.env[SIGNALDESK_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS] ||
    (
        process.env[SIGNALDESK_FIREBASE_ENV.PROJECT_ID] &&
        process.env[SIGNALDESK_FIREBASE_ENV.CLIENT_EMAIL] &&
        process.env[SIGNALDESK_FIREBASE_ENV.PRIVATE_KEY]
    ),
);

const signaldeskFirebaseMode: SignalDeskFirebaseMode =
    signaldeskFirebaseModeOverride ||
    (isSameFirebaseProject ? "shared" : "separate");

const shouldUseSharedSignalDeskFirebase = signaldeskFirebaseMode === "shared";
const isSignalDeskFirebaseConfigured = shouldUseSharedSignalDeskFirebase
    ? hasDefaultFirebaseConfig
    : hasSignalDeskFirebaseConfig || hasSignalDeskAdminFirebaseConfig;

export {
    expectedSignalDeskProjectId,
    hasSignalDeskAdminFirebaseConfig,
    hasSignalDeskFirebaseConfig,
    isSignalDeskFirebaseConfigured,
    shouldUseSharedSignalDeskFirebase,
    signaldeskFirebaseMode,
    signaldeskFirebaseProjectId,
    signaldeskFirestoreDatabaseId,
};

export default signaldeskFirebaseConfig;
