export type BusinessCopyLocalizedFieldKey =
    | 'descriptor'
    | 'knownFor'
    | 'specialNote'
    | 'tagline'
    | 'metaTitle'
    | 'metaDescription'
    | 'pwaShortName';

export type BusinessCopyFieldConfig = {
    key: BusinessCopyLocalizedFieldKey;
    labelKey: BusinessCopyLocalizedFieldKey;
    maxLength: number;
    readValue: (storeDetails?: unknown) => unknown;
};

export function readBusinessCopyOwnValueAtPath(
    value: unknown,
    path: readonly string[],
): unknown {
    let current = value;

    for (const field of path) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            return undefined;
        }

        try {
            const descriptor = Object.getOwnPropertyDescriptor(current, field);
            if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
                return undefined;
            }
            current = descriptor.value;
        } catch {
            return undefined;
        }
    }

    return current;
}

export function hasBusinessCopyOwnDataField(
    value: unknown,
    field: string,
): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, field);
        return Boolean(
            descriptor
            && Object.prototype.hasOwnProperty.call(descriptor, 'value'),
        );
    } catch {
        return false;
    }
}

const BUSINESS_COPY_FIELD_CONFIGS: BusinessCopyFieldConfig[] = [
    {
        key: 'descriptor',
        labelKey: 'descriptor',
        maxLength: 140,
        readValue: (storeDetails) => readBusinessCopyOwnValueAtPath(storeDetails, ['publicPresence', 'descriptor']),
    },
    {
        key: 'knownFor',
        labelKey: 'knownFor',
        maxLength: 120,
        readValue: (storeDetails) => readBusinessCopyOwnValueAtPath(storeDetails, ['publicPresence', 'knownFor']),
    },
    {
        key: 'specialNote',
        labelKey: 'specialNote',
        maxLength: 140,
        readValue: (storeDetails) => readBusinessCopyOwnValueAtPath(storeDetails, ['publicPresence', 'specialNote']),
    },
    {
        key: 'tagline',
        labelKey: 'tagline',
        maxLength: 100,
        readValue: (storeDetails) => readBusinessCopyOwnValueAtPath(storeDetails, ['tagline']),
    },
    {
        key: 'metaTitle',
        labelKey: 'metaTitle',
        maxLength: 60,
        readValue: (storeDetails) => readBusinessCopyOwnValueAtPath(storeDetails, ['metaTitle']),
    },
    {
        key: 'metaDescription',
        labelKey: 'metaDescription',
        maxLength: 160,
        readValue: (storeDetails) => readBusinessCopyOwnValueAtPath(storeDetails, ['metaDescription']),
    },
    {
        key: 'pwaShortName',
        labelKey: 'pwaShortName',
        maxLength: 12,
        readValue: (storeDetails) => readBusinessCopyOwnValueAtPath(storeDetails, ['pwaSettings', 'pwaShortName']),
    },
];

export const BUSINESS_COPY_FIELD_LIMITS: Record<BusinessCopyLocalizedFieldKey, number> =
    Object.fromEntries(
        BUSINESS_COPY_FIELD_CONFIGS.map((field) => [field.key, field.maxLength]),
    ) as Record<BusinessCopyLocalizedFieldKey, number>;

export function getBusinessCopyFieldConfigs(includePwaShortName: boolean = true): BusinessCopyFieldConfig[] {
    return BUSINESS_COPY_FIELD_CONFIGS.filter((field) => (
        includePwaShortName ? true : field.key !== 'pwaShortName'
    ));
}
