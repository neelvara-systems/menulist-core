/**
 * Canonica Firebase Admin — Server-side initialization
 *
 * Canonica Functions can use a dedicated production Firebase project/database
 * or intentionally share the MenuList DB in local/test.
 *
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
 */

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

type CredentialPrefix = 'FIREBASE' | 'CANONICA_FIREBASE';

const normalizeMode = (value?: string) => value?.trim().toLowerCase();

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

    return admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail,
    });
}

if (!admin.apps.length) {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        require('dotenv').config({ path: '.env.local' });
    }

    const credential = getShouldUseSharedFirebase()
        ? (getCredential('FIREBASE') || getCredential('CANONICA_FIREBASE'))
        : getCredential('CANONICA_FIREBASE');

    if (credential) {
        admin.initializeApp({ credential });
    } else {
        admin.initializeApp();
    }
}

export const firestoreAdmin = process.env.CANONICA_FIRESTORE_DATABASE_ID
    ? getFirestore(admin.app(), process.env.CANONICA_FIRESTORE_DATABASE_ID)
    : admin.firestore();
export const storageAdmin = admin.storage();
export const authAdmin = admin.auth();
export { admin };
