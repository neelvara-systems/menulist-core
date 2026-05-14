import { VertexAI } from '@google-cloud/vertexai';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// dotenv is loaded once in index.ts (entrypoint) — NOT here.
// This file may be imported by other modules, so we don't duplicate dotenv loading.

// Respect Firebase emulator environment variables when the emulator suite sets
// them. Running only the Functions emulator continues to use cloud services,
// while running `functions,firestore` gives isolated local Firestore tests.

admin.initializeApp();
const logger = functions.logger;
logger.log("🔥 Firebase Admin initialized.");
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    logger.log("Firebase Admin emulator targets", {
        firestore: process.env.FIRESTORE_EMULATOR_HOST || 'cloud',
        storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'cloud',
        auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || 'cloud',
    });
}

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
