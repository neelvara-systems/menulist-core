import type { ResellerTransactionStatus } from "@type/reseller";

export type ResellerClientRecord = {
    action: "ONBOARD";
    amountExpected: number;
    billingInterval: "MONTH" | "YEAR";
    commitmentMonths: number | null;
    createdOn: string | null;
    currency: "INR";
    id: string;
    locationCount: number;
    modifiedOn: string | null;
    paymentMode: "offline" | "online";
    pricingTier: string;
    resellerEmail: "";
    resellerId: string;
    resellerProfileId: string | null;
    status: ResellerTransactionStatus;
    storeId: number;
    storeName: string;
    subscriptionAmount: number;
    subscriptionBillingMode: "auto" | "manual";
    subscriptionId: string;
    subscriptionQuantity: number;
    subscriptionShortUrl: string | null;
    subscriptionStatus: string;
    tenantId: number;
    validUntil: string | null;
};

export type ResellerClientsResponse = {
    invalidRowCount: number;
    isPartial: boolean;
    transactions: ResellerClientRecord[];
};

type ResellerClientScope = {
    storeId: number;
    tenantId: number;
};

const CLIENT_KEYS = new Set([
    "action",
    "amountExpected",
    "billingInterval",
    "commitmentMonths",
    "createdOn",
    "currency",
    "id",
    "locationCount",
    "modifiedOn",
    "paymentMode",
    "pricingTier",
    "resellerEmail",
    "resellerId",
    "resellerProfileId",
    "status",
    "storeId",
    "storeName",
    "subscriptionAmount",
    "subscriptionBillingMode",
    "subscriptionId",
    "subscriptionQuantity",
    "subscriptionShortUrl",
    "subscriptionStatus",
    "tenantId",
    "validUntil",
]);
const RESPONSE_KEYS = new Set(["invalidRowCount", "isPartial", "transactions"]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const hasExactKeys = (value: Record<string, unknown>, keys: Set<string>): boolean => {
    const actual = Object.keys(value);
    return actual.length === keys.size && actual.every((key) => keys.has(key));
};

const nonNegativeSafeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
);

const positiveSafeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
);

const boundedString = (
    value: unknown,
    maxLength: number,
    allowEmpty = false,
): value is string => (
    typeof value === "string"
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0)
);

const optionalBoundedString = (
    value: unknown,
    maxLength: number,
): string | null => (
    boundedString(value, maxLength) ? value.trim() : null
);

const timestampToIso = (value: unknown): string | null => {
    try {
        let date: Date | null = null;
        if (value instanceof Date) {
            date = value;
        } else if (isRecord(value) && typeof value.toDate === "function") {
            const converted = value.toDate();
            date = converted instanceof Date ? converted : null;
        } else if (isRecord(value) && typeof value.toMillis === "function") {
            const millis = value.toMillis();
            date = typeof millis === "number" && Number.isFinite(millis) ? new Date(millis) : null;
        } else if (typeof value === "string" || typeof value === "number") {
            date = new Date(value);
        }
        return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const isIsoOrNull = (value: unknown): value is string | null => {
    if (value === null) return true;
    if (typeof value !== "string" || value.length > 40) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString() === value;
};

const normalizeStatus = (value: unknown): ResellerTransactionStatus | null => {
    if (value === "pending" || value === "pending_payment") return "pending_payment";
    if (value === "active" || value === "expired" || value === "cancelled") return value;
    return null;
};

export const isResellerClientRecord = (value: unknown): value is ResellerClientRecord => {
    if (!isRecord(value) || !hasExactKeys(value, CLIENT_KEYS)) return false;
    return (
        value.action === "ONBOARD"
        && nonNegativeSafeInteger(value.amountExpected)
        && (value.billingInterval === "MONTH" || value.billingInterval === "YEAR")
        && (value.commitmentMonths === null || positiveSafeInteger(value.commitmentMonths))
        && isIsoOrNull(value.createdOn)
        && value.currency === "INR"
        && boundedString(value.id, 128)
        && positiveSafeInteger(value.locationCount)
        && isIsoOrNull(value.modifiedOn)
        && (value.paymentMode === "offline" || value.paymentMode === "online")
        && boundedString(value.pricingTier, 64)
        && value.resellerEmail === ""
        && boundedString(value.resellerId, 128)
        && (value.resellerProfileId === null || boundedString(value.resellerProfileId, 128))
        && normalizeStatus(value.status) === value.status
        && positiveSafeInteger(value.storeId)
        && boundedString(value.storeName, 200, true)
        && nonNegativeSafeInteger(value.subscriptionAmount)
        && (value.subscriptionBillingMode === "auto" || value.subscriptionBillingMode === "manual")
        && boundedString(value.subscriptionId, 128)
        && positiveSafeInteger(value.subscriptionQuantity)
        && (value.subscriptionShortUrl === null || boundedString(value.subscriptionShortUrl, 2048))
        && boundedString(value.subscriptionStatus, 50)
        && positiveSafeInteger(value.tenantId)
        && isIsoOrNull(value.validUntil)
    );
};

export const isResellerClientsResponse = (
    value: unknown,
): value is ResellerClientsResponse => (
    isRecord(value)
    && hasExactKeys(value, RESPONSE_KEYS)
    && nonNegativeSafeInteger(value.invalidRowCount)
    && typeof value.isPartial === "boolean"
    && Array.isArray(value.transactions)
    && value.transactions.length <= 200
    && value.transactions.every(isResellerClientRecord)
);

export const projectResellerClientRecord = (
    documentId: string,
    value: unknown,
    scope: ResellerClientScope,
    normalizedCheckoutUrl: string | null,
): ResellerClientRecord | null => {
    if (!isRecord(value)) return null;
    const id = optionalBoundedString(documentId, 128);
    const resellerId = optionalBoundedString(value.resellerId, 128);
    const pricingTier = optionalBoundedString(value.resellerPricingTier, 64);
    const subscriptionStatus = optionalBoundedString(value.status, 50);
    const status = normalizeStatus(value.status);
    const billingMode = value.billingMode;
    const quantity = value.quantity === undefined ? 1 : value.quantity;
    const amount = value.amount;
    const commitmentMonths = value.commitmentPeriodMonths;
    if (
        !id
        || !resellerId
        || !pricingTier
        || !subscriptionStatus
        || !status
        || (billingMode !== "manual" && billingMode !== "auto")
        || !positiveSafeInteger(quantity)
        || !nonNegativeSafeInteger(amount)
        || (
            commitmentMonths !== undefined
            && commitmentMonths !== null
            && !positiveSafeInteger(commitmentMonths)
        )
        || !positiveSafeInteger(scope.storeId)
        || !positiveSafeInteger(scope.tenantId)
    ) {
        return null;
    }
    const amountExpected = billingMode === "manual" ? amount : amount * quantity;
    if (!nonNegativeSafeInteger(amountExpected)) return null;
    const resellerProfileId = value.resellerProfileId;
    if (
        resellerProfileId !== undefined
        && resellerProfileId !== null
        && !boundedString(resellerProfileId, 128)
    ) {
        return null;
    }

    return {
        action: "ONBOARD",
        amountExpected,
        billingInterval: value.planType === "YEAR" ? "YEAR" : "MONTH",
        commitmentMonths: positiveSafeInteger(commitmentMonths) ? commitmentMonths : null,
        createdOn: timestampToIso(value.createdOn),
        currency: "INR",
        id,
        locationCount: quantity,
        modifiedOn: timestampToIso(value.modifiedOn),
        paymentMode: billingMode === "manual" ? "offline" : "online",
        pricingTier,
        resellerEmail: "",
        resellerId,
        resellerProfileId: typeof resellerProfileId === "string" ? resellerProfileId : null,
        status,
        storeId: scope.storeId,
        storeName: boundedString(value.name, 200, true) ? value.name.trim() : "",
        subscriptionAmount: amount,
        subscriptionBillingMode: billingMode,
        subscriptionId: id,
        subscriptionQuantity: quantity,
        subscriptionShortUrl: normalizedCheckoutUrl,
        subscriptionStatus,
        tenantId: scope.tenantId,
        validUntil: timestampToIso(value.validUntil) || timestampToIso(value.cycleEndDate),
    };
};
