import {
    SIGNALDESK_DEFAULT_FIREBASE_APP_NAME,
    SIGNALDESK_DEFAULT_FIREBASE_CREDENTIAL_PREFIX,
    SIGNALDESK_FIREBASE_APP_NAME,
    SIGNALDESK_FIREBASE_CREDENTIAL_PREFIX,
    SIGNALDESK_FIREBASE_ENV,
    SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS,
    type SignalDeskAdminCredentialPrefix,
} from "@constant/signaldesk/firebase";
import * as admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import {
    shouldUseSharedSignalDeskFirebase,
    signaldeskFirebaseProjectId,
    signaldeskFirestoreDatabaseId,
} from "./signaldeskConfig";
import {
    getBoundedFirebaseAdminStringContext,
    logFirebaseAdminFailure,
} from "./firebaseAdminDiagnostics";

const getSignalDeskProjectId = () =>
    SIGNALDESK_FIREBASE_PROJECT_ID_ENV_KEYS.map((key) => process.env[key]).find(Boolean) ||
    signaldeskFirebaseProjectId;

const getSignalDeskStorageBucket = () =>
    process.env[SIGNALDESK_FIREBASE_ENV.STORAGE_BUCKET] ||
    process.env[SIGNALDESK_FIREBASE_ENV.PUBLIC_STORAGE_BUCKET];

function normalizePrivateKey(privateKey: string): string {
    return privateKey
        .replace(/\\\r?\n/g, "\n")
        .replace(/\\n/g, "\n")
        .trim();
}

function getAdminCredential(prefix: SignalDeskAdminCredentialPrefix): admin.credential.Credential | null {
    const projectId = process.env[`${prefix}_PROJECT_ID`];
    const privateKey = process.env[`${prefix}_PRIVATE_KEY`];
    const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`];

    if (!projectId || !privateKey || !clientEmail) return null;

    try {
        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logFirebaseAdminFailure("signaldesk_admin_env_credential_invalid", error, {
            credentialSource: "env",
            product: "signaldesk",
            usesProductCredential: prefix === SIGNALDESK_FIREBASE_CREDENTIAL_PREFIX,
        }, { developmentOnly: true });
        return null;
    }
}

function getSignalDeskFileCredential(): admin.credential.Credential | null {
    const credentialPath = process.env[SIGNALDESK_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS];
    if (!credentialPath) return null;

    try {
        const resolvedPath = path.isAbsolute(credentialPath)
            ? credentialPath
            : path.join(process.cwd(), credentialPath);
        const raw = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
        const projectId = raw.project_id || getSignalDeskProjectId();
        const privateKey = raw.private_key;
        const clientEmail = raw.client_email;

        if (!projectId || !privateKey || !clientEmail) {
            throw new Error("Missing project_id, private_key, or client_email in SignalDesk service-account file.");
        }

        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logFirebaseAdminFailure("signaldesk_admin_file_credential_load_failed", error, {
            credentialSource: "file",
            product: "signaldesk",
            ...getBoundedFirebaseAdminStringContext("credentialPath", credentialPath),
        }, { developmentOnly: true });
        return null;
    }
}

function initializeLocalSignalDeskAdcApp(appName?: string): admin.app.App | null {
    if (process.env.NODE_ENV === "production") return null;

    const projectId = getSignalDeskProjectId();
    if (!projectId) return null;

    try {
        const options: admin.AppOptions = {
            projectId,
            ...(getSignalDeskStorageBucket() ? { storageBucket: getSignalDeskStorageBucket() } : {}),
        };
        return appName
            ? admin.initializeApp(options, appName)
            : admin.initializeApp(options);
    } catch (error) {
        logFirebaseAdminFailure("signaldesk_admin_local_adc_initialize_failed", error, {
            credentialSource: "adc",
            hasProjectId: Boolean(projectId),
            hasStorageBucket: Boolean(getSignalDeskStorageBucket()),
            product: "signaldesk",
        }, { developmentOnly: true });
        return null;
    }
}

function getDefaultAdminAppForSignalDesk(): admin.app.App | null {
    const existing = admin.apps.find(app => app?.name === SIGNALDESK_DEFAULT_FIREBASE_APP_NAME);
    if (existing) return existing;

    const defaultCredential = getAdminCredential(SIGNALDESK_DEFAULT_FIREBASE_CREDENTIAL_PREFIX);
    if (defaultCredential) {
        return admin.initializeApp({ credential: defaultCredential });
    }

    const signaldeskCredential = getAdminCredential(SIGNALDESK_FIREBASE_CREDENTIAL_PREFIX);
    if (signaldeskCredential) {
        return admin.initializeApp({
            credential: signaldeskCredential,
            ...(getSignalDeskStorageBucket() ? { storageBucket: getSignalDeskStorageBucket() } : {}),
        });
    }

    const fileCredential = getSignalDeskFileCredential();
    if (fileCredential) {
        return admin.initializeApp({
            credential: fileCredential,
            ...(getSignalDeskStorageBucket() ? { storageBucket: getSignalDeskStorageBucket() } : {}),
        });
    }

    if (process.env.NODE_ENV !== "production") {
        return initializeLocalSignalDeskAdcApp() || admin.initializeApp();
    }

    return null;
}

function getSignalDeskAdminApp(): admin.app.App | null {
    if (shouldUseSharedSignalDeskFirebase) {
        return getDefaultAdminAppForSignalDesk();
    }

    const existing = admin.apps.find(app => app?.name === SIGNALDESK_FIREBASE_APP_NAME);
    if (existing) return existing;

    const credential = getAdminCredential(SIGNALDESK_FIREBASE_CREDENTIAL_PREFIX) || getSignalDeskFileCredential();
    if (credential) {
        return admin.initializeApp({
            credential,
            ...(getSignalDeskStorageBucket() ? { storageBucket: getSignalDeskStorageBucket() } : {}),
        }, SIGNALDESK_FIREBASE_APP_NAME);
    }

    const localAdcApp = initializeLocalSignalDeskAdcApp(SIGNALDESK_FIREBASE_APP_NAME);
    if (localAdcApp) return localAdcApp;

    return null;
}

const signaldeskAdminApp = getSignalDeskAdminApp();
const signaldeskFirestoreAdmin = signaldeskAdminApp
    ? (signaldeskFirestoreDatabaseId
        ? getAdminFirestore(signaldeskAdminApp, signaldeskFirestoreDatabaseId)
        : getAdminFirestore(signaldeskAdminApp))
    : (null as unknown as admin.firestore.Firestore);
const signaldeskStorageAdmin = signaldeskAdminApp ? signaldeskAdminApp.storage() : (null as unknown as admin.storage.Storage);
const signaldeskAuthAdmin = signaldeskAdminApp ? signaldeskAdminApp.auth() : (null as unknown as admin.auth.Auth);

export {
    admin,
    signaldeskAdminApp,
    signaldeskAuthAdmin,
    signaldeskFirestoreAdmin,
    signaldeskStorageAdmin,
};
