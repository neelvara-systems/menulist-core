const DEFAULT_TEMP_BASENAME = "source-file";
const MAX_TEMP_BASENAME_LENGTH = 160;

export function sanitizeTempFileBasename(value: unknown, fallbackName = DEFAULT_TEMP_BASENAME): string {
    const sanitize = (input: unknown): string => {
        if (typeof input !== "string" && typeof input !== "number") return "";
        return String(input)
            .replace(/\.\./g, "")
            .replace(/[/\\]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/^\.+/, "")
            .slice(0, MAX_TEMP_BASENAME_LENGTH);
    };

    const safeFallback = sanitize(fallbackName) || DEFAULT_TEMP_BASENAME;
    return sanitize(value) || safeFallback;
}

export function buildSafeTempFilePath(fileName: unknown, fallbackName = DEFAULT_TEMP_BASENAME): string {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const basename = sanitizeTempFileBasename(fileName, fallbackName);
    return `/tmp/${uniqueId}-${basename}`;
}
