/**
 * Answerlattice Firebase Admin — shared or separate Firebase runtime.
 *
 * Server-side Answerlattice access keeps a single import surface while local,
 * preview, and production use the Answerlattice Firebase target for that stage.
 * Shared mode is only an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md v4.3.0
 */
import { admin, registerFirebaseFirestoreCompatInstance } from './firebaseAdminCompat';
import * as fs from 'fs';
import * as path from 'path';
import { FieldValue, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { answerlatticeFirebaseBoundary, answerlatticeFirestoreDatabaseId, shouldUseSharedAnswerlatticeFirebase, } from './answerlatticeConfig';
import { isAnswerlatticeEmulatorProjectId } from '@data/shared/answerlatticeFirebaseBoundary';
import { getBoundedFirebaseAdminStringContext, logFirebaseAdminFailure, } from './firebaseAdminDiagnostics';
import { answerlatticeServerEnv } from '@lib/env/answerlatticeServerEnv';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';
import {
    createAnswerlatticeWorkloadIdentitySubjectTokenSupplier,
    getAnswerlatticeFirebaseWorkloadIdentityCredential,
    getAnswerlatticeWorkloadIdentityAuthClient,
    readAnswerlatticeWorkloadIdentityConfig,
    resolveAnswerlatticeGoogleCredentialMode,
} from '@lib/google/answerlatticeWorkloadIdentity';
import {
    createWorkloadIdentityGoogleAuth,
    isManagedVercelQaOrProduction,
} from '@lib/google/vercelWorkloadIdentity';
import {
    createWorkloadIdentityFirestore,
    createWorkloadIdentityStorageAdmin,
} from '@lib/google/workloadIdentityFirebaseServices';
import { normalizeAnswerlatticeFirestoreEmulatorHost } from './answerlatticeEmulatorPorts';

const ANSWERLATTICE_APP_NAME = 'answerlattice-admin';
const DEFAULT_APP_NAME = '[DEFAULT]';
const isAnswerlatticeEmulator = process.env.FUNCTIONS_EMULATOR === 'true'
    || Boolean(process.env.FIRESTORE_EMULATOR_HOST)
    || Boolean(process.env.ANSWERLATTICE_FIRESTORE_EMULATOR_HOST)
    || Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
    || Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);

function isAllowedAnswerlatticeProjectId(projectId: string): boolean {
    return projectId === answerlatticeFirebaseBoundary.expectedProjectId
        || (isAnswerlatticeEmulator && isAnswerlatticeEmulatorProjectId(projectId));
}

const getAnswerlatticeProjectId = () => answerlatticeServerEnv.firebaseProjectId;

const getAnswerlatticeStorageBucket = () => answerlatticeServerEnv.firebaseStorageBucket;

function normalizePrivateKey(privateKey: string): string {
    return privateKey
        .replace(/\\\r?\n/g, '\n')
        .replace(/\\n/g, '\n')
        .trim();
}

function getAdminCredential(prefix: 'FIREBASE' | 'ANSWERLATTICE_FIREBASE'): admin.credential.Credential | null {
    const projectId = prefix === 'ANSWERLATTICE_FIREBASE'
        ? getAnswerlatticeProjectId()
        : menulistServerEnv.firebaseProjectId;
    const privateKey = prefix === 'ANSWERLATTICE_FIREBASE'
        ? answerlatticeServerEnv.firebasePrivateKey
        : menulistServerEnv.firebasePrivateKey;
    const clientEmail = prefix === 'ANSWERLATTICE_FIREBASE'
        ? answerlatticeServerEnv.firebaseClientEmail
        : menulistServerEnv.firebaseClientEmail;

    if (!projectId || !privateKey || !clientEmail) return null;
    if (
        prefix === 'ANSWERLATTICE_FIREBASE'
        && !shouldUseSharedAnswerlatticeFirebase
        && !isAllowedAnswerlatticeProjectId(projectId)
    ) {
        logFirebaseAdminFailure('answerlattice_admin_env_project_mismatch', new Error('Answerlattice project mismatch.'), {
            credentialSource: 'env',
            product: 'answerlattice',
            projectMatchesExpected: false,
        }, { developmentOnly: true });
        return null;
    }

    try {
        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logFirebaseAdminFailure('answerlattice_admin_env_credential_invalid', error, {
            credentialSource: 'env',
            product: 'answerlattice',
            usesProductCredential: prefix === 'ANSWERLATTICE_FIREBASE',
        }, { developmentOnly: true });
        return null;
    }
}

function getAnswerlatticeServiceAccountFileCredential(): admin.credential.Credential | null {
    const credentialPath = process.env.ANSWERLATTICE_GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialPath) return null;

    try {
        const resolvedPath = path.isAbsolute(credentialPath)
            ? credentialPath
            : path.join(/* turbopackIgnore: true */ process.cwd(), credentialPath);
        const raw = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ resolvedPath, 'utf8'));
        const projectId = raw.project_id || getAnswerlatticeProjectId();
        const privateKey = raw.private_key;
        const clientEmail = raw.client_email;

        if (!projectId || !privateKey || !clientEmail) {
            throw new Error('Missing project_id, private_key, or client_email in Answerlattice service-account file.');
        }
        if (!shouldUseSharedAnswerlatticeFirebase && !isAllowedAnswerlatticeProjectId(projectId)) {
            throw new Error('Answerlattice service-account project does not match the active deployment stage.');
        }

        return admin.credential.cert({
            projectId,
            privateKey: normalizePrivateKey(privateKey),
            clientEmail,
        });
    } catch (error) {
        logFirebaseAdminFailure('answerlattice_admin_file_credential_load_failed', error, {
            credentialSource: 'file',
            product: 'answerlattice',
            ...getBoundedFirebaseAdminStringContext('credentialPath', credentialPath),
        }, { developmentOnly: true });
        return null;
    }
}

function initializeLocalAnswerlatticeAdcApp(appName?: string): admin.app.App | null {
    if (process.env.NODE_ENV === 'production') return null;

    const projectId = getAnswerlatticeProjectId();
    if (!projectId) return null;
    if (!shouldUseSharedAnswerlatticeFirebase && !isAllowedAnswerlatticeProjectId(projectId)) return null;

    try {
        const options: admin.AppOptions = {
            projectId,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        };
        return appName
            ? admin.initializeApp(options, appName)
            : admin.initializeApp(options);
    } catch (error) {
        logFirebaseAdminFailure('answerlattice_admin_local_adc_initialize_failed', error, {
            credentialSource: 'adc',
            hasProjectId: Boolean(projectId),
            hasStorageBucket: Boolean(getAnswerlatticeStorageBucket()),
            product: 'answerlattice',
        }, { developmentOnly: true });
        return null;
    }
}

function getDefaultAdminAppForAnswerlattice(): admin.app.App | null {
    const existing = admin.getApps().find(app => app?.name === DEFAULT_APP_NAME);
    if (existing) return existing;

    const defaultCredential = getAdminCredential('FIREBASE');
    if (defaultCredential) {
        return admin.initializeApp({ credential: defaultCredential });
    }

    const sharedAnswerlatticeCredential = getAdminCredential('ANSWERLATTICE_FIREBASE');
    if (sharedAnswerlatticeCredential) {
        return admin.initializeApp({
            credential: sharedAnswerlatticeCredential,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    }

    const answerlatticeFileCredential = getAnswerlatticeServiceAccountFileCredential();
    if (answerlatticeFileCredential) {
        return admin.initializeApp({
            credential: answerlatticeFileCredential,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        });
    }

    if (process.env.NODE_ENV !== 'production') {
        return initializeLocalAnswerlatticeAdcApp() || admin.initializeApp();
    }

    return null;
}

function getAnswerlatticeAdminApp(): admin.app.App | null {
    if (!answerlatticeFirebaseBoundary.valid) return null;
    if (shouldUseSharedAnswerlatticeFirebase) {
        if (isManagedVercelQaOrProduction()) {
            throw new Error('Answerlattice managed Vercel QA and production must use its dedicated Firebase project and identity.');
        }
        return getDefaultAdminAppForAnswerlattice();
    }

    const existing = admin.getApps().find(app => app?.name === ANSWERLATTICE_APP_NAME);
    if (existing) {
        return existing.options.projectId && isAllowedAnswerlatticeProjectId(existing.options.projectId)
            ? existing
            : null;
    }

    const credentialMode = resolveAnswerlatticeGoogleCredentialMode();
    if (credentialMode === 'vercel_oidc') {
        const workloadIdentity = readAnswerlatticeWorkloadIdentityConfig();
        if (!isAllowedAnswerlatticeProjectId(workloadIdentity.projectId)) {
            throw new Error('Answerlattice Workload Identity project does not match the active deployment stage.');
        }
        return admin.initializeApp({
            credential: getAnswerlatticeFirebaseWorkloadIdentityCredential(),
            projectId: workloadIdentity.projectId,
            serviceAccountId: workloadIdentity.serviceAccountEmail,
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        }, ANSWERLATTICE_APP_NAME);
    }

    if (credentialMode === 'service_account_key') {
        const answerlatticeCredential = getAdminCredential('ANSWERLATTICE_FIREBASE');
        const answerlatticeFileCredential = getAnswerlatticeServiceAccountFileCredential();
        const credential = answerlatticeCredential || answerlatticeFileCredential;
        if (!credential) {
            throw new Error('Answerlattice Firebase service-account key configuration is invalid.');
        }
        return admin.initializeApp({
            credential,
            projectId: getAnswerlatticeProjectId(),
            ...(getAnswerlatticeStorageBucket() ? { storageBucket: getAnswerlatticeStorageBucket() } : {}),
        }, ANSWERLATTICE_APP_NAME);
    }

    const localAdcApp = initializeLocalAnswerlatticeAdcApp(ANSWERLATTICE_APP_NAME);
    if (localAdcApp) return localAdcApp;

    // No credentials available (e.g. Vercel build without ANSWERLATTICE_* env vars)
    // Return null to avoid ADC fallback crash looking for service-account.json
    return null;
}

const answerlatticeAdminApp = getAnswerlatticeAdminApp();
const answerlatticeCredentialMode = answerlatticeAdminApp && !shouldUseSharedAnswerlatticeFirebase
    ? resolveAnswerlatticeGoogleCredentialMode()
    : null;
const answerlatticeWorkloadIdentity = answerlatticeCredentialMode === 'vercel_oidc'
    ? readAnswerlatticeWorkloadIdentityConfig()
    : null;
const answerlatticeWorkloadIdentityAuthClient = answerlatticeWorkloadIdentity
    ? getAnswerlatticeWorkloadIdentityAuthClient()
    : null;
const answerlatticeWorkloadIdentityGoogleAuth = answerlatticeWorkloadIdentity
    && answerlatticeWorkloadIdentityAuthClient
    ? createWorkloadIdentityGoogleAuth(
        answerlatticeWorkloadIdentity,
        answerlatticeWorkloadIdentityAuthClient,
    )
    : null;
const answerlatticeFirestoreAdmin = answerlatticeAdminApp
    ? (answerlatticeWorkloadIdentity && answerlatticeWorkloadIdentityGoogleAuth
        ? createWorkloadIdentityFirestore({
            auth: answerlatticeWorkloadIdentityGoogleAuth,
            databaseId: answerlatticeFirestoreDatabaseId || undefined,
            projectId: answerlatticeWorkloadIdentity.projectId,
        })
        : (answerlatticeFirestoreDatabaseId
            ? getAdminFirestore(answerlatticeAdminApp, answerlatticeFirestoreDatabaseId)
            : getAdminFirestore(answerlatticeAdminApp)))
    : null;
const answerlatticeFirestoreEmulatorHost = process.env.NODE_ENV === 'production'
    ? null
    : normalizeAnswerlatticeFirestoreEmulatorHost(process.env.ANSWERLATTICE_FIRESTORE_EMULATOR_HOST);
if (answerlatticeFirestoreAdmin && answerlatticeFirestoreEmulatorHost) {
    answerlatticeFirestoreAdmin.settings({
        host: answerlatticeFirestoreEmulatorHost,
        ssl: false,
    });
}
if (answerlatticeAdminApp && answerlatticeFirestoreAdmin) {
    registerFirebaseFirestoreCompatInstance(answerlatticeAdminApp, answerlatticeFirestoreAdmin);
}
const answerlatticeStorageAdmin = answerlatticeAdminApp
    ? (answerlatticeWorkloadIdentity && answerlatticeWorkloadIdentityAuthClient
        ? createWorkloadIdentityStorageAdmin({
            app: answerlatticeAdminApp,
            config: answerlatticeWorkloadIdentity,
            defaultBucket: getAnswerlatticeStorageBucket(),
            getSubjectToken: createAnswerlatticeWorkloadIdentitySubjectTokenSupplier(
                answerlatticeWorkloadIdentity,
            ),
        })
        : admin.storage(answerlatticeAdminApp))
    : null;
const answerlatticeAuthAdmin = answerlatticeAdminApp ? admin.auth(answerlatticeAdminApp) : null;

function requireAnswerlatticeAdminService<T>(service: T | null, serviceName: string): T {
    if (!service) {
        throw new Error(`Answerlattice Firebase Admin ${serviceName} is unavailable.`);
    }
    return service;
}

const requireAnswerlatticeFirestoreAdmin = () => requireAnswerlatticeAdminService(
    answerlatticeFirestoreAdmin,
    'Firestore',
);
const requireAnswerlatticeStorageAdmin = () => requireAnswerlatticeAdminService(
    answerlatticeStorageAdmin,
    'Storage',
);
const requireAnswerlatticeAuthAdmin = () => requireAnswerlatticeAdminService(
    answerlatticeAuthAdmin,
    'Auth',
);

type AnswerlatticeVectorValue = ReturnType<typeof FieldValue.vector> & {
    values?: number[];
    _values?: number[];
};
type AnswerlatticeVectorFactory = {
    new(values?: number[]): AnswerlatticeVectorValue;
    (values?: number[]): AnswerlatticeVectorValue;
};
const AnswerlatticeVector = (function AnswerlatticeVector(values?: number[]) {
    return FieldValue.vector(values) as AnswerlatticeVectorValue;
}) as AnswerlatticeVectorFactory;

export {
    AnswerlatticeVector,
    answerlatticeAdminApp,
    answerlatticeAuthAdmin,
    answerlatticeFirestoreAdmin,
    answerlatticeStorageAdmin,
    requireAnswerlatticeAuthAdmin,
    requireAnswerlatticeFirestoreAdmin,
    requireAnswerlatticeStorageAdmin,
};
