/**
 * Canonica Firebase Admin — shared or separate Firebase runtime.
 *
 * Server-side Canonica access keeps a single import surface while allowing
 * local/test to share MenuList DB and production to use a dedicated project/DB.
 *
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import * as admin from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { canonicaFirestoreDatabaseId, shouldUseSharedCanonicaFirebase } from './canonicaConfig';

const CANONICA_APP_NAME = 'canonica-admin';
const DEFAULT_APP_NAME = '[DEFAULT]';

function getAdminCredential(prefix: 'FIREBASE' | 'CANONICA_FIREBASE'): admin.credential.Credential | null {
    const projectId = process.env[`${prefix}_PROJECT_ID`];
    const privateKey = process.env[`${prefix}_PRIVATE_KEY`];
    const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`];

    if (!projectId || !privateKey || !clientEmail) return null;

    return admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail,
    });
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
        return admin.initializeApp({ credential: sharedCanonicaCredential });
    }

    if (process.env.NODE_ENV !== 'production') {
        return admin.initializeApp();
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
    if (canonicaCredential) {
        return admin.initializeApp({ credential: canonicaCredential }, CANONICA_APP_NAME);
    }

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
