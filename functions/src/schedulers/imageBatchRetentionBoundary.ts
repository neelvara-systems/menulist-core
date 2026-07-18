import { selectDeterministicRetentionStorePage } from './retentionStorePageBoundary';

const IMAGE_BATCH_DELETE_ALL_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "discarded",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const IMAGE_BATCH_PROJECT_SCAN_MAX_NODES = 50_000;
const IMAGE_BATCH_PROJECT_SCAN_MAX_DEPTH = 32;

// Generated media URLs can be copied into duplicated projects and inherited or
// projected across outlet boundaries. A batch row and one current project do
// not prove exclusive ownership, so retention remains metadata-only until a
// global reference ledger or equivalent cross-project proof exists.
export const IMAGE_BATCH_STORAGE_DELETION_ENABLED = false;

export type ImageBatchRetentionStorePage<T> = {
  entries: Array<[string, T]>;
  pageCount: number;
  pageIndex: number;
  totalActiveStores: number;
};

export function selectImageBatchRetentionStorePage<T extends Record<string, unknown>>(
  stores: Record<string, T>,
  nowMillis: number,
  limit: number,
): ImageBatchRetentionStorePage<T> {
  const page = selectDeterministicRetentionStorePage(
    stores,
    nowMillis,
    limit,
    (storeInfo) => storeInfo.active !== false,
  );

  return {
    entries: page.entries,
    pageCount: page.pageCount,
    pageIndex: page.pageIndex,
    totalActiveStores: page.totalStores,
  };
}

export type ImageBatchReferenceFilterResult = {
  complete: boolean;
  referencedUrls: string[];
  unreferencedUrls: string[];
};

export function filterProjectReferencedImageBatchUrls(
  projectData: unknown,
  candidateUrls: string[],
): ImageBatchReferenceFilterResult {
  const candidates = new Set(candidateUrls.map((url) => url.trim()).filter(Boolean));
  const referenced = new Set<string>();
  const visited = new Set<object>();
  let nodesVisited = 0;
  let complete = true;

  const visit = (value: unknown, depth: number): void => {
    if (!complete || referenced.size === candidates.size) return;
    nodesVisited += 1;
    if (nodesVisited > IMAGE_BATCH_PROJECT_SCAN_MAX_NODES || depth > IMAGE_BATCH_PROJECT_SCAN_MAX_DEPTH) {
      complete = false;
      return;
    }
    if (typeof value === "string") {
      const normalized = value.trim();
      if (candidates.has(normalized)) referenced.add(normalized);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    Object.values(value).forEach((entry) => visit(entry, depth + 1));
  };

  visit(projectData, 0);
  const referencedUrls = Array.from(referenced);
  return {
    complete,
    referencedUrls,
    unreferencedUrls: complete
      ? Array.from(candidates).filter((url) => !referenced.has(url))
      : [],
  };
}

export function shouldDeleteImageBatchStorage(status: unknown): status is string {
  return IMAGE_BATCH_STORAGE_DELETION_ENABLED
    && typeof status === "string"
    && (IMAGE_BATCH_DELETE_ALL_STATUSES.has(status) || status === "finished");
}

export function getImageBatchImageUrls(data: unknown): string[] {
  if (!isRecord(data) || !Array.isArray(data.itemsList)) {
    return [];
  }

  const urls = new Set<string>();
  for (const item of data.itemsList) {
    if (!isRecord(item) || !Array.isArray(item.images)) continue;
    for (const image of item.images) {
      if (!isRecord(image) || typeof image.url !== "string") continue;
      const url = image.url.trim();
      if (url) urls.add(url);
    }
  }
  return Array.from(urls);
}

export function getImageBatchStorageCleanupUrls(data: unknown, status: unknown): string[] {
  if (!shouldDeleteImageBatchStorage(status)) return [];

  // This branch is intentionally unreachable until exclusive-reference proof is
  // introduced. Keep candidate projection centralized for that future migration.
  return getImageBatchImageUrls(data);
}
