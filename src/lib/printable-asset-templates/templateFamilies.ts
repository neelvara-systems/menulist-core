import {
    getBusinessCategoryConfig,
    getBusinessTypeConfig,
    resolveStoreBusinessCategory,
} from '@data/shared/businessTypes';
import type { PrintableAssetTypeId, PrintableTemplateFamily, PrintableTemplateFamilyId } from './types';

export const DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID: PrintableTemplateFamilyId = 'botanical-heritage';

export const PRINTABLE_TEMPLATE_FAMILIES: PrintableTemplateFamily[] = [
    {
        accentLabel: 'Green heritage',
        bestFor: 'Wellness, organic, local, boutique',
        description: 'Deep green cues with warm paper and heritage framing.',
        id: 'botanical-heritage',
        label: 'Botanical Heritage',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Parchment + red ink',
        bestFor: 'Restaurants, breweries, cafes, bakeries',
        description: 'Warm parchment, editorial red type, and original culinary ink artwork.',
        id: 'craft-kitchen',
        label: 'Craft Kitchen',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessCategories: ['food'], scope: 'business-category' },
    },
    {
        accentLabel: 'Bone paper + ember copper',
        bestFor: 'Grills, steakhouses, barbecue and fire-led dining',
        description: 'A tactile fire-house identity with charcoal printmaking, ember colour, and a quiet premium copy field.',
        id: 'ember-house',
        label: 'Ember House',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessCategories: ['food'], scope: 'business-category' },
    },
    {
        accentLabel: 'Salt paper + deep marine',
        bestFor: 'Seafood, Mediterranean and coastal restaurants',
        description: 'An airy coastal table with sea-glass washes, etched produce, and restrained marine framing.',
        id: 'coastal-table',
        label: 'Coastal Table',
        tier: 'pro',
        tone: 'minimal',
        visibility: { businessCategories: ['food'], scope: 'business-category' },
    },
    {
        accentLabel: 'Warm linen + tomato ink',
        bestFor: 'Neighbourhood restaurants, bistros and family dining',
        description: 'A welcoming all-day dining system with linen texture, produce sketches, and relaxed bistro colour.',
        id: 'sunday-table',
        label: 'Sunday Table',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessCategories: ['food'], scope: 'business-category' },
    },
    {
        accentLabel: 'Cream stock + primary colour',
        bestFor: 'Fast casual, QSR, takeaway and street-food concepts',
        description: 'A disciplined high-energy counter system with screenprint colour, bold geometry, and clean ordering space.',
        id: 'counter-rush',
        label: 'Counter Rush',
        tier: 'pro',
        tone: 'bold',
        visibility: { businessCategories: ['food'], scope: 'business-category' },
    },
    {
        accentLabel: 'Oatmeal + roasted copper',
        bestFor: 'Cafes, coffee shops and specialty roasters',
        description: 'A tactile roastery ledger with engraved coffee botanicals, measured brewing details, and quiet editorial paper.',
        id: 'roastery-ledger',
        label: 'Roastery Ledger',
        tier: 'pro',
        tone: 'heritage',
        visibility: {
            businessTypes: ['Cafe', 'Coffee Shop', 'Specialty Coffee Shop'],
            scope: 'business-type',
        },
    },
    {
        accentLabel: 'Clotted cream + pistachio',
        bestFor: 'Cake shops, bakeries and patisseries',
        description: 'A refined pastry conservatory with engraved bakeware, wheat, fruit, and softly structured brass detailing.',
        id: 'patisserie-conservatory',
        label: 'Patisserie Conservatory',
        tier: 'pro',
        tone: 'heritage',
        visibility: {
            businessTypes: ['Cake Shop', 'Bakery'],
            scope: 'business-type',
        },
    },
    {
        accentLabel: 'Milk cream + Riviera colour',
        bestFor: 'Gelaterias and ice cream shops',
        description: 'A bright Riviera gelateria with artisanal scoops, ingredients, and a playful but disciplined tile frame.',
        id: 'gelateria-riviera',
        label: 'Gelateria Riviera',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessTypes: ['Ice Cream Shop'], scope: 'business-type' },
    },
    {
        accentLabel: 'Ivory + antique brass',
        bestFor: 'Hair salons and colour studios',
        description: 'A handcrafted salon editorial with flowing hair linework, professional tools, warm paper, and restrained brass detail.',
        id: 'salon-atelier',
        label: 'Salon Atelier',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessTypes: ['Salon', 'Makeup Studio'], scope: 'business-type' },
    },
    {
        accentLabel: 'Porcelain + petal blush',
        bestFor: 'Salons, makeup studios, nail and bridal beauty',
        description: 'A light editorial beauty system with hand-painted petals, professional tool gestures, and a protected service-pricing field.',
        id: 'petal-studio',
        label: 'Petal Studio',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessTypes: ['Salon', 'Makeup Studio'], scope: 'business-type' },
    },
    {
        accentLabel: 'Pearl ivory + powder blue',
        bestFor: 'Weddings, boutiques, salons, patisserie and premium hospitality',
        description: 'A luminous identity with sheer ribbon structure, pearl details, and quiet space for packages, tiers, service notes, and refined offers.',
        id: 'pearl-veil',
        label: 'Pearl Veil',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Warm ivory + terracotta',
        bestFor: 'Creative studios, cafés, boutiques, salons and lifestyle brands',
        description: 'A warm metropolitan system with sculptural sun forms, organic linework, and calm service-list clarity.',
        id: 'terracotta-glow',
        label: 'Terracotta Glow',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Daylight cream + celadon',
        bestFor: 'Boutiques, studios, hospitality, wellness and modern services',
        description: 'An airy glasshouse-inspired system with precise architectural geometry, soft foliage, and disciplined category and price columns.',
        id: 'glasshouse-beauty',
        label: 'Glasshouse Garden',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Rice paper + eucalyptus',
        bestFor: 'Spas, treatment studios and spa resorts',
        description: 'A serene hospitality system built around treatment rituals, mineral textures, eucalyptus, and restorative whitespace.',
        id: 'ritual-sanctuary',
        label: 'Ritual Sanctuary',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessTypes: ['Spa', 'Spa Resort'], scope: 'business-type' },
    },
    {
        accentLabel: 'Rice cream + eucalyptus',
        bestFor: 'Day spas, treatment studios and spa resorts',
        description: 'A restorative spa system with eucalyptus, linen, mist, and stone details held outside a generous treatment copy field.',
        id: 'eucalyptus-retreat',
        label: 'Eucalyptus Retreat',
        tier: 'pro',
        tone: 'heritage',
        visibility: { businessTypes: ['Spa', 'Spa Resort'], scope: 'business-type' },
    },
    {
        accentLabel: 'Chalk white + pale aqua',
        bestFor: 'Wellness, hospitality, health, beauty and calm service brands',
        description: 'A clean mineral-water system with ripple contours, limestone texture, and protected columns for details and prices.',
        id: 'mineral-spring',
        label: 'Mineral Spring',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Rice paper + lotus blush',
        bestFor: 'Wellness, hospitality, weddings, cafés and restorative services',
        description: 'A spacious system with original lotus and ripple artwork, warm paper, and serene service storytelling.',
        id: 'lotus-stillness',
        label: 'Lotus Stillness',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Warm cream + turmeric light',
        bestFor: 'Hospitality, cafés, beauty, wellness and lifestyle services',
        description: 'A sun-warmed hospitality system with original botanical and vessel gestures, tactile paper, and clear customer information.',
        id: 'sunlit-ritual',
        label: 'Sunlit Ritual',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Athletic white + cobalt',
        bestFor: 'Gyms, fitness centres, bootcamps and personal trainers',
        description: 'An engineered performance identity with technical training artwork, disciplined cobalt structure, and energetic coral detail.',
        id: 'performance-circuit',
        label: 'Performance Circuit',
        tier: 'pro',
        tone: 'minimal',
        visibility: {
            businessTypes: ['Gym', 'Fitness Center', 'Fitness Bootcamp', 'Personal Trainer'],
            scope: 'business-type',
        },
    },
    {
        accentLabel: 'Ivory + black ink',
        bestFor: 'Rooftop restaurants, cafes, organic dining',
        description: 'Warm paper, hand-drawn vine rules, and a quiet artisanal layout.',
        id: 'ink-vine',
        label: 'Ink & Vine',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Midnight + champagne',
        bestFor: 'Cocktail bars, lounges, evening venues',
        description: 'Velvety dark paper with disciplined Art Deco geometry and gold light.',
        id: 'midnight-gold',
        label: 'Midnight Gold',
        tier: 'pro',
        tone: 'dark',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Apricot + deep teal',
        bestFor: 'Salons, spas, beauty and wellness',
        description: 'A sunset gradient, watercolor edges, and a refined atelier frame.',
        id: 'sunset-atelier',
        label: 'Sunset Atelier',
        tier: 'pro',
        tone: 'dark',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Porcelain + dusty rose',
        bestFor: 'Beauty salons, makeup studios, nail and skin services',
        description: 'A poised beauty-editorial system with sculptural curves, warm paper, and restrained brass lines.',
        id: 'rosewater-editorial',
        label: 'Rosewater Editorial',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Limestone + mineral sage',
        bestFor: 'Day spas, spa resorts, massage and wellness studios',
        description: 'A calm mineral-paper composition with water contours, quiet sage washes, and restorative whitespace.',
        id: 'mineral-sanctuary',
        label: 'Mineral Sanctuary',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Smoked charcoal + copper',
        bestFor: 'Premium salons, grooming studios and evening beauty concepts',
        description: 'A cinematic studio identity with dark satin depth, architectural lines, and crisp pearl typography.',
        id: 'noir-studio',
        label: 'Noir Studio',
        tier: 'pro',
        tone: 'dark',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Old paper + oxblood',
        bestFor: 'Indian restaurants, heritage cafes, bakeries',
        description: 'Narrative café printmaking with railway green, ticket details, and aged paper.',
        id: 'bombay-chronicle',
        label: 'Bombay Chronicle',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Gallery ivory + garnet',
        bestFor: 'Chef-led dining, hotels, tasting menus',
        description: 'Generous gallery whitespace with linen texture, jaali detail, and bronze rules.',
        id: 'indian-atelier',
        label: 'Indian Atelier',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Ivory + champagne garden',
        bestFor: 'Weddings, boutique hotels, upscale dining',
        description: 'A symmetrical Deco frame with celadon palms and dusty-rose geometric blooms.',
        id: 'art-deco-garden',
        label: 'Art-Deco Garden',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Sumi + vermilion',
        bestFor: 'Sushi, robata, seafood, evening venues',
        description: 'Cinematic indigo paper with a rice-paper moon, ink clouds, and gold ripples.',
        id: 'japanese-night-luxe',
        label: 'Japanese Night Luxe',
        tier: 'pro',
        tone: 'dark',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Clotted cream + duck egg',
        bestFor: 'Afternoon tea, patisserie, dessert cafes',
        description: 'Ceremonious tea-salon stationery with engraved berries and antique-gold framing.',
        id: 'tea-salon-heritage',
        label: 'Tea Salon Heritage',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Coconut + block print',
        bestFor: 'Sri Lankan, South Indian, tropical casual dining',
        description: 'Hand-carved edge artwork in cinnamon, turmeric, lagoon, and aubergine.',
        id: 'lankan-block-print',
        label: 'Lankan Block Print',
        tier: 'pro',
        tone: 'bold',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Gallery ivory + cobalt',
        bestFor: 'Retail, professional services, studios and creative businesses',
        description: 'A precise editorial catalogue with architectural colour planes, quiet paper, and a disciplined presentation grid.',
        id: 'gallery-ledger',
        label: 'Gallery Ledger',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Marine + mineral motion',
        bestFor: 'Fitness, clinics, wellness, training and active services',
        description: 'A high-clarity health and performance system with mineral motion, marine structure, and an energetic coral accent.',
        id: 'vital-current',
        label: 'Vital Current',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Flax + blueprint ink',
        bestFor: 'Makers, contractors, repair, specialty and practical services',
        description: 'A tactile maker catalogue with flax paper, blueprint precision, material swatches, and warm workshop colour.',
        id: 'workshop-atlas',
        label: 'Workshop Atlas',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Cream + civic spruce',
        bestFor: 'Pet care, neighbourhood services and appointment businesses',
        description: 'A friendly service standard with ticket geometry, calm paper, and small practical edge details.',
        id: 'neighbourhood-standard',
        label: 'Neighbourhood Standard',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Flax + field olive',
        bestFor: 'Cleaning, landscaping, detailing and mobile services',
        description: 'An assured field guide with practical contours, tactile paper, and structured service colour.',
        id: 'field-notes',
        label: 'Field Notes',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Ivory + oxblood display',
        bestFor: 'Fashion, jewellery, footwear and premium retail',
        description: 'A polished shop-window system with quiet Deco arches, display plinths, and champagne rules.',
        id: 'boutique-window',
        label: 'Boutique Window',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Oat + market colour',
        bestFor: 'Books, flowers, crafts, music and independent shops',
        description: 'A contemporary market-label world with crafted botanical marks, paper tags, and warm retail colour.',
        id: 'market-label',
        label: 'Market Label',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Institutional cream + navy',
        bestFor: 'Legal, financial, property and advisory practices',
        description: 'A trustworthy letterpress system with disciplined rules, restrained brass, and formal editorial balance.',
        id: 'civic-letterpress',
        label: 'Civic Letterpress',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Pearl + architectural teal',
        bestFor: 'Consultants, planners, coaches and modern practices',
        description: 'A clear contemporary practice system with translucent geometry, generous whitespace, and measured colour.',
        id: 'modern-practice',
        label: 'Modern Practice',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Paper white + studio primaries',
        bestFor: 'Photography, art, tattoo, music and visual studios',
        description: 'An expressive contact-sheet system with analogue marks, screenprint colour, and a controlled gallery field.',
        id: 'studio-contact-sheet',
        label: 'Studio Contact Sheet',
        tier: 'pro',
        tone: 'bold',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Linen + crafted plum',
        bestFor: 'Makers, florists, tailors, decorators and handmade brands',
        description: 'A tactile maker ledger with stitched edges, material swatches, and restrained botanical craft marks.',
        id: 'maker-ledger',
        label: 'Maker Ledger',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Bone + clinical teal',
        bestFor: 'Dental, veterinary and modern care practices',
        description: 'A reassuring clinical system with mineral movement, scientific linework, and calm high-contrast clarity.',
        id: 'clinical-calm',
        label: 'Clinical Calm',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Warm mist + mindful indigo',
        bestFor: 'Yoga, movement, martial arts and wellbeing studios',
        description: 'A restorative motion system with breath arcs, tactile circles, and spacious layered colour.',
        id: 'mindful-motion',
        label: 'Mindful Motion',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Warm stone + house green',
        bestFor: 'Boutique hotels, coworking, daycare and guest-led businesses',
        description: 'A welcoming hospitality house with architectural arches, textile detail, and quiet premium warmth.',
        id: 'hospitality-house',
        label: 'Hospitality House',
        tier: 'pro',
        tone: 'heritage',
        visibility: { scope: 'common' },
    },
    {
        accentLabel: 'Pale alloy + signal blue',
        bestFor: '3D printing, drones, automotive and technical specialists',
        description: 'A future-facing technical field with isometric structure, material samples, and precise signal accents.',
        id: 'future-workshop',
        label: 'Future Workshop',
        tier: 'pro',
        tone: 'minimal',
        visibility: { scope: 'common' },
    },
];

const LEGACY_PRINTABLE_TEMPLATE_FAMILY_ALIASES: Readonly<Record<string, PrintableTemplateFamilyId>> = {
    'brand-banner': 'art-deco-garden',
    'classic-luxe': 'botanical-heritage',
    'clean-utility': 'indian-atelier',
    'executive-dark': 'midnight-gold',
    'local-bold': 'lankan-block-print',
    'modern-calm': 'indian-atelier',
    'qr-first': 'indian-atelier',
    'soft-curve': 'sunset-atelier',
};

export function isPrintableTemplateFamilyId(value?: string | null): value is PrintableTemplateFamilyId {
    return Boolean(
        value
        && (
            PRINTABLE_TEMPLATE_FAMILIES.some((family) => family.id === value)
            || LEGACY_PRINTABLE_TEMPLATE_FAMILY_ALIASES[value]
        )
    );
}

export function normalizePrintableTemplateFamilyId(value?: string | null): PrintableTemplateFamilyId {
    if (!value) return DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID;
    if (PRINTABLE_TEMPLATE_FAMILIES.some((family) => family.id === value)) {
        return value as PrintableTemplateFamilyId;
    }
    return LEGACY_PRINTABLE_TEMPLATE_FAMILY_ALIASES[value] || DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID;
}

export function getPrintableTemplateFamily(id?: string | null): PrintableTemplateFamily {
    const normalized = normalizePrintableTemplateFamilyId(id);
    return PRINTABLE_TEMPLATE_FAMILIES.find((family) => family.id === normalized) || PRINTABLE_TEMPLATE_FAMILIES[0];
}

export const PRINTABLE_THEME_FAMILY_IDS: readonly PrintableTemplateFamilyId[] = [
    'botanical-heritage',
    'craft-kitchen',
    'ember-house',
    'coastal-table',
    'sunday-table',
    'counter-rush',
    'roastery-ledger',
    'patisserie-conservatory',
    'gelateria-riviera',
    'salon-atelier',
    'petal-studio',
    'pearl-veil',
    'terracotta-glow',
    'glasshouse-beauty',
    'ritual-sanctuary',
    'eucalyptus-retreat',
    'mineral-spring',
    'lotus-stillness',
    'sunlit-ritual',
    'performance-circuit',
    'ink-vine',
    'midnight-gold',
    'sunset-atelier',
    'rosewater-editorial',
    'mineral-sanctuary',
    'noir-studio',
    'bombay-chronicle',
    'indian-atelier',
    'art-deco-garden',
    'japanese-night-luxe',
    'tea-salon-heritage',
    'lankan-block-print',
    'gallery-ledger',
    'vital-current',
    'workshop-atlas',
    'neighbourhood-standard',
    'field-notes',
    'boutique-window',
    'market-label',
    'civic-letterpress',
    'modern-practice',
    'studio-contact-sheet',
    'maker-ledger',
    'clinical-calm',
    'mindful-motion',
    'hospitality-house',
    'future-workshop',
];

export function getPrintableThemeFamilies(): PrintableTemplateFamily[] {
    return PRINTABLE_THEME_FAMILY_IDS.map((id) => getPrintableTemplateFamily(id));
}

/**
 * Owner catalog eligibility is separate from renderer support. The renderer
 * retains every canonical family for internal previews and regression output,
 * while owner-facing selection and preference resolution use this fail-closed
 * business applicability boundary.
 */
export function isPrintableTemplateFamilyVisibleForBusiness(params: {
    businessCategory?: string | null;
    businessType?: string | null;
    templateFamilyId: PrintableTemplateFamilyId;
}): boolean {
    if (!isPrintableTemplateFamilyId(params.templateFamilyId)) return false;
    const family = getPrintableTemplateFamily(params.templateFamilyId);
    if (family.visibility.scope === 'common') return true;

    if (family.visibility.scope === 'business-type') {
        const canonicalBusinessType = getBusinessTypeConfig(params.businessType || undefined)?.value;
        return Boolean(
            canonicalBusinessType
            && family.visibility.businessTypes.includes(canonicalBusinessType),
        );
    }

    const canonicalBusinessType = getBusinessTypeConfig(params.businessType || undefined);
    const explicitBusinessCategory = getBusinessCategoryConfig(params.businessCategory || undefined);
    if (!canonicalBusinessType && !explicitBusinessCategory) return false;
    const canonicalBusinessCategory = resolveStoreBusinessCategory(
        params.businessType || undefined,
        params.businessCategory || undefined,
    );
    return family.visibility.businessCategories.includes(canonicalBusinessCategory);
}

export function isPrintableThemeFamilyId(value?: string | null): value is PrintableTemplateFamilyId {
    return Boolean(value && PRINTABLE_THEME_FAMILY_IDS.includes(value as PrintableTemplateFamilyId));
}

export function getPrintableTemplateFamiliesForAsset(assetTypeId: PrintableAssetTypeId): PrintableTemplateFamily[] {
    void assetTypeId;
    return getPrintableThemeFamilies();
}

export function mapPrintableTemplateToMenuCardStyle(id?: string | null): 'classic' | 'compact' | 'premium' {
    const familyId = normalizePrintableTemplateFamilyId(id);
    if (PRINTABLE_THEME_FAMILY_IDS.includes(familyId)) return 'premium';
    return 'classic';
}
