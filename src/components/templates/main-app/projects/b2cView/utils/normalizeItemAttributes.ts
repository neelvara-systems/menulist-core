/**
 * Item Attribute Normalization
 * 
 * ARCHITECTURE PRINCIPLE:
 * - AI produces signals (raw tags)
 * - This layer normalizes them to boolean flags
 * - UI layer enforces what's visible
 * 
 * This is the ONLY place where AI tags are interpreted.
 * After normalization, the rest of the system uses boolean attributes.
 */

/**
 * Normalized item attributes
 * These are the ONLY filterable attributes in the system.
 * Adding new attributes requires explicit approval.
 * 
 * Categories:
 * - Dietary: veg, nonveg (food only)
 * - Audience: forMen, forWomen (service/spa/salon)
 * - Universal: popular (all)
 */
export interface NormalizedAttributes {
    veg: boolean;
    nonveg: boolean;
    popular: boolean;
    forMen: boolean;
    forWomen: boolean;
}

/**
 * Tag patterns for normalization
 * AI may output variations - we normalize them here
 */
const TAG_PATTERNS = {
    // Dietary (food)
    veg: ['vegetarian', 'veg', 'vegan', 'plant-based', 'plant based'],
    nonveg: ['non-vegetarian', 'non-veg', 'nonveg', 'non vegetarian'],
    // Audience (service/spa/salon)
    forMen: ['for men', 'men only', 'gents', 'male', 'men\'s', 'mens'],
    forWomen: ['for women', 'women only', 'ladies', 'female', 'women\'s', 'womens'],
} as const;

/**
 * Normalize AI tags to boolean attributes
 * 
 * @param tags - Raw tags from AI extraction
 * @param isBestSeller - Whether item is marked as bestseller
 * @returns Normalized boolean attributes
 * 
 * @example
 * normalizeTags(['Vegetarian', 'Spicy'], false)
 * // Returns: { veg: true, nonveg: false, popular: false, forMen: false, forWomen: false }
 * 
 * normalizeTags(['For Men'], false)
 * // Returns: { veg: false, nonveg: false, popular: false, forMen: true, forWomen: false }
 */
export function normalizeTags(
    tags?: string[] | Record<string, string>,
    isBestSeller?: boolean
): NormalizedAttributes {
    // Handle both array and object formats (AI can return either)
    let tagArray: string[] = [];

    if (!tags) {
        tagArray = [];
    } else if (Array.isArray(tags)) {
        tagArray = tags;
    } else {
        // It's a multilingual object - extract values and split by comma
        tagArray = Object.values(tags)
            .flatMap((tagString: string) => tagString.split(',').map(tag => tag.trim()))
            .filter(tag => tag.length > 0);
    }

    const normalizedTags = tagArray.map(tag => tag.toLowerCase());

    return {
        veg: normalizedTags.some(tag =>
            TAG_PATTERNS.veg.some(pattern => tag.includes(pattern))
        ),
        nonveg: normalizedTags.some(tag =>
            TAG_PATTERNS.nonveg.some(pattern => tag.includes(pattern))
        ),
        popular: isBestSeller === true,
        forMen: normalizedTags.some(tag =>
            TAG_PATTERNS.forMen.some(pattern => tag.includes(pattern))
        ),
        forWomen: normalizedTags.some(tag =>
            TAG_PATTERNS.forWomen.some(pattern => tag.includes(pattern))
        ),
    };
}

/**
 * Check if item has a specific normalized attribute
 * Use this instead of checking tags directly
 */
export function hasAttribute(
    tags: string[] | undefined,
    isBestSeller: boolean | undefined,
    attribute: keyof NormalizedAttributes
): boolean {
    const normalized = normalizeTags(tags, isBestSeller);
    return normalized[attribute];
}
