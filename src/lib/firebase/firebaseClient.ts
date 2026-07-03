import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import firebaseConfig from "./config";
import { logFirebaseBootstrapFailure } from "./firebaseDiagnostics";

const appCheckDebugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;

const isLocalAppCheckHost = (hostname: string): boolean => {
    const normalizedHost = hostname.toLowerCase();

    if (
        normalizedHost === 'localhost' ||
        normalizedHost === '0.0.0.0' ||
        normalizedHost.endsWith('.local')
    ) {
        return true;
    }

    if (/^127(?:\.\d{1,3}){3}$/.test(normalizedHost)) return true;
    if (/^192\.168(?:\.\d{1,3}){2}$/.test(normalizedHost)) return true;
    if (/^10(?:\.\d{1,3}){3}$/.test(normalizedHost)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(normalizedHost)) return true;

    return false;
};

// Initialize Firebase — guard against missing env vars during build
const hasConfig = !!firebaseConfig.apiKey;
const defaultFirebaseApp = getApps().find((app) => app.name === '[DEFAULT]');
const firebaseApp = hasConfig ? (defaultFirebaseApp || initializeApp(firebaseConfig)) : null;

const firebaseClient = firebaseApp ? getFirestore(firebaseApp) : null as any;
const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null as any;
const firebaseStorage = firebaseApp ? getStorage(firebaseApp) : null as any;
const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null as any;
const firebaseStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket || 'menulist-qa.appspot.com'}/o`;
const signOutFirebaseAuth = () => firebaseAuth ? signOut(firebaseAuth) : Promise.resolve();
const functions = firebaseApp ? getFunctions(firebaseApp) : null as any;

// Initialize App Check (bot protection)
// Call this after firebaseApp is initialized
if (firebaseApp && typeof window !== 'undefined') {
    const shouldLoadAppCheck = !isLocalAppCheckHost(window.location.hostname) || Boolean(appCheckDebugToken);

    if (shouldLoadAppCheck) {
        import('./appCheck')
            .then(({ initAppCheck }) => {
                initAppCheck(firebaseApp);
            })
            .catch((error) => {
                logFirebaseBootstrapFailure('app_check_module_load_failed', error, {
                    isLocalHost: isLocalAppCheckHost(window.location.hostname),
                    hasDebugToken: Boolean(appCheckDebugToken),
                });
            });
    }
}

if (firebaseApp && process.env.NODE_ENV === 'development') {
    try {
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
        // Firestore & Storage emulators NOT connected — app reads tenant/store data from production
        // The Functions emulator backend handles emulator Firestore via FIRESTORE_EMULATOR_HOST
    } catch (error) {
        logFirebaseBootstrapFailure('firebase_functions_emulator_connect_failed', error, {
            isDevelopment: true,
        });
    }
}

export { firebaseApp, firebaseAuth, firebaseClient, firebaseDatabase, firebaseStorage, firebaseStorageUrl, functions, signOutFirebaseAuth };
