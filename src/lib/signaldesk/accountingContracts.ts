import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import type {
    SignalDeskBudgetScope,
    SignalDeskControlStatus,
    SignalDeskProviderId,
    SignalDeskProviderStatus,
    SignalDeskProviderUse,
} from "@type/signaldesk";
import { z } from "zod";

const MAX_BUDGET_USD = 10_000_000;
const MAX_RECORDED_SPEND_USD = 1_000_000_000;
const MAX_DAILY_OPERATION_COUNT = 100_000_000;
const UTC_DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const UTC_MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const CANONICAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const USD_PRECISION_FACTOR = 1_000_000;

const normalizeUsdAmount = (value: number) => Math.round(value * USD_PRECISION_FACTOR) / USD_PRECISION_FACTOR;

const providerIds = [
    "google-places",
    "foursquare",
    "apify",
    "fhrs-fhis",
    "manual",
    "owned-email",
    "apollo",
    "hunter",
    "zerobounce",
    "firecrawl",
    "tavily",
    "exa",
    "postmark",
    "resend",
    "smartlead",
    "instantly",
    "lemlist",
    "gemini",
    "openai",
    "anthropic",
] as const satisfies readonly SignalDeskProviderId[];

const providerUses = [
    "discovery",
    "enrichment",
    "verification",
    "research",
    "sender",
    "sequencer",
    "ai",
] as const satisfies readonly SignalDeskProviderUse[];

const providerStatuses = [
    "approved",
    "blocked",
    "evaluation",
    "disabled",
] as const satisfies readonly SignalDeskProviderStatus[];

const budgetScopes = [
    "global",
    "provider",
    "market-pod",
    "model-route",
    "sequencer",
    "trust-partner",
] as const satisfies readonly SignalDeskBudgetScope[];

const budgetStatuses = [
    "active",
    "inactive",
    "hold",
    "blocked",
] as const satisfies readonly SignalDeskControlStatus[];

const boundedBudget = z.number().finite().min(0).max(MAX_BUDGET_USD);
const boundedSpend = z.number().finite().min(0).max(MAX_RECORDED_SPEND_USD);
const boundedIdentifier = z.string().min(1).max(180).refine((value) => (
    value === value.trim() && CANONICAL_ID.test(value)
));

const isCanonicalDayKey = (value: string) => {
    if (!UTC_DAY_KEY.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const assertCanonicalSpendPeriod = (period: SignalDeskSpendPeriod) => {
    if (
        !isCanonicalDayKey(period.spendDayKey)
        || !UTC_MONTH_KEY.test(period.spendMonthKey)
        || period.spendDayKey.slice(0, 7) !== period.spendMonthKey
    ) throw new Error("SIGNALDESK_SPEND_PERIOD_SHAPE_INVALID");
};

const timestampToIso = (value: unknown): string | null => {
    if (typeof value !== "object" || value === null || !("toDate" in value) || typeof value.toDate !== "function") {
        return null;
    }
    try {
        const date = value.toDate();
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

export type SignalDeskSpendPeriod = {
    spendDayKey: string;
    spendMonthKey: string;
};

export type SignalDeskDailyCostAuthority = {
    aiCostEstimate: number;
    day: string;
    firestoreReadEstimate: number;
    firestoreWriteEstimate: number;
    pId: typeof SIGNALDESK_PRODUCT_CODE;
    providerCostEstimate: number;
    updatedAt: string;
};

export type SignalDeskDailyCostDelta = Partial<Pick<
    SignalDeskDailyCostAuthority,
    "aiCostEstimate" | "firestoreReadEstimate" | "firestoreWriteEstimate" | "providerCostEstimate"
>>;

export type SignalDeskDailyCostMutation = Omit<SignalDeskDailyCostAuthority, "updatedAt"> & {
    updatedAt: unknown;
};

export type SignalDeskNormalizedSpend = SignalDeskSpendPeriod & {
    requiresMigration: boolean;
    spentMonthUsd: number;
    spentTodayUsd: number;
};

export type SignalDeskSpendMutation = SignalDeskSpendPeriod & {
    spentMonthUsd: number;
    spentTodayUsd: number;
    updatedAt: unknown;
};

export type SignalDeskSpendReservation = SignalDeskSpendPeriod & {
    reservedAmountUsd: number;
};

export type SignalDeskProviderBudgetGate = {
    enforcePerRunBudget?: boolean;
    estimatedCostUsd: number;
};

export type SignalDeskProviderAccountAuthority = SignalDeskNormalizedSpend & {
    credentialState: "missing" | "configured" | "not_required";
    dailyBudgetUsd: number;
    disabledReason: string | null;
    monthlyBudgetUsd: number;
    ownerApproved: boolean;
    pId: typeof SIGNALDESK_PRODUCT_CODE;
    perRunBudgetUsd: number;
    provider: SignalDeskProviderId;
    providerAccountId: string;
    status: SignalDeskProviderStatus;
    updatedAt: string;
    use: SignalDeskProviderUse;
};

export type SignalDeskBudgetPolicyAuthority = SignalDeskNormalizedSpend & {
    budgetPolicyId: string;
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    name: string;
    pId: typeof SIGNALDESK_PRODUCT_CODE;
    perRunBudgetUsd: number;
    provider: SignalDeskProviderId | null;
    scope: SignalDeskBudgetScope;
    scopeId: string | null;
    status: SignalDeskControlStatus;
    updatedAt: string;
};

export const getSignalDeskSpendPeriod = (value: Date | number | string = new Date()): SignalDeskSpendPeriod => {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error("SIGNALDESK_SPEND_PERIOD_INVALID");
    const spendDayKey = date.toISOString().slice(0, 10);
    return {
        spendDayKey,
        spendMonthKey: spendDayKey.slice(0, 7),
    };
};

const DAILY_COST_VALUE_FIELDS = [
    "aiCostEstimate",
    "firestoreReadEstimate",
    "firestoreWriteEstimate",
    "providerCostEstimate",
] as const;

const DAILY_COST_LEGACY_FIELDS = new Set([
    ...DAILY_COST_VALUE_FIELDS,
    "updatedAt",
]);

const DAILY_COST_FIELDS = new Set([
    ...Array.from(DAILY_COST_LEGACY_FIELDS),
    "day",
    "pId",
]);

const readDailyCostValue = (
    data: Record<string, unknown>,
    field: typeof DAILY_COST_VALUE_FIELDS[number],
): number => {
    if (!Object.prototype.hasOwnProperty.call(data, field)) return 0;
    const value = data[field];
    const valid = field === "firestoreReadEstimate" || field === "firestoreWriteEstimate"
        ? Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= MAX_DAILY_OPERATION_COUNT
        : typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_RECORDED_SPEND_USD;
    if (!valid) throw new Error("SIGNALDESK_DAILY_COST_SHAPE_INVALID");
    return value as number;
};

const parseDailyCostValues = (data: Record<string, unknown>) => ({
    aiCostEstimate: readDailyCostValue(data, "aiCostEstimate"),
    firestoreReadEstimate: readDailyCostValue(data, "firestoreReadEstimate"),
    firestoreWriteEstimate: readDailyCostValue(data, "firestoreWriteEstimate"),
    providerCostEstimate: readDailyCostValue(data, "providerCostEstimate"),
});

export const parseSignalDeskDailyCostDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskDailyCostAuthority => {
    if (
        typeof raw !== "object"
        || raw === null
        || Array.isArray(raw)
        || !isCanonicalDayKey(documentId)
    ) throw new Error("SIGNALDESK_DAILY_COST_SHAPE_INVALID");
    const data = raw as Record<string, unknown>;
    if (
        data.pId !== SIGNALDESK_PRODUCT_CODE
        || data.day !== documentId
        || Object.keys(data).some((key) => !DAILY_COST_FIELDS.has(key))
    ) throw new Error("SIGNALDESK_DAILY_COST_SHAPE_INVALID");
    const updatedAt = timestampToIso(data.updatedAt);
    if (!updatedAt) throw new Error("SIGNALDESK_DAILY_COST_SHAPE_INVALID");
    return {
        ...parseDailyCostValues(data),
        day: documentId,
        pId: SIGNALDESK_PRODUCT_CODE,
        updatedAt,
    };
};

const parseSignalDeskLegacyDailyCostDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskDailyCostAuthority => {
    if (
        typeof raw !== "object"
        || raw === null
        || Array.isArray(raw)
        || !isCanonicalDayKey(documentId)
    ) throw new Error("SIGNALDESK_DAILY_COST_SHAPE_INVALID");
    const data = raw as Record<string, unknown>;
    if (
        Object.prototype.hasOwnProperty.call(data, "pId")
        || Object.prototype.hasOwnProperty.call(data, "day")
        || Object.keys(data).some((key) => !DAILY_COST_LEGACY_FIELDS.has(key))
    ) throw new Error("SIGNALDESK_DAILY_COST_SHAPE_INVALID");
    const updatedAt = timestampToIso(data.updatedAt);
    if (!updatedAt) throw new Error("SIGNALDESK_DAILY_COST_SHAPE_INVALID");
    return {
        ...parseDailyCostValues(data),
        day: documentId,
        pId: SIGNALDESK_PRODUCT_CODE,
        updatedAt,
    };
};

const readDailyCostDelta = (
    delta: SignalDeskDailyCostDelta,
    field: typeof DAILY_COST_VALUE_FIELDS[number],
): number => {
    const value = delta[field] ?? 0;
    const valid = field === "firestoreReadEstimate" || field === "firestoreWriteEstimate"
        ? Number.isSafeInteger(value) && value >= 0 && value <= MAX_DAILY_OPERATION_COUNT
        : typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_RECORDED_SPEND_USD;
    if (!valid) throw new Error("SIGNALDESK_DAILY_COST_DELTA_INVALID");
    return value;
};

export const buildSignalDeskDailyCostMutation = (params: {
    current: unknown | null;
    day: string;
    delta: SignalDeskDailyCostDelta;
    updatedAt: unknown;
}): SignalDeskDailyCostMutation => {
    if (!isCanonicalDayKey(params.day) || !timestampToIso(params.updatedAt)) {
        throw new Error("SIGNALDESK_DAILY_COST_MUTATION_INVALID");
    }
    let current: SignalDeskDailyCostAuthority;
    if (params.current === null) {
        current = {
            aiCostEstimate: 0,
            day: params.day,
            firestoreReadEstimate: 0,
            firestoreWriteEstimate: 0,
            pId: SIGNALDESK_PRODUCT_CODE,
            providerCostEstimate: 0,
            updatedAt: timestampToIso(params.updatedAt)!,
        };
    } else {
        try {
            current = parseSignalDeskDailyCostDocument(params.current, params.day);
        } catch {
            current = parseSignalDeskLegacyDailyCostDocument(params.current, params.day);
        }
    }
    const nextValues = Object.fromEntries(DAILY_COST_VALUE_FIELDS.map((field) => {
        const next = current[field] + readDailyCostDelta(params.delta, field);
        const maximum = field === "firestoreReadEstimate" || field === "firestoreWriteEstimate"
            ? MAX_DAILY_OPERATION_COUNT
            : MAX_RECORDED_SPEND_USD;
        if (!Number.isFinite(next) || next > maximum) throw new Error("SIGNALDESK_DAILY_COST_OVERFLOW");
        return [field, next];
    })) as Pick<SignalDeskDailyCostAuthority, typeof DAILY_COST_VALUE_FIELDS[number]>;
    return {
        ...nextValues,
        day: params.day,
        pId: SIGNALDESK_PRODUCT_CODE,
        updatedAt: params.updatedAt,
    };
};

export const providerAccountIdFor = (provider: SignalDeskProviderId, use: SignalDeskProviderUse): string => {
    if (!providerIds.includes(provider) || !providerUses.includes(use)) {
        throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_ID_INPUT_INVALID");
    }
    return `provider_${provider}_${use}`;
};

export const budgetPolicyIdFor = (
    scope: SignalDeskBudgetScope,
    provider?: SignalDeskProviderId | null,
    scopeId?: string | null,
): string => {
    const normalizedProvider = provider || null;
    const normalizedScopeId = scopeId || null;
    const isProviderScope = scope === "provider";
    const isGlobalScope = scope === "global";
    const isNamedScope = budgetScopes.includes(scope) && !isProviderScope && !isGlobalScope;
    if (
        !budgetScopes.includes(scope)
        || (isProviderScope && (!normalizedProvider || normalizedScopeId))
        || (isGlobalScope && (normalizedProvider || normalizedScopeId))
        || (isNamedScope && (normalizedProvider || !normalizedScopeId))
        || (normalizedProvider && !providerIds.includes(normalizedProvider))
        || (normalizedScopeId && (
            normalizedScopeId.length > 180
            || normalizedScopeId !== normalizedScopeId.trim()
            || !CANONICAL_ID.test(normalizedScopeId)
        ))
    ) throw new Error("SIGNALDESK_BUDGET_POLICY_SCOPE_INVALID");
    return ["budget", scope, normalizedProvider || "all", normalizedScopeId || "default"].join("_");
};

export const normalizeSignalDeskSpendPeriods = (
    input: {
        spendDayKey?: unknown;
        spendMonthKey?: unknown;
        spentMonthUsd: number;
        spentTodayUsd: number;
    },
    currentPeriod: SignalDeskSpendPeriod = getSignalDeskSpendPeriod(),
): SignalDeskNormalizedSpend => {
    assertCanonicalSpendPeriod(currentPeriod);
    const dayKey = input.spendDayKey;
    const monthKey = input.spendMonthKey;
    const legacy = dayKey === undefined && monthKey === undefined;
    if (!legacy && (typeof dayKey !== "string" || typeof monthKey !== "string")) {
        throw new Error("SIGNALDESK_SPEND_PERIOD_SHAPE_INVALID");
    }
    if (!legacy && (
        !isCanonicalDayKey(dayKey as string)
        || !UTC_MONTH_KEY.test(monthKey as string)
        || (dayKey as string).slice(0, 7) !== monthKey
    )) {
        throw new Error("SIGNALDESK_SPEND_PERIOD_SHAPE_INVALID");
    }

    // Existing rows predate period keys. Carry their counters into the current
    // period once, conservatively, so migration cannot create fresh headroom.
    if (legacy) {
        return {
            ...currentPeriod,
            requiresMigration: true,
            spentMonthUsd: input.spentMonthUsd,
            spentTodayUsd: input.spentTodayUsd,
        };
    }

    if ((monthKey as string) > currentPeriod.spendMonthKey || (dayKey as string) > currentPeriod.spendDayKey) {
        throw new Error("SIGNALDESK_SPEND_PERIOD_FUTURE");
    }

    return {
        ...currentPeriod,
        requiresMigration: dayKey !== currentPeriod.spendDayKey || monthKey !== currentPeriod.spendMonthKey,
        spentMonthUsd: monthKey === currentPeriod.spendMonthKey ? input.spentMonthUsd : 0,
        spentTodayUsd: dayKey === currentPeriod.spendDayKey ? input.spentTodayUsd : 0,
    };
};

export const buildSignalDeskSpendMutation = (params: {
    amountUsd: number;
    authority: SignalDeskNormalizedSpend;
    currentPeriod: SignalDeskSpendPeriod;
    updatedAt: unknown;
}): SignalDeskSpendMutation => {
    assertCanonicalSpendPeriod(params.currentPeriod);
    if (
        params.authority.spendDayKey !== params.currentPeriod.spendDayKey
        || params.authority.spendMonthKey !== params.currentPeriod.spendMonthKey
        || typeof params.amountUsd !== "number"
        || !Number.isFinite(params.amountUsd)
        || params.amountUsd < 0
        || params.amountUsd > MAX_RECORDED_SPEND_USD
        || !timestampToIso(params.updatedAt)
    ) throw new Error("SIGNALDESK_SPEND_MUTATION_INVALID");
    const spentTodayUsd = normalizeUsdAmount(params.authority.spentTodayUsd + params.amountUsd);
    const spentMonthUsd = normalizeUsdAmount(params.authority.spentMonthUsd + params.amountUsd);
    if (
        !Number.isFinite(spentTodayUsd)
        || !Number.isFinite(spentMonthUsd)
        || spentTodayUsd > MAX_RECORDED_SPEND_USD
        || spentMonthUsd > MAX_RECORDED_SPEND_USD
    ) throw new Error("SIGNALDESK_SPEND_MUTATION_OVERFLOW");
    return {
        ...params.currentPeriod,
        spentMonthUsd,
        spentTodayUsd,
        updatedAt: params.updatedAt,
};
};

export const settleSignalDeskSpendReservation = (params: {
    actualAmountUsd: number;
    authority: SignalDeskNormalizedSpend;
    currentPeriod: SignalDeskSpendPeriod;
    reservation: SignalDeskSpendReservation;
    updatedAt: unknown;
}): SignalDeskSpendMutation => {
    assertCanonicalSpendPeriod(params.currentPeriod);
    assertCanonicalSpendPeriod(params.reservation);
    if (
        params.authority.spendDayKey !== params.currentPeriod.spendDayKey
        || params.authority.spendMonthKey !== params.currentPeriod.spendMonthKey
        || typeof params.actualAmountUsd !== "number"
        || !Number.isFinite(params.actualAmountUsd)
        || params.actualAmountUsd < 0
        || typeof params.reservation.reservedAmountUsd !== "number"
        || !Number.isFinite(params.reservation.reservedAmountUsd)
        || params.reservation.reservedAmountUsd < 0
        || params.actualAmountUsd > params.reservation.reservedAmountUsd
        || params.reservation.reservedAmountUsd > MAX_RECORDED_SPEND_USD
        || !timestampToIso(params.updatedAt)
    ) throw new Error("SIGNALDESK_SPEND_SETTLEMENT_INVALID");

    const sameDay = params.reservation.spendDayKey === params.currentPeriod.spendDayKey;
    const sameMonth = params.reservation.spendMonthKey === params.currentPeriod.spendMonthKey;
    if (
        (sameDay && params.authority.spentTodayUsd < params.reservation.reservedAmountUsd)
        || (sameMonth && params.authority.spentMonthUsd < params.reservation.reservedAmountUsd)
    ) throw new Error("SIGNALDESK_SPEND_RESERVATION_MISSING");

    // A reservation belongs to the period in which it was admitted. If the
    // operation settles after a UTC boundary, the old-period reservation is
    // left conservative and the actual cost is charged to the new period.
    const spentTodayUsd = normalizeUsdAmount(params.authority.spentTodayUsd
        - (sameDay ? params.reservation.reservedAmountUsd : 0)
        + params.actualAmountUsd);
    const spentMonthUsd = normalizeUsdAmount(params.authority.spentMonthUsd
        - (sameMonth ? params.reservation.reservedAmountUsd : 0)
        + params.actualAmountUsd);
    if (
        !Number.isFinite(spentTodayUsd)
        || !Number.isFinite(spentMonthUsd)
        || spentTodayUsd < 0
        || spentMonthUsd < 0
        || spentTodayUsd > MAX_RECORDED_SPEND_USD
        || spentMonthUsd > MAX_RECORDED_SPEND_USD
    ) throw new Error("SIGNALDESK_SPEND_SETTLEMENT_OVERFLOW");
    return {
        ...params.currentPeriod,
        spentMonthUsd,
        spentTodayUsd,
        updatedAt: params.updatedAt,
    };
};

export const assertSignalDeskProviderBudgetState = (
    account: SignalDeskProviderAccountAuthority | null,
    providerBudget: SignalDeskBudgetPolicyAuthority | null,
    params: SignalDeskProviderBudgetGate,
): void => {
    if (
        typeof params.estimatedCostUsd !== "number"
        || !Number.isFinite(params.estimatedCostUsd)
        || params.estimatedCostUsd < 0
        || params.estimatedCostUsd > MAX_RECORDED_SPEND_USD
    ) throw new Error("SIGNALDESK_PROVIDER_COST_INVALID");
    if (!account) throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_MISSING");
    if (!account.ownerApproved || account.status === "blocked" || account.status === "disabled") {
        throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_NOT_APPROVED");
    }
    if (account.credentialState === "missing") {
        throw new Error("SIGNALDESK_PROVIDER_CREDENTIALS_MISSING");
    }
    const enforcePerRunBudget = params.enforcePerRunBudget !== false;
    if (enforcePerRunBudget && params.estimatedCostUsd > account.perRunBudgetUsd) {
        throw new Error("SIGNALDESK_PROVIDER_PER_RUN_BUDGET_EXCEEDED");
    }
    if (account.spentTodayUsd + params.estimatedCostUsd > account.dailyBudgetUsd) {
        throw new Error("SIGNALDESK_PROVIDER_DAILY_BUDGET_EXCEEDED");
    }
    if (account.spentMonthUsd + params.estimatedCostUsd > account.monthlyBudgetUsd) {
        throw new Error("SIGNALDESK_PROVIDER_MONTHLY_BUDGET_EXCEEDED");
    }
    if (!providerBudget) return;
    if (
        providerBudget.scope !== "provider"
        || providerBudget.provider !== account.provider
        || providerBudget.scopeId !== null
        || providerBudget.spendDayKey !== account.spendDayKey
        || providerBudget.spendMonthKey !== account.spendMonthKey
    ) throw new Error("SIGNALDESK_PROVIDER_BUDGET_POLICY_MISMATCH");
    if (providerBudget.status !== "active") {
        throw new Error("SIGNALDESK_PROVIDER_BUDGET_POLICY_INACTIVE");
    }
    if (enforcePerRunBudget && params.estimatedCostUsd > providerBudget.perRunBudgetUsd) {
        throw new Error("SIGNALDESK_PROVIDER_POLICY_PER_RUN_BUDGET_EXCEEDED");
    }
    if (providerBudget.spentTodayUsd + params.estimatedCostUsd > providerBudget.dailyBudgetUsd) {
        throw new Error("SIGNALDESK_PROVIDER_POLICY_DAILY_BUDGET_EXCEEDED");
    }
    if (providerBudget.spentMonthUsd + params.estimatedCostUsd > providerBudget.monthlyBudgetUsd) {
        throw new Error("SIGNALDESK_PROVIDER_POLICY_MONTHLY_BUDGET_EXCEEDED");
    }
};

const providerAccountSchema = z.object({
    credentialState: z.enum(["missing", "configured", "not_required"]),
    dailyBudgetUsd: boundedBudget,
    disabledReason: z.string().trim().max(500).nullable().optional(),
    monthlyBudgetUsd: boundedBudget,
    ownerApproved: z.boolean(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    perRunBudgetUsd: boundedBudget,
    provider: z.enum(providerIds),
    providerAccountId: boundedIdentifier,
    spendDayKey: z.string().optional(),
    spendMonthKey: z.string().optional(),
    spentMonthUsd: boundedSpend,
    spentTodayUsd: boundedSpend,
    status: z.enum(providerStatuses),
    updatedAt: z.unknown(),
    use: z.enum(providerUses),
}).passthrough();

export const parseSignalDeskProviderAccountDocument = (
    raw: unknown,
    documentId: string,
    currentPeriod: SignalDeskSpendPeriod = getSignalDeskSpendPeriod(),
): SignalDeskProviderAccountAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_SHAPE_INVALID");
    }
    const parsed = providerAccountSchema.safeParse(raw);
    if (!parsed.success) throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_SHAPE_INVALID");
    const expectedId = providerAccountIdFor(parsed.data.provider, parsed.data.use);
    if (documentId !== expectedId || parsed.data.providerAccountId !== documentId) {
        throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_IDENTITY_MISMATCH");
    }
    if (
        parsed.data.perRunBudgetUsd > parsed.data.dailyBudgetUsd
        || parsed.data.dailyBudgetUsd > parsed.data.monthlyBudgetUsd
    ) throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_BUDGET_INVALID");
    const updatedAt = timestampToIso(parsed.data.updatedAt);
    if (!updatedAt) throw new Error("SIGNALDESK_PROVIDER_ACCOUNT_SHAPE_INVALID");
    const normalizedSpend = normalizeSignalDeskSpendPeriods({
        spendDayKey: parsed.data.spendDayKey,
        spendMonthKey: parsed.data.spendMonthKey,
        spentMonthUsd: parsed.data.spentMonthUsd,
        spentTodayUsd: parsed.data.spentTodayUsd,
    }, currentPeriod);
    return {
        ...normalizedSpend,
        credentialState: parsed.data.credentialState,
        dailyBudgetUsd: parsed.data.dailyBudgetUsd,
        disabledReason: parsed.data.disabledReason || null,
        monthlyBudgetUsd: parsed.data.monthlyBudgetUsd,
        ownerApproved: parsed.data.ownerApproved,
        pId: SIGNALDESK_PRODUCT_CODE,
        perRunBudgetUsd: parsed.data.perRunBudgetUsd,
        provider: parsed.data.provider,
        providerAccountId: parsed.data.providerAccountId,
        status: parsed.data.status,
        updatedAt,
        use: parsed.data.use,
    };
};

const budgetPolicySchema = z.object({
    budgetPolicyId: boundedIdentifier,
    dailyBudgetUsd: boundedBudget,
    monthlyBudgetUsd: boundedBudget,
    name: z.string().trim().min(1).max(180),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    perRunBudgetUsd: boundedBudget,
    provider: z.enum(providerIds).nullable().optional(),
    scope: z.enum(budgetScopes),
    scopeId: boundedIdentifier.nullable().optional(),
    spendDayKey: z.string().optional(),
    spendMonthKey: z.string().optional(),
    spentMonthUsd: boundedSpend,
    spentTodayUsd: boundedSpend,
    status: z.enum(budgetStatuses),
    updatedAt: z.unknown(),
}).passthrough();

export const parseSignalDeskBudgetPolicyDocument = (
    raw: unknown,
    documentId: string,
    currentPeriod: SignalDeskSpendPeriod = getSignalDeskSpendPeriod(),
): SignalDeskBudgetPolicyAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error("SIGNALDESK_BUDGET_POLICY_SHAPE_INVALID");
    }
    const parsed = budgetPolicySchema.safeParse(raw);
    if (!parsed.success) throw new Error("SIGNALDESK_BUDGET_POLICY_SHAPE_INVALID");
    const provider = parsed.data.provider || null;
    const scopeId = parsed.data.scopeId || null;
    const expectedId = budgetPolicyIdFor(parsed.data.scope, provider, scopeId);
    if (documentId !== expectedId || parsed.data.budgetPolicyId !== documentId) {
        throw new Error("SIGNALDESK_BUDGET_POLICY_IDENTITY_MISMATCH");
    }
    if (
        parsed.data.perRunBudgetUsd > parsed.data.dailyBudgetUsd
        || parsed.data.dailyBudgetUsd > parsed.data.monthlyBudgetUsd
    ) throw new Error("SIGNALDESK_BUDGET_POLICY_BUDGET_INVALID");
    const updatedAt = timestampToIso(parsed.data.updatedAt);
    if (!updatedAt) throw new Error("SIGNALDESK_BUDGET_POLICY_SHAPE_INVALID");
    const normalizedSpend = normalizeSignalDeskSpendPeriods({
        spendDayKey: parsed.data.spendDayKey,
        spendMonthKey: parsed.data.spendMonthKey,
        spentMonthUsd: parsed.data.spentMonthUsd,
        spentTodayUsd: parsed.data.spentTodayUsd,
    }, currentPeriod);
    return {
        ...normalizedSpend,
        budgetPolicyId: parsed.data.budgetPolicyId,
        dailyBudgetUsd: parsed.data.dailyBudgetUsd,
        monthlyBudgetUsd: parsed.data.monthlyBudgetUsd,
        name: parsed.data.name,
        pId: SIGNALDESK_PRODUCT_CODE,
        perRunBudgetUsd: parsed.data.perRunBudgetUsd,
        provider,
        scope: parsed.data.scope,
        scopeId,
        status: parsed.data.status,
        updatedAt,
    };
};
