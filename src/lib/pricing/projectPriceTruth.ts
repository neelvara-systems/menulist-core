import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

type MutableRecord = Record<string, any>;

const isRecord = (value: unknown): value is MutableRecord => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

function normalizeRecordPrice(record: MutableRecord): void {
    if (!Object.prototype.hasOwnProperty.call(record, 'price')) return;

    const result = normalizeOptionalMenuPrice(record.price);
    if (!result.success) throw new Error('Invalid menu price');
    record.price = result.data || '';
}

/**
 * Normalize prices on an extracted menu payload before it is promoted into a
 * persisted project. This shares the same item/option contract as normal
 * project mutations without requiring a synthetic file wrapper at callers.
 */
export function normalizeExtractedMenuPriceTruth<T extends object>(menuData: T): T {
    const items = (menuData as MutableRecord).items;
    if (!Array.isArray(items)) return menuData;

    for (const item of items) {
        if (!isRecord(item)) continue;
        normalizeRecordPrice(item);
        if (Array.isArray(item.attributes)) {
            item.attributes.forEach((attribute: unknown) => {
                if (isRecord(attribute)) normalizeRecordPrice(attribute);
            });
        }
    }

    return menuData;
}

/**
 * Normalizes every persisted item/option/override price in a project mutation.
 * This is intentionally in-memory and adds no Firebase operation.
 */
export function normalizeProjectPriceTruth<T extends object>(project: T): T {
    const projectRecord = project as MutableRecord;
    if (Array.isArray(projectRecord.files)) {
        for (const file of projectRecord.files) {
            const menuData = file?.extractedData?.data;
            if (isRecord(menuData)) normalizeExtractedMenuPriceTruth(menuData);
        }
    }

    const overrides = isRecord(projectRecord.overrides) ? projectRecord.overrides : null;
    for (const bucketName of ['items', 'attributes'] as const) {
        const bucket = overrides && isRecord(overrides[bucketName])
            ? overrides[bucketName]
            : null;
        if (!bucket) continue;
        Object.values(bucket).forEach((entry) => {
            if (isRecord(entry)) normalizeRecordPrice(entry);
        });
    }

    return project;
}
