import { SIGNALDESK_CLIENT_FIREBASE_APP_NAME } from "@constant/signaldesk/firebase";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import {
    firebaseApp,
    firebaseAuth,
    firebaseClient,
    firebaseStorage,
    functions,
} from "./firebaseClient";
import signaldeskFirebaseConfig, {
    isSignalDeskFirebaseConfigured,
    shouldUseSharedSignalDeskFirebase,
    signaldeskFirebaseMode,
    signaldeskFirestoreDatabaseId,
} from "./signaldeskConfig";

const getSignalDeskFirestore = (app: NonNullable<typeof firebaseApp>) => (
    signaldeskFirestoreDatabaseId
        ? getFirestore(app, signaldeskFirestoreDatabaseId)
        : getFirestore(app)
);

const signaldeskApp = isSignalDeskFirebaseConfigured
    ? (shouldUseSharedSignalDeskFirebase
        ? firebaseApp
        : (getApps().find((app) => app.name === SIGNALDESK_CLIENT_FIREBASE_APP_NAME)
            ? getApp(SIGNALDESK_CLIENT_FIREBASE_APP_NAME)
            : initializeApp(signaldeskFirebaseConfig, SIGNALDESK_CLIENT_FIREBASE_APP_NAME)))
    : null;

const signaldeskFirebaseClient = signaldeskApp
    ? (shouldUseSharedSignalDeskFirebase && !signaldeskFirestoreDatabaseId
        ? firebaseClient
        : getSignalDeskFirestore(signaldeskApp))
    : null as any;
const signaldeskAuth = signaldeskApp ? (shouldUseSharedSignalDeskFirebase ? firebaseAuth : getAuth(signaldeskApp)) : null as any;
const signaldeskStorage = signaldeskApp ? (shouldUseSharedSignalDeskFirebase ? firebaseStorage : getStorage(signaldeskApp)) : null as any;
const signaldeskFunctions = signaldeskApp ? (shouldUseSharedSignalDeskFirebase ? functions : getFunctions(signaldeskApp)) : null as any;

export {
    isSignalDeskFirebaseConfigured,
    shouldUseSharedSignalDeskFirebase,
    signaldeskApp,
    signaldeskAuth,
    signaldeskFirebaseClient,
    signaldeskFirebaseMode,
    signaldeskFirestoreDatabaseId,
    signaldeskFunctions,
    signaldeskStorage,
};
