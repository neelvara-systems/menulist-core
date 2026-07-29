import assert from "node:assert/strict";
import {
    createDalLoaderRequestId,
    getDalFunctionName,
    summarizeDalArgs,
} from "../../src/lib/apiHelper/dalDiagnostics";

assert.equal(getDalFunctionName([]), "unknownDalCall");
assert.equal(getDalFunctionName([1, "loadProjects"]), "loadProjects");
assert.equal(getDalFunctionName([1, "x".repeat(100)]).length, 80);
assert.deepEqual(summarizeDalArgs([
    "private-value",
    [1, 2],
    { secret: true, token: true },
    42,
    "loadProjects",
]), [
    { type: "string", length: 13 },
    { type: "array", length: 2 },
    { type: "object", keys: ["secret", "token"] },
    { type: "number" },
]);

assert.deepEqual(summarizeDalArgs([
    new Proxy({}, {
        ownKeys() {
            throw new Error("hostile object");
        },
    }),
    "loadProjects",
]), [{ type: "uninspectable" }]);

assert.deepEqual(summarizeDalArgs([
    new Proxy([], {
        get() {
            throw new Error("hostile array");
        },
    }),
    "loadProjects",
]), [{ type: "uninspectable" }]);

const loaderIdA = createDalLoaderRequestId();
const loaderIdB = createDalLoaderRequestId();
assert.match(loaderIdA, /^dal_\d+_\d+$/);
assert.match(loaderIdB, /^dal_\d+_\d+$/);
assert.notEqual(loaderIdA, loaderIdB);
assert.equal(loaderIdA.includes("private-value"), false);

console.log("DAL diagnostic boundary tests passed.");
