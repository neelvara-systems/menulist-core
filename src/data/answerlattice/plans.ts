/**
 * Answerlattice Plans — Pricing & Plan Configuration
 *
 * Separate from MenuList plans. Answerlattice has its own pricing model
 * based on canonical answer volume, knowledge coverage, signals, and workspaces.
 *
 * Public packaging is founder-friendly and INR-first:
 * Starter, Growth, Studio. Beta remains available as a controlled launch path.
 *
 * Prices are in smallest currency unit (paise for INR, cents for USD).
 *
 * @see __docs__/answerlattice/client-onboarding/
 */

export interface AnswerlatticePlan {
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
        maxWorkspaces?: number;
        widgetIncluded: boolean;
        apiAccessIncluded: boolean;
    };
}

const AnswerlatticePlansList: AnswerlatticePlan[] = [
    // Beta Plan — Free (Monthly)
    {
        planId: 'answerlattice_beta',
        name: 'Beta',
        description: 'Controlled launch access before paid packaging is enabled.',
        isRecommended: true,
        billingInterval: 'MONTH',
        priceINR: { price: 0, monthlyCredits: 500 },
        priceUSD: { price: 0, monthlyCredits: 500 },
        limits: {
            maxEntities: 200,
            maxCanonicalAnswers: 500,
            maxKBArticles: 200,
            maxSignalEventsPerMonth: 10000,
            maxWorkspaces: 1,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Starter Plan — Monthly
    {
        planId: 'answerlattice_starter',
        name: 'Starter',
        description: 'For solo founders launching support for one SaaS product.',
        isRecommended: false,
        billingInterval: 'MONTH',
        priceINR: { price: 99900, monthlyCredits: 150 },
        priceUSD: { price: 1200, monthlyCredits: 150 },
        limits: {
            maxEntities: 50,
            maxCanonicalAnswers: 50,
            maxKBArticles: 50,
            maxSignalEventsPerMonth: 2000,
            maxWorkspaces: 1,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Starter Plan — Yearly
    {
        planId: 'answerlattice_starter',
        name: 'Starter (Yearly)',
        description: 'For solo founders launching support for one SaaS product.',
        isRecommended: false,
        billingInterval: 'YEAR',
        priceINR: { price: 999000, monthlyCredits: 150 },
        priceUSD: { price: 12000, monthlyCredits: 150 },
        limits: {
            maxEntities: 50,
            maxCanonicalAnswers: 50,
            maxKBArticles: 50,
            maxSignalEventsPerMonth: 2000,
            maxWorkspaces: 1,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Growth Plan — Monthly
    {
        planId: 'answerlattice_growth',
        name: 'Growth',
        description: 'For growing SaaS products that need surfaces, signals, and weekly support review.',
        isRecommended: true,
        billingInterval: 'MONTH',
        priceINR: { price: 299900, monthlyCredits: 500 },
        priceUSD: { price: 3600, monthlyCredits: 500 },
        limits: {
            maxEntities: 200,
            maxCanonicalAnswers: 500,
            maxKBArticles: 200,
            maxSignalEventsPerMonth: 10000,
            maxWorkspaces: 1,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Growth Plan — Yearly
    {
        planId: 'answerlattice_growth',
        name: 'Growth (Yearly)',
        description: 'For growing SaaS products that need surfaces, signals, and weekly support review.',
        isRecommended: true,
        billingInterval: 'YEAR',
        priceINR: { price: 2999000, monthlyCredits: 500 },
        priceUSD: { price: 36000, monthlyCredits: 500 },
        limits: {
            maxEntities: 200,
            maxCanonicalAnswers: 500,
            maxKBArticles: 200,
            maxSignalEventsPerMonth: 10000,
            maxWorkspaces: 1,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Studio Plan — Monthly
    {
        planId: 'answerlattice_studio',
        name: 'Studio',
        description: 'For agencies and dev studios managing several small SaaS launches.',
        isRecommended: false,
        billingInterval: 'MONTH',
        priceINR: { price: 699900, monthlyCredits: 1200 },
        priceUSD: { price: 8400, monthlyCredits: 1200 },
        limits: {
            maxEntities: 800,
            maxCanonicalAnswers: 2000,
            maxKBArticles: 800,
            maxSignalEventsPerMonth: 40000,
            maxWorkspaces: 5,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
    // Studio Plan — Yearly
    {
        planId: 'answerlattice_studio',
        name: 'Studio (Yearly)',
        description: 'For agencies and dev studios managing several small SaaS launches.',
        isRecommended: false,
        billingInterval: 'YEAR',
        priceINR: { price: 6999000, monthlyCredits: 1200 },
        priceUSD: { price: 84000, monthlyCredits: 1200 },
        limits: {
            maxEntities: 800,
            maxCanonicalAnswers: 2000,
            maxKBArticles: 800,
            maxSignalEventsPerMonth: 40000,
            maxWorkspaces: 5,
            widgetIncluded: true,
            apiAccessIncluded: false,
        },
    },
];

export function getAnswerlatticePlans(): AnswerlatticePlan[] {
    return AnswerlatticePlansList;
}

export function getAnswerlatticeBetaPlan(): AnswerlatticePlan {
    return AnswerlatticePlansList[0];
}

export function getAnswerlatticePlanById(planId: string, interval: 'MONTH' | 'YEAR'): AnswerlatticePlan | undefined {
    return AnswerlatticePlansList.find(p => p.planId === planId && p.billingInterval === interval);
}
