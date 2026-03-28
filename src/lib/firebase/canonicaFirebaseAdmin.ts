/**
 * Canonica Firebase Admin — Separate Firebase Project (Server-Side)
 * 
 * Server-side admin SDK for the Canonica Firebase project.
 * Used by API routes and server components that need Canonica Firestore access.
 * 
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import * as admin from 'firebase-admin';

const CANONICA_APP_NAME = 'canonica-admin';

function getCanonicaAdminApp(): admin.app.App | null {
    const existing = admin.apps.find(app => app?.name === CANONICA_APP_NAME);
    if (existing) return existing;

    if (
        process.env.CANONICA_FIREBASE_PROJECT_ID &&
        process.env.CANONICA_FIREBASE_PRIVATE_KEY &&
        process.env.CANONICA_FIREBASE_CLIENT_EMAIL
    ) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.CANONICA_FIREBASE_PROJECT_ID,
                privateKey: process.env.CANONICA_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.CANONICA_FIREBASE_CLIENT_EMAIL,
            })
        }, CANONICA_APP_NAME);
    }

    // No credentials available (e.g. Vercel build without CANONICA_* env vars)
    // Return null to avoid ADC fallback crash looking for service-account.json
    return null;
}

const canonicaAdminApp = getCanonicaAdminApp();
const canonicaFirestoreAdmin = canonicaAdminApp ? canonicaAdminApp.firestore() : (null as unknown as admin.firestore.Firestore);
const canonicaStorageAdmin = canonicaAdminApp ? canonicaAdminApp.storage() : (null as unknown as admin.storage.Storage);
const canonicaAuthAdmin = canonicaAdminApp ? canonicaAdminApp.auth() : (null as unknown as admin.auth.Auth);

const CanonicaVector = (admin.firestore as any).VectorValue;

export { CanonicaVector, canonicaAdminApp, canonicaAuthAdmin, canonicaFirestoreAdmin, canonicaStorageAdmin };

