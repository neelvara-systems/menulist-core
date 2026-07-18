import assert from "node:assert/strict";
import { buildProjectUploadObjectId } from "../../src/lib/menu/projectUploadIdentity";

const first = buildProjectUploadObjectId({
    attemptId: "attempt-one",
    fileId: "Main menu.pdf",
    projectId: "1-menu-2",
});
const second = buildProjectUploadObjectId({
    attemptId: "attempt-two",
    fileId: "Main menu.pdf",
    projectId: "1-menu-2",
});

assert.notEqual(first, second, "separate persistence attempts must never reuse an object path");
assert.match(first, /^1-menu-2-Main-menu\.pdf-attempt-one$/);
assert.ok(first.length <= 120);
assert.ok(buildProjectUploadObjectId({
    attemptId: "safe-attempt",
    fileId: "x".repeat(500),
    projectId: "1-menu-2",
}).endsWith("-safe-attempt"), "truncation must preserve attempt identity");
assert.throws(
    () => buildProjectUploadObjectId({ attemptId: "///", fileId: "file", projectId: "1-menu-2" }),
    /project_upload_attempt_id_invalid/,
);
assert.match(buildProjectUploadObjectId({
    attemptId: "attempt-three",
    stableParts: ["menu", "Lunch menu.pdf"],
}), /^menu-Lunch-menu\.pdf-attempt-three$/);
assert.throws(
    () => buildProjectUploadObjectId({ attemptId: "attempt", stableParts: new Array(9).fill("part") }),
    /project_upload_stable_parts_invalid/,
);

console.log("Project upload identity tests passed.");
