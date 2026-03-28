import { VertexAI } from '@google-cloud/vertexai';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// dotenv is loaded once in index.ts (entrypoint) — NOT here.
// This file may be imported by other modules, so we don't duplicate dotenv loading.

// Force Admin SDK to connect to CLOUD Firestore/Storage, not local emulators.
// The emulator suite auto-sets these env vars even when we only want the Functions emulator.
// We want: local Functions emulator → cloud Firestore/Storage/Auth
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

admin.initializeApp();
const logger = functions.logger;
logger.log("🔥 Firebase Admin initialized.");

const firestoreAdmin = admin.firestore();
firestoreAdmin.settings({ ignoreUndefinedProperties: true });
const storageAdmin = admin.storage();
const authAdmin = admin.auth();
const Vector = (admin.firestore as any).VectorValue;

const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
if (!projectId) {
    throw new Error("Google Cloud project ID could not be determined.");
}

logger.log("🔥 Initializing Vertex AI for project:", projectId);
const vertexAIClient = new VertexAI({ project: projectId!, location: 'us-central1' });
export { admin, authAdmin, firestoreAdmin, storageAdmin, Vector, vertexAIClient };

