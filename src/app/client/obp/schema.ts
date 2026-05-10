/**
 * OBP Schema.org Structured Data Generator
 *
 * Generates deep LocalBusiness JSON-LD for SEO/AEO.
 * Uses shared schema utilities to eliminate duplication with menu page schema.
 *
 * Fields generated:
 * - @type: Business-specific (Restaurant, BeautySalon, etc.) via getSchemaType()
 * - GeoCoordinates: latitude/longitude for local SEO
 * - sameAs: Social profile links for entity alignment
 * - priceRange: $/$$/$$$/$$$$
 * - dateModified: Freshness signal for AI engines
 * - openingHoursSpecification, address, catalog links, telephone, etc.
 *
 * @see __docs__/discovery-infrastructure/
 * @see __docs__/official-business-page/official-business-page_impl.md §9
 */

import { FEATURE_FLAGS } from '@config/features';
import { getBrandName, getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getPublicBusinessDescription } from '@lib/obp/getPublicBusinessDescription';
import {
    buildAddress,
    buildAmenityFeatures,
    buildPublicCatalogUrlSchema,
    buildGeoCoordinates,
    buildOpeningHours,
    buildSameAs,
    getSchemaType,
    isFoodBusinessCategory,
} from '@lib/schema';

export function generateOBPSchema(
    storeData: any,
    canonicalUrl: string,
    language?: string,
    identityScope: 'brand' | 'store' = 'brand',
    options: { hasPublishedMenu?: boolean; menuUrl?: string } = {},
) {
    const contentLanguage = language || storeData?.defaultLanguage || storeData?.activeLanguages?.[0] || storeData?.language || 'en';
    const publicDisplayName = identityScope === 'store'
        ? getStoreContextName(storeData, 'Business')
        : getBrandName(storeData, 'Business');
    const publicDescriptor = getLocalizedText(
        storeData?.publicPresence?.descriptor,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeData?.publicPresence?.descriptor, contentLanguage),
        '',
    );
    const publicKnownFor = getLocalizedText(
        storeData?.publicPresence?.knownFor,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeData?.publicPresence?.knownFor, contentLanguage),
        '',
    );
    const publicDescription = getPublicBusinessDescription(storeData, contentLanguage);
    const address = buildAddress(storeData);
    const geo = buildGeoCoordinates(storeData);
    const openingHours = buildOpeningHours(storeData);
    const sameAs = buildSameAs(storeData);
    const schemaType = getSchemaType(storeData?.businessType, storeData?.businessCategory);
    const menuUrl = options.hasPublishedMenu
        ? (options.menuUrl || buildMenuUrl(canonicalUrl))
        : undefined;
    const catalogName = publicDescriptor || (isFoodBusinessCategory(storeData?.businessType, storeData?.businessCategory) ? 'Menu' : 'Offerings');

    // Build amenity features from businessAttributes (BTG Layer 12)
    const amenityFeatures = FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES
        ? buildAmenityFeatures(storeData?.businessAttributes)
        : undefined;

    // Build payment accepted from businessAttributes
    const paymentAccepted = FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES
        ? buildPaymentAccepted(storeData?.businessAttributes)
        : undefined;

    return {
        '@context': 'https://schema.org',
        '@type': schemaType,
        '@id': canonicalUrl,
        name: publicDisplayName,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
        identifier: {
            '@type': 'PropertyValue',
            name: 'MenuList Entity ID',
            value: `ml_${storeData?.storeId || 'unknown'}`,
        },
        ...(publicDescription && {
            description: publicDescription,
        }),
        ...buildImageSchema(
            storeData?.logo,
            storeData?.publicPresence?.photos,
            storeData?.publicPresence?.businessCover,
        ),
        url: canonicalUrl,
        ...(storeData?.phoneNumber && { telephone: storeData.phoneNumber }),
        ...(storeData?.email && { email: storeData.email }),
        ...(storeData?.currencyCode && { currenciesAccepted: storeData.currencyCode }),
        ...(storeData?.priceRange && { priceRange: storeData.priceRange }),
        ...(address && { address }),
        ...(geo && { geo }),
        ...(openingHours && { openingHoursSpecification: openingHours }),
        ...(sameAs && { sameAs }),
        ...(amenityFeatures && { amenityFeature: amenityFeatures }),
        ...(paymentAccepted && { paymentAccepted }),
        ...(storeData?.publicPresence?.reservationUrl && {
            acceptsReservations: storeData.publicPresence.reservationUrl,
        }),
        ...buildPublicCatalogUrlSchema(menuUrl, storeData?.businessType, storeData?.businessCategory, catalogName),
        ...buildPotentialActions(
            storeData?.publicPresence?.reservationUrl,
            storeData?.publicPresence?.orderUrl,
        ),
        ...(storeData?.modifiedOn && {
            dateModified: typeof storeData.modifiedOn === 'string'
                ? storeData.modifiedOn
                : storeData.modifiedOn?.toDate?.()?.toISOString?.() || undefined,
        }),
        ...(storeData?.cuisineTypes?.length && { servesCuisine: storeData.cuisineTypes }),
        ...(storeData?.publicPresence?.establishedYear && {
            foundingDate: String(storeData.publicPresence.establishedYear),
        }),
        ...buildAggregateRating(
            storeData?.publicPresence?.googleRating,
            storeData?.publicPresence?.googleReviewCount,
        ),
        ...(storeData?.permanentlyClosed && {
            additionalProperty: {
                '@type': 'PropertyValue',
                name: 'businessStatus',
                value: 'ClosedPermanently',
            },
        }),
        publisher: {
            '@type': 'Organization',
            name: 'MenuList',
            url: 'https://www.menulist.ai',
        },
    };
}

function buildMenuUrl(canonicalUrl: string): string {
    const base = canonicalUrl.replace(/\/$/, '');
    return `${base}/menu`;
}

/**
 * Build potentialAction array for schema.org.
 * Uses ReserveAction for reservations and OrderAction for ordering,
 * each with a proper EntryPoint target per schema.org spec.
 *
 * @see https://schema.org/ReserveAction
 * @see https://schema.org/OrderAction
 */
function buildPotentialActions(reservationUrl?: string, orderUrl?: string): Record<string, any> {
    const actions: any[] = [];

    if (reservationUrl) {
        actions.push({
            '@type': 'ReserveAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: reservationUrl,
                actionPlatform: [
                    'http://schema.org/DesktopWebPlatform',
                    'http://schema.org/IOSPlatform',
                    'http://schema.org/AndroidPlatform',
                ],
            },
            result: {
                '@type': 'FoodEstablishmentReservation',
                name: 'Reserve a table',
            },
        });
    }

    if (orderUrl) {
        actions.push({
            '@type': 'OrderAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: orderUrl,
                actionPlatform: [
                    'http://schema.org/DesktopWebPlatform',
                    'http://schema.org/IOSPlatform',
                    'http://schema.org/AndroidPlatform',
                ],
            },
        });
    }

    if (actions.length === 0) return {};
    return { potentialAction: actions.length === 1 ? actions[0] : actions };
}

/**
 * Build image schema. Combines logo + preview business photos into an image array.
 * Schema.org image can be a single URL or array of URLs.
 */
function buildImageSchema(logo?: string, photos?: string[], businessCover?: string): Record<string, any> {
    const images: string[] = [];
    if (businessCover) images.push(businessCover);
    if (logo) images.push(logo);
    if (photos?.length) {
        for (const p of photos.filter(Boolean).slice(0, 3)) {
            if (!images.includes(p)) images.push(p);
        }
    }
    if (images.length === 0) return {};
    return { image: images.length === 1 ? images[0] : images };
}

/**
 * Build AggregateRating schema from Google review data.
 * Only emits when both rating and review count are available.
 * @see https://schema.org/AggregateRating
 */
function buildAggregateRating(rating?: number, reviewCount?: number): Record<string, any> {
    if (!rating || rating < 1 || rating > 5) return {};
    return {
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            bestRating: 5,
            ...(reviewCount && reviewCount > 0 && { reviewCount }),
        },
    };
}

/**
 * Build paymentAccepted string from businessAttributes.
 * Returns schema.org paymentAccepted value or undefined.
 */
function buildPaymentAccepted(attributes?: Record<string, boolean>): string | undefined {
    if (!attributes) return undefined;
    const methods: string[] = [];
    if (attributes.acceptsCash) methods.push('Cash');
    if (attributes.acceptsCards) methods.push('Credit Card');
    if (attributes.acceptsUPI) methods.push('UPI');
    return methods.length > 0 ? methods.join(', ') : undefined;
}
