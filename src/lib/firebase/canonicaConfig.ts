/**
 * Canonica Firebase Configuration
 * 
 * Separate Firebase project for Canonica (Support Knowledge Control Plane).
 * Uses CANONICA_* prefixed environment variables.
 * 
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md v4.3.0
 * @see __docs__/canonica/doctrine/09-multi-product-doctrine.md
 */

const canonicaFirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_CANONICA_FIREBASE_APP_ID,
};

export default canonicaFirebaseConfig;
