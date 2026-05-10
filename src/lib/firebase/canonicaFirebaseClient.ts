/**
 * Canonica Firebase Client — shared or separate Firebase runtime.
 *
 * Canonica DAL files import from this file so local/test can reuse MenuList's
 * default DB and production can point at a dedicated Canonica project/database.
 *
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import canonicaFirebaseConfig, {
    canonicaFirebaseMode,
    canonicaFirestoreDatabaseId,
    isCanonicaFirebaseConfigured,
    shouldUseSharedCanonicaFirebase,
} from "./canonicaConfig";
import {
    firebaseApp,
    firebaseAuth,
    firebaseClient,
    firebaseStorage,
    functions,
} from "./firebaseClient";

const CANONICA_APP_NAME = 'canonica';

const getCanonicaFirestore = (app: NonNullable<typeof firebaseApp>) => {
    return canonicaFirestoreDatabaseId
        ? getFirestore(app, canonicaFirestoreDatabaseId)
        : getFirestore(app);
};

const canonicaApp = isCanonicaFirebaseConfigured
    ? (shouldUseSharedCanonicaFirebase
        ? firebaseApp
        : (getApps().find(app => app.name === CANONICA_APP_NAME)
            ? getApp(CANONICA_APP_NAME)
            : initializeApp(canonicaFirebaseConfig, CANONICA_APP_NAME)))
    : null;

const canonicaFirebaseClient = canonicaApp
    ? (shouldUseSharedCanonicaFirebase && !canonicaFirestoreDatabaseId
        ? firebaseClient
        : getCanonicaFirestore(canonicaApp))
    : null as any;
const canonicaAuth = canonicaApp ? (shouldUseSharedCanonicaFirebase ? firebaseAuth : getAuth(canonicaApp)) : null as any;
const canonicaStorage = canonicaApp ? (shouldUseSharedCanonicaFirebase ? firebaseStorage : getStorage(canonicaApp)) : null as any;
const canonicaFunctions = canonicaApp ? (shouldUseSharedCanonicaFirebase ? functions : getFunctions(canonicaApp)) : null as any;

export {
    canonicaApp,
    canonicaAuth,
    canonicaFirebaseMode,
    canonicaFirebaseClient,
    canonicaFunctions,
    canonicaFirestoreDatabaseId,
    canonicaStorage,
    isCanonicaFirebaseConfigured,
    shouldUseSharedCanonicaFirebase,
};
