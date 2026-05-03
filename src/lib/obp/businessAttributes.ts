export type BusinessAttributeGroup = 'dietary' | 'amenity' | 'service' | 'payment';

export interface BusinessAttributeConfig {
    key: string;
    labelKey: string;
    publicLabelKey: string;
    group: BusinessAttributeGroup;
    icon: string;
    businessKinds?: Array<'food' | 'retail' | 'service' | 'venue'>;
}

export interface CustomBusinessAttribute {
    id: string;
    label: string;
    icon?: string;
    active?: boolean;
}

export const BUSINESS_ATTRIBUTE_GROUP_LABELS: Record<BusinessAttributeGroup, string> = {
    dietary: 'dietaryOptions',
    amenity: 'amenities',
    service: 'serviceModes',
    payment: 'paymentMethods',
};

export const BUSINESS_ATTRIBUTE_CONFIG: BusinessAttributeConfig[] = [
    { key: 'vegetarian', labelKey: 'attrVegetarian', publicLabelKey: 'publicAttributes.vegetarian', group: 'dietary', icon: 'V', businessKinds: ['food'] },
    { key: 'vegan', labelKey: 'attrVegan', publicLabelKey: 'publicAttributes.vegan', group: 'dietary', icon: 'VG', businessKinds: ['food'] },
    { key: 'halal', labelKey: 'attrHalal', publicLabelKey: 'publicAttributes.halal', group: 'dietary', icon: 'H', businessKinds: ['food'] },
    { key: 'glutenFree', labelKey: 'attrGlutenFree', publicLabelKey: 'publicAttributes.glutenFree', group: 'dietary', icon: 'GF', businessKinds: ['food'] },
    { key: 'wifi', labelKey: 'attrWifi', publicLabelKey: 'publicAttributes.wifi', group: 'amenity', icon: 'WiFi' },
    { key: 'outdoorSeating', labelKey: 'attrOutdoorSeating', publicLabelKey: 'publicAttributes.outdoorSeating', group: 'amenity', icon: 'Out' },
    { key: 'parking', labelKey: 'attrParking', publicLabelKey: 'publicAttributes.parking', group: 'amenity', icon: 'P' },
    { key: 'airConditioning', labelKey: 'attrAirConditioning', publicLabelKey: 'publicAttributes.airConditioning', group: 'amenity', icon: 'AC' },
    { key: 'liveMusic', labelKey: 'attrLiveMusic', publicLabelKey: 'publicAttributes.liveMusic', group: 'amenity', icon: 'Live', businessKinds: ['food', 'venue'] },
    { key: 'petFriendly', labelKey: 'attrPetFriendly', publicLabelKey: 'publicAttributes.petFriendly', group: 'amenity', icon: 'Pet' },
    { key: 'dineIn', labelKey: 'attrDineIn', publicLabelKey: 'publicAttributes.dineIn', group: 'service', icon: 'In', businessKinds: ['food', 'venue'] },
    { key: 'takeaway', labelKey: 'attrTakeaway', publicLabelKey: 'publicAttributes.takeaway', group: 'service', icon: 'Take', businessKinds: ['food', 'retail'] },
    { key: 'delivery', labelKey: 'attrDelivery', publicLabelKey: 'publicAttributes.delivery', group: 'service', icon: 'Del' },
    { key: 'driveThrough', labelKey: 'attrDriveThrough', publicLabelKey: 'publicAttributes.driveThrough', group: 'service', icon: 'Drive', businessKinds: ['food'] },
    { key: 'acceptsCards', labelKey: 'attrAcceptsCards', publicLabelKey: 'publicAttributes.acceptsCards', group: 'payment', icon: 'Card' },
    { key: 'acceptsUPI', labelKey: 'attrAcceptsUPI', publicLabelKey: 'publicAttributes.acceptsUPI', group: 'payment', icon: 'UPI' },
    { key: 'acceptsCash', labelKey: 'attrAcceptsCash', publicLabelKey: 'publicAttributes.acceptsCash', group: 'payment', icon: 'Cash' },
];

function getBusinessKind(businessType?: string): 'food' | 'retail' | 'service' | 'venue' {
    const normalized = String(businessType || '').toLowerCase();
    if (/(restaurant|cafe|coffee|bakery|bar|pub|food|kitchen|hotel|dining|pizza|burger|ice|sweet|cloud)/.test(normalized)) {
        return 'food';
    }
    if (/(salon|spa|clinic|doctor|repair|service|studio|gym|fitness|beauty|wellness)/.test(normalized)) {
        return 'service';
    }
    if (/(store|shop|retail|market|boutique|pharmacy|grocery)/.test(normalized)) {
        return 'retail';
    }
    if (/(venue|hall|event|theatre|cinema|club)/.test(normalized)) {
        return 'venue';
    }
    return 'food';
}

export function getBusinessAttributeConfigForType(businessType?: string): BusinessAttributeConfig[] {
    const kind = getBusinessKind(businessType);
    return BUSINESS_ATTRIBUTE_CONFIG.filter((attribute) => (
        !attribute.businessKinds || attribute.businessKinds.includes(kind)
    ));
}

export function getBusinessAttributeGroupsForType(businessType?: string) {
    const attributes = getBusinessAttributeConfigForType(businessType);
    return (Object.keys(BUSINESS_ATTRIBUTE_GROUP_LABELS) as BusinessAttributeGroup[])
        .map((group) => ({
            group,
            labelKey: BUSINESS_ATTRIBUTE_GROUP_LABELS[group],
            fields: attributes.filter((attribute) => attribute.group === group),
        }))
        .filter((group) => group.fields.length > 0);
}

export function normalizeCustomBusinessAttributes(value: unknown): CustomBusinessAttribute[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry, index) => {
            const raw = entry && typeof entry === 'object' ? entry as Record<string, any> : {};
            const label = String(raw.label || '').trim().slice(0, 32);
            if (!label) return null;
            const id = String(raw.id || `custom-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`).slice(0, 64);
            return {
                id,
                label,
                icon: String(raw.icon || '').trim().slice(0, 8) || undefined,
                active: raw.active !== false,
            };
        })
        .filter(Boolean) as CustomBusinessAttribute[];
}
