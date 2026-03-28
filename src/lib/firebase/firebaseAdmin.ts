import * as admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
    // For Vercel deployment: Use explicit environment variables
    // For local development: Uses GOOGLE_APPLICATION_CREDENTIALS automatically
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            })
        });
        console.log("🔥 Firebase Admin initialized with explicit credentials (Vercel).");
    } else {
        // Fallback to ADC for local development with GOOGLE_APPLICATION_CREDENTIALS
        admin.initializeApp();
        console.log("🔥 Firebase Admin initialized with ADC (local development).");
    }
}

const firestoreAdmin = admin.firestore();
const storageAdmin = admin.storage();
const authAdmin = admin.auth();
const Vector = (admin.firestore as any).VectorValue;

export { Vector, admin, authAdmin, firestoreAdmin, storageAdmin };

