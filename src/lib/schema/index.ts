/**
 * Shared Schema.org Structured Data Utilities
 *
 * Centralizes schema generation logic used by both OBP and menu pages.
 * Eliminates duplication of address, openingHours, geo, sameAs builders.
 *
 * @see __docs__/discovery-infrastructure/
 * @see __docs__/official-business-page/official-business-page_impl.md §9
 */

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
 * Maps store.businessType values to schema.org @type.
 * Uses specific subtypes for better entity classification in search/AI.
 * Fallback: 'LocalBusiness' for unknown types.
 *
 * @see https://schema.org/LocalBusiness (subtypes list)
 */
const BUSINESS_TYPE_SCHEMA_MAP: Record<string, string> = {
    'restaurant': 'Restaurant',
    'cafe': 'CafeOrCoffeeShop',
    'coffee': 'CafeOrCoffeeShop',
    'bakery': 'Bakery',
    'bar': 'BarOrPub',
    'pub': 'BarOrPub',
    'salon': 'BeautySalon',
    'beauty salon': 'BeautySalon',
    'spa': 'DaySpa',
    'gym': 'ExerciseGym',
    'fitness': 'ExerciseGym',
    'clinic': 'MedicalClinic',
    'medical': 'MedicalClinic',
    'dentist': 'Dentist',
    'hotel': 'Hotel',
    'store': 'Store',
    'shop': 'Store',
    'retail': 'Store',
    'food truck': 'FoodEstablishment',
    'cloud kitchen': 'FoodEstablishment',
    'ice cream': 'IceCreamShop',
    'fast food': 'FastFoodRestaurant',
};

// ── Builders ──

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
    if (!storeData?.geo?.latitude || !storeData?.geo?.longitude) return undefined;

    return {
        '@type': 'GeoCoordinates' as const,
        latitude: storeData.geo.latitude,
        longitude: storeData.geo.longitude,
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
        .filter(
            ([, hours]) =>
                hours &&
                typeof hours === 'string' &&
                (hours as string).includes('-'),
        )
        .map(([day, hours]) => {
            const [opens, closes] = (hours as string).split('-');
            return {
                '@type': 'OpeningHoursSpecification' as const,
                dayOfWeek: DAY_MAP[day.toLowerCase()] || day,
                opens: opens?.trim(),
                closes: closes?.trim(),
            };
        });

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

    if (socialMedia.instagram) {
        const ig = socialMedia.instagram;
        links.push(ig.startsWith('http') ? ig : `https://instagram.com/${ig}`);
    }
    if (socialMedia.facebook) {
        const fb = socialMedia.facebook;
        links.push(fb.startsWith('http') ? fb : `https://facebook.com/${fb}`);
    }
    if (storeData?.url) {
        const url = storeData.url;
        links.push(url.startsWith('http') ? url : `https://${url}`);
    } else if (socialMedia.website) {
        const web = socialMedia.website;
        links.push(web.startsWith('http') ? web : `https://${web}`);
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
export function getSchemaType(businessType?: string): string {
    if (!businessType) return 'LocalBusiness';
    const normalized = businessType.toLowerCase().trim();
    return BUSINESS_TYPE_SCHEMA_MAP[normalized] || 'LocalBusiness';
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

export function buildFaqSchema(storeData: any, canonicalUrl: string, t?: SchemaTranslator, displayName?: string) {
    const faqs: { question: string; answer: string }[] = [];
    const storeName = displayName || storeData?.name || translateSchemaText(t, 'publicFallbackBusiness', {}, 'This business');

    // Q: Working hours
    if (storeData?.workingHours) {
        const days = Object.entries(storeData.workingHours)
            .filter(([, hours]) => hours && typeof hours === 'string' && (hours as string).includes('-'))
            .map(([day, hours]) => {
                const fallbackDay = day.charAt(0).toUpperCase() + day.slice(1);
                const dayLabel = translateSchemaText(t, `publicDays.${day}`, {}, fallbackDay);
                return `${dayLabel}: ${hours}`;
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

    // Q: Menu
    faqs.push({
        question: translateSchemaText(t, 'publicFaqMenuQuestion', { storeName }, `Where can I see the menu for ${storeName}?`),
        answer: translateSchemaText(t, 'publicFaqMenuAnswer', { url: `${canonicalUrl}/menu` }, `You can view the full menu at ${canonicalUrl}/menu — it is always up to date.`),
    });

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
export function buildTempStatusSchema(tempStatus?: {
    type: string;
    message?: string;
    expiresAt: string;
    createdAt: string;
}) {
    if (!tempStatus) return undefined;

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(tempStatus.expiresAt);
    if (expiresAt.getTime() <= now.getTime()) return undefined;

    // Only closure-related statuses get schema representation
    const closureTypes = ['closed_today', 'closing_early', 'kitchen_closed'];
    if (!closureTypes.includes(tempStatus.type)) return undefined;

    const today = now.toISOString().split('T')[0];

    return {
        '@type': 'OpeningHoursSpecification',
        validFrom: today,
        validThrough: expiresAt.toISOString().split('T')[0],
        opens: '00:00',
        closes: '00:00',
        description: tempStatus.message || 'Temporarily closed',
    };
}

/**
 * Get the schema.org @type specifically for menu pages.
 * Menu pages prefer Restaurant/FoodEstablishment types for hasMenu support.
 * Falls back to 'Restaurant' for food-related businesses, otherwise uses getSchemaType.
 */
export function getMenuSchemaType(businessType?: string): string {
    const schemaType = getSchemaType(businessType);

    // For menu pages, food-related businesses should use Restaurant subtypes
    // Non-food businesses fall through to their specific type
    const foodTypes = [
        'Restaurant', 'CafeOrCoffeeShop', 'Bakery', 'BarOrPub',
        'FoodEstablishment', 'IceCreamShop', 'FastFoodRestaurant',
    ];

    if (foodTypes.includes(schemaType)) return schemaType;

    // If generic LocalBusiness but has a menu, likely food-related
    if (schemaType === 'LocalBusiness') return 'Restaurant';

    return schemaType;
}
