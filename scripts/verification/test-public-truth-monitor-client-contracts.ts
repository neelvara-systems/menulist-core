import assert from "node:assert/strict";
import {
    getPublicTruthMonitorClientCacheKey,
    getPublicTruthMonitorClientScope,
    parsePublicTruthMonitorClientData,
} from "../../src/lib/public-truth-tools/publicTruthMonitorClientContracts";

const scope = getPublicTruthMonitorClientScope("12", 34);
assert.deepEqual(scope, { storeId: "34", tenantId: "12" });
if (!scope) throw new Error("Expected valid test scope");
assert.deepEqual(
    getPublicTruthMonitorClientCacheKey(scope),
    ["publicTruthMonitorSummary", "12", "34"],
);
assert.equal(getPublicTruthMonitorClientScope(" 12", "34"), null);
assert.equal(getPublicTruthMonitorClientScope("01", "34"), null);
assert.equal(getPublicTruthMonitorClientScope(12.5, 34), null);

const sourceBoundary = {
    aiOrSearchChecked: false,
    externalPlatformMutation: false,
    externalSourcesFetched: false,
    publicRouteAdded: false,
    rankingPromise: false,
} as const;
const moduleSnapshot = {
    actionLabel: "Fix",
    evidenceText: "Evidence",
    fixHref: "/settings",
    id: "public_truth_basics",
    mobileFixTarget: "basic_settings",
    status: "ready",
    title: "Basics",
} as const;
const historyEntry = {
    generatedAt: "2026-07-26T10:00:00.000Z",
    id: "public_truth_12_34_20260726100000000Z",
    moduleSummaries: [moduleSnapshot],
    notCheckedFactCount: 0,
    publicLinks: {},
    readyModuleCount: 1,
    sourceBoundary,
    sourceSummary: {
        activeProjectCount: 1,
        domainState: "subdomain_live",
        externalSourcesFetched: false,
        projectDataChecked: true,
    },
    setupJobCount: 0,
    setupJobs: [],
    status: "ready",
    totalModuleCount: 1,
    unclearFactCount: 0,
    missingFactCount: 0,
} as const;
const payload = {
    data: {
        entitlement: {
            allowed: true,
            message: "Available",
            mode: "paid",
            reason: "allowed",
        },
        report: { attackerControlledRefreshOnlyField: true },
        summary: {
            cadence: "manual",
            history: [historyEntry],
            historyLimit: 6,
            latest: historyEntry,
            sId: "34",
            sourceBoundary,
            status: "ready",
            tId: "12",
            updatedAt: { seconds: 1 },
        },
    },
};

const parsed = parsePublicTruthMonitorClientData(payload, scope);
assert.equal(parsed.summary?.tId, "12");
assert.equal("report" in parsed, false);
assert.equal("updatedAt" in (parsed.summary || {}), false);

assert.throws(
    () => parsePublicTruthMonitorClientData({
        ...payload,
        data: {
            ...payload.data,
            summary: { ...payload.data.summary, tId: "99" },
        },
    }, scope),
    /scope mismatch/,
);
assert.throws(
    () => parsePublicTruthMonitorClientData({
        ...payload,
        data: {
            ...payload.data,
            summary: {
                ...payload.data.summary,
                history: [{ ...historyEntry, readyModuleCount: 2 }],
            },
        },
    }, scope),
    /ready module count exceeds total module count/,
);
assert.throws(
    () => parsePublicTruthMonitorClientData({
        data: {
            ...payload.data,
            entitlement: { ...payload.data.entitlement, allowed: "yes" },
        },
    }, scope),
);

console.log("Public Truth Monitor client contracts tests passed");
