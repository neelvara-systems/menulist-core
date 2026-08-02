/**
 * CampaignCue Firebase Admin — separate Firebase runtime.
 *
 * CampaignCue workspace, campaign, trust, asset, schedule, and analytics data
 * must not be written to MenuList or Answerlattice Firebase projects. An
 * explicit shared-mode override is accepted only outside production.
 */
import { admin } from "./firebaseAdminCompat";
import * as fs from "fs";
import * as path from "path";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { CAMPAIGNCUE_DEFAULT_FIREBASE_APP_NAME, CAMPAIGNCUE_DEFAULT_FIREBASE_CREDENTIAL_PREFIX, CAMPAIGNCUE_FIREBASE_APP_NAME, CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX, CAMPAIGNCUE_FIREBASE_ENV, type CampaignCueAdminCredentialPrefix, } from "@constant/campaigncue/firebase";
import { campaigncueFirebaseProjectId, campaigncueFirestoreDatabaseId, isExpectedCampaignCueProjectId, shouldUseSharedCampaignCueFirebase, } from "./campaigncueConfig";
import { getBoundedFirebaseAdminStringContext, logFirebaseAdminFailure, } from "./firebaseAdminDiagnostics";

const getCampaignCueProjectId = () => campaigncueFirebaseProjectId;

const getCampaignCueStorageBucket = () =>
    process.env[CAMPAIGNCUE_FIREBASE_ENV.STORAGE_BUCKET] ||
    process.env[CAMPAIGNCUE_FIREBASE_ENV.PUBLIC_STORAGE_BUCKET];

function normalizePrivateKey(privateKey: string): string {
    return privateKey
        .replace(/\\\r?\n/g, "\n")
        .replace(/\\n/g, "\n")
        .trim();
}

function getAdminCredential(prefix: CampaignCueAdminCredentialPrefix): admin.credential.Credential | null {
    const projectId = process.env[`${prefix}_PROJECT_ID`];
    const privateKey = process.env[`${prefix}_PRIVATE_KEY`];
    const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`];

    if (!projectId || !privateKey || !clientEmail) return null;
    if (
        prefix === CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX
        && !isExpectedCampaignCueProjectId(projectId, campaigncueFirebaseProjectId)
    ) {
        logFirebaseAdminFailure("campaigncue_admin_project_mismatch", undefined, {
            credentialSource: "env",
            product: "campaigncue",
            usesProductCredential: true,
        }, { developmentOnly: true });
        return null;
    }

    try {
        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logFirebaseAdminFailure("campaigncue_admin_env_credential_invalid", error, {
            credentialSource: "env",
            product: "campaigncue",
            usesProductCredential: prefix === CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX,
        }, { developmentOnly: true });
        return null;
    }
}

function getCampaignCueFileCredential(): admin.credential.Credential | null {
    const credentialPath = process.env[CAMPAIGNCUE_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS];
    if (!credentialPath) return null;

    try {
        const resolvedPath = path.isAbsolute(credentialPath)
            ? credentialPath
            : path.join(/* turbopackIgnore: true */ process.cwd(), credentialPath);
        const raw = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ resolvedPath, "utf8"));
        const projectId = raw.project_id;
        const privateKey = raw.private_key;
        const clientEmail = raw.client_email;

        if (!projectId || !privateKey || !clientEmail) {
            throw new Error("Missing project_id, private_key, or client_email in CampaignCue service-account file.");
        }
        if (!isExpectedCampaignCueProjectId(projectId, campaigncueFirebaseProjectId)) {
            throw new Error("CampaignCue service-account project does not match the governed deployment target.");
        }

        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logFirebaseAdminFailure("campaigncue_admin_file_credential_load_failed", error, {
            credentialSource: "file",
            product: "campaigncue",
            ...getBoundedFirebaseAdminStringContext("credentialPath", credentialPath),
        }, { developmentOnly: true });
        return null;
    }
}

function initializeLocalCampaignCueAdcApp(appName?: string): admin.app.App | null {
    if (process.env.NODE_ENV === "production") return null;

    const projectId = getCampaignCueProjectId();
    if (!projectId) return null;

    try {
        const options: admin.AppOptions = {
            projectId,
            ...(getCampaignCueStorageBucket() ? { storageBucket: getCampaignCueStorageBucket() } : {}),
        };
        return appName
            ? admin.initializeApp(options, appName)
            : admin.initializeApp(options);
    } catch (error) {
        logFirebaseAdminFailure("campaigncue_admin_local_adc_initialize_failed", error, {
            credentialSource: "adc",
            hasProjectId: Boolean(projectId),
            hasStorageBucket: Boolean(getCampaignCueStorageBucket()),
            product: "campaigncue",
        }, { developmentOnly: true });
        return null;
    }
}

function getDefaultAdminAppForCampaignCue(): admin.app.App | null {
    const existing = admin.getApps().find(app => app?.name === CAMPAIGNCUE_DEFAULT_FIREBASE_APP_NAME);
    if (existing) return existing;

    const defaultCredential = getAdminCredential(CAMPAIGNCUE_DEFAULT_FIREBASE_CREDENTIAL_PREFIX);
    if (defaultCredential) {
        return admin.initializeApp({ credential: defaultCredential });
    }

    const campaigncueCredential = getAdminCredential(CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX);
    if (campaigncueCredential) {
        return admin.initializeApp({
            credential: campaigncueCredential,
            ...(getCampaignCueStorageBucket() ? { storageBucket: getCampaignCueStorageBucket() } : {}),
        });
    }

    const fileCredential = getCampaignCueFileCredential();
    if (fileCredential) {
        return admin.initializeApp({
            credential: fileCredential,
            ...(getCampaignCueStorageBucket() ? { storageBucket: getCampaignCueStorageBucket() } : {}),
        });
    }

    if (process.env.NODE_ENV !== "production") {
        return initializeLocalCampaignCueAdcApp() || admin.initializeApp();
    }

    return null;
}

function getCampaignCueAdminApp(): admin.app.App | null {
    if (shouldUseSharedCampaignCueFirebase) {
        return getDefaultAdminAppForCampaignCue();
    }

    const existing = admin.getApps().find(app => app?.name === CAMPAIGNCUE_FIREBASE_APP_NAME);
    if (existing) return existing;

    const credential = getAdminCredential(CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX) || getCampaignCueFileCredential();
    if (credential) {
        return admin.initializeApp({
            credential,
            ...(getCampaignCueStorageBucket() ? { storageBucket: getCampaignCueStorageBucket() } : {}),
        }, CAMPAIGNCUE_FIREBASE_APP_NAME);
    }

    const localAdcApp = initializeLocalCampaignCueAdcApp(CAMPAIGNCUE_FIREBASE_APP_NAME);
    if (localAdcApp) return localAdcApp;

    return null;
}

const campaigncueAdminApp = getCampaignCueAdminApp();
const campaigncueFirestoreAdmin = campaigncueAdminApp
    ? (campaigncueFirestoreDatabaseId
        ? getAdminFirestore(campaigncueAdminApp, campaigncueFirestoreDatabaseId)
        : getAdminFirestore(campaigncueAdminApp))
    : null;
const campaigncueStorageAdmin = campaigncueAdminApp ? admin.storage(campaigncueAdminApp) : null;
const campaigncueAuthAdmin = campaigncueAdminApp ? admin.auth(campaigncueAdminApp) : null;

function requireCampaignCueAdminService<T>(service: T | null, serviceName: string): T {
    if (!service) {
        throw new Error(`CampaignCue Firebase Admin ${serviceName} is unavailable.`);
    }
    return service;
}

const requireCampaignCueFirestoreAdmin = () => requireCampaignCueAdminService(
    campaigncueFirestoreAdmin,
    'Firestore',
);
const requireCampaignCueStorageAdmin = () => requireCampaignCueAdminService(
    campaigncueStorageAdmin,
    'Storage',
);
const requireCampaignCueAuthAdmin = () => requireCampaignCueAdminService(
    campaigncueAuthAdmin,
    'Auth',
);

export {
    admin,
    campaigncueAdminApp,
    campaigncueAuthAdmin,
    campaigncueFirestoreAdmin,
    campaigncueStorageAdmin,
    requireCampaignCueAuthAdmin,
    requireCampaignCueFirestoreAdmin,
    requireCampaignCueStorageAdmin,
};
