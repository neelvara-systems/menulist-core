import assert from "node:assert/strict";
import { SIGNALDESK_PRODUCT_CODE } from "../../src/constants/signaldesk/product";
import {
    assertSignalDeskDemandSignalSummaryMatchesEvent,
    getSignalDeskDemandSignalEventDay,
    parseSignalDeskDemandSignalClaimDocument,
    parseSignalDeskDemandSignalEventDocument,
    parseSignalDeskDemandSignalSummaryDocument,
} from "../../src/lib/signaldesk/demandSignalContracts";

const eventId = `demand_${"a".repeat(32)}`;
const eventFixture = (createdAt: unknown) => ({
    createdAt,
    createdBy: "founder_admin",
    demandSignalId: eventId,
    pId: SIGNALDESK_PRODUCT_CODE,
    signalType: "claim_attempt" as const,
    sourceSurface: "manual" as const,
    targetId: "target_001",
    targetName: "Example Restaurant",
});
const summaryId = "2026-07-28_claim_attempt_manual_target_001";
const summaryFixture = (updatedAt: unknown) => ({
    count: 1,
    day: "2026-07-28",
    demandSignalId: summaryId,
    pId: SIGNALDESK_PRODUCT_CODE,
    signalType: "claim_attempt" as const,
    sourceSurface: "manual" as const,
    targetId: "target_001",
    targetName: "Example Restaurant",
    updatedAt,
});
const claimFixture = (updatedAt: unknown) => ({
    actorId: "founder_admin",
    entityId: eventId,
    operation: "demand_signal_capture" as const,
    pId: SIGNALDESK_PRODUCT_CODE,
    requestFingerprintHash: "b".repeat(64),
    updatedAt,
});
const validTimestamp = {
    toMillis: () => Date.parse("2026-07-28T12:00:00.000Z"),
};

const assertContractError = (expectedCode: string, operation: () => unknown) => {
    assert.throws(operation, (error: unknown) => (
        error instanceof Error && error.message === expectedCode
    ));
};

const event = parseSignalDeskDemandSignalEventDocument(eventFixture(validTimestamp), eventId);
const summary = parseSignalDeskDemandSignalSummaryDocument(summaryFixture(validTimestamp), summaryId);
parseSignalDeskDemandSignalClaimDocument(claimFixture(validTimestamp));
assert.equal(getSignalDeskDemandSignalEventDay(event), "2026-07-28");
assert.doesNotThrow(() => assertSignalDeskDemandSignalSummaryMatchesEvent(summary, event));
assertContractError(
    "DEMAND_SIGNAL_EVENT_INVALID",
    () => parseSignalDeskDemandSignalEventDocument({
        ...eventFixture(validTimestamp),
        targetId: "targets/target_001",
    }, eventId),
);
assertContractError(
    "DEMAND_SIGNAL_SUMMARY_INVALID",
    () => parseSignalDeskDemandSignalSummaryDocument({
        ...summaryFixture(validTimestamp),
        targetId: " target_001",
    }, summaryId),
);
assertContractError(
    "DEMAND_SIGNAL_CLAIM_INVALID",
    () => parseSignalDeskDemandSignalClaimDocument({
        ...claimFixture(validTimestamp),
        actorId: " founder_admin",
    }),
);

const invalidTimestamps: readonly unknown[] = [
    null,
    {},
    { toMillis: 1 },
    { toMillis: () => Number.NaN },
    { toMillis: () => Number.POSITIVE_INFINITY },
    { toMillis: () => 8.65e15 },
    { toMillis: () => { throw new Error("hostile timestamp"); } },
    Object.defineProperty({}, "toMillis", {
        get() {
            throw new Error("hostile getter");
        },
    }),
    new Proxy({}, {
        get() {
            throw new Error("hostile proxy");
        },
    }),
];

for (const invalidTimestamp of invalidTimestamps) {
    assertContractError(
        "DEMAND_SIGNAL_EVENT_INVALID",
        () => parseSignalDeskDemandSignalEventDocument(eventFixture(invalidTimestamp), eventId),
    );
    assertContractError(
        "DEMAND_SIGNAL_SUMMARY_INVALID",
        () => parseSignalDeskDemandSignalSummaryDocument(summaryFixture(invalidTimestamp), summaryId),
    );
    assertContractError(
        "DEMAND_SIGNAL_CLAIM_INVALID",
        () => parseSignalDeskDemandSignalClaimDocument(claimFixture(invalidTimestamp)),
    );
}

assertContractError(
    "DEMAND_SIGNAL_EVENT_INVALID",
    () => parseSignalDeskDemandSignalEventDocument(new Proxy({}, {
        get() {
            throw new Error("hostile document");
        },
        ownKeys() {
            throw new Error("hostile document");
        },
    }), eventId),
);

const mutableTimestamp = {
    current: Date.parse("2026-07-28T12:00:00.000Z"),
    toMillis() {
        return this.current;
    },
};
const mutableEvent = parseSignalDeskDemandSignalEventDocument(eventFixture(mutableTimestamp), eventId);
mutableTimestamp.current = Number.NaN;
assertContractError("DEMAND_SIGNAL_EVENT_INVALID", () => getSignalDeskDemandSignalEventDay(mutableEvent));

console.log("SignalDesk demand-signal contract boundary tests passed.");
