/**
 * Answerlattice Firebase Admin — shared or separate Firebase runtime.
 *
 * Server-side Answerlattice access keeps a single import surface while local,
 * preview, and production use the Answerlattice Firebase target for that stage.
 * Shared mode is only an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { answerlatticeFirestoreDatabaseId, shouldUseSharedAnswerlatticeFirebase } from './answerlatticeConfig';

const ANSWERLATTICE_APP_NAME = 'answerlattice-admin';
const DEFAULT_APP_NAME = '[DEFAULT]';

const getAnswerlatticeProjectId = () =>
    process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID;

const getAnswerlatticeStorageBucket = () =>
    process.env.ANSWERLATTICE_FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET;

function normalizePrivateKey(privateKey: string): string {
    return privateKey
        .replace(/\\\r?\n/g, '\n')
        .replace(/\\n/g, '\n')
        .trim();
}

function getAdminCredential(prefix: 'FIREBASE' | 'ANSWERLATTICE_FIREBASE'): admin.credential.Credential | null {
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
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[Answerlattice Firebase Admin] Ignoring invalid ${prefix} service-account credentials for local runtime.`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return null;
    }
}

function getAnswerlatticeServiceAccountFileCredential(): admin.credential.Credential | null {
    const credentialPath = process.env.ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialPath) return null;

    try {
        const resolvedPath = path.isAbsolute(credentialPath)
            ? credentialPath
            : path.join(process.cwd(), credentialPath);
        const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        const projectId = raw.project_id || getAnswerlatticeProjectId();
        const privateKey = raw.private_key;
        const clientEmail = raw.client_email;

        if (!projectId || !privateKey || !clientEmail) {
            throw new Error('Missing project_id, private_key, or client_email in Answerlattice service-account file.');
        }

        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Answerlattice Firebase Admin] Could not load ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS.', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return null;
    }
}

function initializeLocalAnswerlatticeAdcApp(appName?: string): admin.app.App | null {
    if (process.env.NODE_ENV === 'production') return null;

    const projectId = getAnswerlatticeProjectId();
    if (!projectId) return null;

    try {
        const options: admin.AppOptions = {
            projectId,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        };
        return appName
            ? admin.initializeApp(options, appName)
            : admin.initializeApp(options);
    } catch (error) {
        console.warn('[Answerlattice Firebase Admin] Local ADC initialization failed.', {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

function getDefaultAdminAppForAnswerlattice(): admin.app.App | null {
    const existing = admin.apps.find(app => app?.name === DEFAULT_APP_NAME);
    if (existing) return existing;

    const defaultCredential = getAdminCredential('FIREBASE');
    if (defaultCredential) {
        return admin.initializeApp({ credential: defaultCredential });
    }

    const sharedAnswerlatticeCredential = getAdminCredential('ANSWERLATTICE_FIREBASE');
    if (sharedAnswerlatticeCredential) {
        return admin.initializeApp({
            credential: sharedAnswerlatticeCredential,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    }

    const answerlatticeFileCredential = getAnswerlatticeServiceAccountFileCredential();
    if (answerlatticeFileCredential) {
        return admin.initializeApp({
            credential: answerlatticeFileCredential,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    }

    if (process.env.NODE_ENV !== 'production') {
        return initializeLocalAnswerlatticeAdcApp() || admin.initializeApp();
    }

    return null;
}

function getAnswerlatticeAdminApp(): admin.app.App | null {
    if (shouldUseSharedAnswerlatticeFirebase) {
        return getDefaultAdminAppForAnswerlattice();
    }

    const existing = admin.apps.find(app => app?.name === ANSWERLATTICE_APP_NAME);
    if (existing) return existing;

    const answerlatticeCredential = getAdminCredential('ANSWERLATTICE_FIREBASE');
    const answerlatticeFileCredential = getAnswerlatticeServiceAccountFileCredential();
    const credential = answerlatticeCredential || answerlatticeFileCredential;
    if (credential) {
        return admin.initializeApp({
            credential,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        }, ANSWERLATTICE_APP_NAME);
    }

    const localAdcApp = initializeLocalAnswerlatticeAdcApp(ANSWERLATTICE_APP_NAME);
    if (localAdcApp) return localAdcApp;

    // No credentials available (e.g. Vercel build without ANSWERLATTICE_* env vars)
    // Return null to avoid ADC fallback crash looking for service-account.json
    return null;
}

const answerlatticeAdminApp = getAnswerlatticeAdminApp();
const answerlatticeFirestoreAdmin = answerlatticeAdminApp
    ? (answerlatticeFirestoreDatabaseId
        ? getAdminFirestore(answerlatticeAdminApp, answerlatticeFirestoreDatabaseId)
        : getAdminFirestore(answerlatticeAdminApp))
    : (null as unknown as admin.firestore.Firestore);
const answerlatticeStorageAdmin = answerlatticeAdminApp ? answerlatticeAdminApp.storage() : (null as unknown as admin.storage.Storage);
const answerlatticeAuthAdmin = answerlatticeAdminApp ? answerlatticeAdminApp.auth() : (null as unknown as admin.auth.Auth);

const AnswerlatticeVector = (admin.firestore as any).VectorValue;

export { AnswerlatticeVector, answerlatticeAdminApp, answerlatticeAuthAdmin, answerlatticeFirestoreAdmin, answerlatticeStorageAdmin };
