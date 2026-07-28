import assert from "node:assert/strict";
import {
    normalizeAnswerlatticeOwnerAssistantCount,
    normalizeAnswerlatticeOwnerAssistantTimestamp,
} from "../../src/lib/answerlattice/ownerSupportAssistantNormalization";

assert.equal(normalizeAnswerlatticeOwnerAssistantCount(4), 4);
assert.equal(normalizeAnswerlatticeOwnerAssistantCount(30, 20), 20);
for (const invalid of ["4", true, null, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(normalizeAnswerlatticeOwnerAssistantCount(invalid), 0);
}
assert.equal(normalizeAnswerlatticeOwnerAssistantCount(4, Number.NaN), 0);

assert.equal(
    normalizeAnswerlatticeOwnerAssistantTimestamp("2026-07-26T10:00:00.000Z"),
    "2026-07-26T10:00:00.000Z",
);
assert.equal(
    normalizeAnswerlatticeOwnerAssistantTimestamp(new Date("2026-07-26T10:00:00.000Z")),
    "2026-07-26T10:00:00.000Z",
);
assert.equal(
    normalizeAnswerlatticeOwnerAssistantTimestamp({
        toDate: () => new Date("2026-07-26T10:00:00.000Z"),
    }),
    "2026-07-26T10:00:00.000Z",
);
assert.equal(normalizeAnswerlatticeOwnerAssistantTimestamp("not-a-date"), null);
assert.equal(normalizeAnswerlatticeOwnerAssistantTimestamp({
    get toDate() {
        throw new Error("malformed timestamp getter");
    },
}), null);
assert.equal(normalizeAnswerlatticeOwnerAssistantTimestamp({
    toDate: () => {
        throw new Error("malformed timestamp conversion");
    },
}), null);

console.log("Answerlattice Owner Support Assistant normalization tests passed");
