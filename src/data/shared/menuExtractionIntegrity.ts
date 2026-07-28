export type MenuExtractionBatchResultSummary = {
  batchIndex: number;
  failedFileIndices?: number[];
  filesProcessed: number;
  success: boolean;
};

export type MenuExtractionBatchCompletion = "complete" | "failed" | "needs_review";

export type MenuExtractionFileIdentity = {
  size: number;
  type: string;
  uid: string;
  url: string;
};

export function findDuplicateMenuExtractionFileUids(
  files: ReadonlyArray<{ uid?: unknown }>,
): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const file of files) {
    const uid = typeof file?.uid === "string" ? file.uid.trim() : "";
    if (!uid) continue;
    if (seen.has(uid)) duplicates.add(uid);
    seen.add(uid);
  }

  return Array.from(duplicates).sort();
}

export function findInvalidMenuExtractionFileUidIndexes(
  files: ReadonlyArray<{ uid?: unknown }>,
): number[] {
  const invalidIndexes: number[] = [];
  files.forEach((file, index) => {
    const uid = file?.uid;
    if (
      typeof uid !== "string"
      || uid.length === 0
      || uid.length > 120
      || uid.trim() !== uid
    ) {
      invalidIndexes.push(index);
    }
  });
  return invalidIndexes;
}

export function findInvalidMenuExtractionSourceIndexes(
  records: ReadonlyArray<{ sourceFileIndex?: unknown }>,
  sourceFileCount: number,
): number[] {
  if (!Number.isInteger(sourceFileCount) || sourceFileCount <= 0) {
    return records.map((_, index) => index);
  }

  const invalidRecordIndexes: number[] = [];
  records.forEach((record, recordIndex) => {
    const sourceFileIndex = record?.sourceFileIndex;
    if (
      typeof sourceFileIndex !== "number"
      || !Number.isInteger(sourceFileIndex)
      || sourceFileIndex < 0
      || sourceFileIndex >= sourceFileCount
    ) {
      invalidRecordIndexes.push(recordIndex);
    }
  });
  return invalidRecordIndexes;
}

export function getMenuExtractionFailedSourceFileIndices(
  files: ReadonlyArray<{ sourceFileIndex: number }>,
): number[] {
  return files.map((file) => file.sourceFileIndex);
}

export function resolveMenuExtractionBatchCompletion(
  batchResults: readonly MenuExtractionBatchResultSummary[] | undefined,
  options: { canReviewPartialResult: boolean },
): MenuExtractionBatchCompletion {
  // Deterministic text extraction does not create provider batch records.
  if (batchResults === undefined) return "complete";
  if (batchResults.length === 0) return "failed";

  const failedBatchCount = batchResults.filter((batch) => batch.success !== true).length;
  if (failedBatchCount === 0) return "complete";
  if (failedBatchCount === batchResults.length) return "failed";
  return options.canReviewPartialResult ? "needs_review" : "failed";
}

function hasSameFileIdentity(
  existing: MenuExtractionFileIdentity,
  incoming: MenuExtractionFileIdentity,
): boolean {
  return existing.url === incoming.url
    && existing.type === incoming.type
    && Number(existing.size) === Number(incoming.size);
}

export function selectNewMenuExtractionProjectFiles<
  TExisting extends MenuExtractionFileIdentity,
  TIncoming extends MenuExtractionFileIdentity,
>(
  existingFiles: readonly TExisting[],
  incomingFiles: readonly TIncoming[],
): TIncoming[] {
  if (findInvalidMenuExtractionFileUidIndexes(incomingFiles).length > 0) {
    throw new Error("MENU_EXTRACTION_INVALID_INCOMING_FILE_UID");
  }
  const duplicateIncomingUids = findDuplicateMenuExtractionFileUids(incomingFiles);
  if (duplicateIncomingUids.length > 0) {
    throw new Error("MENU_EXTRACTION_DUPLICATE_INCOMING_FILE_UID");
  }

  const existingByUid = new Map<string, TExisting>();
  for (const file of existingFiles) {
    if (typeof file?.uid !== "string" || !file.uid.trim()) continue;
    const existing = existingByUid.get(file.uid);
    if (existing && !hasSameFileIdentity(existing, file)) {
      throw new Error("MENU_EXTRACTION_CONFLICTING_EXISTING_FILE_UID");
    }
    existingByUid.set(file.uid, file);
  }

  return incomingFiles.filter((file) => {
    const existing = existingByUid.get(file.uid);
    if (!existing) return true;
    if (!hasSameFileIdentity(existing, file)) {
      throw new Error("MENU_EXTRACTION_FILE_UID_CONFLICT");
    }
    return false;
  });
}
