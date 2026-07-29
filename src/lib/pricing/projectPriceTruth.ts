import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

type MutableRecord = Record<string, unknown>;
type PriceAssignment = {
    record: MutableRecord;
    value: string;
};

const isRecord = (value: unknown): value is MutableRecord => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

function readRecordField(record: MutableRecord, key: string): unknown {
    try {
        return Reflect.get(record, key);
    } catch {
        throw new Error('Invalid menu price');
    }
}

function collectRecordPrice(record: MutableRecord, assignments: PriceAssignment[]): void {
    if (!Object.prototype.hasOwnProperty.call(record, 'price')) return;

    const result = normalizeOptionalMenuPrice(readRecordField(record, 'price'));
    if (!result.success) throw new Error('Invalid menu price');
    assignments.push({ record, value: result.data || '' });
}

function collectExtractedMenuPriceTruth(
    menuData: MutableRecord,
    assignments: PriceAssignment[],
): void {
    const items = readRecordField(menuData, 'items');
    if (!Array.isArray(items)) return;

    for (const item of items) {
        if (!isRecord(item)) continue;
        collectRecordPrice(item, assignments);
        const attributes = readRecordField(item, 'attributes');
        if (!Array.isArray(attributes)) continue;
        for (const attribute of attributes) {
            if (isRecord(attribute)) collectRecordPrice(attribute, assignments);
        }
    }
}

function applyPriceAssignments(assignments: PriceAssignment[]): void {
    for (const assignment of assignments) {
        assignment.record.price = assignment.value;
    }
}

/**
 * Normalize prices on an extracted menu payload before it is promoted into a
 * persisted project. This shares the same item/option contract as normal
 * project mutations without requiring a synthetic file wrapper at callers.
 */
export function normalizeExtractedMenuPriceTruth<T extends object>(menuData: T): T {
    const assignments: PriceAssignment[] = [];
    collectExtractedMenuPriceTruth(menuData as MutableRecord, assignments);
    applyPriceAssignments(assignments);

    return menuData;
}

/**
 * Normalizes every persisted item/option/override price in a project mutation.
 * This is intentionally in-memory and adds no Firebase operation.
 */
export function normalizeProjectPriceTruth<T extends object>(project: T): T {
    const projectRecord = project as MutableRecord;
    const assignments: PriceAssignment[] = [];
    const files = readRecordField(projectRecord, 'files');
    if (Array.isArray(files)) {
        for (const file of files) {
            if (!isRecord(file)) continue;
            const extractedData = readRecordField(file, 'extractedData');
            if (!isRecord(extractedData)) continue;
            const menuData = readRecordField(extractedData, 'data');
            if (isRecord(menuData)) collectExtractedMenuPriceTruth(menuData, assignments);
        }
    }

    const projectOverrides = readRecordField(projectRecord, 'overrides');
    const overrides = isRecord(projectOverrides) ? projectOverrides : null;
    for (const bucketName of ['items', 'attributes'] as const) {
        const bucketValue = overrides ? readRecordField(overrides, bucketName) : null;
        const bucket = isRecord(bucketValue) ? bucketValue : null;
        if (!bucket) continue;
        for (const key of Object.keys(bucket)) {
            const entry = readRecordField(bucket, key);
            if (isRecord(entry)) collectRecordPrice(entry, assignments);
        }
    }

    applyPriceAssignments(assignments);
    return project;
}
