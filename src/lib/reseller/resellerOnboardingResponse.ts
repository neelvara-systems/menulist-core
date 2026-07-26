export type ResellerOnboardingResponse = {
    dashboardUrl?: string;
    locationCount: number;
    loginEmail?: string;
    ownerUsername?: string;
    passwordSet: true;
    publicUrl?: string;
    shortUrl?: string;
    status: "active" | "pending";
    storeId: number;
    subdomain?: string;
    subscriptionId: string;
    tenantId: number;
    transactionId: string;
};

const RESPONSE_KEYS = new Set([
    "dashboardUrl", "locationCount", "loginEmail", "ownerUsername",
    "passwordSet", "publicUrl", "shortUrl", "status", "storeId",
    "subdomain", "subscriptionId", "tenantId", "transactionId",
]);

const boundedOptionalString = (value: unknown, maxLength: number): boolean => (
    value === undefined
    || (typeof value === "string" && value.length > 0 && value.length <= maxLength)
);

export const isResellerOnboardingResponse = (
    value: unknown,
    expectedOperationId: string,
): value is ResellerOnboardingResponse => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => !RESPONSE_KEYS.has(key))) return false;
    return typeof record.storeId === "number"
        && Number.isSafeInteger(record.storeId)
        && record.storeId > 0
        && typeof record.tenantId === "number"
        && Number.isSafeInteger(record.tenantId)
        && record.tenantId > 0
        && typeof record.locationCount === "number"
        && Number.isSafeInteger(record.locationCount)
        && record.locationCount > 0
        && record.locationCount <= 30
        && record.passwordSet === true
        && (record.status === "active" || record.status === "pending")
        && typeof record.subscriptionId === "string"
        && record.subscriptionId.length > 0
        && record.subscriptionId.length <= 256
        && record.transactionId === expectedOperationId
        && boundedOptionalString(record.dashboardUrl, 2048)
        && boundedOptionalString(record.loginEmail, 320)
        && boundedOptionalString(record.ownerUsername, 128)
        && boundedOptionalString(record.publicUrl, 2048)
        && boundedOptionalString(record.shortUrl, 2048)
        && boundedOptionalString(record.subdomain, 253);
};
