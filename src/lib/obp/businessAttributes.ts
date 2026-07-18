import { resolveBusinessCategory } from '@data/shared/businessTypes';
import {
    BusinessAttributeKind,
    getBusinessAttributeKindForCategory,
} from '@data/shared/businessAttributeInference';

export type BusinessAttributeGroup = 'dietary' | 'amenity' | 'service' | 'payment';

export interface BusinessAttributeConfig {
    key: string;
    labelKey: string;
    publicLabelKey: string;
    group: BusinessAttributeGroup;
    icon: string;
    businessKinds?: BusinessAttributeKind[];
}

export interface CustomBusinessAttribute {
    id: string;
    label: string;
    icon?: string;
    active?: boolean;
}

export const MAX_CUSTOM_BUSINESS_ATTRIBUTES = 6;

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

export function normalizeBusinessAttributes(value: unknown): Record<string, boolean> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const attributes = value as Record<string, unknown>;
    const normalized: Record<string, boolean> = Object.create(null);

    BUSINESS_ATTRIBUTE_CONFIG.forEach(({ key }) => {
        if (typeof attributes[key] === 'boolean') normalized[key] = attributes[key];
    });

    return { ...normalized };
}

function getBusinessKind(businessType?: string, businessCategory?: string): BusinessAttributeKind {
    const category = resolveBusinessCategory(businessType, businessCategory) || 'food';
    return getBusinessAttributeKindForCategory(category);
}

export function getBusinessAttributeConfigForType(businessType?: string, businessCategory?: string): BusinessAttributeConfig[] {
    const kind = getBusinessKind(businessType, businessCategory);
    return BUSINESS_ATTRIBUTE_CONFIG.filter((attribute) => (
        !attribute.businessKinds || attribute.businessKinds.includes(kind)
    ));
}

export function getBusinessAttributeGroupsForType(businessType?: string, businessCategory?: string) {
    const attributes = getBusinessAttributeConfigForType(businessType, businessCategory);
    return (Object.keys(BUSINESS_ATTRIBUTE_GROUP_LABELS) as BusinessAttributeGroup[])
        .map((group) => ({
            group,
            labelKey: BUSINESS_ATTRIBUTE_GROUP_LABELS[group],
            fields: attributes.filter((attribute) => attribute.group === group),
        }))
        .filter((group) => group.fields.length > 0);
}

function normalizeCustomBusinessAttributeIcon(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const icon = value.trim();
    if (!icon) return undefined;

    if (icon.startsWith('lu:')) {
        return icon.slice(0, 64);
    }

    if (icon.startsWith('emoji:')) {
        return icon.slice(0, 40);
    }

    return icon.slice(0, 8);
}

export function normalizeCustomBusinessAttributes(value: unknown): CustomBusinessAttribute[] {
    if (!Array.isArray(value)) return [];
    const normalized: CustomBusinessAttribute[] = [];
    const seenIds = new Set<string>();

    for (let index = 0; index < value.length && normalized.length < MAX_CUSTOM_BUSINESS_ATTRIBUTES; index += 1) {
        const entry = value[index];
        const raw = entry && typeof entry === 'object' && !Array.isArray(entry)
            ? entry as Record<string, unknown>
            : {};
        const label = String(raw.label || '').trim().slice(0, 32);
        if (!label) continue;
        const id = String(raw.id || `custom-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`).slice(0, 64);
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        normalized.push({
            id,
            label,
            icon: normalizeCustomBusinessAttributeIcon(raw.icon),
            active: raw.active === undefined ? true : raw.active === true,
        });
    }

    return normalized;
}
