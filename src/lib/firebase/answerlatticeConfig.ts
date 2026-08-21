/**
 * Answerlattice Firebase Configuration
 *
 * Answerlattice uses a separate Firebase project in all active environments:
 * local + Vercel preview use neelvara-answerlattice-qa; Vercel production uses
 * neelvara-answerlattice-prod.
 * Shared mode remains only as an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md v4.3.0
 * @see __docs__/answerlattice/doctrine/09-multi-product-doctrine.md
 */

import firebaseConfig from "./config";
import { getDeploymentStage } from '@constant/deploymentTargets';
import {
    normalizeAnswerlatticeFirebaseBoundaryMode,
    resolveAnswerlatticeFirebaseBoundary,
} from '@data/shared/answerlatticeFirebaseBoundary';

export type AnswerlatticeFirebaseMode = 'shared' | 'separate';

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

const answerlatticeFirebaseModeValue = process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE
    || process.env.ANSWERLATTICE_FIREBASE_MODE;
const answerlatticeFirebaseModeOverride = normalizeAnswerlatticeFirebaseBoundaryMode(answerlatticeFirebaseModeValue);
const answerlatticeFirebaseProjectId = answerlatticeFirebaseConfig.projectId || process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID;
const answerlatticeDeploymentStage = getDeploymentStage();
const answerlatticeFirebaseBoundary = resolveAnswerlatticeFirebaseBoundary({
    allowEmulatorProject: Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FUNCTIONS_EMULATOR === 'true'),
    allowShared: answerlatticeDeploymentStage === 'local',
    configuredProjectId: answerlatticeFirebaseProjectId,
    modeValue: answerlatticeFirebaseModeValue,
    stage: answerlatticeDeploymentStage,
});

const hasDefaultFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const hasAnswerlatticeFirebaseConfig = Boolean(
    answerlatticeFirebaseConfig.apiKey &&
    answerlatticeFirebaseConfig.projectId &&
    answerlatticeFirebaseConfig.appId
);

const answerlatticeFirebaseMode: AnswerlatticeFirebaseMode = answerlatticeFirebaseBoundary.mode;

const shouldUseSharedAnswerlatticeFirebase = answerlatticeFirebaseMode === 'shared';
const isAnswerlatticeFirebaseConfigured = shouldUseSharedAnswerlatticeFirebase
    ? answerlatticeFirebaseBoundary.valid && hasDefaultFirebaseConfig
    : answerlatticeFirebaseBoundary.valid && hasAnswerlatticeFirebaseConfig;

export {
    answerlatticeFirebaseBoundary,
    answerlatticeFirebaseMode,
    answerlatticeFirebaseModeOverride,
    answerlatticeFirebaseProjectId,
    answerlatticeFirestoreDatabaseId,
    hasAnswerlatticeFirebaseConfig,
    isAnswerlatticeFirebaseConfigured,
    shouldUseSharedAnswerlatticeFirebase,
};

export default answerlatticeFirebaseConfig;
