/**
 * Answerlattice Plans — Pricing & Plan Configuration
 *
 * Separate from MenuList plans. Answerlattice has its own pricing model
 * based on canonical answer volume, knowledge coverage, signals, and workspaces.
 *
 * Public packaging is founder-friendly and region-aware:
 * Launch, Growth, Studio only. Active packaging has no zero-price tier.
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
    // Launch Plan — Monthly
    {
        planId: 'answerlattice_launch',
        name: 'Launch',
        description: 'For one SaaS product building its first governed support layer.',
        isRecommended: false,
        billingInterval: 'MONTH',
        priceINR: { price: 149900, monthlyCredits: 250 },
        priceUSD: { price: 2900, monthlyCredits: 250 },
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
    // Launch Plan — Yearly
    {
        planId: 'answerlattice_launch',
        name: 'Launch (Yearly)',
        description: 'For one SaaS product building its first governed support layer.',
        isRecommended: false,
        billingInterval: 'YEAR',
        priceINR: { price: 1499000, monthlyCredits: 250 },
        priceUSD: { price: 29000, monthlyCredits: 250 },
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
        priceINR: { price: 499900, monthlyCredits: 1000 },
        priceUSD: { price: 9900, monthlyCredits: 1000 },
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
        priceINR: { price: 4999000, monthlyCredits: 1000 },
        priceUSD: { price: 99000, monthlyCredits: 1000 },
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
        priceINR: { price: 1299900, monthlyCredits: 4000 },
        priceUSD: { price: 24900, monthlyCredits: 4000 },
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
        priceINR: { price: 12999000, monthlyCredits: 4000 },
        priceUSD: { price: 249000, monthlyCredits: 4000 },
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

export function getAnswerlatticePlanById(planId: string, interval: 'MONTH' | 'YEAR'): AnswerlatticePlan | undefined {
    return AnswerlatticePlansList.find(p => p.planId === planId && p.billingInterval === interval);
}
