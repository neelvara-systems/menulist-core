/**
 * Canonica Plans — Pricing & Plan Configuration
 *
 * Separate from MenuList plans. Canonica has its own pricing model
 * based on canonical answer volume and API usage.
 *
 * During beta: all features included at $0.
 * Post-beta: per-tenant pricing based on usage.
 *
 * Prices are in smallest currency unit (paise for INR, cents for USD).
 *
 * @see __docs__/canonica/client-onboarding/
 */

export interface CanonicaPlan {
    planId: string;
    name: string;
    description: string;
    isRecommended: boolean;
    billingInterval: 'MONTH' | 'YEAR';
    priceINR: { price: number; monthlyCredits: number };
    priceUSD: { price: number; monthlyCredits: number };
    limits: {
        maxEntities: number;
        maxCanonicalAnswers: number;
        maxKBArticles: number;
        maxSignalEventsPerMonth: number;
        widgetIncluded: boolean;
        apiAccessIncluded: boolean;
    };
}

const CanonicaPlansList: CanonicaPlan[] = [
    // Beta Plan — Free (Monthly)
    {
        planId: 'canonica_beta',
        name: 'Beta',
        description: 'Full access during private beta. All features included.',
        isRecommended: true,
        billingInterval: 'MONTH',
        priceINR: { price: 0, monthlyCredits: 500 },
        priceUSD: { price: 0, monthlyCredits: 500 },
        limits: {
            maxEntities: 200,
            maxCanonicalAnswers: 500,
            maxKBArticles: 200,
            maxSignalEventsPerMonth: 10000,
            widgetIncluded: true,
            apiAccessIncluded: true,
        },
    },
    // Starter Plan — Monthly
    {
        planId: 'canonica_starter',
        name: 'Starter',
        description: 'For SaaS products with up to 50 canonical answers.',
        isRecommended: false,
        billingInterval: 'MONTH',
        priceINR: { price: 299900, monthlyCredits: 200 },
        priceUSD: { price: 4900, monthlyCredits: 200 },
        limits: {
            maxEntities: 50,
            maxCanonicalAnswers: 50,
            maxKBArticles: 50,
            maxSignalEventsPerMonth: 2000,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Starter Plan — Yearly
    {
        planId: 'canonica_starter',
        name: 'Starter (Yearly)',
        description: 'For SaaS products with up to 50 canonical answers.',
        isRecommended: false,
        billingInterval: 'YEAR',
        priceINR: { price: 2999000, monthlyCredits: 200 },
        priceUSD: { price: 49000, monthlyCredits: 200 },
        limits: {
            maxEntities: 50,
            maxCanonicalAnswers: 50,
            maxKBArticles: 50,
            maxSignalEventsPerMonth: 2000,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Pro Plan — Monthly
    {
        planId: 'canonica_pro',
        name: 'Pro',
        description: 'For SaaS products with full canonical governance.',
        isRecommended: true,
        billingInterval: 'MONTH',
        priceINR: { price: 799900, monthlyCredits: 500 },
        priceUSD: { price: 9900, monthlyCredits: 500 },
        limits: {
            maxEntities: 200,
            maxCanonicalAnswers: 500,
            maxKBArticles: 200,
            maxSignalEventsPerMonth: 10000,
            widgetIncluded: true,
            apiAccessIncluded: true,
        },
    },
    // Pro Plan — Yearly
    {
        planId: 'canonica_pro',
        name: 'Pro (Yearly)',
        description: 'For SaaS products with full canonical governance.',
        isRecommended: true,
        billingInterval: 'YEAR',
        priceINR: { price: 7999000, monthlyCredits: 500 },
        priceUSD: { price: 99000, monthlyCredits: 500 },
        limits: {
            maxEntities: 200,
            maxCanonicalAnswers: 500,
            maxKBArticles: 200,
            maxSignalEventsPerMonth: 10000,
            widgetIncluded: true,
            apiAccessIncluded: true,
        },
    },
];

export function getCanonicaPlans(): CanonicaPlan[] {
    return CanonicaPlansList;
}

export function getCanonicaBetaPlan(): CanonicaPlan {
    return CanonicaPlansList[0];
}

export function getCanonicaPlanById(planId: string, interval: 'MONTH' | 'YEAR'): CanonicaPlan | undefined {
    return CanonicaPlansList.find(p => p.planId === planId && p.billingInterval === interval);
}
