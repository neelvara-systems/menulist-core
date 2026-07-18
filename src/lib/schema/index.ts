/**
 * Shared Schema.org Structured Data Utilities
 *
 * Centralizes schema generation logic used by both OBP and menu pages.
 * Eliminates duplication of address, openingHours, geo, sameAs builders.
 *
 * @see __docs__/discovery-infrastructure/
 * @see __docs__/official-business-page/official-business-page_impl.md §9
 */

import {
    getBusinessCatalogKind,
    getBusinessOfferingKind,
    getBusinessSchemaOrgType,
    resolveBusinessCategory,
} from '@data/shared/businessTypes';
import { normalizeOBPSocialUrl, normalizeOBPWebsiteUrl } from '@lib/obp/publicLinks';
import { parseWorkingHoursRanges } from '@lib/hours/hoursEngine';
import { getActiveTempStatus } from '@lib/tempStatus/statusBoundary';
import { normalizePhoneNumberForStorage, type PhoneNumberStorageInput } from '@lib/phone/phoneNumber';

// ── Constants ──

const DAY_MAP: Record<string, string> = {
    sun: 'https://schema.org/Sunday',
    mon: 'https://schema.org/Monday',
    tue: 'https://schema.org/Tuesday',
    wed: 'https://schema.org/Wednesday',
    thu: 'https://schema.org/Thursday',
    fri: 'https://schema.org/Friday',
    sat: 'https://schema.org/Saturday',
};

/**
 * Legacy/free-text fallback for older stores or manually entered values that
 * are not present in the canonical BUSINESS_TYPES taxonomy.
 *
 * Canonical exact business type mapping lives in src/data/shared/businessTypes.ts.
 *
 * @see https://schema.org/LocalBusiness
 */
const LEGACY_BUSINESS_TYPE_SCHEMA_FALLBACK: Record<string, string> = {
    'restaurant': 'Restaurant',
    'cafe': 'CafeOrCoffeeShop',
    'coffee shop': 'CafeOrCoffeeShop',
    'specialty coffee shop': 'CafeOrCoffeeShop',
    'coffee': 'CafeOrCoffeeShop',
    'cake shop': 'Bakery',
    'bakery': 'Bakery',
    'bar': 'BarOrPub',
    'pub': 'BarOrPub',
    'ice cream shop': 'IceCreamShop',
    'salon': 'BeautySalon',
    'nail salon': 'BeautySalon',
    'barbershop': 'BeautySalon',
    'beauty salon': 'BeautySalon',
    'spa': 'DaySpa',
    'spa resort': 'DaySpa',
    'gym': 'ExerciseGym',
    'fitness center': 'ExerciseGym',
    'fitness bootcamp': 'ExerciseGym',
    'personal trainer': 'ExerciseGym',
    'yoga studio': 'ExerciseGym',
    'martial arts academy': 'ExerciseGym',
    'fitness': 'ExerciseGym',
    'dental clinic': 'Dentist',
    'clinic': 'MedicalClinic',
    'medical': 'MedicalClinic',
    'dentist': 'Dentist',
    'veterinary clinic': 'VeterinaryCare',
    'hotel': 'Hotel',
    'boutique hotel': 'Hotel',
    'store': 'Store',
    'shop': 'Store',
    'retail': 'Store',
    'fashion boutique': 'ClothingStore',
    'jewelry store': 'JewelryStore',
    'bookstore': 'BookStore',
    'electronics store': 'ElectronicsStore',
    'furniture store': 'FurnitureStore',
    'luxury watch dealer': 'JewelryStore',
    'craft supply store': 'Store',
    'music store': 'MusicStore',
    'shoe store': 'ShoeStore',
    'aquarium store': 'PetStore',
    'florist shop': 'Florist',
    'fitness equipment seller': 'SportingGoodsStore',
    'real estate agent': 'RealEstateAgent',
    'real estate agency': 'RealEstateAgent',
    'law firm': 'LegalService',
    'financial advisor': 'FinancialService',
    'travel agency': 'TravelAgency',
    'home renovation contractor': 'HomeAndConstructionBusiness',
    'cleaning services company': 'HomeAndConstructionBusiness',
    'landscaping service': 'HomeAndConstructionBusiness',
    'landscaping company': 'HomeAndConstructionBusiness',
    'photography studio': 'ProfessionalService',
    'photography tour operator': 'TravelAgency',
    'tattoo studio': 'HealthAndBeautyBusiness',
    'art gallery': 'ArtGallery',
    'music school': 'School',
    'makeup studio': 'BeautySalon',
    'tailoring shop': 'Store',
    'auto repair shop': 'AutoRepair',
    'car dealership': 'AutoDealer',
    'car wash & detailing service': 'AutoWash',
    "children's daycare": 'ChildCare',
    'daycare center': 'ChildCare',
    'food truck': 'FoodEstablishment',
    'cloud kitchen': 'FoodEstablishment',
    'ice cream': 'IceCreamShop',
    'fast food': 'FastFoodRestaurant',
};

const BUSINESS_TYPE_SCHEMA_KEYWORDS: Array<[string, string]> = [
    ['specialty coffee', 'CafeOrCoffeeShop'],
    ['coffee', 'CafeOrCoffeeShop'],
    ['cafe', 'CafeOrCoffeeShop'],
    ['restaurant', 'Restaurant'],
    ['cake', 'Bakery'],
    ['bakery', 'Bakery'],
    ['ice cream', 'IceCreamShop'],
    ['salon', 'BeautySalon'],
    ['barber', 'BeautySalon'],
    ['spa', 'DaySpa'],
    ['gym', 'ExerciseGym'],
    ['fitness', 'ExerciseGym'],
    ['yoga', 'ExerciseGym'],
    ['dental', 'Dentist'],
    ['veterinary', 'VeterinaryCare'],
    ['hotel', 'Hotel'],
    ['boutique', 'ClothingStore'],
    ['jewelry', 'JewelryStore'],
    ['bookstore', 'BookStore'],
    ['electronics', 'ElectronicsStore'],
    ['furniture', 'FurnitureStore'],
    ['florist', 'Florist'],
    ['shoe', 'ShoeStore'],
    ['aquarium', 'PetStore'],
    ['watch', 'JewelryStore'],
    ['real estate', 'RealEstateAgent'],
    ['law', 'LegalService'],
    ['financial', 'FinancialService'],
    ['travel', 'TravelAgency'],
    ['renovation', 'HomeAndConstructionBusiness'],
    ['contractor', 'HomeAndConstructionBusiness'],
    ['cleaning', 'HomeAndConstructionBusiness'],
    ['landscaping', 'HomeAndConstructionBusiness'],
    ['photography', 'ProfessionalService'],
    ['tattoo', 'HealthAndBeautyBusiness'],
    ['art gallery', 'ArtGallery'],
    ['music school', 'School'],
    ['makeup', 'BeautySalon'],
    ['tailoring', 'Store'],
    ['auto repair', 'AutoRepair'],
    ['car dealership', 'AutoDealer'],
    ['car wash', 'AutoWash'],
    ['daycare', 'ChildCare'],
    ['shop', 'Store'],
    ['store', 'Store'],
];

const FOOD_SCHEMA_TYPES = new Set([
    'Restaurant',
    'CafeOrCoffeeShop',
    'Bakery',
    'BarOrPub',
    'FoodEstablishment',
    'IceCreamShop',
    'FastFoodRestaurant',
]);

const PRODUCT_OFFERING_SCHEMA_TYPES = new Set([
    'Store',
    'ClothingStore',
    'JewelryStore',
    'BookStore',
    'ElectronicsStore',
    'FurnitureStore',
    'MusicStore',
    'ShoeStore',
    'PetStore',
    'Florist',
    'SportingGoodsStore',
    'AutoDealer',
]);

const SCHEMA_PRICE_RANGE_MAX_LENGTH = 99;

// ── Builders ──

export function buildSchemaTelephone(input: PhoneNumberStorageInput): string | undefined {
    const telephone = normalizePhoneNumberForStorage(input).phone;
    return telephone || undefined;
}

export function buildSchemaPriceRange(priceRange: unknown): string | undefined {
    const value = String(priceRange ?? '').trim();
    if (!value || value.length > SCHEMA_PRICE_RANGE_MAX_LENGTH) return undefined;
    return value;
}

/**
 * Build PostalAddress schema from store data.
 * Returns undefined if no address data available (Law 5: show less, not wrong).
 */
export function buildAddress(storeData: any) {
    if (!storeData?.addressLine && !storeData?.city) return undefined;

    return {
        '@type': 'PostalAddress' as const,
        ...(storeData?.addressLine && { streetAddress: storeData.addressLine }),
        ...(storeData?.city && { addressLocality: storeData.city }),
        ...(storeData?.state && { addressRegion: storeData.state }),
        ...(storeData?.postalCode && { postalCode: storeData.postalCode }),
        ...(storeData?.country && { addressCountry: storeData.country }),
    };
}

/**
 * Build GeoCoordinates schema from store.geo field.
 * Returns undefined if no geo data available.
 */
export function buildGeoCoordinates(storeData: any) {
    const latitude = Number(storeData?.geo?.latitude);
    const longitude = Number(storeData?.geo?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

    return {
        '@type': 'GeoCoordinates' as const,
        latitude,
        longitude,
    };
}

/**
 * Build OpeningHoursSpecification array from store.workingHours.
 * Parses "HH:mm-HH:mm" format per day.
 * Returns undefined if no hours data available.
 */
export function buildOpeningHours(storeData: any) {
    if (!storeData?.workingHours) return undefined;

    const specs = Object.entries(storeData.workingHours)
        .flatMap(([day, hours]) => (
            DAY_MAP[day.toLowerCase()]
                ? parseWorkingHoursRanges(hours).map((range) => ({
                    '@type': 'OpeningHoursSpecification' as const,
                    dayOfWeek: DAY_MAP[day.toLowerCase()],
                    opens: range.startTime,
                    closes: range.endTime,
                }))
                : []
        ));

    return specs.length > 0 ? specs : undefined;
}

/**
 * Build sameAs array from store social media links.
 * Used for entity alignment in search engines and AI.
 * Returns undefined if no social links available.
 */
export function buildSameAs(storeData: any) {
    const links: string[] = [];
    const socialMedia = storeData?.socialMedia || {};
    const addDirectLink = (url: string | null) => {
        if (!url) return;
        if (!links.includes(url)) links.push(url);
    };

    addDirectLink(normalizeOBPSocialUrl('instagram', socialMedia.instagram));
    addDirectLink(normalizeOBPSocialUrl('facebook', socialMedia.facebook));
    addDirectLink(normalizeOBPSocialUrl('twitter', socialMedia.twitter));
    addDirectLink(normalizeOBPSocialUrl('linkedin', socialMedia.linkedin));
    addDirectLink(normalizeOBPSocialUrl('youtube', socialMedia.youtube));
    if (storeData?.url) {
        addDirectLink(normalizeOBPWebsiteUrl(storeData.url));
    } else if (socialMedia.website) {
        addDirectLink(normalizeOBPWebsiteUrl(socialMedia.website));
    }

    return links.length > 0 ? links : undefined;
}

/**
 * Build amenityFeature array from store.businessAttributes.
 * Maps boolean attributes to schema.org LocationFeatureSpecification.
 * Returns undefined if no attributes set.
 *
 * @see https://schema.org/amenityFeature
 * @see __docs__/business-truth-graph/_archive/chatgpt-review-session13.md §Layer 12
 */
export function buildAmenityFeatures(attributes?: Record<string, boolean>) {
    if (!attributes) return undefined;

    const ATTRIBUTE_LABELS: Record<string, string> = {
        wifi: 'Free WiFi',
        outdoorSeating: 'Outdoor Seating',
        parking: 'Parking',
        airConditioning: 'Air Conditioning',
        liveMusic: 'Live Music',
        petFriendly: 'Pet Friendly',
        vegetarian: 'Vegetarian Options',
        vegan: 'Vegan Options',
        halal: 'Halal',
        glutenFree: 'Gluten-Free Options',
        dineIn: 'Dine-In',
        takeaway: 'Takeaway',
        delivery: 'Delivery',
        driveThrough: 'Drive-Through',
    };

    const features = Object.entries(attributes)
        .filter(([key, value]) => value === true && ATTRIBUTE_LABELS[key])
        .map(([key]) => ({
            '@type': 'LocationFeatureSpecification' as const,
            name: ATTRIBUTE_LABELS[key],
            value: true,
        }));

    return features.length > 0 ? features : undefined;
}

/**
 * Get the most specific schema.org @type for a business.
 * Maps store.businessType to schema.org subtypes.
 * Falls back to 'LocalBusiness' for unknown types.
 */
export function getSchemaType(businessType?: string, businessCategory?: string): string {
    const configuredSchema = getBusinessSchemaOrgType(businessType, businessCategory);
    if (configuredSchema) return configuredSchema;

    const normalized = businessType?.toLowerCase().trim() || '';
    if (normalized && LEGACY_BUSINESS_TYPE_SCHEMA_FALLBACK[normalized]) return LEGACY_BUSINESS_TYPE_SCHEMA_FALLBACK[normalized];
    const keywordMatch = normalized
        ? BUSINESS_TYPE_SCHEMA_KEYWORDS.find(([keyword]) => normalized.includes(keyword))?.[1]
        : undefined;
    if (keywordMatch) return keywordMatch;

    const category = resolveBusinessCategory(businessType, businessCategory);
    if (category === 'food') return 'FoodEstablishment';
    if (category === 'retail') return 'Store';

    return 'LocalBusiness';
}

export function getSchemaBusinessCategory(businessType?: string, businessCategory?: string): string | undefined {
    return resolveBusinessCategory(businessType, businessCategory);
}

export function isFoodSchemaType(schemaType: string): boolean {
    return FOOD_SCHEMA_TYPES.has(schemaType);
}

export function isFoodBusinessCategory(businessType?: string, businessCategory?: string): boolean {
    return getBusinessCatalogKind(businessType, businessCategory) === 'menu'
        || isFoodSchemaType(getSchemaType(businessType, businessCategory))
        || resolveBusinessCategory(businessType, businessCategory) === 'food';
}

export function getOfferingItemSchemaType(businessType?: string, businessCategory?: string): 'Product' | 'Service' {
    const offeringKind = getBusinessOfferingKind(businessType, businessCategory);
    if (offeringKind === 'product') return 'Product';
    if (offeringKind === 'service') return 'Service';

    const category = resolveBusinessCategory(businessType, businessCategory);
    const schemaType = getSchemaType(businessType, businessCategory);
    const normalized = businessType?.toLowerCase().trim() || '';

    if (category === 'retail' || PRODUCT_OFFERING_SCHEMA_TYPES.has(schemaType)) {
        return 'Product';
    }

    if (/(dealer|seller|store|shop|boutique|book|furniture|jewelry|equipment|florist|craft|product)/.test(normalized)) {
        return 'Product';
    }

    return 'Service';
}

export function buildPublicCatalogUrlSchema(
    catalogUrl: string | undefined,
    businessType?: string,
    businessCategory?: string,
    catalogName: string = 'Offerings',
): Record<string, any> {
    if (!catalogUrl) return {};

    if (getBusinessCatalogKind(businessType, businessCategory) === 'menu') {
        return {
            menu: catalogUrl,
            hasMenu: catalogUrl,
        };
    }

    return {
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: catalogName,
            url: catalogUrl,
        },
    };
}

/**
 * Build BreadcrumbList schema for menu pages.
 * Helps search engines understand page hierarchy: Business → Menu
 * Returns undefined if no valid data.
 */
export function buildBreadcrumbList(storeName: string, baseUrl: string, menuName?: string) {
    const items: any[] = [
        {
            '@type': 'ListItem',
            position: 1,
            name: storeName,
            item: baseUrl,
        },
    ];

    if (menuName) {
        items.push({
            '@type': 'ListItem',
            position: 2,
            name: menuName,
        });
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
    };
}

/**
 * Build FAQ schema from store data for OBP pages.
 * Auto-generates common customer questions from available store data.
 * Returns undefined if insufficient data for meaningful FAQs.
 */
type SchemaTranslator = (key: string, values?: Record<string, string | number | boolean | null | undefined>) => string;

function translateSchemaText(
    t: SchemaTranslator | undefined,
    key: string,
    values: Record<string, string | number | boolean | null | undefined>,
    fallback: string,
): string {
    if (!t) return fallback;
    const value = t(key, values);
    return value && value !== key ? value : fallback;
}

export function buildFaqSchema(
    storeData: any,
    canonicalUrl: string,
    t?: SchemaTranslator,
    displayName?: string,
    options: { hasPublishedCatalog?: boolean; catalogUrl?: string } = {},
) {
    const faqs: { question: string; answer: string }[] = [];
    const storeName = displayName || storeData?.name || translateSchemaText(t, 'publicFallbackBusiness', {}, 'This business');
    const catalogUrl = options.hasPublishedCatalog
        ? (options.catalogUrl || `${canonicalUrl}/menu`)
        : undefined;
    const isFoodCatalog = isFoodBusinessCategory(storeData?.businessType, storeData?.businessCategory);

    // Q: Working hours
    if (storeData?.workingHours) {
        const days = Object.entries(storeData.workingHours)
            .flatMap(([day, hours]) => {
                if (!DAY_MAP[day.toLowerCase()]) return [];
                const ranges = parseWorkingHoursRanges(hours);
                if (!ranges.length) return [];
                const fallbackDay = day.charAt(0).toUpperCase() + day.slice(1);
                const dayLabel = translateSchemaText(t, `publicDays.${day}`, {}, fallbackDay);
                const display = ranges.map((range) => `${range.startTime}-${range.endTime}`).join(', ');
                return [`${dayLabel}: ${display}`];
            })
            .join(', ');

        if (days) {
            faqs.push({
                question: translateSchemaText(t, 'publicFaqOpeningHoursQuestion', { storeName }, `What are the opening hours of ${storeName}?`),
                answer: translateSchemaText(t, 'publicFaqOpeningHoursAnswer', { storeName, days }, `${storeName} is open ${days}.`),
            });
        }
    }

    // Q: Location
    if (storeData?.addressLine || storeData?.city) {
        const parts = [storeData.addressLine, storeData.city, storeData.state].filter(Boolean);
        faqs.push({
            question: translateSchemaText(t, 'publicFaqLocationQuestion', { storeName }, `Where is ${storeName} located?`),
            answer: translateSchemaText(t, 'publicFaqLocationAnswer', { storeName, address: parts.join(', ') }, `${storeName} is located at ${parts.join(', ')}.`),
        });
    }

    // Q: Phone
    if (storeData?.phoneNumber) {
        faqs.push({
            question: translateSchemaText(t, 'publicFaqPhoneQuestion', { storeName }, `What is the phone number of ${storeName}?`),
            answer: translateSchemaText(t, 'publicFaqPhoneAnswer', { storeName, phone: storeData.phoneNumber }, `You can reach ${storeName} at ${storeData.phoneNumber}.`),
        });
    }

    if (catalogUrl) {
        faqs.push({
            question: isFoodCatalog
                ? translateSchemaText(t, 'publicFaqMenuQuestion', { storeName }, `Where can I see the menu for ${storeName}?`)
                : translateSchemaText(t, 'publicFaqCatalogQuestion', { storeName }, `Where can I see what ${storeName} offers?`),
            answer: isFoodCatalog
                ? translateSchemaText(t, 'publicFaqMenuAnswer', { url: catalogUrl }, `You can view the full published menu at ${catalogUrl}.`)
                : translateSchemaText(t, 'publicFaqCatalogAnswer', { url: catalogUrl }, `You can view current offerings at ${catalogUrl}.`),
        });
    }

    if (faqs.length < 2) return undefined;

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}

/**
 * Build specialOpeningHoursSpecification from active tempStatus.
 * Reflects temporary closures/changes in schema.org structured data.
 * Returns undefined if no active tempStatus or not closure-related.
 */
export function buildTempStatusSchema(
    tempStatus: unknown,
    timeZone?: string,
    now = new Date(),
) {
    const activeStatus = getActiveTempStatus(tempStatus, now.getTime());
    // Only an explicit whole-business closure can claim closed opening hours.
    // Kitchen-only and early/late notices remain visible banners but must not
    // mark the entire LocalBusiness closed in structured data.
    if (!activeStatus || activeStatus.type !== 'closed_today') return undefined;

    let today: string;
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            day: '2-digit',
            month: '2-digit',
            timeZone: timeZone || 'UTC',
            year: 'numeric',
        }).formatToParts(now);
        const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
        const year = get('year');
        const month = get('month');
        const day = get('day');
        if (!year || !month || !day) return undefined;
        today = `${year}-${month}-${day}`;
    } catch {
        return undefined;
    }

    return {
        '@type': 'OpeningHoursSpecification',
        validFrom: today,
        validThrough: today,
        opens: '00:00',
        closes: '00:00',
        description: activeStatus.message,
    };
}

/**
 * Get the schema.org @type specifically for public catalog pages.
 * Food catalog pages prefer Restaurant/FoodEstablishment types for hasMenu support.
 * Non-food SMB catalog pages preserve the business schema type and use OfferCatalog.
 */
export function getMenuSchemaType(businessType?: string, businessCategory?: string): string {
    const schemaType = getSchemaType(businessType, businessCategory);

    if (isFoodSchemaType(schemaType)) return schemaType;

    // Only food-category unknowns should use Restaurant as the menu-page fallback.
    // Other SMB categories are still customer-facing offering pages, but they
    // must not be mislabeled as restaurants in structured data.
    if (schemaType === 'LocalBusiness' && resolveBusinessCategory(businessType, businessCategory) === 'food') {
        return 'Restaurant';
    }

    return schemaType;
}
