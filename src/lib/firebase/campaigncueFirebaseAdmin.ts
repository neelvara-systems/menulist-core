/**
 * CampaignCue Firebase Admin — separate Firebase runtime.
 *
 * CampaignCue workspace, campaign, trust, asset, schedule, and analytics data
 * must not be written to MenuList or Answerlattice Firebase projects unless an
 * explicit shared-mode override is used for local/emulator work.
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import {
    CAMPAIGNCUE_DEFAULT_FIREBASE_APP_NAME,
    CAMPAIGNCUE_DEFAULT_FIREBASE_CREDENTIAL_PREFIX,
    CAMPAIGNCUE_FIREBASE_APP_NAME,
    CAMPAIGNCUE_FIREBASE_CREDENTIAL_PREFIX,
    CAMPAIGNCUE_FIREBASE_ENV,
    CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS,
    type CampaignCueAdminCredentialPrefix,
} from "@constant/campaigncue/firebase";
import {
    campaigncueFirebaseProjectId,
    campaigncueFirestoreDatabaseId,
    shouldUseSharedCampaignCueFirebase,
} from "./campaigncueConfig";

const getCampaignCueProjectId = () =>
    CAMPAIGNCUE_FIREBASE_PROJECT_ID_ENV_KEYS.map((key) => process.env[key]).find(Boolean) ||
    campaigncueFirebaseProjectId;

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

    try {
        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[CampaignCue Firebase Admin] Ignoring invalid ${prefix} credentials.`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return null;
    }
}

function getCampaignCueFileCredential(): admin.credential.Credential | null {
    const credentialPath = process.env[CAMPAIGNCUE_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS];
    if (!credentialPath) return null;

    try {
        const resolvedPath = path.isAbsolute(credentialPath)
            ? credentialPath
            : path.join(process.cwd(), credentialPath);
        const raw = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
        const projectId = raw.project_id || getCampaignCueProjectId();
        const privateKey = raw.private_key;
        const clientEmail = raw.client_email;

        if (!projectId || !privateKey || !clientEmail) {
            throw new Error("Missing project_id, private_key, or client_email in CampaignCue service-account file.");
        }

        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[CampaignCue Firebase Admin] Could not load ${CAMPAIGNCUE_FIREBASE_ENV.GOOGLE_APPLICATION_CREDENTIALS}.`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
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
        console.warn("[CampaignCue Firebase Admin] Local ADC initialization failed.", {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

function getDefaultAdminAppForCampaignCue(): admin.app.App | null {
    const existing = admin.apps.find(app => app?.name === CAMPAIGNCUE_DEFAULT_FIREBASE_APP_NAME);
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

    const existing = admin.apps.find(app => app?.name === CAMPAIGNCUE_FIREBASE_APP_NAME);
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
    : (null as unknown as admin.firestore.Firestore);
const campaigncueStorageAdmin = campaigncueAdminApp ? campaigncueAdminApp.storage() : (null as unknown as admin.storage.Storage);
const campaigncueAuthAdmin = campaigncueAdminApp ? campaigncueAdminApp.auth() : (null as unknown as admin.auth.Auth);

export {
    admin,
    campaigncueAdminApp,
    campaigncueAuthAdmin,
    campaigncueFirestoreAdmin,
    campaigncueStorageAdmin,
};
