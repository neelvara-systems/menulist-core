import assert from "node:assert/strict";
import { SIGNALDESK_PRODUCT_CODE } from "../../src/constants/signaldesk/product";
import {
    assertSignalDeskProviderBudgetState,
    buildSignalDeskDailyCostMutation,
    buildSignalDeskSpendMutation,
    budgetPolicyIdFor,
    getSignalDeskSpendPeriod,
    normalizeSignalDeskSpendPeriods,
    parseSignalDeskBudgetPolicyDocument,
    parseSignalDeskDailyCostDocument,
    parseSignalDeskProviderAccountDocument,
    providerAccountIdFor,
    settleSignalDeskSpendReservation,
} from "../../src/lib/signaldesk/accountingContracts";

const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });
const currentPeriod = getSignalDeskSpendPeriod("2026-07-15T10:30:00.000Z");

const costTimestamp = timestamp("2026-07-15T10:00:00.000Z");
const mutationTimestamp = timestamp("2026-07-15T11:00:00.000Z");
const canonicalDailyCost = {
    aiCostEstimate: 0.5,
    day: "2026-07-15",
    firestoreReadEstimate: 3,
    firestoreWriteEstimate: 4,
    pId: SIGNALDESK_PRODUCT_CODE,
    providerCostEstimate: 1.25,
    updatedAt: costTimestamp,
};
assert.deepEqual(parseSignalDeskDailyCostDocument(canonicalDailyCost, canonicalDailyCost.day), {
    ...canonicalDailyCost,
    updatedAt: "2026-07-15T10:00:00.000Z",
});
for (const invalid of [
    { pId: "ML" },
    { day: "2026-07-14" },
    { providerCostEstimate: -0.01 },
    { aiCostEstimate: Number.POSITIVE_INFINITY },
    { firestoreWriteEstimate: 1.5 },
    { privateNotes: "must-not-be-authority" },
]) {
    assert.throws(
        () => parseSignalDeskDailyCostDocument({ ...canonicalDailyCost, ...invalid }, canonicalDailyCost.day),
        /SIGNALDESK_DAILY_COST_SHAPE_INVALID/,
    );
}
assert.deepEqual(buildSignalDeskDailyCostMutation({
    current: canonicalDailyCost,
    day: canonicalDailyCost.day,
    delta: { aiCostEstimate: 0.25, firestoreWriteEstimate: 2, providerCostEstimate: 0.5 },
    updatedAt: mutationTimestamp,
}), {
    aiCostEstimate: 0.75,
    day: "2026-07-15",
    firestoreReadEstimate: 3,
    firestoreWriteEstimate: 6,
    pId: SIGNALDESK_PRODUCT_CODE,
    providerCostEstimate: 1.75,
    updatedAt: mutationTimestamp,
});
assert.deepEqual(buildSignalDeskDailyCostMutation({
    current: {
        firestoreWriteEstimate: 4,
        providerCostEstimate: 1.25,
        updatedAt: costTimestamp,
    },
    day: canonicalDailyCost.day,
    delta: { firestoreWriteEstimate: 1 },
    updatedAt: mutationTimestamp,
}), {
    aiCostEstimate: 0,
    day: "2026-07-15",
    firestoreReadEstimate: 0,
    firestoreWriteEstimate: 5,
    pId: SIGNALDESK_PRODUCT_CODE,
    providerCostEstimate: 1.25,
    updatedAt: mutationTimestamp,
});
for (const invalidCurrent of [
    { day: "2026-07-15", updatedAt: costTimestamp },
    { pId: SIGNALDESK_PRODUCT_CODE, updatedAt: costTimestamp },
    { foreign: true, updatedAt: costTimestamp },
]) {
    assert.throws(() => buildSignalDeskDailyCostMutation({
        current: invalidCurrent,
        day: canonicalDailyCost.day,
        delta: { firestoreWriteEstimate: 1 },
        updatedAt: costTimestamp,
    }), /SIGNALDESK_DAILY_COST_SHAPE_INVALID/);
}
for (const invalidDelta of [
    { firestoreWriteEstimate: -1 },
    { firestoreWriteEstimate: 0.5 },
    { aiCostEstimate: Number.NaN },
    { providerCostEstimate: -0.01 },
]) {
    assert.throws(() => buildSignalDeskDailyCostMutation({
        current: canonicalDailyCost,
        day: canonicalDailyCost.day,
        delta: invalidDelta,
        updatedAt: costTimestamp,
    }), /SIGNALDESK_DAILY_COST_DELTA_INVALID/);
}

assert.deepEqual(currentPeriod, { spendDayKey: "2026-07-15", spendMonthKey: "2026-07" });
assert.deepEqual(getSignalDeskSpendPeriod("2026-08-01T00:00:00.000Z"), {
    spendDayKey: "2026-08-01",
    spendMonthKey: "2026-08",
});
assert.throws(() => getSignalDeskSpendPeriod("not-a-date"), /SIGNALDESK_SPEND_PERIOD_INVALID/);

assert.deepEqual(normalizeSignalDeskSpendPeriods({
    spendDayKey: "2026-07-14",
    spendMonthKey: "2026-07",
    spentMonthUsd: 12,
    spentTodayUsd: 4,
}, currentPeriod), {
    ...currentPeriod,
    requiresMigration: true,
    spentMonthUsd: 12,
    spentTodayUsd: 0,
});

assert.deepEqual(normalizeSignalDeskSpendPeriods({
    spendDayKey: "2026-06-30",
    spendMonthKey: "2026-06",
    spentMonthUsd: 12,
    spentTodayUsd: 4,
}, currentPeriod), {
    ...currentPeriod,
    requiresMigration: true,
    spentMonthUsd: 0,
    spentTodayUsd: 0,
});

assert.deepEqual(normalizeSignalDeskSpendPeriods({
    spentMonthUsd: 12,
    spentTodayUsd: 4,
}, currentPeriod), {
    ...currentPeriod,
    requiresMigration: true,
    spentMonthUsd: 12,
    spentTodayUsd: 4,
});

for (const malformed of [
    { spendDayKey: "2026-07-15", spentMonthUsd: 1, spentTodayUsd: 1 },
    { spendDayKey: "2026-07-15", spendMonthKey: "2026-06", spentMonthUsd: 1, spentTodayUsd: 1 },
    { spendDayKey: "2026-7-15", spendMonthKey: "2026-07", spentMonthUsd: 1, spentTodayUsd: 1 },
    { spendDayKey: "2026-02-30", spendMonthKey: "2026-02", spentMonthUsd: 1, spentTodayUsd: 1 },
    { spendDayKey: "2026-13-01", spendMonthKey: "2026-13", spentMonthUsd: 1, spentTodayUsd: 1 },
]) {
    assert.throws(
        () => normalizeSignalDeskSpendPeriods(malformed, currentPeriod),
        /SIGNALDESK_SPEND_PERIOD_SHAPE_INVALID/,
    );
}

assert.throws(() => normalizeSignalDeskSpendPeriods({
    spendDayKey: "2026-07-16",
    spendMonthKey: "2026-07",
    spentMonthUsd: 12,
    spentTodayUsd: 4,
}, currentPeriod), /SIGNALDESK_SPEND_PERIOD_FUTURE/);
assert.throws(() => normalizeSignalDeskSpendPeriods({
    spendDayKey: "2026-08-01",
    spendMonthKey: "2026-08",
    spentMonthUsd: 12,
    spentTodayUsd: 4,
}, currentPeriod), /SIGNALDESK_SPEND_PERIOD_FUTURE/);

const providerAccountId = providerAccountIdFor("gemini", "ai");
const providerAccount = parseSignalDeskProviderAccountDocument({
    credentialState: "configured",
    dailyBudgetUsd: 5,
    monthlyBudgetUsd: 100,
    ownerApproved: true,
    pId: SIGNALDESK_PRODUCT_CODE,
    perRunBudgetUsd: 0.25,
    privateCredentialHint: "must-not-project",
    provider: "gemini",
    providerAccountId,
    spendDayKey: "2026-07-14",
    spendMonthKey: "2026-07",
    spentMonthUsd: 8,
    spentTodayUsd: 2,
    status: "approved",
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
    use: "ai",
}, providerAccountId, currentPeriod);
assert.equal(providerAccount.spentTodayUsd, 0);
assert.equal(providerAccount.spentMonthUsd, 8);
assert.equal(providerAccount.requiresMigration, true);
assert.equal("privateCredentialHint" in providerAccount, false);
assert.deepEqual(buildSignalDeskSpendMutation({
    amountUsd: 0.5,
    authority: providerAccount,
    currentPeriod,
    updatedAt: mutationTimestamp,
}), {
    ...currentPeriod,
    spentMonthUsd: 8.5,
    spentTodayUsd: 0.5,
    updatedAt: mutationTimestamp,
});
const reservedProviderAccount = {
    ...providerAccount,
    spendDayKey: currentPeriod.spendDayKey,
    spendMonthKey: currentPeriod.spendMonthKey,
    spentMonthUsd: 8.15,
    spentTodayUsd: 0.15,
};
assert.deepEqual(settleSignalDeskSpendReservation({
    actualAmountUsd: 0.1,
    authority: reservedProviderAccount,
    currentPeriod,
    reservation: { ...currentPeriod, reservedAmountUsd: 0.15 },
    updatedAt: mutationTimestamp,
}), {
    ...currentPeriod,
    spentMonthUsd: 8.1,
    spentTodayUsd: 0.1,
    updatedAt: mutationTimestamp,
});
const nextDayPeriod = getSignalDeskSpendPeriod("2026-07-16T00:01:00.000Z");
const nextDayTimestamp = timestamp("2026-07-16T00:01:00.000Z");
assert.deepEqual(settleSignalDeskSpendReservation({
    actualAmountUsd: 0.1,
    authority: {
        ...reservedProviderAccount,
        ...nextDayPeriod,
        spentMonthUsd: 8.15,
        spentTodayUsd: 0.2,
    },
    currentPeriod: nextDayPeriod,
    reservation: { ...currentPeriod, reservedAmountUsd: 0.15 },
    updatedAt: nextDayTimestamp,
}), {
    ...nextDayPeriod,
    spentMonthUsd: 8.1,
    spentTodayUsd: 0.3,
    updatedAt: nextDayTimestamp,
});
const nextMonthPeriod = getSignalDeskSpendPeriod("2026-08-01T00:01:00.000Z");
const nextMonthTimestamp = timestamp("2026-08-01T00:01:00.000Z");
assert.deepEqual(settleSignalDeskSpendReservation({
    actualAmountUsd: 0.1,
    authority: {
        ...reservedProviderAccount,
        ...nextMonthPeriod,
        spentMonthUsd: 0.4,
        spentTodayUsd: 0.4,
    },
    currentPeriod: nextMonthPeriod,
    reservation: { ...currentPeriod, reservedAmountUsd: 0.15 },
    updatedAt: nextMonthTimestamp,
}), {
    ...nextMonthPeriod,
    spentMonthUsd: 0.5,
    spentTodayUsd: 0.5,
    updatedAt: nextMonthTimestamp,
});
assert.throws(() => settleSignalDeskSpendReservation({
    actualAmountUsd: 0.16,
    authority: reservedProviderAccount,
    currentPeriod,
    reservation: { ...currentPeriod, reservedAmountUsd: 0.15 },
    updatedAt: mutationTimestamp,
}), /SIGNALDESK_SPEND_SETTLEMENT_INVALID/);
assert.throws(() => settleSignalDeskSpendReservation({
    actualAmountUsd: 0.1,
    authority: { ...reservedProviderAccount, spentTodayUsd: 0.14 },
    currentPeriod,
    reservation: { ...currentPeriod, reservedAmountUsd: 0.15 },
    updatedAt: mutationTimestamp,
}), /SIGNALDESK_SPEND_RESERVATION_MISSING/);
for (const amountUsd of [-0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => buildSignalDeskSpendMutation({
        amountUsd,
        authority: providerAccount,
        currentPeriod,
        updatedAt: mutationTimestamp,
    }), /SIGNALDESK_SPEND_MUTATION_INVALID/);
}

for (const invalid of [
    { pId: "ML" },
    { ownerApproved: "true" },
    { spentTodayUsd: -1 },
    { dailyBudgetUsd: "5" },
    { providerAccountId: "provider_gemini_discovery" },
]) {
    assert.throws(() => parseSignalDeskProviderAccountDocument({
        credentialState: "configured",
        dailyBudgetUsd: 5,
        monthlyBudgetUsd: 100,
        ownerApproved: true,
        pId: SIGNALDESK_PRODUCT_CODE,
        perRunBudgetUsd: 0.25,
        provider: "gemini",
        providerAccountId,
        spendDayKey: "2026-07-15",
        spendMonthKey: "2026-07",
        spentMonthUsd: 8,
        spentTodayUsd: 2,
        status: "approved",
        updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
        use: "ai",
        ...invalid,
    }, providerAccountId, currentPeriod));
}

const budgetPolicyId = budgetPolicyIdFor("provider", "gemini");
const budgetPolicy = parseSignalDeskBudgetPolicyDocument({
    budgetPolicyId,
    dailyBudgetUsd: 5,
    monthlyBudgetUsd: 100,
    name: "Gemini budget",
    pId: SIGNALDESK_PRODUCT_CODE,
    perRunBudgetUsd: 0.25,
    provider: "gemini",
    scope: "provider",
    scopeId: null,
    spendDayKey: "2026-07-15",
    spendMonthKey: "2026-07",
    spentMonthUsd: 8,
    spentTodayUsd: 2,
    status: "active",
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
}, budgetPolicyId, currentPeriod);
assert.equal(budgetPolicy.budgetPolicyId, budgetPolicyId);
assert.equal(budgetPolicy.requiresMigration, false);

assert.doesNotThrow(() => assertSignalDeskProviderBudgetState(providerAccount, budgetPolicy, {
    estimatedCostUsd: 0.2,
}));
assert.doesNotThrow(() => assertSignalDeskProviderBudgetState(providerAccount, budgetPolicy, {
    enforcePerRunBudget: false,
    estimatedCostUsd: 1,
}));
for (const estimatedCostUsd of [-0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
        () => assertSignalDeskProviderBudgetState(providerAccount, budgetPolicy, { estimatedCostUsd }),
        /SIGNALDESK_PROVIDER_COST_INVALID/,
    );
}
assert.throws(
    () => assertSignalDeskProviderBudgetState(null, budgetPolicy, { estimatedCostUsd: 0.1 }),
    /SIGNALDESK_PROVIDER_ACCOUNT_MISSING/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState({ ...providerAccount, ownerApproved: false }, budgetPolicy, { estimatedCostUsd: 0.1 }),
    /SIGNALDESK_PROVIDER_ACCOUNT_NOT_APPROVED/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState({ ...providerAccount, credentialState: "missing" }, budgetPolicy, { estimatedCostUsd: 0.1 }),
    /SIGNALDESK_PROVIDER_CREDENTIALS_MISSING/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState(providerAccount, budgetPolicy, { estimatedCostUsd: 0.3 }),
    /SIGNALDESK_PROVIDER_PER_RUN_BUDGET_EXCEEDED/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState({ ...providerAccount, spentTodayUsd: 4.9 }, budgetPolicy, {
        enforcePerRunBudget: false,
        estimatedCostUsd: 0.2,
    }),
    /SIGNALDESK_PROVIDER_DAILY_BUDGET_EXCEEDED/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState({ ...providerAccount, spentMonthUsd: 99.9 }, budgetPolicy, {
        enforcePerRunBudget: false,
        estimatedCostUsd: 0.2,
    }),
    /SIGNALDESK_PROVIDER_MONTHLY_BUDGET_EXCEEDED/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState(providerAccount, { ...budgetPolicy, status: "hold" }, { estimatedCostUsd: 0.1 }),
    /SIGNALDESK_PROVIDER_BUDGET_POLICY_INACTIVE/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState(providerAccount, {
        ...budgetPolicy,
        budgetPolicyId: "budget_provider_openai_default",
        provider: "openai",
    }, { estimatedCostUsd: 0.1 }),
    /SIGNALDESK_PROVIDER_BUDGET_POLICY_MISMATCH/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState(providerAccount, {
        ...budgetPolicy,
        spendDayKey: "2026-07-14",
    }, { estimatedCostUsd: 0.1 }),
    /SIGNALDESK_PROVIDER_BUDGET_POLICY_MISMATCH/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState(providerAccount, { ...budgetPolicy, spentTodayUsd: 4.9 }, {
        enforcePerRunBudget: false,
        estimatedCostUsd: 0.2,
    }),
    /SIGNALDESK_PROVIDER_POLICY_DAILY_BUDGET_EXCEEDED/,
);
assert.throws(
    () => assertSignalDeskProviderBudgetState(providerAccount, { ...budgetPolicy, spentMonthUsd: 99.9 }, {
        enforcePerRunBudget: false,
        estimatedCostUsd: 0.2,
    }),
    /SIGNALDESK_PROVIDER_POLICY_MONTHLY_BUDGET_EXCEEDED/,
);

assert.throws(() => parseSignalDeskBudgetPolicyDocument({
    ...budgetPolicy,
    provider: null,
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
}, budgetPolicyId, currentPeriod), /SIGNALDESK_BUDGET_POLICY_SCOPE_INVALID/);
assert.throws(() => budgetPolicyIdFor("global", null, "unexpected_scope"), /SIGNALDESK_BUDGET_POLICY_SCOPE_INVALID/);
assert.throws(() => budgetPolicyIdFor("trust-partner"), /SIGNALDESK_BUDGET_POLICY_SCOPE_INVALID/);
assert.throws(() => budgetPolicyIdFor("trust-partner", null, "bad/scope"), /SIGNALDESK_BUDGET_POLICY_SCOPE_INVALID/);
assert.equal(
    budgetPolicyIdFor("trust-partner", null, "first_partner_test"),
    "budget_trust-partner_all_first_partner_test",
);
assert.throws(() => parseSignalDeskBudgetPolicyDocument({
    ...budgetPolicy,
    budgetPolicyId: " budget_provider_gemini_default",
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
}, budgetPolicyId, currentPeriod), /SIGNALDESK_BUDGET_POLICY_SHAPE_INVALID/);
assert.throws(() => parseSignalDeskBudgetPolicyDocument({
    ...budgetPolicy,
    pId: "ML",
    updatedAt: timestamp("2026-07-15T10:00:00.000Z"),
}, budgetPolicyId, currentPeriod), /SIGNALDESK_BUDGET_POLICY_SHAPE_INVALID/);

console.log("SignalDesk accounting contracts passed");
