import assert from "node:assert/strict";

import {
    isScreenExpiryValueExpired,
    screenTimestampToDate,
    screenTimestampToMillis,
} from "../../src/lib/screen/screenTimestamp";

const expectedIso = "2026-07-25T12:00:00.000Z";
const expectedMilliseconds = Date.parse(expectedIso);
const expectedSeconds = expectedMilliseconds / 1000;

[
    new Date(expectedIso),
    expectedIso,
    expectedMilliseconds,
    { seconds: expectedSeconds },
    { _seconds: expectedSeconds },
    { toMillis: () => expectedMilliseconds },
    { toDate: () => new Date(expectedIso) },
].forEach((value) => {
    assert.equal(screenTimestampToDate(value)?.toISOString(), expectedIso);
    assert.equal(screenTimestampToMillis(value), expectedMilliseconds);
});

[
    undefined,
    null,
    "",
    " 2026-07-25T12:00:00.000Z",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    {},
    [],
    { seconds: "1753444800" },
    { toMillis: () => "1753444800000" },
    { toMillis: () => Number.NaN },
    { toMillis: () => { throw new Error("invalid"); } },
    { toDate: () => "2026-07-25T12:00:00.000Z" },
    { toDate: () => new Date("invalid") },
].forEach((value) => {
    assert.equal(screenTimestampToDate(value), null);
    assert.equal(screenTimestampToMillis(value), null);
});

assert.equal(isScreenExpiryValueExpired(undefined, expectedMilliseconds), false);
assert.equal(isScreenExpiryValueExpired({ seconds: expectedSeconds + 1 }, expectedMilliseconds), false);
assert.equal(isScreenExpiryValueExpired({ seconds: expectedSeconds - 1 }, expectedMilliseconds), true);
assert.equal(isScreenExpiryValueExpired({}, expectedMilliseconds), true);
assert.equal(isScreenExpiryValueExpired({ toDate: () => "invalid" }, expectedMilliseconds), true);

console.log("Digital Screen timestamp normalization verification passed");
