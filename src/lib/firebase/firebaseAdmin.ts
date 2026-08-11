import { admin } from './firebaseAdminCompat';
import { FieldValue } from 'firebase-admin/firestore';
import { logFirebaseAdminDiagnostic } from './firebaseAdminDiagnostics';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';

// Initialize Firebase Admin if it hasn't been initialized yet
const DEFAULT_APP_NAME = '[DEFAULT]';
const existingDefaultApp = admin.getApps().find(app => app?.name === DEFAULT_APP_NAME);
const firebaseAdminApp = existingDefaultApp || (() => {
    const storageBucket = menulistServerEnv.firebaseStorageBucket;
    const projectId = menulistServerEnv.firebaseProjectId;
    const privateKey = menulistServerEnv.firebasePrivateKey;
    const clientEmail = menulistServerEnv.firebaseClientEmail;

    // For Vercel deployment: Use explicit environment variables
    // For local development: Uses GOOGLE_APPLICATION_CREDENTIALS automatically
    if (projectId && privateKey && clientEmail) {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                privateKey: privateKey.replace(/\\n/g, '\n'),
                clientEmail,
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
const storageAdmin = admin.storage(firebaseAdminApp);
const authAdmin = admin.auth(firebaseAdminApp);
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
