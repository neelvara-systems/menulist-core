import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logFirebaseAdminDiagnostic } from './firebaseAdminDiagnostics';

// Initialize Firebase Admin if it hasn't been initialized yet
const DEFAULT_APP_NAME = '[DEFAULT]';
const existingDefaultApp = admin.apps.find(app => app?.name === DEFAULT_APP_NAME);
const firebaseAdminApp = existingDefaultApp || (() => {
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    // For Vercel deployment: Use explicit environment variables
    // For local development: Uses GOOGLE_APPLICATION_CREDENTIALS automatically
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
            ...(storageBucket ? { storageBucket } : {}),
        });
        logFirebaseAdminDiagnostic('firebase_admin_initialized', {
            credentialSource: 'explicit_env',
            hasStorageBucket: Boolean(storageBucket),
        });
        return app;
    }

    // Fallback to ADC for local development with GOOGLE_APPLICATION_CREDENTIALS
    const app = admin.initializeApp({
        ...(storageBucket ? { storageBucket } : {}),
    });
    logFirebaseAdminDiagnostic('firebase_admin_initialized', {
        credentialSource: 'adc',
        hasStorageBucket: Boolean(storageBucket),
    }, { developmentOnly: true });
    return app;
})();

const firestoreAdmin = admin.firestore(firebaseAdminApp);
const storageAdmin = firebaseAdminApp.storage();
const authAdmin = firebaseAdminApp.auth();
type VectorValue = ReturnType<typeof FieldValue.vector> & {
    values?: number[];
    _values?: number[];
};
type VectorFactory = {
    new(values?: number[]): VectorValue;
    (values?: number[]): VectorValue;
};
const Vector = (function Vector(values?: number[]) {
    return FieldValue.vector(values) as VectorValue;
}) as VectorFactory;

export { Vector, admin, authAdmin, firestoreAdmin, storageAdmin };
