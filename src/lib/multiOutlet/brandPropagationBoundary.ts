export const MASTER_STORE_PROPAGATED_FIELDS = [
    'logo',
    'phoneNumber',
    'currencyCode',
    'currencySymbol',
    'country',
    'timeZone',
    'defaultLanguage',
    'businessType',
    'businessCategory',
] as const;

export type MasterStorePropagatedField = typeof MASTER_STORE_PROPAGATED_FIELDS[number];

const MASTER_STORE_PROPAGATED_FIELD_SET = new Set<string>(MASTER_STORE_PROPAGATED_FIELDS);
const STORE_SUMMARY_PROPAGATED_FIELDS = new Set<MasterStorePropagatedField>([
    'businessType',
    'businessCategory',
    'logo',
    'timeZone',
]);
const DIGITAL_SCREEN_PROPAGATED_OUTPUT_FIELDS = new Set<MasterStorePropagatedField>([
    'currencyCode',
    'currencySymbol',
    'logo',
]);

export type BrandPropagationResult = {
    failed: number;
    propagated: number;
    skipped: number;
    success: true;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeMasterStorePropagationFields(value: unknown): MasterStorePropagatedField[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.filter((field): field is MasterStorePropagatedField => (
        typeof field === 'string' && MASTER_STORE_PROPAGATED_FIELD_SET.has(field)
    ))));
}

export function buildBrandPropagationValues(
    masterStore: unknown,
    fields: MasterStorePropagatedField[],
): Partial<Record<MasterStorePropagatedField, unknown>> {
    if (!isRecord(masterStore)) return {};
    return Object.fromEntries(fields.map((field) => [
        field,
        Object.prototype.hasOwnProperty.call(masterStore, field) ? masterStore[field] : null,
    ]));
}

export function buildStoreSummaryBrandPropagationValues(
    propagatedValues: Partial<Record<MasterStorePropagatedField, unknown>>,
): Record<string, unknown> {
    return Object.fromEntries(Object.entries(propagatedValues).filter(([field]) => (
        STORE_SUMMARY_PROPAGATED_FIELDS.has(field as MasterStorePropagatedField)
    )));
}

export function hasDigitalScreenBrandPropagationFields(
    fields: MasterStorePropagatedField[],
): boolean {
    return fields.some((field) => DIGITAL_SCREEN_PROPAGATED_OUTPUT_FIELDS.has(field));
}

export function isBrandPropagationResult(value: unknown): value is BrandPropagationResult {
    if (!isRecord(value)) return false;
    return value.success === true
        && value.failed === 0
        && Number.isSafeInteger(value.propagated)
        && Number(value.propagated) >= 0
        && Number.isSafeInteger(value.skipped)
        && Number(value.skipped) >= 0;
}
