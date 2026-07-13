#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { isMessagingExtractionJob } from "../../functions/src/messagingOnboarding/extractionWatcher";

const now = Timestamp.now();

function buildCompletedJob(): Record<string, unknown> {
  return {
    createdAt: now,
    files: [{
      name: "menu.png",
      size: 1024,
      type: "image/png",
      uid: "upload-1",
      url: "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/menu.png?alt=media",
    }],
    id: "job-1",
    projectId: "msg-onboarding-session-1",
    result: {
      combinedData: {
        categories: [{ id: "cat-1", name: { en: "Lunch" }, sourceFileIndex: 0 }],
        items: [{
          category: "cat-1",
          id: "item-1",
          name: { en: "Lunch Combo" },
          sourceFileIndex: 0,
        }],
        languages: [{ code: "en", isPrimary: true, name: "English" }],
      },
      processingTime: 1200,
      qualityDetails: {
        categoryQuality: 90,
        descriptionQuality: 80,
        itemQuality: 90,
        priceQuality: 85,
      },
      qualityScore: 88,
      redistributedFiles: { "upload-1": { data: { categories: [], items: [] } } },
    },
    status: "completed",
    targetLanguages: [{ code: "en", name: "English" }],
    updatedAt: now,
  };
}

const valid = buildCompletedJob();
assert.equal(isMessagingExtractionJob(valid), true);
assert.equal(isMessagingExtractionJob({
  ...valid,
  error: { code: "PROVIDER_FAILED", message: "Provider failed", retryable: true },
  result: undefined,
  status: "failed",
}), true);
assert.equal(isMessagingExtractionJob({ ...valid, error: undefined, result: undefined, status: "failed" }), true);

const invalidJobs: unknown[] = [
  null,
  [],
  { ...valid, status: "processing" },
  { ...valid, createdAt: new Date() },
  { ...valid, files: [] },
  { ...valid, files: Array.from({ length: 16 }, (_, index) => ({
    name: `${index}.png`,
    size: 1,
    type: "image/png",
    uid: `upload-${index}`,
    url: `https://storage.googleapis.com/demo/${index}.png`,
  })) },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], size: "1024" }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], size: 0 }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], size: Number.POSITIVE_INFINITY }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], size: 10 * 1024 * 1024 + 1 }] },
  { ...valid, files: [
    (valid.files as Array<Record<string, unknown>>)[0],
    { ...(valid.files as Array<Record<string, unknown>>)[0], name: "duplicate.png" },
  ] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], uid: " upload-1" }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], name: "   " }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], type: " image/png" }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], url: "http://example.com/menu.png" }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], url: "https://user:pass@example.com/menu.png" }] },
  { ...valid, files: [{ ...(valid.files as Array<Record<string, unknown>>)[0], url: "https://%" }] },
  { ...valid, targetLanguages: [] },
  { ...valid, targetLanguages: Array.from({ length: 13 }, (_, index) => ({ code: `l${index}`, name: `Language ${index}` })) },
  { ...valid, targetLanguages: [null] },
  { ...valid, targetLanguages: [{ code: " ", name: "English" }] },
  { ...valid, targetLanguages: [{ code: "en", name: " " }] },
  { ...valid, targetLanguages: [{ code: "en", name: "English" }, { code: "EN", name: "English duplicate" }] },
  { ...valid, result: undefined },
  { ...valid, result: { ...(valid.result as Record<string, unknown>), qualityScore: Number.NaN } },
  { ...valid, result: { ...(valid.result as Record<string, unknown>), processingTime: "1200" } },
  { ...valid, result: {
    ...(valid.result as Record<string, unknown>),
    qualityDetails: { categoryQuality: 90, descriptionQuality: 80, itemQuality: 90 },
  } },
  { ...valid, result: { ...(valid.result as Record<string, unknown>), combinedData: { categories: {}, items: [], languages: [] } } },
  { ...valid, result: { ...(valid.result as Record<string, unknown>), redistributedFiles: [] } },
  { ...valid, error: { code: 500, message: "failed", retryable: true }, result: undefined, status: "failed" },
];

invalidJobs.forEach((job, index) => {
  assert.equal(isMessagingExtractionJob(job), false, `invalid terminal job ${index} was accepted`);
});

console.log("Messaging extraction job boundary verification passed.");
