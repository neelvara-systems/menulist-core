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
    get billingSyntheticQaEnabled() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_SYNTHETIC_QA_ENABLED');
    },
    get billingAuthorisedSignatoryName() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_AUTHORISED_SIGNATORY_NAME');
    },
    get billingDocumentDeliveryEnabled() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_DOCUMENT_DELIVERY_ENABLED');
    },
    get billingDocumentsEnabled() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_DOCUMENTS_ENABLED');
    },
    get billingEInvoiceStatus() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_E_INVOICE_STATUS');
    },
    get billingExportZeroRatingEnabled() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_EXPORT_ZERO_RATING_ENABLED');
    },
    get billingGstin() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_GSTIN');
    },
    get billingInternationalCheckoutEnabled() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_INTERNATIONAL_CHECKOUT_ENABLED');
    },
    get billingLegalIdentityVerified() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_LEGAL_IDENTITY_VERIFIED');
    },
    get billingLegalSupplierName() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_LEGAL_SUPPLIER_NAME');
    },
    get billingLutReference() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_LUT_REFERENCE');
    },
    get billingMerchantEntityId() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_MERCHANT_ENTITY_ID');
    },
    get billingRegisteredAddress() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_REGISTERED_ADDRESS');
    },
    get billingSacCode() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_SAC_CODE');
    },
    get billingSupplierStateCode() {
        return readConfiguredValue('ANSWERLATTICE_BILLING_SUPPLIER_STATE_CODE');
    },
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
    get firebaseAdminAuthMode() {
        return readConfiguredValue('ANSWERLATTICE_FIREBASE_ADMIN_AUTH_MODE');
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
    get gcpProjectNumber() {
        return readConfiguredValue('ANSWERLATTICE_GCP_PROJECT_NUMBER');
    },
    get gcpServiceAccountEmail() {
        return readConfiguredValue('ANSWERLATTICE_GCP_SERVICE_ACCOUNT_EMAIL');
    },
    get gcpWorkloadIdentityPoolId() {
        return readConfiguredValue('ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_POOL_ID');
    },
    get gcpWorkloadIdentityProviderId() {
        return readConfiguredValue('ANSWERLATTICE_GCP_WORKLOAD_IDENTITY_PROVIDER_ID');
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
