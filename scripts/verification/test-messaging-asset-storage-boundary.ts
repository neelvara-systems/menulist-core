#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import {
  validateMessagingStoredUploadBytes,
  validateMessagingStoredUploadRecord,
} from "../../functions/src/messagingOnboarding/assetStorageBoundary";
import type { SessionUpload } from "../../functions/src/types/messagingOnboarding.types";

const originalBucket = process.env.FIREBASE_STORAGE_BUCKET;
process.env.FIREBASE_STORAGE_BUCKET = "demo-messaging.appspot.com";

try {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const id = "a".repeat(40);
  const storagePath = `messagingOnboarding/session-1/${id}.jpg`;
  const upload: SessionUpload = {
    fileName: "menu.jpg",
    fileSize: bytes.length,
    id,
    mimeType: "image/jpeg",
    providerMediaId: "provider-media-1",
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    storagePath,
    storageUrl: `https://firebasestorage.googleapis.com/v0/b/demo-messaging.appspot.com/o/${encodeURIComponent(storagePath)}?alt=media&token=123e4567-e89b-42d3-a456-426614174000`,
    uploadedAt: Timestamp.now(),
  };

  assert.deepEqual(validateMessagingStoredUploadRecord(upload, "session-1"), {
    valid: true,
    storagePath,
  });
  assert.deepEqual(validateMessagingStoredUploadBytes(upload, bytes), { valid: true });

  assert.equal(
    validateMessagingStoredUploadRecord({ ...upload, storagePath: `messagingOnboarding/../${id}.jpg` }, "session-1").valid,
    false,
  );
  assert.equal(
    validateMessagingStoredUploadRecord({ ...upload, storageUrl: upload.storageUrl.replace("demo-messaging.appspot.com", "other.appspot.com") }, "session-1").valid,
    false,
  );
  assert.equal(
    validateMessagingStoredUploadRecord({ ...upload, mimeType: "image/png" }, "session-1").valid,
    false,
  );
  assert.equal(
    validateMessagingStoredUploadRecord(upload, "other-session").valid,
    false,
    "an otherwise valid object from another messaging session must be rejected",
  );
  assert.deepEqual(
    validateMessagingStoredUploadBytes(upload, Buffer.concat([bytes, Buffer.from([0x00])])),
    { valid: false, reason: "file_size_mismatch" },
  );
  assert.deepEqual(
    validateMessagingStoredUploadBytes(
      { ...upload, sha256: "0".repeat(64) },
      bytes,
    ),
    { valid: false, reason: "sha256_mismatch" },
  );
  const wrongSignature = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  assert.deepEqual(
    validateMessagingStoredUploadBytes(
      {
        ...upload,
        fileSize: wrongSignature.length,
        sha256: crypto.createHash("sha256").update(wrongSignature).digest("hex"),
      },
      wrongSignature,
    ),
    { valid: false, reason: "file_signature_mismatch" },
  );

  console.log("Messaging stored-upload boundary verification passed.");
} finally {
  if (originalBucket === undefined) delete process.env.FIREBASE_STORAGE_BUCKET;
  else process.env.FIREBASE_STORAGE_BUCKET = originalBucket;
}
