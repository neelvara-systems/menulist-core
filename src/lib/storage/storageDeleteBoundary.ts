const STORAGE_DELETE_ERROR_CODE_MAX_LENGTH = 80;

export const normalizeStorageDeleteTarget = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized || null;
};

export const normalizeStorageDeleteErrorCode = (error: unknown): string => {
    if (!error || typeof error !== "object" || Array.isArray(error)) return "unknown";
    let code: unknown;
    try {
        code = Reflect.get(error, "code");
    } catch {
        return "unknown";
    }
    if (typeof code !== "string") return "unknown";
    const normalized = code.trim();
    return normalized ? normalized.slice(0, STORAGE_DELETE_ERROR_CODE_MAX_LENGTH) : "unknown";
};
