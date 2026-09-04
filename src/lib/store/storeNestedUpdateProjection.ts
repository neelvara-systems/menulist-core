const STORE_NESTED_PATCH_FIELDS = new Set([
    'analytics',
    'businessAttributes',
    'businessCopyMeta',
    'externalLocationIdentity',
    'feedbackDefaults',
    'geo',
    'keywords',
    'menuPresence',
    'metaDescription',
    'metaTitle',
    'posSync',
    'presence',
    'printableAssetStylePreferences',
    'publicPresence',
    'pwaSettings',
    'socialMedia',
    'tagline',
    'workingHours',
]);

class StoreNestedDeleteMarker {
    readonly kind = 'store_nested_update_delete';
}

export const STORE_NESTED_DELETE = Object.freeze(new StoreNestedDeleteMarker());

export function isStoreNestedDelete(value: unknown): value is typeof STORE_NESTED_DELETE {
    return value === STORE_NESTED_DELETE;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function assertSafeFieldSegment(segment: string): void {
    if (!segment || segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
        throw new Error('store_nested_update_field_invalid');
    }
}

function assertSafeFieldPath(path: string): void {
    path.split('.').forEach(assertSafeFieldSegment);
}

function mergeNestedValue(current: unknown, patch: unknown): unknown {
    if (isStoreNestedDelete(patch)) return STORE_NESTED_DELETE;
    if (!isPlainRecord(patch)) return patch;
    const patchKeys = Object.keys(patch);
    if (patchKeys.length === 0) return {};
    const currentRecord = isPlainRecord(current) ? current : {};
    const merged: Record<string, unknown> = { ...currentRecord };

    patchKeys.forEach((key) => {
        assertSafeFieldSegment(key);
        const mergedValue = mergeNestedValue(currentRecord[key], patch[key]);
        if (isStoreNestedDelete(mergedValue)) {
            delete merged[key];
        } else {
            merged[key] = mergedValue;
        }
    });
    return merged;
}

export type StoreNestedUpdateEntry = Readonly<{
    path: readonly string[];
    value: unknown;
}>;

function flattenNestedValue(
    output: StoreNestedUpdateEntry[],
    path: readonly string[],
    value: unknown,
): void {
    if (!isPlainRecord(value)) {
        output.push({ path, value });
        return;
    }

    const keys = Object.keys(value);
    if (keys.length === 0) {
        output.push({ path, value: {} });
        return;
    }

    keys.forEach((key) => {
        assertSafeFieldSegment(key);
        flattenNestedValue(output, [...path, key], value[key]);
    });
}

export function mergeStoreNestedUpdateWithCurrent(
    currentStore: Record<string, unknown>,
    requestedUpdate: Record<string, unknown>,
): Record<string, unknown> {
    const merged = { ...currentStore, ...requestedUpdate };
    STORE_NESTED_PATCH_FIELDS.forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(requestedUpdate, field)) return;
        merged[field] = mergeNestedValue(currentStore[field], requestedUpdate[field]);
    });
    return merged;
}

export function projectStoreNestedUpdateEntries(
    requestedUpdate: Record<string, unknown>,
): StoreNestedUpdateEntry[] {
    const projected: StoreNestedUpdateEntry[] = [];

    Object.entries(requestedUpdate).forEach(([field, value]) => {
        if (field.includes('.')) {
            assertSafeFieldPath(field);
            projected.push({ path: field.split('.'), value });
            return;
        }
        assertSafeFieldSegment(field);
        if (STORE_NESTED_PATCH_FIELDS.has(field) && isPlainRecord(value)) {
            flattenNestedValue(projected, [field], value);
            return;
        }
        projected.push({ path: [field], value });
    });

    return projected;
}

const NO_CHANGE = Symbol('store_nested_update_no_change');

function buildNestedDifference(
    updated: unknown,
    original: unknown,
    detectRemovedKeys: boolean,
): unknown | typeof NO_CHANGE {
    if (Object.is(updated, original)) return NO_CHANGE;
    if (Array.isArray(updated) && Array.isArray(original)) {
        if (updated.length === original.length && updated.every((entry, index) => buildNestedDifference(entry, original[index], true) === NO_CHANGE)) {
            return NO_CHANGE;
        }
        return updated;
    }
    if (!isPlainRecord(updated) || !isPlainRecord(original)) return updated;

    const difference: Record<string, unknown> = {};
    const keys = new Set(detectRemovedKeys
        ? [...Object.keys(original), ...Object.keys(updated)]
        : Object.keys(updated));
    keys.forEach((key) => {
        assertSafeFieldSegment(key);
        if (!Object.prototype.hasOwnProperty.call(updated, key)) {
            difference[key] = STORE_NESTED_DELETE;
            return;
        }
        const nestedDifference = buildNestedDifference(updated[key], original[key], true);
        if (nestedDifference !== NO_CHANGE) difference[key] = nestedDifference;
    });

    if (Object.keys(difference).length > 0) return difference;
    return NO_CHANGE;
}

export function getStoreDeepDifference(
    updated: Record<string, unknown>,
    original: Record<string, unknown>,
    options: Readonly<{ detectRemovedRootKeys?: boolean }> = {},
): Record<string, unknown> {
    const difference = buildNestedDifference(updated, original, options.detectRemovedRootKeys === true);
    return difference === NO_CHANGE || !isPlainRecord(difference) ? {} : difference;
}
