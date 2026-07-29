import {
    SIGNALDESK_FIREBASE_APP_NAME,
    SIGNALDESK_FIREBASE_ENV,
} from "@constant/signaldesk/firebase";
import { admin } from "./firebaseAdminCompat";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
    isSignalDeskFirebaseAdminConfigured,
    signaldeskAdminStorageBucket,
    signaldeskFirebaseBoundary,
    signaldeskFirebaseProjectId,
} from "./signaldeskConfig";
import {
    getBoundedFirebaseAdminStringContext,
    logFirebaseAdminFailure,
} from "./firebaseAdminDiagnostics";

type SignalDeskAdminCredentialSource = "emulator" | "env" | "file";

type SignalDeskAdminCredentialDescriptor = {
    clientEmail: string | null;
    credential?: admin.credential.Credential;
    projectId: string;
    source: SignalDeskAdminCredentialSource;
};

type SignalDeskAdminBootstrapState = {
    app: admin.app.App;
    fingerprint: string;
};

type SignalDeskAdminBootstrapGlobal = typeof globalThis & {
    __SIGNALDESK_FIREBASE_ADMIN_BOOTSTRAP__?: SignalDeskAdminBootstrapState;
};

const signaldeskAdminBootstrapGlobal = globalThis as SignalDeskAdminBootstrapGlobal;

const isAllowedSignalDeskProjectId = (projectId?: string): projectId is string => Boolean(
    signaldeskFirebaseBoundary.valid
    && signaldeskFirebaseProjectId
    && projectId === signaldeskFirebaseProjectId
);

function normalizePrivateKey(privateKey: string): string {
    return privateKey
        .replace(/\\\r?\n/g, "\n")
        .replace(/\\n/g, "\n")
        .trim();
}

function getSignalDeskEnvCredential(): SignalDeskAdminCredentialDescriptor | null {
    const projectId = process.env[SIGNALDESK_FIREBASE_ENV.PROJECT_ID]?.trim();
    const privateKey = process.env[SIGNALDESK_FIREBASE_ENV.PRIVATE_KEY];
    const clientEmail = process.env[SIGNALDESK_FIREBASE_ENV.CLIENT_EMAIL]?.trim();

    if (!projectId || !privateKey || !clientEmail) return null;
    if (!isAllowedSignalDeskProjectId(projectId)) {
        logFirebaseAdminFailure("signaldesk_admin_env_project_mismatch", new Error("SignalDesk project mismatch."), {
            credentialSource: "env",
            product: "signaldesk",
            projectMatchesExpected: false,
        });
        return null;
    }

    try {
        return {
            clientEmail,
            credential: admin.credential.cert({
                projectId,
                privateKey: normalizePrivateKey(privateKey),
                clientEmail,
            }),
            projectId,
            source: "env",
        };
    } catch (error) {
        logFirebaseAdminFailure("signaldesk_admin_env_credential_invalid", error, {
            credentialSource: "env",
            product: "signaldesk",
        });
        return null;
    }
}

function getSignalDeskFileCredential(): SignalDeskAdminCredentialDescriptor | null {
    const credentialPath = process.env[SIGNALDESK_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS]?.trim();
    if (!credentialPath) return null;

    try {
        const resolvedPath = path.isAbsolute(credentialPath)
            ? credentialPath
            : path.join(/* turbopackIgnore: true */ process.cwd(), credentialPath);
        const parsed: unknown = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ resolvedPath, "utf8"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("SignalDesk service-account file must contain an object.");
        }

        const raw = parsed as Record<string, unknown>;
        const projectId = typeof raw.project_id === "string" ? raw.project_id.trim() : "";
        const privateKey = typeof raw.private_key === "string" ? raw.private_key : "";
        const clientEmail = typeof raw.client_email === "string" ? raw.client_email.trim() : "";

        if (!projectId || !privateKey || !clientEmail) {
            throw new Error("Missing project_id, private_key, or client_email in SignalDesk service-account file.");
        }
        if (!isAllowedSignalDeskProjectId(projectId)) {
            throw new Error("SignalDesk service-account project does not match the active deployment stage.");
        }

        return {
            clientEmail,
            credential: admin.credential.cert({
                projectId,
                privateKey: normalizePrivateKey(privateKey),
                clientEmail,
            }),
            projectId,
            source: "file",
        };
    } catch (error) {
        logFirebaseAdminFailure("signaldesk_admin_file_credential_load_failed", error, {
            credentialSource: "file",
            product: "signaldesk",
            ...getBoundedFirebaseAdminStringContext("credentialPath", credentialPath),
        });
        return null;
    }
}

const getSignalDeskAdminCredentialDescriptor = (): SignalDeskAdminCredentialDescriptor | null => {
    if (!signaldeskFirebaseProjectId) return null;
    if (signaldeskFirebaseBoundary.isEmulator) {
        return {
            clientEmail: null,
            projectId: signaldeskFirebaseProjectId,
            source: "emulator",
        };
    }
    return getSignalDeskEnvCredential() || getSignalDeskFileCredential();
};

const getSignalDeskAdminBootstrapFingerprint = (
    descriptor: SignalDeskAdminCredentialDescriptor,
): string => createHash("sha256").update(JSON.stringify({
    appName: SIGNALDESK_FIREBASE_APP_NAME,
    clientEmail: descriptor.clientEmail,
    credentialProjectId: descriptor.projectId,
    credentialSource: descriptor.source,
    databaseId: "(default)",
    projectId: signaldeskFirebaseProjectId,
    storageBucket: signaldeskAdminStorageBucket,
})).digest("hex");

const signaldeskAdminAppOptionsMatch = (app: admin.app.App): boolean => Boolean(
    app.name === SIGNALDESK_FIREBASE_APP_NAME
    && app.options.projectId === signaldeskFirebaseProjectId
    && app.options.storageBucket === signaldeskAdminStorageBucket
);

function initializeSignalDeskAdminApp(
    descriptor: SignalDeskAdminCredentialDescriptor,
    fingerprint: string,
): admin.app.App | null {
    if (!signaldeskFirebaseProjectId || !signaldeskAdminStorageBucket) return null;

    try {
        const app = admin.initializeApp({
            ...(descriptor.credential ? { credential: descriptor.credential } : {}),
            projectId: signaldeskFirebaseProjectId,
            storageBucket: signaldeskAdminStorageBucket,
        }, SIGNALDESK_FIREBASE_APP_NAME);
        if (!signaldeskAdminAppOptionsMatch(app)) {
            return null;
        }
        signaldeskAdminBootstrapGlobal.__SIGNALDESK_FIREBASE_ADMIN_BOOTSTRAP__ = {
            app,
            fingerprint,
        };
        return app;
    } catch (error) {
        logFirebaseAdminFailure("signaldesk_admin_initialize_failed", error, {
            hasCredential: Boolean(descriptor.credential),
            hasProjectId: true,
            hasStorageBucket: true,
            isEmulator: signaldeskFirebaseBoundary.isEmulator,
            product: "signaldesk",
        });
        return null;
    }
}

function getSignalDeskAdminApp(): admin.app.App | null {
    if (!signaldeskFirebaseBoundary.valid || !isSignalDeskFirebaseAdminConfigured) return null;
    const descriptor = getSignalDeskAdminCredentialDescriptor();
    if (!descriptor) return null;
    const fingerprint = getSignalDeskAdminBootstrapFingerprint(descriptor);

    const existing = admin.getApps().find((app) => app?.name === SIGNALDESK_FIREBASE_APP_NAME);
    if (existing) {
        const bootstrapState = signaldeskAdminBootstrapGlobal.__SIGNALDESK_FIREBASE_ADMIN_BOOTSTRAP__;
        if (
            bootstrapState?.app === existing
            && bootstrapState.fingerprint === fingerprint
            && signaldeskAdminAppOptionsMatch(existing)
            && isAllowedSignalDeskProjectId(existing.options.projectId)
        ) {
            return existing;
        }

        logFirebaseAdminFailure("signaldesk_admin_existing_app_authority_mismatch", new Error("SignalDesk app authority mismatch."), {
            appNameMatches: true,
            product: "signaldesk",
            projectMatchesExpected: isAllowedSignalDeskProjectId(existing.options.projectId),
            storageBucketMatchesExpected: existing.options.storageBucket === signaldeskAdminStorageBucket,
        });
        return null;
    }

    return initializeSignalDeskAdminApp(descriptor, fingerprint);
}

const signaldeskAdminApp = getSignalDeskAdminApp();
const signaldeskFirestoreAdmin = signaldeskAdminApp
    ? getAdminFirestore(signaldeskAdminApp)
    : null;
const signaldeskStorageAdmin = signaldeskAdminApp ? admin.storage(signaldeskAdminApp) : null;
const signaldeskAuthAdmin = signaldeskAdminApp ? admin.auth(signaldeskAdminApp) : null;

export {
    admin,
    signaldeskAdminApp,
    signaldeskAuthAdmin,
    signaldeskFirestoreAdmin,
    signaldeskStorageAdmin,
};
