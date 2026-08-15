import { admin } from './firebaseAdminCompat';
import { FieldValue } from 'firebase-admin/firestore';
import { logFirebaseAdminDiagnostic } from './firebaseAdminDiagnostics';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';
import {
    getMenulistFirebaseWorkloadIdentityCredential,
    readMenulistWorkloadIdentityConfig,
    resolveMenulistGoogleCredentialMode,
} from '@lib/google/menulistWorkloadIdentity';

// Initialize Firebase Admin if it hasn't been initialized yet
const DEFAULT_APP_NAME = '[DEFAULT]';
const existingDefaultApp = admin.getApps().find(app => app?.name === DEFAULT_APP_NAME);
const firebaseAdminApp = existingDefaultApp || (() => {
    const storageBucket = menulistServerEnv.firebaseStorageBucket;
    const projectId = menulistServerEnv.firebaseProjectId;
    const privateKey = menulistServerEnv.firebasePrivateKey;
    const clientEmail = menulistServerEnv.firebaseClientEmail;
    const credentialMode = resolveMenulistGoogleCredentialMode();

    if (credentialMode === 'vercel_oidc') {
        const workloadIdentity = readMenulistWorkloadIdentityConfig();
        const app = admin.initializeApp({
            credential: getMenulistFirebaseWorkloadIdentityCredential(),
            projectId: workloadIdentity.projectId,
            serviceAccountId: workloadIdentity.serviceAccountEmail,
            ...(storageBucket ? { storageBucket } : {}),
        });
        logFirebaseAdminDiagnostic('firebase_admin_initialized', {
            credentialSource: 'vercel_oidc',
            hasStorageBucket: Boolean(storageBucket),
        });
        return app;
    }

    if (credentialMode === 'service_account_key' && projectId && privateKey && clientEmail) {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                privateKey: privateKey.replace(/\\n/g, '\n'),
                clientEmail,
            }),
            ...(storageBucket ? { storageBucket } : {}),
        });
        logFirebaseAdminDiagnostic('firebase_admin_initialized', {
            credentialSource: 'service_account_key',
            hasStorageBucket: Boolean(storageBucket),
        });
        return app;
    }

    if (credentialMode === 'service_account_key') {
        throw new Error('MenuList Firebase service-account key configuration is incomplete.');
    }

    // Local development and Google-hosted runtimes use Application Default Credentials.
    const app = admin.initializeApp({
        ...(projectId ? { projectId } : {}),
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
