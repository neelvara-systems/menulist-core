/**
 * Answerlattice Firebase Client — shared or separate Firebase runtime.
 *
 * Answerlattice DAL files import from this file so local, preview, and production
 * use the Answerlattice Firebase target configured for that deployment stage.
 * Shared mode is only an explicit legacy/emulator override.
 *
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import answerlatticeFirebaseConfig, {
    answerlatticeFirebaseMode,
    answerlatticeFirestoreDatabaseId,
    isAnswerlatticeFirebaseConfigured,
    shouldUseSharedAnswerlatticeFirebase,
} from "./answerlatticeConfig";
import {
    firebaseApp,
    firebaseAuth,
    firebaseClient,
    firebaseStorage,
    functions,
} from "./firebaseClient";

const ANSWERLATTICE_APP_NAME = 'answerlattice';

const getAnswerlatticeFirestore = (app: NonNullable<typeof firebaseApp>) => {
    return answerlatticeFirestoreDatabaseId
        ? getFirestore(app, answerlatticeFirestoreDatabaseId)
        : getFirestore(app);
};

const answerlatticeApp = isAnswerlatticeFirebaseConfigured
    ? (shouldUseSharedAnswerlatticeFirebase
        ? firebaseApp
        : (getApps().find(app => app.name === ANSWERLATTICE_APP_NAME)
            ? getApp(ANSWERLATTICE_APP_NAME)
            : initializeApp(answerlatticeFirebaseConfig, ANSWERLATTICE_APP_NAME)))
    : null;

const answerlatticeFirebaseClient = answerlatticeApp
    ? (shouldUseSharedAnswerlatticeFirebase && !answerlatticeFirestoreDatabaseId
        ? firebaseClient
        : getAnswerlatticeFirestore(answerlatticeApp))
    : null as any;
const answerlatticeAuth = answerlatticeApp ? (shouldUseSharedAnswerlatticeFirebase ? firebaseAuth : getAuth(answerlatticeApp)) : null as any;
const answerlatticeStorage = answerlatticeApp ? (shouldUseSharedAnswerlatticeFirebase ? firebaseStorage : getStorage(answerlatticeApp)) : null as any;
const answerlatticeFunctions = answerlatticeApp ? (shouldUseSharedAnswerlatticeFirebase ? functions : getFunctions(answerlatticeApp)) : null as any;

export {
    answerlatticeApp,
    answerlatticeAuth,
    answerlatticeFirebaseMode,
    answerlatticeFirebaseClient,
    answerlatticeFunctions,
    answerlatticeFirestoreDatabaseId,
    answerlatticeStorage,
    isAnswerlatticeFirebaseConfigured,
    shouldUseSharedAnswerlatticeFirebase,
};
