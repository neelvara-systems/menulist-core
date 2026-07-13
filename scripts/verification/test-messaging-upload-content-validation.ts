import assert from "node:assert/strict";
import { validateMessagingUploadContent } from "../../functions/src/messagingOnboarding/uploadContentValidation";

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

assert.deepEqual(validateMessagingUploadContent(bytes(), "image/jpeg"), {
  valid: false,
  reason: "empty_file",
});
assert.equal(validateMessagingUploadContent(bytes(0xff, 0xd8, 0xff, 0xdb), "image/jpeg").valid, true);
assert.equal(validateMessagingUploadContent(bytes(0xff, 0xd8, 0xff, 0xdb), "image/png").valid, false);
assert.equal(validateMessagingUploadContent(
  bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
  "image/png",
).valid, true);
assert.equal(validateMessagingUploadContent(
  bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50),
  "image/webp",
).valid, true);
assert.equal(validateMessagingUploadContent(
  bytes(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63),
  "image/heic",
).valid, true);
assert.equal(validateMessagingUploadContent(
  bytes(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31),
  "image/heif",
).valid, true);
assert.equal(validateMessagingUploadContent(
  Buffer.from("%PDF-1.7\nbody\n%%EOF", "ascii"),
  "application/pdf",
).valid, true);
assert.equal(validateMessagingUploadContent(
  Buffer.from("%PDF-1.7\nbody without trailer", "ascii"),
  "application/pdf",
).valid, false);
assert.equal(validateMessagingUploadContent(bytes(1, 2, 3, 4), "application/octet-stream").valid, false);

console.log("Messaging upload content validation tests passed.");
