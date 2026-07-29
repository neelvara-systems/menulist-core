export const GROWTH_ACQUISITION_SOURCE = {
    FOUNDER_PILOT: 'founder_pilot',
    MENULIST_PUBLIC_SURFACE: 'menulist_public_surface',
    PHYSICAL_PARTNER: 'physical_partner',
} as const;

export const GROWTH_ACQUISITION_MEDIUM = {
    MANUAL_HANDOFF: 'manual_handoff',
    PARTNER_HANDOFF: 'partner_handoff',
    POWERED_BY: 'powered_by',
} as const;

export const GROWTH_ACQUISITION_CAMPAIGN = {
    BENGALURU_PILOT_2026: 'bengaluru_pilot_2026',
    PRODUCT_LOOP: 'product_loop',
} as const;

export interface GrowthAcquisitionAttribution {
    source: typeof GROWTH_ACQUISITION_SOURCE[keyof typeof GROWTH_ACQUISITION_SOURCE];
    medium: typeof GROWTH_ACQUISITION_MEDIUM[keyof typeof GROWTH_ACQUISITION_MEDIUM];
    campaign: typeof GROWTH_ACQUISITION_CAMPAIGN[keyof typeof GROWTH_ACQUISITION_CAMPAIGN];
}

const ALLOWED_ATTRIBUTION_COMBINATIONS = new Map<string, GrowthAcquisitionAttribution>([
    [{
        source: GROWTH_ACQUISITION_SOURCE.MENULIST_PUBLIC_SURFACE,
        medium: GROWTH_ACQUISITION_MEDIUM.POWERED_BY,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.PRODUCT_LOOP,
    }, {
        source: GROWTH_ACQUISITION_SOURCE.MENULIST_PUBLIC_SURFACE,
        medium: GROWTH_ACQUISITION_MEDIUM.POWERED_BY,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.PRODUCT_LOOP,
    }],
    [{
        source: GROWTH_ACQUISITION_SOURCE.PHYSICAL_PARTNER,
        medium: GROWTH_ACQUISITION_MEDIUM.PARTNER_HANDOFF,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.BENGALURU_PILOT_2026,
    }, {
        source: GROWTH_ACQUISITION_SOURCE.PHYSICAL_PARTNER,
        medium: GROWTH_ACQUISITION_MEDIUM.PARTNER_HANDOFF,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.BENGALURU_PILOT_2026,
    }],
    [{
        source: GROWTH_ACQUISITION_SOURCE.FOUNDER_PILOT,
        medium: GROWTH_ACQUISITION_MEDIUM.MANUAL_HANDOFF,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.BENGALURU_PILOT_2026,
    }, {
        source: GROWTH_ACQUISITION_SOURCE.FOUNDER_PILOT,
        medium: GROWTH_ACQUISITION_MEDIUM.MANUAL_HANDOFF,
        campaign: GROWTH_ACQUISITION_CAMPAIGN.BENGALURU_PILOT_2026,
    }],
].map(([key, value]) => [
    `${key.source}|${key.medium}|${key.campaign}`,
    value,
]));

export const PUBLIC_SURFACE_GROWTH_ATTRIBUTION: GrowthAcquisitionAttribution = {
    source: GROWTH_ACQUISITION_SOURCE.MENULIST_PUBLIC_SURFACE,
    medium: GROWTH_ACQUISITION_MEDIUM.POWERED_BY,
    campaign: GROWTH_ACQUISITION_CAMPAIGN.PRODUCT_LOOP,
};

export function normalizeGrowthAcquisitionAttribution(value: unknown): GrowthAcquisitionAttribution | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    const firstString = (primary: unknown, fallback: unknown): string => {
        if (typeof primary === 'string') return primary.trim();
        return typeof fallback === 'string' ? fallback.trim() : '';
    };
    const source = firstString(candidate.source, candidate.utm_source);
    const medium = firstString(candidate.medium, candidate.utm_medium);
    const campaign = firstString(candidate.campaign, candidate.utm_campaign);
    return ALLOWED_ATTRIBUTION_COMBINATIONS.get(`${source}|${medium}|${campaign}`) || null;
}

export function getGrowthAcquisitionFromSearchParams(
    searchParams?: Record<string, string | string[] | undefined> | URLSearchParams | null,
): GrowthAcquisitionAttribution | null {
    if (!searchParams) return null;
    if (searchParams instanceof URLSearchParams) {
        return normalizeGrowthAcquisitionAttribution({
            utm_source: searchParams.get('utm_source'),
            utm_medium: searchParams.get('utm_medium'),
            utm_campaign: searchParams.get('utm_campaign'),
        });
    }

    const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
    return normalizeGrowthAcquisitionAttribution({
        utm_source: first(searchParams.utm_source),
        utm_medium: first(searchParams.utm_medium),
        utm_campaign: first(searchParams.utm_campaign),
    });
}

export function appendGrowthAcquisitionToUrl(
    value: string,
    attribution: GrowthAcquisitionAttribution,
): string {
    try {
        const url = new URL(value);
        url.searchParams.set('utm_source', attribution.source);
        url.searchParams.set('utm_medium', attribution.medium);
        url.searchParams.set('utm_campaign', attribution.campaign);
        return url.toString();
    } catch {
        return value;
    }
}

export function buildCreateMenuPath(attribution?: GrowthAcquisitionAttribution | null): string {
    if (!attribution) return '/create-menu';
    const params = new URLSearchParams({
        utm_source: attribution.source,
        utm_medium: attribution.medium,
        utm_campaign: attribution.campaign,
    });
    return `/create-menu?${params.toString()}`;
}
