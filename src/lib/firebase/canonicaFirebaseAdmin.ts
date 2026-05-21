/**
 * Canonica Firebase Admin — shared or separate Firebase runtime.
 *
 * Server-side Canonica access keeps a single import surface while allowing
 * local/test to share MenuList DB and production to use a dedicated project/DB.
 *
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { canonicaFirestoreDatabaseId, shouldUseSharedCanonicaFirebase } from './canonicaConfig';

const CANONICA_APP_NAME = 'canonica-admin';
const DEFAULT_APP_NAME = '[DEFAULT]';

const getCanonicaProjectId = () =>
    process.env.CANONICA_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_CANONICA_FIREBASE_PROJECT_ID;

const getCanonicaStorageBucket = () =>
    process.env.CANONICA_FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET;

function normalizePrivateKey(privateKey: string): string {
    return privateKey.replace(/\\n/g, '\n').trim();
}

function getAdminCredential(prefix: 'FIREBASE' | 'CANONICA_FIREBASE'): admin.credential.Credential | null {
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
            console.warn(`[Canonica Firebase Admin] Ignoring invalid ${prefix} service-account credentials for local runtime.`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return null;
    }
}

function getCanonicaServiceAccountFileCredential(): admin.credential.Credential | null {
    const credentialPath = process.env.CANONICA_GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialPath) return null;

    try {
        const resolvedPath = path.isAbsolute(credentialPath)
            ? credentialPath
            : path.join(process.cwd(), credentialPath);
        const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        const projectId = raw.project_id || getCanonicaProjectId();
        const privateKey = raw.private_key;
        const clientEmail = raw.client_email;

        if (!projectId || !privateKey || !clientEmail) {
            throw new Error('Missing project_id, private_key, or client_email in Canonica service-account file.');
        }

        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Canonica Firebase Admin] Could not load CANONICA_GOOGLE_APPLICATION_CREDENTIALS.', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return null;
    }
}

function initializeLocalCanonicaAdcApp(appName?: string): admin.app.App | null {
    if (process.env.NODE_ENV === 'production') return null;

    const projectId = getCanonicaProjectId();
    if (!projectId) return null;

    try {
        const options: admin.AppOptions = {
            projectId,
            ...(getCanonicaStorageBucket() ? { storageBucket: getCanonicaStorageBucket() } : {}),
        };
        return appName
            ? admin.initializeApp(options, appName)
            : admin.initializeApp(options);
    } catch (error) {
        console.warn('[Canonica Firebase Admin] Local ADC initialization failed.', {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

function getDefaultAdminAppForCanonica(): admin.app.App | null {
    const existing = admin.apps.find(app => app?.name === DEFAULT_APP_NAME);
    if (existing) return existing;

    const defaultCredential = getAdminCredential('FIREBASE');
    if (defaultCredential) {
        return admin.initializeApp({ credential: defaultCredential });
    }

    const sharedCanonicaCredential = getAdminCredential('CANONICA_FIREBASE');
    if (sharedCanonicaCredential) {
        return admin.initializeApp({
            credential: sharedCanonicaCredential,
            ...(getCanonicaStorageBucket() ? { storageBucket: getCanonicaStorageBucket() } : {}),
        });
    }

    const canonicaFileCredential = getCanonicaServiceAccountFileCredential();
    if (canonicaFileCredential) {
        return admin.initializeApp({
            credential: canonicaFileCredential,
            ...(getCanonicaStorageBucket() ? { storageBucket: getCanonicaStorageBucket() } : {}),
        });
    }

    if (process.env.NODE_ENV !== 'production') {
        return initializeLocalCanonicaAdcApp() || admin.initializeApp();
    }

    return null;
}

function getCanonicaAdminApp(): admin.app.App | null {
    if (shouldUseSharedCanonicaFirebase) {
        return getDefaultAdminAppForCanonica();
    }

    const existing = admin.apps.find(app => app?.name === CANONICA_APP_NAME);
    if (existing) return existing;

    const canonicaCredential = getAdminCredential('CANONICA_FIREBASE');
    const canonicaFileCredential = getCanonicaServiceAccountFileCredential();
    const credential = canonicaCredential || canonicaFileCredential;
    if (credential) {
        return admin.initializeApp({
            credential,
            ...(getCanonicaStorageBucket() ? { storageBucket: getCanonicaStorageBucket() } : {}),
        }, CANONICA_APP_NAME);
    }

    const localAdcApp = initializeLocalCanonicaAdcApp(CANONICA_APP_NAME);
    if (localAdcApp) return localAdcApp;

    // No credentials available (e.g. Vercel build without CANONICA_* env vars)
    // Return null to avoid ADC fallback crash looking for service-account.json
    return null;
}

const canonicaAdminApp = getCanonicaAdminApp();
const canonicaFirestoreAdmin = canonicaAdminApp
    ? (canonicaFirestoreDatabaseId
        ? getAdminFirestore(canonicaAdminApp, canonicaFirestoreDatabaseId)
        : getAdminFirestore(canonicaAdminApp))
    : (null as unknown as admin.firestore.Firestore);
const canonicaStorageAdmin = canonicaAdminApp ? canonicaAdminApp.storage() : (null as unknown as admin.storage.Storage);
const canonicaAuthAdmin = canonicaAdminApp ? canonicaAdminApp.auth() : (null as unknown as admin.auth.Auth);

const CanonicaVector = (admin.firestore as any).VectorValue;

export { CanonicaVector, canonicaAdminApp, canonicaAuthAdmin, canonicaFirestoreAdmin, canonicaStorageAdmin };
