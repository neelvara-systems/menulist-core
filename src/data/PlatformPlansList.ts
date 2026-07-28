import { AIEnhancementPack, Feature, Plan } from "./common";
import PlatformFeaturesList from "./PlatformFeaturesList";


// ***********
// DO NOT CHANGE THE PLAN ID IN FUTURE (Used to shhow upgrade button in active subscription card)
// ***********

const B2CplansList = [
    // Starter Monthly
    {
        "planId": "starter", "type": "B2C", "name": "Starter Plan", "isRecommended": false,
        "description": "For one business that needs an official menu, customer page, QR, and share link.",
        "priceINR": { "price": 49900, "monthlyCredits": 75 },
        "priceUSD": { "price": 2900, "monthlyCredits": 100 },
        "billingInterval": "MONTH"
    },
    // Starter Yearly
    {
        "planId": "starter", "type": "B2C", "name": "Starter Plan (Yearly)", "isRecommended": false,
        "description": "For one business that needs an official menu, customer page, QR, and share link.",
        "priceINR": { "price": 499000, "monthlyCredits": 75 },
        "priceUSD": { "price": 29000, "monthlyCredits": 100 },
        "billingInterval": "YEAR"
    },
    // Pro Monthly
    {
        "planId": "pro", "type": "B2C", "name": "Pro Plan", "isRecommended": true,
        "description": "For businesses that want stronger presentation, AI-assisted updates, languages, images, and action insights.",
        "priceINR": { "price": 149900, "monthlyCredits": 200 },
        "priceUSD": { "price": 7900, "monthlyCredits": 400 },
        "billingInterval": "MONTH"
    },
    // Pro Yearly
    {
        "planId": "pro", "type": "B2C", "name": "Pro Plan (Yearly)", "isRecommended": true,
        "description": "For businesses that want stronger presentation, AI-assisted updates, languages, images, and action insights.",
        "priceINR": { "price": 1499000, "monthlyCredits": 200 },
        "priceUSD": { "price": 79000, "monthlyCredits": 400 },
        "billingInterval": "YEAR"
    },
    // Premium Monthly
    {
        "planId": "premium", "type": "B2C", "name": "Premium Plan", "isRecommended": false,
        "description": "For brands that need multi-location menu governance and outlet-level control.",
        "priceINR": { "price": 399900, "monthlyCredits": 600 },
        "priceUSD": { "price": 14900, "monthlyCredits": 1000 },
        "billingInterval": "MONTH"
    },
    // Premium Yearly
    {
        "planId": "premium", "type": "B2C", "name": "Premium Plan (Yearly)", "isRecommended": false,
        "description": "For brands that need multi-location menu governance and outlet-level control.",
        "priceINR": { "price": 3999000, "monthlyCredits": 600 },
        "priceUSD": { "price": 149000, "monthlyCredits": 1000 },
        "billingInterval": "YEAR"
    }
] as const;


const B2BplansList = [
    // Starter API Monthly
    {
        "planId": "starter", "type": "B2B", "name": "Starter API",
        "description": "Perfect for small businesses getting started",
        "priceINR": { "price": 499900, "monthlyCredits": 200 },
        "priceUSD": { "price": 6900, "monthlyCredits": 200 },
        "billingInterval": "MONTH", "monthlyApiCallAllowance": 1000
    },
    // Starter API Yearly
    {
        "planId": "starter", "type": "B2B", "name": "Starter API (Yearly)",
        "description": "Perfect for small businesses getting started",
        "priceINR": { "price": 4999000, "monthlyCredits": 200 },
        "priceUSD": { "price": 69000, "monthlyCredits": 200 },
        "billingInterval": "YEAR", "monthlyApiCallAllowance": 1000
    },
    // Pro API Monthly
    {
        "planId": "pro", "type": "B2B", "name": "Pro API",
        "description": "Most popular for growing businesses",
        "priceINR": { "price": 1899900, "monthlyCredits": 1000 },
        "priceUSD": { "price": 24900, "monthlyCredits": 1000 },
        "billingInterval": "MONTH", "monthlyApiCallAllowance": 5000
    },
    // Pro API Yearly
    {
        "planId": "pro", "type": "B2B", "name": "Pro API (Yearly)",
        "description": "Most popular for growing businesses",
        "priceINR": { "price": 18999000, "monthlyCredits": 1000 },
        "priceUSD": { "price": 249000, "monthlyCredits": 1000 },
        "billingInterval": "YEAR", "monthlyApiCallAllowance": 5000
    }
] as const;

const CustomePlanForB2B = {
    "planId": "custom",
    "type": "B2B",
    "name": "Custom API",
    "billingInterval": null,
    "priceINR": { "price": null, "monthlyCredits": "Custom" },
    "priceUSD": { "price": null, "monthlyCredits": "Custom" },
    "monthlyApiCallAllowance": null,
    "featuresList": PlatformFeaturesList.B2B
} as const;

// ═══════════════════════════════════════════════════════════
// Content Credit Packs (one pack at launch — per-store)
// @see __docs__/ai-enhancement-packs/ai-enhancement-packs_spec.md
// ═══════════════════════════════════════════════════════════
const aiEnhancementPacksList: AIEnhancementPack[] = [
    {
        "packId": "enhancement",
        "name": "Content Credit Pack",
        "description": "More generated images, descriptions, and translations for your menu.",
        "creditAmount": 250,
        "priceINR": { "price": 299900, "monthlyCredits": null },
        "priceUSD": { "price": 2900, "monthlyCredits": null }
    },
];

/** @deprecated Use aiEnhancementPacksList instead */
const creditPacksList: AIEnhancementPack[] = aiEnhancementPacksList;

const getB2CPlansList = (): Plan[] => {
    return B2CplansList.map((plan) => {
        const planFeaturesList: { [key: string]: string | number | boolean } = {};
        PlatformFeaturesList.B2C.forEach((feature: Feature) => {
            planFeaturesList[feature.id] = feature.values[plan.planId];
        });
        return { ...plan, featuresList: planFeaturesList };
    });
}

const getB2BPlansList = (): Plan[] => {
    return B2BplansList.map((plan) => {
        const planFeaturesList: { [key: string]: string | number | boolean } = {};
        PlatformFeaturesList.B2B.forEach((feature: Feature) => {
            planFeaturesList[feature.id] = feature.values[plan.planId];
        });
        return { ...plan, featuresList: planFeaturesList };
    });
}

export { aiEnhancementPacksList, B2BplansList, B2CplansList, creditPacksList, CustomePlanForB2B, getB2BPlansList, getB2CPlansList };
