export type CreativeEditorTemplateIndexRecordShape = {
    assetTypeId?: string;
    id: string;
    productId: string;
    sourceSurface: string;
    sortIndex?: number;
    updatedAtMs?: number;
};

export type CreativeEditorTemplateRecordScope = {
    assetTypeId?: string;
    productId: string;
    sourceSurface: string;
    templateId: string;
};

export const matchesCreativeEditorTemplateRecord = (
    record: CreativeEditorTemplateIndexRecordShape,
    scope: CreativeEditorTemplateRecordScope,
): boolean => (
    record.id === scope.templateId
    && record.productId === scope.productId
    && record.sourceSurface === scope.sourceSurface
    && (!scope.assetTypeId || record.assetTypeId === scope.assetTypeId)
);

const sortUserRecords = <T extends CreativeEditorTemplateIndexRecordShape>(records: T[]): T[] => (
    [...records].sort((left, right) => (right.updatedAtMs || 0) - (left.updatedAtMs || 0))
);

const sortPlatformRecords = <T extends CreativeEditorTemplateIndexRecordShape>(records: T[]): T[] => (
    [...records].sort((left, right) => {
        const leftSort = typeof left.sortIndex === "number" ? left.sortIndex : Number.MAX_SAFE_INTEGER;
        const rightSort = typeof right.sortIndex === "number" ? right.sortIndex : Number.MAX_SAFE_INTEGER;
        if (leftSort !== rightSort) return leftSort - rightSort;
        return (right.updatedAtMs || 0) - (left.updatedAtMs || 0);
    })
);

export const upsertCreativeEditorTemplateRecord = <T extends CreativeEditorTemplateIndexRecordShape>(params: {
    limit: number;
    mode: "platform" | "user";
    record: T;
    records: T[];
    scope: CreativeEditorTemplateRecordScope;
}): {
    evicted: T[];
    records: T[];
    replaced?: T;
} => {
    if (!Number.isSafeInteger(params.limit) || params.limit < 1) {
        throw new RangeError("Template index limit must be a positive safe integer");
    }

    const replaced = params.records.find((record) => matchesCreativeEditorTemplateRecord(record, params.scope));
    const withoutCurrent = params.records.filter((record) => !matchesCreativeEditorTemplateRecord(record, params.scope));
    const sorted = params.mode === "platform"
        ? sortPlatformRecords([params.record, ...withoutCurrent])
        : sortUserRecords([params.record, ...withoutCurrent]);
    let records = sorted.slice(0, params.limit);
    if (!records.includes(params.record)) {
        const retainedWithoutInserted = records.slice(0, Math.max(0, params.limit - 1));
        records = params.mode === "platform"
            ? sortPlatformRecords([...retainedWithoutInserted, params.record])
            : sortUserRecords([...retainedWithoutInserted, params.record]);
    }
    const retained = new Set(records);

    return {
        evicted: sorted.filter((record) => !retained.has(record)),
        records,
        replaced,
    };
};

export const removeCreativeEditorTemplateRecord = <T extends CreativeEditorTemplateIndexRecordShape>(params: {
    records: T[];
    scope: CreativeEditorTemplateRecordScope;
}): {
    records: T[];
    removed?: T;
} => {
    const removed = params.records.find((record) => matchesCreativeEditorTemplateRecord(record, params.scope));
    if (!removed) return { records: params.records };
    return {
        records: params.records.filter((record) => !matchesCreativeEditorTemplateRecord(record, params.scope)),
        removed,
    };
};
