export type SignalDeskFirebaseMode = "separate";

export const SIGNALDESK_FIREBASE_APP_NAME = "menulist-signaldesk-admin";
export const SIGNALDESK_CLIENT_FIREBASE_APP_NAME = "menulist-signaldesk";
export const SIGNALDESK_REQUIRED_FIREBASE_MODE: SignalDeskFirebaseMode = "separate";
export const SIGNALDESK_DEFAULT_FIRESTORE_DATABASE_ID = "(default)";
export const SIGNALDESK_EMULATOR_PROJECT_ID_PREFIX = "demo-signaldesk";
export const SIGNALDESK_FIREBASE_STORAGE_BUCKET_SUFFIXES = [
    ".appspot.com",
    ".firebasestorage.app",
] as const;

export const SIGNALDESK_FIREBASE_ENV = {
    API_KEY: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_API_KEY",
    APP_ID: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_APP_ID",
    AUTH_DOMAIN: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_AUTH_DOMAIN",
    CLIENT_EMAIL: "MENULIST_SIGNALDESK_FIREBASE_CLIENT_EMAIL",
    FIREBASE_MODE: "MENULIST_SIGNALDESK_FIREBASE_MODE",
    FIRESTORE_DATABASE_ID: "MENULIST_SIGNALDESK_FIRESTORE_DATABASE_ID",
    GOOGLE_APPLICATION_CREDENTIALS: "MENULIST_SIGNALDESK_GOOGLE_APPLICATION_CREDENTIALS",
    MESSAGING_SENDER_ID: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MESSAGING_SENDER_ID",
    PRIVATE_KEY: "MENULIST_SIGNALDESK_FIREBASE_PRIVATE_KEY",
    PROJECT_ID: "MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID",
    PUBLIC_FIREBASE_MODE: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE",
    PUBLIC_FIRESTORE_DATABASE_ID: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIRESTORE_DATABASE_ID",
    PUBLIC_PROJECT_ID: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID",
    PUBLIC_STORAGE_BUCKET: "NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET",
    STORAGE_BUCKET: "MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET",
} as const;

export const SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS = [
    SIGNALDESK_FIREBASE_ENV.PUBLIC_PROJECT_ID,
    SIGNALDESK_FIREBASE_ENV.PROJECT_ID,
] as const;

export const normalizeSignalDeskStorageBucket = (value?: string): string | null => {
    const normalized = value?.trim().replace(/^gs:\/\//i, "").replace(/\/$/, "") || "";
    if (
        !normalized
        || normalized !== normalized.toLowerCase()
        || normalized.includes("/")
        || !/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(normalized)
    ) {
        return null;
    }
    return normalized;
};

export const getSignalDeskProjectStorageBuckets = (projectId: string): readonly string[] => (
    SIGNALDESK_FIREBASE_STORAGE_BUCKET_SUFFIXES.map((suffix) => `${projectId}${suffix}`)
);

export const getSignalDeskEmulatorStorageBucket = (projectId: string): string => (
    `${projectId}.appspot.com`
);

export const isSignalDeskProjectStorageBucket = (
    bucket: string,
    projectId: string,
): boolean => getSignalDeskProjectStorageBuckets(projectId).includes(bucket);

export const isSignalDeskEmulatorProjectId = (projectId: string): boolean => (
    projectId === SIGNALDESK_EMULATOR_PROJECT_ID_PREFIX
    || (
        projectId.startsWith(`${SIGNALDESK_EMULATOR_PROJECT_ID_PREFIX}-`)
        && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            projectId.slice(SIGNALDESK_EMULATOR_PROJECT_ID_PREFIX.length + 1),
        )
    )
);
