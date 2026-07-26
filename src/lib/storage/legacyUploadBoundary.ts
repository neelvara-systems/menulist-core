export const LEGACY_STORAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const PLATFORM_ASSET_CONTENT_TYPES = new Set([
    "application/json",
    "application/msword",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/xml",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
    "text/csv",
    "text/html",
    "text/markdown",
    "text/plain",
    "text/xml",
]);

const isSafeStoragePathSegment = (value: string): boolean => (
    value !== "."
    && value !== ".."
    && !value.includes("/")
    && !value.includes("\\")
    && !/[\u0000-\u001F\u007F]/.test(value)
);

export const normalizeLegacyStoragePathSegment = (
    value: unknown,
    maxLength = 160,
): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized
        && normalized.length <= maxLength
        && isSafeStoragePathSegment(normalized)
        ? normalized
        : null;
};

export const normalizeLegacyStorageObjectPath = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    if (
        !normalized
        || normalized.length > 1024
        || normalized.startsWith("/")
        || normalized.endsWith("/")
        || normalized.includes("\\")
        || /[\u0000-\u001F\u007F]/.test(normalized)
    ) {
        return null;
    }
    const segments = normalized.split("/");
    return segments.every((segment) => segment && segment !== "." && segment !== "..")
        ? normalized
        : null;
};

export const getStorageUploadByteLength = (value: unknown): number | null => {
    if (value instanceof Blob) return value.size;
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (value instanceof Uint8Array) return value.byteLength;
    return null;
};

export const normalizePlatformAssetBlob = (
    value: unknown,
): { bytes: Blob; contentType: string } | null => {
    if (!(value instanceof Blob)) return null;
    const contentType = value.type.trim().toLowerCase();
    return value.size > 0
        && value.size <= LEGACY_STORAGE_UPLOAD_MAX_BYTES
        && PLATFORM_ASSET_CONTENT_TYPES.has(contentType)
        ? { bytes: value, contentType }
        : null;
};

export const normalizeFontUploadBytes = (
    value: unknown,
): { bytes: Blob | Uint8Array | ArrayBuffer; contentType: string } | null => {
    const byteLength = getStorageUploadByteLength(value);
    if (!byteLength || byteLength > LEGACY_STORAGE_UPLOAD_MAX_BYTES) return null;
    const contentType = value instanceof Blob && value.type.trim()
        ? value.type.trim().toLowerCase()
        : "application/octet-stream";
    if (
        !(
            contentType === "application/octet-stream"
            || contentType === "application/font-woff"
            || contentType === "application/font-woff2"
            || contentType.startsWith("font/")
        )
    ) {
        return null;
    }
    return { bytes: value as Blob | Uint8Array | ArrayBuffer, contentType };
};

export const serializeBoundedStorageJson = (value: unknown): string | null => {
    let serialized: string | undefined;
    try {
        serialized = JSON.stringify(value);
    } catch {
        return null;
    }
    if (typeof serialized !== "string") return null;
    const byteLength = new TextEncoder().encode(serialized).byteLength;
    return byteLength > 0 && byteLength <= LEGACY_STORAGE_UPLOAD_MAX_BYTES
        ? serialized
        : null;
};
