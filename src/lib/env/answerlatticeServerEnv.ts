const readConfiguredValue = (canonicalName: string, ...legacyNames: string[]): string | undefined => {
    for (const name of [canonicalName, ...legacyNames]) {
        const value = process.env[name];
        if (typeof value === 'string' && value.trim().length > 0) return value;
    }
    return undefined;
};

/**
 * Answerlattice server configuration.
 *
 * Generic names remain migration fallbacks only and must not be added to
 * managed environment templates.
 */
export const answerlatticeServerEnv = {
    get firebaseApiKey() {
        return readConfiguredValue(
            'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_API_KEY',
            'ANSWERLATTICE_FIREBASE_API_KEY',
            'FIREBASE_API_KEY',
            'NEXT_PUBLIC_FIREBASE_API_KEY',
        );
    },
    get firebaseClientEmail() {
        return readConfiguredValue('ANSWERLATTICE_FIREBASE_CLIENT_EMAIL');
    },
    get firebasePrivateKey() {
        return readConfiguredValue('ANSWERLATTICE_FIREBASE_PRIVATE_KEY');
    },
    get firebaseProjectId() {
        return readConfiguredValue(
            'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID',
            'ANSWERLATTICE_FIREBASE_PROJECT_ID',
        );
    },
    get firebaseStorageBucket() {
        return readConfiguredValue(
            'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET',
            'ANSWERLATTICE_FIREBASE_STORAGE_BUCKET',
        );
    },
    get githubAppClientId() {
        return readConfiguredValue('ANSWERLATTICE_GITHUB_APP_CLIENT_ID');
    },
    get githubAppClientSecret() {
        return readConfiguredValue('ANSWERLATTICE_GITHUB_APP_CLIENT_SECRET');
    },
    get githubAppId() {
        return readConfiguredValue('ANSWERLATTICE_GITHUB_APP_ID');
    },
    get githubAppPrivateKey() {
        return readConfiguredValue('ANSWERLATTICE_GITHUB_APP_PRIVATE_KEY');
    },
    get githubAppSlug() {
        return readConfiguredValue('ANSWERLATTICE_GITHUB_APP_SLUG');
    },
    get githubStateSecret() {
        return readConfiguredValue('ANSWERLATTICE_GITHUB_STATE_SECRET');
    },
    get githubWebhookSecret() {
        return readConfiguredValue('ANSWERLATTICE_GITHUB_WEBHOOK_SECRET');
    },
    get upstashRedisRestToken() {
        return readConfiguredValue('ANSWERLATTICE_UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
    },
    get upstashRedisRestUrl() {
        return readConfiguredValue('ANSWERLATTICE_UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_URL');
    },
} as const;

export const getAnswerlatticeUpstashEnv = () => ({
    token: answerlatticeServerEnv.upstashRedisRestToken,
    url: answerlatticeServerEnv.upstashRedisRestUrl,
});
