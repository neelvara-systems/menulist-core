const readConfiguredValue = (canonicalName: string, ...legacyNames: string[]): string | undefined => {
    for (const name of [canonicalName, ...legacyNames]) {
        const value = process.env[name];
        if (typeof value === 'string' && value.trim().length > 0) return value;
    }
    return undefined;
};

/**
 * MenuList server configuration.
 *
 * Callers always prefer the product-scoped name. Generic names are migration
 * fallbacks only and are intentionally absent from managed env templates.
 */
export const menulistServerEnv = {
    get billingExportZeroRatingEnabled() {
        return readConfiguredValue('MENULIST_BILLING_EXPORT_ZERO_RATING_ENABLED');
    },
    get billingGstin() {
        return readConfiguredValue('MENULIST_BILLING_GSTIN');
    },
    get billingInternationalCheckoutEnabled() {
        return readConfiguredValue('MENULIST_BILLING_INTERNATIONAL_CHECKOUT_ENABLED');
    },
    get billingLegalIdentityVerified() {
        return readConfiguredValue('MENULIST_BILLING_LEGAL_IDENTITY_VERIFIED');
    },
    get billingLegalSupplierName() {
        return readConfiguredValue('MENULIST_BILLING_LEGAL_SUPPLIER_NAME');
    },
    get billingLutReference() {
        return readConfiguredValue('MENULIST_BILLING_LUT_REFERENCE');
    },
    get billingMerchantEntityId() {
        return readConfiguredValue('MENULIST_BILLING_MERCHANT_ENTITY_ID');
    },
    get billingRegisteredAddress() {
        return readConfiguredValue('MENULIST_BILLING_REGISTERED_ADDRESS');
    },
    get billingSacCode() {
        return readConfiguredValue('MENULIST_BILLING_SAC_CODE');
    },
    get billingSupplierStateCode() {
        return readConfiguredValue('MENULIST_BILLING_SUPPLIER_STATE_CODE');
    },
    get billingDocumentsEnabled() {
        return readConfiguredValue('MENULIST_BILLING_DOCUMENTS_ENABLED');
    },
    get billingDocumentDeliveryEnabled() {
        return readConfiguredValue('MENULIST_BILLING_DOCUMENT_DELIVERY_ENABLED');
    },
    get billingEInvoiceStatus() {
        return readConfiguredValue('MENULIST_BILLING_E_INVOICE_STATUS');
    },
    get billingAuthorisedSignatoryName() {
        return readConfiguredValue('MENULIST_BILLING_AUTHORISED_SIGNATORY_NAME');
    },
    get batchImageGenerationQueueId() {
        return readConfiguredValue('MENULIST_BATCH_IMAGE_GENERATION_QUEUE_ID', 'BATCH_IMAGE_GENERATION_QUEUE_ID');
    },
    get batchImageGenerationWorkerSecret() {
        return readConfiguredValue('MENULIST_BATCH_IMAGE_GENERATION_WORKER_SECRET', 'BATCH_IMAGE_GENERATION_WORKER_SECRET');
    },
    get batchImageGenerationWorkerUrl() {
        return readConfiguredValue('MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL', 'BATCH_IMAGE_GENERATION_WORKER_URL');
    },
    get firebaseApiKey() {
        return readConfiguredValue(
            'NEXT_PUBLIC_MENULIST_FIREBASE_API_KEY',
            'MENULIST_FIREBASE_API_KEY',
            'FIREBASE_API_KEY',
            'NEXT_PUBLIC_FIREBASE_API_KEY',
        );
    },
    get firebaseClientEmail() {
        return readConfiguredValue('MENULIST_FIREBASE_CLIENT_EMAIL', 'FIREBASE_CLIENT_EMAIL');
    },
    get firebaseAdminAuthMode() {
        return readConfiguredValue('MENULIST_FIREBASE_ADMIN_AUTH_MODE');
    },
    get firebasePrivateKey() {
        return readConfiguredValue('MENULIST_FIREBASE_PRIVATE_KEY', 'FIREBASE_PRIVATE_KEY');
    },
    get firebaseProjectId() {
        return readConfiguredValue(
            'NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID',
            'MENULIST_FIREBASE_PROJECT_ID',
            'FIREBASE_PROJECT_ID',
            'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        );
    },
    get firebaseProjectLocation() {
        return readConfiguredValue('MENULIST_FIREBASE_PROJECT_LOCATION', 'FIREBASE_PROJECT_LOCATION');
    },
    get firebaseStorageBucket() {
        return readConfiguredValue(
            'NEXT_PUBLIC_MENULIST_FIREBASE_STORAGE_BUCKET',
            'MENULIST_FIREBASE_STORAGE_BUCKET',
            'FIREBASE_STORAGE_BUCKET',
            'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        );
    },
    get gcpProjectNumber() {
        return readConfiguredValue('MENULIST_GCP_PROJECT_NUMBER');
    },
    get gcpServiceAccountEmail() {
        return readConfiguredValue('MENULIST_GCP_SERVICE_ACCOUNT_EMAIL');
    },
    get gcpWorkloadIdentityPoolId() {
        return readConfiguredValue('MENULIST_GCP_WORKLOAD_IDENTITY_POOL_ID');
    },
    get gcpWorkloadIdentityProviderId() {
        return readConfiguredValue('MENULIST_GCP_WORKLOAD_IDENTITY_PROVIDER_ID');
    },
    get razorpayKeyId() {
        return readConfiguredValue(
            'NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID',
            'MENULIST_RAZORPAY_KEY_ID',
            'RAZORPAY_KEY_ID',
            'NEXT_PUBLIC_RAZORPAY_KEY_ID',
        );
    },
    get razorpayKeySecret() {
        return readConfiguredValue('MENULIST_RAZORPAY_KEY_SECRET', 'RAZORPAY_KEY_SECRET');
    },
    get razorpayWebhookSecret() {
        return readConfiguredValue('MENULIST_RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_WEBHOOK_SECRET');
    },
    get revalidationSecret() {
        return readConfiguredValue('MENULIST_REVALIDATION_SECRET', 'REVALIDATION_SECRET');
    },
    get telegramBotToken() {
        return readConfiguredValue('MENULIST_TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_TOKEN');
    },
    get telegramChatId() {
        return readConfiguredValue('MENULIST_TELEGRAM_CHAT_ID', 'TELEGRAM_CHAT_ID');
    },
    get upstashRedisRestToken() {
        return readConfiguredValue('MENULIST_UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
    },
    get upstashRedisRestUrl() {
        return readConfiguredValue('MENULIST_UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_URL');
    },
    get whatsappAccessToken() {
        return readConfiguredValue('MENULIST_WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_ACCESS_TOKEN');
    },
    get whatsappOtpAllowTextFallback() {
        return readConfiguredValue('MENULIST_WHATSAPP_OTP_ALLOW_TEXT_FALLBACK', 'WHATSAPP_OTP_ALLOW_TEXT_FALLBACK');
    },
    get whatsappOtpTemplateLanguage() {
        return readConfiguredValue('MENULIST_WHATSAPP_OTP_TEMPLATE_LANGUAGE', 'WHATSAPP_OTP_TEMPLATE_LANGUAGE');
    },
    get whatsappOtpTemplateName() {
        return readConfiguredValue('MENULIST_WHATSAPP_OTP_TEMPLATE_NAME', 'WHATSAPP_OTP_TEMPLATE_NAME');
    },
    get whatsappPhoneNumberId() {
        return readConfiguredValue('MENULIST_WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PHONE_NUMBER_ID');
    },
} as const;
