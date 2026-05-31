/**
 * Answerlattice Firebase Configuration
 *
 * Answerlattice uses a separate Firebase project in all active environments:
 * local + Vercel preview use answerlattice-qa, Vercel production uses answerlattice.
 * Shared mode remains only as an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md v4.3.0
 * @see __docs__/answerlattice/doctrine/09-multi-product-doctrine.md
 */

import firebaseConfig from "./config";

export type AnswerlatticeFirebaseMode = 'shared' | 'separate';

const normalizeAnswerlatticeFirebaseMode = (value?: string): AnswerlatticeFirebaseMode | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;

    if (['shared', 'same', 'default'].includes(normalized)) return 'shared';
    if (['separate', 'isolated', 'dedicated'].includes(normalized)) return 'separate';

    return null;
};

const answerlatticeFirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_APP_ID,
};

const answerlatticeFirestoreDatabaseId =
    process.env.NEXT_PUBLIC_ANSWERLATTICE_FIRESTORE_DATABASE_ID ||
    process.env.ANSWERLATTICE_FIRESTORE_DATABASE_ID ||
    undefined;

const answerlatticeFirebaseModeOverride = normalizeAnswerlatticeFirebaseMode(
    process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE ||
    process.env.ANSWERLATTICE_FIREBASE_MODE
);

const defaultFirebaseProjectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID;
const answerlatticeFirebaseProjectId = answerlatticeFirebaseConfig.projectId || process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID;
const isSameFirebaseProject = Boolean(
    defaultFirebaseProjectId &&
    answerlatticeFirebaseProjectId &&
    defaultFirebaseProjectId === answerlatticeFirebaseProjectId
);

const hasDefaultFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const hasAnswerlatticeFirebaseConfig = Boolean(
    answerlatticeFirebaseConfig.apiKey &&
    answerlatticeFirebaseConfig.projectId &&
    answerlatticeFirebaseConfig.appId
);

const answerlatticeFirebaseMode: AnswerlatticeFirebaseMode =
    answerlatticeFirebaseModeOverride ||
    (isSameFirebaseProject ? 'shared' : 'separate');

const shouldUseSharedAnswerlatticeFirebase = answerlatticeFirebaseMode === 'shared';
const isAnswerlatticeFirebaseConfigured = shouldUseSharedAnswerlatticeFirebase
    ? hasDefaultFirebaseConfig
    : hasAnswerlatticeFirebaseConfig;

export {
    answerlatticeFirebaseMode,
    answerlatticeFirestoreDatabaseId,
    hasAnswerlatticeFirebaseConfig,
    isAnswerlatticeFirebaseConfigured,
    shouldUseSharedAnswerlatticeFirebase,
};

export default answerlatticeFirebaseConfig;
