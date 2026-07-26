import assert from "node:assert/strict";
import {
    LEGACY_STORAGE_UPLOAD_MAX_BYTES,
    normalizeFontUploadBytes,
    normalizeLegacyStorageObjectPath,
    normalizeLegacyStoragePathSegment,
    normalizePlatformAssetBlob,
    serializeBoundedStorageJson,
} from "../../src/lib/storage/legacyUploadBoundary";

assert.equal(normalizeLegacyStoragePathSegment(" component-1 "), "component-1");
assert.equal(normalizeLegacyStoragePathSegment("../escape"), null);
assert.equal(normalizeLegacyStoragePathSegment("folder/name"), null);
assert.equal(normalizeLegacyStorageObjectPath(" templates/a/document.json "), "templates/a/document.json");
assert.equal(normalizeLegacyStorageObjectPath("../document.json"), null);
assert.equal(normalizeLegacyStorageObjectPath("templates//document.json"), null);

const image = normalizePlatformAssetBlob(new Blob(["image"], { type: "image/png" }));
assert.equal(image?.contentType, "image/png");
assert.equal(normalizePlatformAssetBlob(new Blob(["image"], { type: "application/octet-stream" })), null);
assert.equal(
    normalizePlatformAssetBlob(new Blob([new Uint8Array(LEGACY_STORAGE_UPLOAD_MAX_BYTES + 1)], { type: "image/png" })),
    null,
);

assert.equal(
    normalizeFontUploadBytes(new Blob(["font"], { type: "font/woff2" }))?.contentType,
    "font/woff2",
);
assert.equal(
    normalizeFontUploadBytes(new Uint8Array([1, 2, 3]))?.contentType,
    "application/octet-stream",
);
assert.equal(normalizeFontUploadBytes(new Blob(["bad"], { type: "image/png" })), null);

assert.equal(serializeBoundedStorageJson({ ok: true }), '{"ok":true}');
assert.equal(serializeBoundedStorageJson(undefined), null);
const circular: Record<string, unknown> = {};
circular.self = circular;
assert.equal(serializeBoundedStorageJson(circular), null);
assert.equal(serializeBoundedStorageJson("x".repeat(LEGACY_STORAGE_UPLOAD_MAX_BYTES + 1)), null);

console.log("Legacy Storage upload boundary regression passed.");
