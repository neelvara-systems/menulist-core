import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';

// dotenv is loaded once in index.ts (entrypoint) — NOT here.
// This file may be imported by other modules, so we don't duplicate dotenv loading.

// Respect Firebase emulator environment variables when the emulator suite sets
// them. Running only the Functions emulator continues to use cloud services,
// while running `functions,firestore` gives isolated local Firestore tests.

const firebaseApp = getApps()[0] ?? initializeApp();
const logger = functions.logger;
logger.log("🔥 Firebase Admin initialized.");
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    logger.log("Firebase Admin emulator targets", {
        firestore: process.env.FIRESTORE_EMULATOR_HOST || 'cloud',
        storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'cloud',
        auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || 'cloud',
    });
}

const firestoreAdmin = getFirestore(firebaseApp);
firestoreAdmin.settings({ ignoreUndefinedProperties: true });
const storageAdmin = getStorage(firebaseApp);
const authAdmin = getAuth(firebaseApp);
const admin = {
    app: () => ({
        delete: () => deleteApp(firebaseApp),
    }),
    firestore: {
        FieldValue,
        Timestamp,
    },
};

export { admin, authAdmin, firestoreAdmin, storageAdmin };
