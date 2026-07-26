import type {
    ResellerPaymentMode,
    ResellerTransactionStatus,
} from "@type/reseller";

export type ResellerMonthlySummaryRow = {
    clientCount: number;
    offlineCollectedPaise: number;
    onlineActivePaise: number;
    onlinePendingPaise: number;
    recognizedRevenuePaise: number;
    resellerEmail: string;
    resellerId: string;
    resellerName: string;
    totalExpectedPaise: number;
    transactionCount: number;
};

export type ResellerMonthlySummaryTotals = Omit<
    ResellerMonthlySummaryRow,
    "resellerEmail" | "resellerId" | "resellerName"
>;

export type ResellerMonthlySummary = {
    generatedAt: string;
    invalidRowCount: number;
    isPartial: boolean;
    month: string;
    period: {
        end: string;
        start: string;
        timeZone: "Asia/Kolkata";
    };
    resellers: ResellerMonthlySummaryRow[];
    totals: ResellerMonthlySummaryTotals;
};

export type AdmittedResellerMonthlyTransaction = {
    amountExpected: number;
    paymentMode: ResellerPaymentMode;
    resellerEmail: string;
    resellerId: string;
    resellerProfileId: string | null;
    status: ResellerTransactionStatus;
    storeId: number;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const SUMMARY_KEYS = new Set([
    "generatedAt",
    "invalidRowCount",
    "isPartial",
    "month",
    "period",
    "resellers",
    "totals",
]);
const PERIOD_KEYS = new Set(["end", "start", "timeZone"]);
const ROW_KEYS = new Set([
    "clientCount",
    "offlineCollectedPaise",
    "onlineActivePaise",
    "onlinePendingPaise",
    "recognizedRevenuePaise",
    "resellerEmail",
    "resellerId",
    "resellerName",
    "totalExpectedPaise",
    "transactionCount",
]);
const TOTAL_KEYS = new Set([
    "clientCount",
    "offlineCollectedPaise",
    "onlineActivePaise",
    "onlinePendingPaise",
    "recognizedRevenuePaise",
    "totalExpectedPaise",
    "transactionCount",
]);
const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const hasExactKeys = (value: Record<string, unknown>, keys: Set<string>): boolean => {
    const actualKeys = Object.keys(value);
    return actualKeys.length === keys.size && actualKeys.every((key) => keys.has(key));
};

const isNonNegativeSafeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0
);

const isPositiveSafeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
);

const isPaymentMode = (value: unknown): value is ResellerPaymentMode => (
    value === "offline" || value === "online"
);

const isTransactionStatus = (value: unknown): value is ResellerTransactionStatus => (
    value === "active"
    || value === "cancelled"
    || value === "expired"
    || value === "pending_payment"
);

const isBoundedString = (
    value: unknown,
    maxLength: number,
    allowEmpty = false,
): value is string => (
    typeof value === "string"
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0)
);

const isIsoTimestamp = (value: unknown): value is string => {
    if (typeof value !== "string" || value.length > 40) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString() === value;
};

const isSummaryCounters = (
    value: Record<string, unknown>,
    keys: Set<string>,
): boolean => (
    hasExactKeys(value, keys)
    && Array.from(keys).every((key) => isNonNegativeSafeInteger(value[key]))
);

const isSummaryRow = (value: unknown): value is ResellerMonthlySummaryRow => {
    if (!isRecord(value) || !hasExactKeys(value, ROW_KEYS)) return false;
    if (
        !isBoundedString(value.resellerId, 128)
        || !isBoundedString(value.resellerName, 100)
        || !isBoundedString(value.resellerEmail, 320, true)
    ) {
        return false;
    }
    return Array.from(TOTAL_KEYS).every((key) => isNonNegativeSafeInteger(value[key]));
};

export const isResellerMonthlySummary = (
    value: unknown,
): value is ResellerMonthlySummary => {
    if (!isRecord(value) || !hasExactKeys(value, SUMMARY_KEYS)) return false;
    if (
        typeof value.month !== "string"
        || !MONTH_PATTERN.test(value.month)
        || !isIsoTimestamp(value.generatedAt)
        || typeof value.isPartial !== "boolean"
        || !isNonNegativeSafeInteger(value.invalidRowCount)
        || !Array.isArray(value.resellers)
        || value.resellers.length > 2000
        || !value.resellers.every(isSummaryRow)
        || !isRecord(value.totals)
        || !isSummaryCounters(value.totals, TOTAL_KEYS)
        || !isRecord(value.period)
        || !hasExactKeys(value.period, PERIOD_KEYS)
        || value.period.timeZone !== "Asia/Kolkata"
        || !isIsoTimestamp(value.period.start)
        || !isIsoTimestamp(value.period.end)
    ) {
        return false;
    }
    return Date.parse(value.period.start) < Date.parse(value.period.end);
};

export const projectResellerMonthlyTransaction = (
    value: unknown,
): AdmittedResellerMonthlyTransaction | null => {
    if (!isRecord(value)) return null;
    if (
        !isNonNegativeSafeInteger(value.amountExpected)
        || !isPositiveSafeInteger(value.storeId)
        || !isBoundedString(value.resellerId, 128)
        || !isBoundedString(value.resellerEmail, 320, true)
        || !isPaymentMode(value.paymentMode)
        || !isTransactionStatus(value.status)
    ) {
        return null;
    }
    const resellerProfileId = value.resellerProfileId;
    if (
        resellerProfileId !== undefined
        && resellerProfileId !== null
        && !isBoundedString(resellerProfileId, 128)
    ) {
        return null;
    }
    return {
        amountExpected: value.amountExpected,
        paymentMode: value.paymentMode,
        resellerEmail: value.resellerEmail,
        resellerId: value.resellerId,
        resellerProfileId: typeof resellerProfileId === "string" ? resellerProfileId : null,
        status: value.status,
        storeId: value.storeId,
    };
};
