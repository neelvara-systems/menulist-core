/**
 * Canonica Firebase Admin — Server-side initialization
 * 
 * This initializes firebase-admin for the Canonica Firebase project.
 * Used by all Canonica Cloud Functions.
 * 
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        require('dotenv').config({ path: '.env.local' });
    }

    if (process.env.CANONICA_FIREBASE_PROJECT_ID && process.env.CANONICA_FIREBASE_PRIVATE_KEY && process.env.CANONICA_FIREBASE_CLIENT_EMAIL) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.CANONICA_FIREBASE_PROJECT_ID,
                privateKey: process.env.CANONICA_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.CANONICA_FIREBASE_CLIENT_EMAIL,
            })
        });
    } else {
        admin.initializeApp();
    }
}

export const firestoreAdmin = admin.firestore();
export const storageAdmin = admin.storage();
export const authAdmin = admin.auth();
export { admin };
