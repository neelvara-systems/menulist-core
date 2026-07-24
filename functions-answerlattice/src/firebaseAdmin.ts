/**
 * Answerlattice Firebase Admin — Server-side initialization
 *
 * Answerlattice Functions run against Answerlattice Firebase targets:
 * QA/staging deploys to answerlattice-qa; production deploys to answerlattice.
 * Shared mode is only an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md
 */

import {
    cert,
    deleteApp,
    getApp,
    getApps,
    initializeApp,
    type Credential,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as logger from 'firebase-functions/logger';
import * as fs from 'fs';
import * as path from 'path';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import {
    isAnswerlatticeEmulatorProjectId,
    normalizeAnswerlatticeFirebaseBoundaryMode,
    resolveAnswerlatticeFirebaseBoundary,
    type AnswerlatticeFirebaseBoundaryStage,
} from './sharedData/answerlatticeFirebaseBoundary';

type CredentialPrefix = 'FIREBASE' | 'ANSWERLATTICE_FIREBASE';

const normalizePrivateKey = (privateKey: string) => privateKey.replace(/\\n/g, '\n').trim();

function getBoundedFunctionsAdminStringContext(label: string, value: unknown): Record<string, number | boolean> {
    const text = typeof value === 'string' ? value : '';
    return {
        [`${label}Present`]: text.length > 0,
        [`${label}Length`]: text.length,
    };
}

function getFunctionsAdminErrorContext(error: unknown): Record<string, string | number | null> {
    const source = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    const code = typeof source?.code === 'string' || typeof source?.code === 'number'
        ? String(source.code).slice(0, 80)
        : null;
    const status = typeof source?.status === 'string' || typeof source?.status === 'number'
        ? String(source.status).slice(0, 80)
        : typeof source?.statusCode === 'string' || typeof source?.statusCode === 'number'
            ? String(source.statusCode).slice(0, 80)
            : null;

    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: code,
        sourceErrorStatus: status,
    };
}

function getAnswerlatticeProjectId(): string | undefined {
    return process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT;
}

function getAnswerlatticeStorageBucket(): string | undefined {
    return process.env.ANSWERLATTICE_FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET;
}

function getShouldUseSharedFirebase(): boolean {
    return normalizeAnswerlatticeFirebaseBoundaryMode(process.env.ANSWERLATTICE_FIREBASE_MODE) === 'shared';
}

const isAnswerlatticeEmulator = process.env.FUNCTIONS_EMULATOR === 'true'
    || Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const configuredAnswerlatticeProjectId = getAnswerlatticeProjectId();
const answerlatticeFunctionsStage: AnswerlatticeFirebaseBoundaryStage = isAnswerlatticeEmulator
    ? 'local'
    : configuredAnswerlatticeProjectId === 'answerlattice'
        ? 'production'
        : 'preview';
const answerlatticeFunctionsBoundary = resolveAnswerlatticeFirebaseBoundary({
    allowEmulatorProject: isAnswerlatticeEmulator,
    allowShared: isAnswerlatticeEmulator,
    configuredProjectId: configuredAnswerlatticeProjectId,
    modeValue: process.env.ANSWERLATTICE_FIREBASE_MODE,
    stage: answerlatticeFunctionsStage,
});

function getCredential(prefix: CredentialPrefix): Credential | null {
    const projectId = process.env[`${prefix}_PROJECT_ID`];
    const privateKey = process.env[`${prefix}_PRIVATE_KEY`];
    const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`];

    if (!projectId || !privateKey || !clientEmail) return null;
    if (
        prefix === 'ANSWERLATTICE_FIREBASE'
        && !getShouldUseSharedFirebase()
        && projectId !== answerlatticeFunctionsBoundary.expectedProjectId
        && !(isAnswerlatticeEmulator && isAnswerlatticeEmulatorProjectId(projectId))
    ) {
        logger.error('[Answerlattice Firebase Admin] Rejected mismatched Answerlattice service-account project.', {
            failureCode: 'answerlattice_functions_admin_env_project_mismatch',
            projectMatchesExpected: false,
        });
        return null;
    }

    try {
        return cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logger.warn('[Answerlattice Firebase Admin] Ignoring invalid service-account credential. Falling back to runtime credentials when available.', {
            failureCode: 'answerlattice_functions_admin_env_credential_invalid',
            prefix,
            usesProductCredential: prefix === 'ANSWERLATTICE_FIREBASE',
            ...getFunctionsAdminErrorContext(error),
        });
        return null;
    }
}

function getAnswerlatticeServiceAccountFileCredential(): Credential | null {
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
        if (
            !getShouldUseSharedFirebase()
            && projectId !== answerlatticeFunctionsBoundary.expectedProjectId
            && !(isAnswerlatticeEmulator && isAnswerlatticeEmulatorProjectId(projectId))
        ) {
            throw new Error('Answerlattice service-account project does not match the active deployment stage.');
        }

        return cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logger.warn('[Answerlattice Firebase Admin] Could not load ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS. Falling back to runtime credentials when available.', {
            failureCode: 'answerlattice_functions_admin_file_credential_load_failed',
            ...getBoundedFunctionsAdminStringContext('credentialPath', credentialPath),
            ...getFunctionsAdminErrorContext(error),
        });
        return null;
    }
}

if (!answerlatticeFunctionsBoundary.valid) {
    throw new Error(`Answerlattice Firebase project boundary rejected runtime configuration: ${answerlatticeFunctionsBoundary.errorCode}`);
}

if (!getApps().length) {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        require('dotenv').config({ path: '.env.local' });
    }

    const credential = getShouldUseSharedFirebase()
        ? (getCredential('FIREBASE') || getCredential('ANSWERLATTICE_FIREBASE'))
        : (getCredential('ANSWERLATTICE_FIREBASE') || getAnswerlatticeServiceAccountFileCredential());

    if (credential) {
        initializeApp({
            credential,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    } else {
        initializeApp({
            ...(getAnswerlatticeProjectId() ? { projectId: getAnswerlatticeProjectId() } : {}),
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    }
}

const answerlatticeAdminApp = getApp();
export const firestoreAdmin = process.env.ANSWERLATTICE_FIRESTORE_DATABASE_ID
    ? getFirestore(answerlatticeAdminApp, process.env.ANSWERLATTICE_FIRESTORE_DATABASE_ID)
    : getFirestore(answerlatticeAdminApp);
const projectId = process.env.GCLOUD_PROJECT || answerlatticeAdminApp.options.projectId;
if (!projectId) {
    throw new Error('Answerlattice Firebase project ID could not be determined.');
}

export const storageAdmin = getStorage(answerlatticeAdminApp);
export const authAdmin = getAuth(answerlatticeAdminApp);
export const admin = {
    app: () => ({
        delete: () => deleteApp(answerlatticeAdminApp),
    }),
    firestore: {
        FieldValue,
        Timestamp,
    },
};
