/**
 * Canonica Firebase Admin — Server-side initialization
 *
 * Canonica Functions run against Canonica Firebase targets:
 * QA/staging deploys to canonica-qa; production deploys to canonica.
 * Shared mode is only an explicit legacy/emulator override.
 *
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import * as fs from 'fs';
import * as path from 'path';
import { VertexAI } from '@google-cloud/vertexai';
import { getFirestore } from 'firebase-admin/firestore';

type CredentialPrefix = 'FIREBASE' | 'CANONICA_FIREBASE';

const normalizeMode = (value?: string) => value?.trim().toLowerCase();
const normalizePrivateKey = (privateKey: string) => privateKey.replace(/\\n/g, '\n').trim();

function getCanonicaProjectId(): string | undefined {
    return process.env.CANONICA_FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT;
}

function getCanonicaStorageBucket(): string | undefined {
    return process.env.CANONICA_FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET;
}

function getShouldUseSharedFirebase(): boolean {
    return ['shared', 'same', 'default'].includes(normalizeMode(process.env.CANONICA_FIREBASE_MODE) || '') ||
        Boolean(
            process.env.FIREBASE_PROJECT_ID &&
            process.env.CANONICA_FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_PROJECT_ID === process.env.CANONICA_FIREBASE_PROJECT_ID
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
        logger.warn('[Canonica Firebase Admin] Ignoring invalid service-account credential. Falling back to runtime credentials when available.', {
            prefix,
            error: error instanceof Error ? error.message : String(error),
        });
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
        logger.warn('[Canonica Firebase Admin] Could not load CANONICA_GOOGLE_APPLICATION_CREDENTIALS. Falling back to runtime credentials when available.', {
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
        ? (getCredential('FIREBASE') || getCredential('CANONICA_FIREBASE'))
        : (getCredential('CANONICA_FIREBASE') || getCanonicaServiceAccountFileCredential());

    if (credential) {
        admin.initializeApp({
            credential,
            ...(getCanonicaStorageBucket() ? { storageBucket: getCanonicaStorageBucket() } : {}),
        });
    } else {
        admin.initializeApp({
            ...(getCanonicaProjectId() ? { projectId: getCanonicaProjectId() } : {}),
            ...(getCanonicaStorageBucket() ? { storageBucket: getCanonicaStorageBucket() } : {}),
        });
    }
}

export const firestoreAdmin = process.env.CANONICA_FIRESTORE_DATABASE_ID
    ? getFirestore(admin.app(), process.env.CANONICA_FIRESTORE_DATABASE_ID)
    : admin.firestore();
const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
if (!projectId) {
    throw new Error('Canonica Firebase project ID could not be determined.');
}

export const vertexAIClient = new VertexAI({ project: projectId, location: 'us-central1' });
export const storageAdmin = admin.storage();
export const authAdmin = admin.auth();
export { admin };
