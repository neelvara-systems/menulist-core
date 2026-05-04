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
    readValue: (storeDetails?: any) => unknown;
};

const BUSINESS_COPY_FIELD_CONFIGS: BusinessCopyFieldConfig[] = [
    {
        key: 'descriptor',
        labelKey: 'descriptor',
        maxLength: 140,
        readValue: (storeDetails) => storeDetails?.publicPresence?.descriptor,
    },
    {
        key: 'knownFor',
        labelKey: 'knownFor',
        maxLength: 120,
        readValue: (storeDetails) => storeDetails?.publicPresence?.knownFor,
    },
    {
        key: 'specialNote',
        labelKey: 'specialNote',
        maxLength: 140,
        readValue: (storeDetails) => storeDetails?.publicPresence?.specialNote,
    },
    {
        key: 'tagline',
        labelKey: 'tagline',
        maxLength: 100,
        readValue: (storeDetails) => storeDetails?.tagline,
    },
    {
        key: 'metaTitle',
        labelKey: 'metaTitle',
        maxLength: 60,
        readValue: (storeDetails) => storeDetails?.metaTitle,
    },
    {
        key: 'metaDescription',
        labelKey: 'metaDescription',
        maxLength: 160,
        readValue: (storeDetails) => storeDetails?.metaDescription,
    },
    {
        key: 'pwaShortName',
        labelKey: 'pwaShortName',
        maxLength: 12,
        readValue: (storeDetails) => storeDetails?.pwaSettings?.pwaShortName,
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
