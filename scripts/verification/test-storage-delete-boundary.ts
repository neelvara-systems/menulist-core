import assert from "node:assert/strict";
import {
    normalizeStorageDeleteErrorCode,
    normalizeStorageDeleteTarget,
} from "../../src/lib/storage/storageDeleteBoundary";

assert.equal(normalizeStorageDeleteTarget("  gs://bucket/path  "), "gs://bucket/path");
assert.equal(normalizeStorageDeleteTarget("projects/files/1/2/menu.pdf"), "projects/files/1/2/menu.pdf");

for (const invalid of [null, undefined, 1, {}, [], "", "   "]) {
    assert.equal(
        normalizeStorageDeleteTarget(invalid),
        null,
        `invalid delete target must fail closed: ${JSON.stringify(invalid)}`,
    );
}

assert.equal(
    normalizeStorageDeleteErrorCode({ code: "storage/object-not-found" }),
    "storage/object-not-found",
);
assert.equal(normalizeStorageDeleteErrorCode({ code: "  storage/unauthorized  " }), "storage/unauthorized");
assert.equal(normalizeStorageDeleteErrorCode({ code: 403 }), "unknown");
assert.equal(normalizeStorageDeleteErrorCode({ code: "" }), "unknown");
assert.equal(normalizeStorageDeleteErrorCode(null), "unknown");
assert.equal(normalizeStorageDeleteErrorCode("storage/unauthorized"), "unknown");
assert.equal(normalizeStorageDeleteErrorCode({ code: "x".repeat(200) }).length, 80);

console.log("Storage delete boundary regression passed.");
