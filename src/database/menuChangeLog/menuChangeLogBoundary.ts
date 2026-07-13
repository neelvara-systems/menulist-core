import type {
    ChangeLogDebounceKey,
    MenuChangeLogInput,
    MenuChangeScope,
    PendingMenuChange,
} from "@type/menuObservation";

export const DEFAULT_MENU_CHANGE_LOG_QUERY_LIMIT = 100;
export const MAX_MENU_CHANGE_LOG_QUERY_LIMIT = 500;
export const MAX_MENU_CHANGE_LOG_IDENTIFIER_LENGTH = 180;

export const normalizeMenuChangeLogScopeId = (value: unknown): number | null => {
    if (typeof value !== "number" && typeof value !== "string") return null;
    const documentId = String(value);
    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId)
        && numericId > 0
        && String(numericId) === documentId
        ? numericId
        : null;
};

export const normalizeMenuChangeLogScope = (
    scope: Readonly<{ tId?: unknown; sId?: unknown }> | null | undefined,
): MenuChangeScope | null => {
    const tId = normalizeMenuChangeLogScopeId(scope?.tId);
    const sId = normalizeMenuChangeLogScopeId(scope?.sId);
    return tId === null || sId === null ? null : { tId, sId };
};

export const normalizeMenuChangeLogIdentifier = (
    value: unknown,
    field: string,
): string => {
    if (typeof value !== "string"
        || value.length === 0
        || value.length > MAX_MENU_CHANGE_LOG_IDENTIFIER_LENGTH
        || value.trim() !== value
        || value.includes("/")) {
        throw new TypeError(`Invalid ${field}`);
    }
    return value;
};

export const createMenuChangeLogDebounceKey = (
    scope: MenuChangeScope,
    entry: Pick<MenuChangeLogInput, "categoryId" | "changeType" | "itemId" | "projectId">,
): ChangeLogDebounceKey => JSON.stringify([
    scope.tId,
    scope.sId,
    entry.projectId,
    entry.itemId ?? null,
    entry.categoryId ?? null,
    entry.changeType,
]);

export const createMenuChangeLogPendingKey = (
    scope: MenuChangeScope,
    entry: Pick<MenuChangeLogInput, 'categoryId' | 'changeType' | 'itemId' | 'projectId'>,
    appendOnlySequence: number,
): ChangeLogDebounceKey => {
    const stableKey = createMenuChangeLogDebounceKey(scope, entry);
    if (shouldDebounceMenuChange(entry.changeType)) return stableKey;
    if (!Number.isSafeInteger(appendOnlySequence) || appendOnlySequence <= 0) {
        throw new RangeError('Invalid append-only menu change sequence');
    }
    return JSON.stringify([stableKey, appendOnlySequence]);
};

export const createPendingMenuChange = (
    entry: MenuChangeLogInput,
    scope: MenuChangeScope,
    debounceKey: ChangeLogDebounceKey,
    queuedAt = Date.now(),
): PendingMenuChange => ({
    entry,
    scope: { tId: scope.tId, sId: scope.sId },
    debounceKey,
    queuedAt,
});

export const takePendingMenuChanges = (
    pendingData: Map<ChangeLogDebounceKey, PendingMenuChange>,
): PendingMenuChange[] => {
    const pending = Array.from(pendingData.values());
    pendingData.clear();
    return pending;
};

export const normalizeMenuChangeLogQueryLimit = (value?: number): number => {
    if (value === undefined) return DEFAULT_MENU_CHANGE_LOG_QUERY_LIMIT;
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new RangeError("Menu change log query limit must be a positive safe integer");
    }
    return Math.min(value, MAX_MENU_CHANGE_LOG_QUERY_LIMIT);
};

export const shouldDebounceMenuChange = (
    changeType: MenuChangeLogInput['changeType'],
): boolean => changeType !== 'MENU_REVISION_SUMMARY' && changeType !== 'PUBLISH';
