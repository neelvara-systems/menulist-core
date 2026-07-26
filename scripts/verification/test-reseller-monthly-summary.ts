import assert from "node:assert/strict";
import {
    isResellerMonthlySummary,
    projectResellerMonthlyTransaction,
    type ResellerMonthlySummary,
} from "../../src/lib/reseller/resellerMonthlySummary";

const admitted = projectResellerMonthlyTransaction({
    amountExpected: 40000,
    paymentMode: "offline",
    resellerEmail: "reseller@example.com",
    resellerId: "actor-1",
    resellerProfileId: "profile-1",
    status: "active",
    storeId: 101,
});
assert.deepEqual(admitted, {
    amountExpected: 40000,
    paymentMode: "offline",
    resellerEmail: "reseller@example.com",
    resellerId: "actor-1",
    resellerProfileId: "profile-1",
    status: "active",
    storeId: 101,
});

for (const amountExpected of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "40000"]) {
    assert.equal(projectResellerMonthlyTransaction({
        amountExpected,
        paymentMode: "offline",
        resellerEmail: "reseller@example.com",
        resellerId: "actor-1",
        status: "active",
        storeId: 101,
    }), null);
}

const summary: ResellerMonthlySummary = {
    generatedAt: "2026-07-25T10:00:00.000Z",
    invalidRowCount: 1,
    isPartial: true,
    month: "2026-07",
    period: {
        end: "2026-07-31T18:30:00.000Z",
        start: "2026-06-30T18:30:00.000Z",
        timeZone: "Asia/Kolkata",
    },
    resellers: [{
        clientCount: 1,
        offlineCollectedPaise: 40000,
        onlineActivePaise: 0,
        onlinePendingPaise: 0,
        recognizedRevenuePaise: 40000,
        resellerEmail: "reseller@example.com",
        resellerId: "actor-1",
        resellerName: "Reseller",
        totalExpectedPaise: 40000,
        transactionCount: 1,
    }],
    totals: {
        clientCount: 1,
        offlineCollectedPaise: 40000,
        onlineActivePaise: 0,
        onlinePendingPaise: 0,
        recognizedRevenuePaise: 40000,
        totalExpectedPaise: 40000,
        transactionCount: 1,
    },
};
assert.equal(isResellerMonthlySummary(summary), true);
assert.equal(isResellerMonthlySummary({ ...summary, privateNotes: "no" }), false);
assert.equal(isResellerMonthlySummary({
    ...summary,
    totals: { ...summary.totals, totalExpectedPaise: Number.NaN },
}), false);
assert.equal(isResellerMonthlySummary({
    ...summary,
    period: { ...summary.period, end: summary.period.start },
}), false);

console.log("Reseller monthly-summary boundary tests passed.");
