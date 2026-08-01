import {
    getDeploymentStage,
    getExpectedFirebaseProjectId,
    type DeploymentStage,
} from "@constant/deploymentTargets";
import {
    SIGNALDESK_DEFAULT_FIRESTORE_DATABASE_ID,
    SIGNALDESK_REQUIRED_FIREBASE_MODE,
    getSignalDeskEmulatorStorageBucket,
    isSignalDeskEmulatorProjectId,
    isSignalDeskProjectStorageBucket,
    normalizeSignalDeskStorageBucket,
    type SignalDeskFirebaseMode,
} from "@constant/signaldesk/firebase";

export type SignalDeskFirebaseConfigurationErrorCode =
    | "DATABASE_ID_CONFLICT"
    | "EMULATOR_PROJECT_MISMATCH"
    | "INVALID_MODE"
    | "INVALID_STORAGE_BUCKET"
    | "MISSING_MODE"
    | "MISSING_PROJECT_ID"
    | "MISSING_STORAGE_BUCKET"
    | "MODE_CONFLICT"
    | "NON_DEFAULT_DATABASE_NOT_ALLOWED"
    | "PROJECT_ID_CONFLICT"
    | "PROJECT_ID_MISMATCH"
    | "STORAGE_BUCKET_CONFLICT"
    | "STORAGE_BUCKET_PROJECT_MISMATCH"
    | "SHARED_MODE_NOT_ALLOWED";

export interface SignalDeskFirebaseBoundaryInput {
    deploymentStage: DeploymentStage;
    emulatorHost?: string;
    emulatorProjectId?: string;
    nodeEnv?: string;
    privateDatabaseId?: string;
    privateMode?: string;
    privateProjectId?: string;
    publicDatabaseId?: string;
    publicMode?: string;
    publicProjectId?: string;
    privateStorageBucket?: string;
    publicStorageBucket?: string;
}

export interface SignalDeskFirebaseBoundary {
    activeProjectId: string | null;
    activeStorageBucket: string | null;
    errorCode: SignalDeskFirebaseConfigurationErrorCode | null;
    expectedProjectId: string;
    isEmulator: boolean;
    mode: SignalDeskFirebaseMode | null;
    privateStorageBucket: string | null;
    publicStorageBucket: string | null;
    valid: boolean;
}

const normalizeOptionalValue = (value?: string): string | null => {
    const normalized = value?.trim();
    return normalized ? normalized : null;
};

const normalizeMode = (value?: string): string | null => (
    normalizeOptionalValue(value)?.toLowerCase() || null
);

const invalidBoundary = (
    expectedProjectId: string,
    isEmulator: boolean,
    errorCode: SignalDeskFirebaseConfigurationErrorCode,
): SignalDeskFirebaseBoundary => ({
    activeProjectId: null,
    activeStorageBucket: null,
    errorCode,
    expectedProjectId,
    isEmulator,
    mode: null,
    privateStorageBucket: null,
    publicStorageBucket: null,
    valid: false,
});

export const resolveSignalDeskFirebaseBoundary = (
    input: SignalDeskFirebaseBoundaryInput,
): SignalDeskFirebaseBoundary => {
    const expectedProjectId = getExpectedFirebaseProjectId("signaldesk", input.deploymentStage);
    const isEmulator = Boolean(normalizeOptionalValue(input.emulatorHost))
        && normalizeMode(input.nodeEnv) !== "production";
    const privateMode = normalizeMode(input.privateMode);
    const publicMode = normalizeMode(input.publicMode);

    if (!privateMode && !publicMode) {
        return invalidBoundary(expectedProjectId, isEmulator, "MISSING_MODE");
    }
    if (privateMode && publicMode && privateMode !== publicMode) {
        return invalidBoundary(expectedProjectId, isEmulator, "MODE_CONFLICT");
    }
    if (privateMode === "shared" || publicMode === "shared") {
        return invalidBoundary(expectedProjectId, isEmulator, "SHARED_MODE_NOT_ALLOWED");
    }
    if (
        (privateMode && privateMode !== SIGNALDESK_REQUIRED_FIREBASE_MODE)
        || (publicMode && publicMode !== SIGNALDESK_REQUIRED_FIREBASE_MODE)
    ) {
        return invalidBoundary(expectedProjectId, isEmulator, "INVALID_MODE");
    }

    const privateProjectId = normalizeOptionalValue(input.privateProjectId);
    const publicProjectId = normalizeOptionalValue(input.publicProjectId);
    if (privateProjectId && publicProjectId && privateProjectId !== publicProjectId) {
        return invalidBoundary(expectedProjectId, isEmulator, "PROJECT_ID_CONFLICT");
    }

    const activeProjectId = privateProjectId || publicProjectId;
    if (!activeProjectId) {
        return invalidBoundary(expectedProjectId, isEmulator, "MISSING_PROJECT_ID");
    }

    if (isEmulator) {
        const emulatorProjectId = normalizeOptionalValue(input.emulatorProjectId);
        if (
            !emulatorProjectId
            || emulatorProjectId !== activeProjectId
            || !isSignalDeskEmulatorProjectId(activeProjectId)
        ) {
            return invalidBoundary(expectedProjectId, true, "EMULATOR_PROJECT_MISMATCH");
        }
    } else if (activeProjectId !== expectedProjectId) {
        return invalidBoundary(expectedProjectId, false, "PROJECT_ID_MISMATCH");
    }

    const privateDatabaseId = normalizeOptionalValue(input.privateDatabaseId);
    const publicDatabaseId = normalizeOptionalValue(input.publicDatabaseId);
    if (privateDatabaseId && publicDatabaseId && privateDatabaseId !== publicDatabaseId) {
        return invalidBoundary(expectedProjectId, isEmulator, "DATABASE_ID_CONFLICT");
    }
    if (
        (privateDatabaseId && privateDatabaseId !== SIGNALDESK_DEFAULT_FIRESTORE_DATABASE_ID)
        || (publicDatabaseId && publicDatabaseId !== SIGNALDESK_DEFAULT_FIRESTORE_DATABASE_ID)
    ) {
        return invalidBoundary(expectedProjectId, isEmulator, "NON_DEFAULT_DATABASE_NOT_ALLOWED");
    }

    const rawPrivateStorageBucket = normalizeOptionalValue(input.privateStorageBucket);
    const rawPublicStorageBucket = normalizeOptionalValue(input.publicStorageBucket);
    const privateStorageBucket = rawPrivateStorageBucket
        ? normalizeSignalDeskStorageBucket(rawPrivateStorageBucket)
        : null;
    const publicStorageBucket = rawPublicStorageBucket
        ? normalizeSignalDeskStorageBucket(rawPublicStorageBucket)
        : null;
    if (
        (rawPrivateStorageBucket && !privateStorageBucket)
        || (rawPublicStorageBucket && !publicStorageBucket)
    ) {
        return invalidBoundary(expectedProjectId, isEmulator, "INVALID_STORAGE_BUCKET");
    }

    if (isEmulator) {
        const emulatorStorageBucket = getSignalDeskEmulatorStorageBucket(activeProjectId);
        if (
            (privateStorageBucket && privateStorageBucket !== emulatorStorageBucket)
            || (publicStorageBucket && publicStorageBucket !== emulatorStorageBucket)
        ) {
            return invalidBoundary(expectedProjectId, true, "STORAGE_BUCKET_PROJECT_MISMATCH");
        }
        return {
            activeProjectId,
            activeStorageBucket: emulatorStorageBucket,
            errorCode: null,
            expectedProjectId,
            isEmulator: true,
            mode: SIGNALDESK_REQUIRED_FIREBASE_MODE,
            privateStorageBucket: privateStorageBucket || emulatorStorageBucket,
            publicStorageBucket: publicStorageBucket || emulatorStorageBucket,
            valid: true,
        };
    }

    if (!privateStorageBucket && !publicStorageBucket) {
        return invalidBoundary(expectedProjectId, false, "MISSING_STORAGE_BUCKET");
    }
    if (
        privateStorageBucket
        && publicStorageBucket
        && privateStorageBucket !== publicStorageBucket
    ) {
        return invalidBoundary(expectedProjectId, false, "STORAGE_BUCKET_CONFLICT");
    }
    if (
        (privateStorageBucket && !isSignalDeskProjectStorageBucket(privateStorageBucket, activeProjectId))
        || (publicStorageBucket && !isSignalDeskProjectStorageBucket(publicStorageBucket, activeProjectId))
    ) {
        return invalidBoundary(expectedProjectId, false, "STORAGE_BUCKET_PROJECT_MISMATCH");
    }

    return {
        activeProjectId,
        activeStorageBucket: privateStorageBucket || publicStorageBucket,
        errorCode: null,
        expectedProjectId,
        isEmulator,
        mode: SIGNALDESK_REQUIRED_FIREBASE_MODE,
        privateStorageBucket,
        publicStorageBucket,
        valid: true,
    };
};

const signaldeskDeploymentStage = getDeploymentStage();
const expectedSignalDeskProjectId = getExpectedFirebaseProjectId("signaldesk", signaldeskDeploymentStage);
const signaldeskFirebaseBoundary = resolveSignalDeskFirebaseBoundary({
    deploymentStage: signaldeskDeploymentStage,
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
    emulatorProjectId: process.env.GCLOUD_PROJECT,
    nodeEnv: process.env.NODE_ENV,
    privateDatabaseId: process.env.SIGNALDESK_FIRESTORE_DATABASE_ID,
    privateMode: process.env.SIGNALDESK_FIREBASE_MODE,
    privateProjectId: process.env.SIGNALDESK_FIREBASE_PROJECT_ID,
    publicDatabaseId: process.env.NEXT_PUBLIC_SIGNALDESK_FIRESTORE_DATABASE_ID,
    publicMode: process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_MODE,
    publicProjectId: process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID,
    privateStorageBucket: process.env.SIGNALDESK_FIREBASE_STORAGE_BUCKET,
    publicStorageBucket: process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_STORAGE_BUCKET,
});

const normalizeRuntimeValue = (value?: string): string | undefined => {
    const normalized = value?.trim();
    return normalized || undefined;
};

const privateMode = normalizeMode(process.env.SIGNALDESK_FIREBASE_MODE);
const publicMode = normalizeMode(process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_MODE);
const privateProjectId = normalizeOptionalValue(process.env.SIGNALDESK_FIREBASE_PROJECT_ID);
const publicProjectId = normalizeOptionalValue(process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_PROJECT_ID);
const signaldeskAdminStorageBucket = signaldeskFirebaseBoundary.privateStorageBucket || undefined;
const signaldeskClientStorageBucket = signaldeskFirebaseBoundary.publicStorageBucket || undefined;

const signaldeskFirebaseConfig = {
    apiKey: normalizeRuntimeValue(process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_API_KEY),
    authDomain: normalizeRuntimeValue(process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_AUTH_DOMAIN),
    projectId: publicProjectId === signaldeskFirebaseBoundary.activeProjectId
        ? signaldeskFirebaseBoundary.activeProjectId || undefined
        : undefined,
    storageBucket: signaldeskClientStorageBucket,
    messagingSenderId: normalizeRuntimeValue(process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_MESSAGING_SENDER_ID),
    appId: normalizeRuntimeValue(process.env.NEXT_PUBLIC_SIGNALDESK_FIREBASE_APP_ID),
};

const hasSignalDeskFirebaseConfig = Boolean(
    signaldeskFirebaseBoundary.valid
    && publicMode === SIGNALDESK_REQUIRED_FIREBASE_MODE
    && publicProjectId === signaldeskFirebaseBoundary.activeProjectId
    && signaldeskClientStorageBucket === signaldeskFirebaseBoundary.activeStorageBucket
    && signaldeskFirebaseConfig.apiKey
    && signaldeskFirebaseConfig.appId
    && signaldeskFirebaseConfig.authDomain
);
const hasSignalDeskAdminCredential = Boolean(
    privateProjectId === signaldeskFirebaseBoundary.activeProjectId
    && normalizeRuntimeValue(process.env.SIGNALDESK_FIREBASE_CLIENT_EMAIL)
    && normalizeRuntimeValue(process.env.SIGNALDESK_FIREBASE_PRIVATE_KEY)
);
const hasSignalDeskAdminFirebaseConfig = Boolean(
    signaldeskFirebaseBoundary.valid
    && privateMode === SIGNALDESK_REQUIRED_FIREBASE_MODE
    && privateProjectId === signaldeskFirebaseBoundary.activeProjectId
    && signaldeskAdminStorageBucket === signaldeskFirebaseBoundary.activeStorageBucket
    && (
        signaldeskFirebaseBoundary.isEmulator
        || hasSignalDeskAdminCredential
        || normalizeRuntimeValue(process.env.SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS)
    )
);
const isSignalDeskFirebaseClientConfigured = hasSignalDeskFirebaseConfig;
const isSignalDeskFirebaseAdminConfigured = hasSignalDeskAdminFirebaseConfig;
// Historical server consumers use this aggregate readiness flag before
// attempting Admin SDK work. Keep it admin-safe; client-only public Firebase
// configuration must never be reported as server readiness.
const isSignalDeskFirebaseConfigured = isSignalDeskFirebaseAdminConfigured;
const signaldeskFirebaseMode = signaldeskFirebaseBoundary.mode;
const signaldeskFirebaseProjectId = signaldeskFirebaseBoundary.activeProjectId || undefined;
const signaldeskFirestoreDatabaseId: undefined = undefined;

export {
    expectedSignalDeskProjectId,
    hasSignalDeskAdminFirebaseConfig,
    hasSignalDeskFirebaseConfig,
    isSignalDeskFirebaseAdminConfigured,
    isSignalDeskFirebaseClientConfigured,
    isSignalDeskFirebaseConfigured,
    signaldeskAdminStorageBucket,
    signaldeskFirebaseBoundary,
    signaldeskFirebaseMode,
    signaldeskFirebaseProjectId,
    signaldeskFirestoreDatabaseId,
    signaldeskClientStorageBucket,
};

export default signaldeskFirebaseConfig;
