const firstConfiguredValue = (...values: Array<string | undefined>): string | undefined => (
    values.find((value) => typeof value === 'string' && value.trim().length > 0)
);

/**
 * MenuList browser configuration.
 *
 * Canonical product-scoped names are authoritative. Generic names remain
 * read-only migration fallbacks so an existing deployment can be migrated
 * without storing duplicate values.
 */
export const menulistPublicEnv = {
    firebaseApiKey: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY,
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    ),
    firebaseAppCheckDebugToken: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_APPCHECK_DEBUG_TOKEN,
        process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN,
    ),
    firebaseAppId: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_APP_ID,
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    ),
    firebaseAuthDomain: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_AUTH_DOMAIN,
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    ),
    firebaseDatabaseUrl: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FB_DATABASE_URL,
        process.env.NEXT_PUBLIC_FB_DATABASE_URL,
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    ),
    firebaseMeasurementId: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_MEASUREMENT_ID,
        process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    ),
    firebaseMessagingSenderId: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_MESSAGING_SENDER_ID,
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    firebaseProjectId: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID,
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    ),
    firebaseStorageBucket: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET,
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    ),
    razorpayKeyId: firstConfiguredValue(
        process.env.NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID,
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    ),
} as const;
