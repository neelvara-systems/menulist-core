/**
 * Canonica Firebase Configuration
 *
 * Canonica uses a separate Firebase project in all active environments:
 * local + Vercel preview use canonica-qa, Vercel production uses canonica.
 * Shared mode remains only as an explicit legacy/emulator override.
 *
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md v4.3.0
 * @see __docs__/canonica/doctrine/09-multi-product-doctrine.md
 */

import firebaseConfig from "./config";

export type CanonicaFirebaseMode = 'shared' | 'separate';

const normalizeCanonicaFirebaseMode = (value?: string): CanonicaFirebaseMode | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;

    if (['shared', 'same', 'default'].includes(normalized)) return 'shared';
    if (['separate', 'isolated', 'dedicated'].includes(normalized)) return 'separate';

    return null;
};

const canonicaFirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_APP_ID,
};

const canonicaFirestoreDatabaseId =
    process.env.NEXT_PUBLIC_CANONICA_FIRESTORE_DATABASE_ID ||
    process.env.CANONICA_FIRESTORE_DATABASE_ID ||
    undefined;

const canonicaFirebaseModeOverride = normalizeCanonicaFirebaseMode(
    process.env.NEXT_PUBLIC_CANONICA_FIREBASE_MODE ||
    process.env.CANONICA_FIREBASE_MODE
);

const defaultFirebaseProjectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID;
const canonicaFirebaseProjectId = canonicaFirebaseConfig.projectId || process.env.CANONICA_FIREBASE_PROJECT_ID;
const isSameFirebaseProject = Boolean(
    defaultFirebaseProjectId &&
    canonicaFirebaseProjectId &&
    defaultFirebaseProjectId === canonicaFirebaseProjectId
);

const hasDefaultFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const hasCanonicaFirebaseConfig = Boolean(
    canonicaFirebaseConfig.apiKey &&
    canonicaFirebaseConfig.projectId &&
    canonicaFirebaseConfig.appId
);

const canonicaFirebaseMode: CanonicaFirebaseMode =
    canonicaFirebaseModeOverride ||
    (isSameFirebaseProject ? 'shared' : 'separate');

const shouldUseSharedCanonicaFirebase = canonicaFirebaseMode === 'shared';
const isCanonicaFirebaseConfigured = shouldUseSharedCanonicaFirebase
    ? hasDefaultFirebaseConfig
    : hasCanonicaFirebaseConfig;

export {
    canonicaFirebaseMode,
    canonicaFirestoreDatabaseId,
    hasCanonicaFirebaseConfig,
    isCanonicaFirebaseConfigured,
    shouldUseSharedCanonicaFirebase,
};

export default canonicaFirebaseConfig;
