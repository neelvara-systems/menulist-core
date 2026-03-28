import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getVertexAI } from "firebase/vertexai";
import firebaseConfig from "./config";

// Initialize Firebase — guard against missing env vars during build
const hasConfig = !!firebaseConfig.apiKey;
const firebaseApp = hasConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

const firebaseClient = firebaseApp ? getFirestore() : null as any;
const firebaseAuth = firebaseApp ? getAuth() : null as any;
const firebaseStorage = firebaseApp ? getStorage() : null as any;
const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null as any;
const firebaseStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket || 'ecomsai.appspot.com'}/o`;
const signOutFirebaseAuth = () => firebaseAuth ? signOut(firebaseAuth) : Promise.resolve();
const vertexAIClient = firebaseApp ? getVertexAI(firebaseApp) : null as any;
const functions = firebaseApp ? getFunctions(firebaseApp) : null as any;

// Initialize App Check (bot protection)
// Call this after firebaseApp is initialized
if (firebaseApp && typeof window !== 'undefined') {
    import('./appCheck').then(({ initAppCheck }) => {
        initAppCheck();
    });
}

if (firebaseApp && process.env.NODE_ENV === 'development') {
    try {
        // console.log("Connecting to Firebase Emulators");
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
        // Firestore & Storage emulators NOT connected — app reads tenant/store data from production
        // The Functions emulator backend handles emulator Firestore via FIRESTORE_EMULATOR_HOST
        // console.log("🔥 Connected to Firebase Functions Emulator");
    } catch (error) {
        console.error("Error connecting to Firebase emulators:", error);
    }
}

export { firebaseApp, firebaseAuth, firebaseClient, firebaseDatabase, firebaseStorage, firebaseStorageUrl, functions, signOutFirebaseAuth, vertexAIClient };
