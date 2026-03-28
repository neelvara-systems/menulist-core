/**
 * Canonica Firebase Client — Separate Firebase Project
 * 
 * This is the client-side Firebase SDK initialization for the Canonica Firebase project.
 * ALL Canonica DAL files must import from this file, NOT from firebaseClient.ts.
 * 
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md v4.3.0
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import canonicaFirebaseConfig from "./canonicaConfig";

const CANONICA_APP_NAME = 'canonica';

const hasCanonicaConfig = !!canonicaFirebaseConfig.apiKey;

const canonicaApp = hasCanonicaConfig
    ? (getApps().find(app => app.name === CANONICA_APP_NAME)
        ? getApp(CANONICA_APP_NAME)
        : initializeApp(canonicaFirebaseConfig, CANONICA_APP_NAME))
    : null;

const canonicaFirebaseClient = canonicaApp ? getFirestore(canonicaApp) : null as any;
const canonicaAuth = canonicaApp ? getAuth(canonicaApp) : null as any;
const canonicaStorage = canonicaApp ? getStorage(canonicaApp) : null as any;
const canonicaFunctions = canonicaApp ? getFunctions(canonicaApp) : null as any;

export {
    canonicaApp,
    canonicaAuth,
    canonicaFirebaseClient,
    canonicaFunctions,
    canonicaStorage,
};
