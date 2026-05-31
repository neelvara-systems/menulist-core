/**
 * Answerlattice Firebase Admin — Server-side initialization
 *
 * Answerlattice Functions run against Answerlattice Firebase targets:
 * QA/staging deploys to answerlattice-qa; production deploys to answerlattice.
 * Shared mode is only an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import * as fs from 'fs';
import * as path from 'path';
import { VertexAI } from '@google-cloud/vertexai';
import { getFirestore } from 'firebase-admin/firestore';

type CredentialPrefix = 'FIREBASE' | 'ANSWERLATTICE_FIREBASE';

const normalizeMode = (value?: string) => value?.trim().toLowerCase();
const normalizePrivateKey = (privateKey: string) => privateKey.replace(/\\n/g, '\n').trim();

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
    return ['shared', 'same', 'default'].includes(normalizeMode(process.env.ANSWERLATTICE_FIREBASE_MODE) || '') ||
        Boolean(
            process.env.FIREBASE_PROJECT_ID &&
            process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_PROJECT_ID === process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID
        );
}

function getCredential(prefix: CredentialPrefix): admin.credential.Credential | null {
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
        logger.warn('[Answerlattice Firebase Admin] Ignoring invalid service-account credential. Falling back to runtime credentials when available.', {
            prefix,
            error: error instanceof Error ? error.message : String(error),
        });
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
        logger.warn('[Answerlattice Firebase Admin] Could not load ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS. Falling back to runtime credentials when available.', {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

if (!admin.apps.length) {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        require('dotenv').config({ path: '.env.local' });
    }

    const credential = getShouldUseSharedFirebase()
        ? (getCredential('FIREBASE') || getCredential('ANSWERLATTICE_FIREBASE'))
        : (getCredential('ANSWERLATTICE_FIREBASE') || getAnswerlatticeServiceAccountFileCredential());

    if (credential) {
        admin.initializeApp({
            credential,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    } else {
        admin.initializeApp({
            ...(getAnswerlatticeProjectId() ? { projectId: getAnswerlatticeProjectId() } : {}),
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    }
}

export const firestoreAdmin = process.env.ANSWERLATTICE_FIRESTORE_DATABASE_ID
    ? getFirestore(admin.app(), process.env.ANSWERLATTICE_FIRESTORE_DATABASE_ID)
    : admin.firestore();
const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
if (!projectId) {
    throw new Error('Answerlattice Firebase project ID could not be determined.');
}

export const vertexAIClient = new VertexAI({ project: projectId, location: 'us-central1' });
export const storageAdmin = admin.storage();
export const authAdmin = admin.auth();
export { admin };
