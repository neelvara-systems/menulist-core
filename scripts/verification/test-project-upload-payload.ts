import assert from "node:assert/strict";
import {
    PROJECT_UPLOAD_MAX_IMAGE_BYTES,
    validateProjectUploadDataUrl,
} from "../../src/lib/menu/projectUploadPayload";

const toDataUrl = (mimeType: string, bytes: number[]) => (
    `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`
);

const jpeg = toDataUrl("image/jpeg", [0xff, 0xd8, 0xff, 0xe0, 0x00]);
const png = toDataUrl("image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = toDataUrl("image/webp", [
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const pdf = toDataUrl("application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

assert.deepEqual(validateProjectUploadDataUrl({ claimedType: "jpg", dataUrl: jpeg }), {
    byteSize: 5,
    mimeType: "image/jpeg",
});
assert.equal(validateProjectUploadDataUrl({ claimedType: "image/png", dataUrl: png }).mimeType, "image/png");
assert.equal(validateProjectUploadDataUrl({ claimedType: "webp", dataUrl: webp }).mimeType, "image/webp");
assert.equal(validateProjectUploadDataUrl({ claimedType: "pdf", dataUrl: pdf }).mimeType, "application/pdf");

assert.throws(
    () => validateProjectUploadDataUrl({ claimedType: "image/png", dataUrl: jpeg }),
    /project_file_upload_type_mismatch/,
);
assert.throws(
    () => validateProjectUploadDataUrl({ claimedType: "image/svg\+xml", dataUrl: "data:image/svg+xml;base64,PHN2Zz4=" }),
    /project_file_upload_type_invalid/,
);
assert.throws(
    () => validateProjectUploadDataUrl({ claimedType: "image/jpeg", dataUrl: "data:image/jpeg;base64,not base64" }),
    /project_file_upload_base64_invalid/,
);
assert.throws(
    () => validateProjectUploadDataUrl({ claimedType: "image/jpeg", dataUrl: toDataUrl("image/jpeg", [0x89, 0x50, 0x4e, 0x47]) }),
    /project_file_upload_signature_mismatch/,
);
assert.throws(
    () => validateProjectUploadDataUrl({ claimedType: "image/jpeg", dataUrl: "data:image/jpeg;base64," }),
    /project_file_upload_base64_invalid|project_file_upload_empty/,
);

const oversizedPayload = "A".repeat(Math.ceil(PROJECT_UPLOAD_MAX_IMAGE_BYTES / 3) * 4 + 8);
assert.throws(
    () => validateProjectUploadDataUrl({
        claimedType: "image/jpeg",
        dataUrl: `data:image/jpeg;base64,${oversizedPayload}`,
    }),
    /project_file_upload_too_large/,
);

console.log("Project upload payload tests passed.");
