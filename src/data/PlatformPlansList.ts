import { AIEnhancementPack, Feature, Plan } from "./common";
import PlatformFeaturesList from "./PlatformFeaturesList";
import { MENULIST_B2B_PLAN_IDS, MENULIST_B2C_PLAN_IDS } from "@constant/menulistPlans";
import {
    MENULIST_CONTENT_CREDIT_ALLOWANCES,
    MENULIST_CONTENT_CREDIT_PACK,
} from "@data/shared/contentCreditPolicy";


// Plan IDs are immutable, product-namespaced billing and entitlement identities.

const B2CplansList = [
    // Official monthly
    {
        "planId": MENULIST_B2C_PLAN_IDS.OFFICIAL, "type": "B2C", "name": "Official", "isRecommended": false,
        "description": "For one business that needs an official menu, customer page, QR, and share link.",
        "priceINR": { "price": 59900, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.OFFICIAL] },
        "priceUSD": { "price": 2900, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.OFFICIAL] },
        "billingInterval": "MONTH", "minimumQuantity": 1
    },
    // Official Yearly (10 monthly payments)
    {
        "planId": MENULIST_B2C_PLAN_IDS.OFFICIAL, "type": "B2C", "name": "Official (Yearly)", "isRecommended": false,
        "description": "For one business that needs an official menu, customer page, QR, and share link.",
        "priceINR": { "price": 599000, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.OFFICIAL] },
        "priceUSD": { "price": 29000, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.OFFICIAL] },
        "billingInterval": "YEAR", "minimumQuantity": 1
    },
    // Pro Monthly
    {
        "planId": MENULIST_B2C_PLAN_IDS.PRO, "type": "B2C", "name": "Pro", "isRecommended": true,
        "description": "For businesses that want stronger presentation, AI-assisted updates, languages, images, and action insights.",
        "priceINR": { "price": 149900, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.PRO] },
        "priceUSD": { "price": 7900, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.PRO] },
        "billingInterval": "MONTH", "minimumQuantity": 1
    },
    // Pro Yearly
    {
        "planId": MENULIST_B2C_PLAN_IDS.PRO, "type": "B2C", "name": "Pro (Yearly)", "isRecommended": true,
        "description": "For businesses that want stronger presentation, AI-assisted updates, languages, images, and action insights.",
        "priceINR": { "price": 1499000, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.PRO] },
        "priceUSD": { "price": 79000, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.PRO] },
        "billingInterval": "YEAR", "minimumQuantity": 1
    },
    // Multi-location monthly, priced per location
    {
        "planId": MENULIST_B2C_PLAN_IDS.MULTI_LOCATION, "type": "B2C", "name": "Multi-location", "isRecommended": false,
        "description": "For brands that need multi-location menu governance and outlet-level control.",
        "priceINR": { "price": 149900, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.MULTI_LOCATION] },
        "priceUSD": { "price": 7900, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.MULTI_LOCATION] },
        "billingInterval": "MONTH", "minimumQuantity": 2
    },
    // Multi-location Yearly (per location; 10 monthly payments)
    {
        "planId": MENULIST_B2C_PLAN_IDS.MULTI_LOCATION, "type": "B2C", "name": "Multi-location (Yearly)", "isRecommended": false,
        "description": "For brands that need multi-location menu governance and outlet-level control.",
        "priceINR": { "price": 1499000, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.MULTI_LOCATION] },
        "priceUSD": { "price": 79000, "monthlyCredits": MENULIST_CONTENT_CREDIT_ALLOWANCES[MENULIST_B2C_PLAN_IDS.MULTI_LOCATION] },
        "billingInterval": "YEAR", "minimumQuantity": 2
    }
] as const;


const B2BplansList = [
    // Starter API Monthly
    {
        "planId": MENULIST_B2B_PLAN_IDS.STARTER_API, "type": "B2B", "name": "Starter API",
        "description": "Perfect for small businesses getting started",
        "priceINR": { "price": 499900, "monthlyCredits": 200 },
        "priceUSD": { "price": 6900, "monthlyCredits": 200 },
        "billingInterval": "MONTH", "monthlyApiCallAllowance": 1000
    },
    // Starter API Yearly
    {
        "planId": MENULIST_B2B_PLAN_IDS.STARTER_API, "type": "B2B", "name": "Starter API (Yearly)",
        "description": "Perfect for small businesses getting started",
        "priceINR": { "price": 4999000, "monthlyCredits": 200 },
        "priceUSD": { "price": 69000, "monthlyCredits": 200 },
        "billingInterval": "YEAR", "monthlyApiCallAllowance": 1000
    },
    // Pro API Monthly
    {
        "planId": MENULIST_B2B_PLAN_IDS.PRO_API, "type": "B2B", "name": "Pro API",
        "description": "Most popular for growing businesses",
        "priceINR": { "price": 1899900, "monthlyCredits": 1000 },
        "priceUSD": { "price": 24900, "monthlyCredits": 1000 },
        "billingInterval": "MONTH", "monthlyApiCallAllowance": 5000
    },
    // Pro API Yearly
    {
        "planId": MENULIST_B2B_PLAN_IDS.PRO_API, "type": "B2B", "name": "Pro API (Yearly)",
        "description": "Most popular for growing businesses",
        "priceINR": { "price": 18999000, "monthlyCredits": 1000 },
        "priceUSD": { "price": 249000, "monthlyCredits": 1000 },
        "billingInterval": "YEAR", "monthlyApiCallAllowance": 5000
    }
] as const;

// ═══════════════════════════════════════════════════════════
// Content Credit Packs (one pack at launch — per-store)
// @see __docs__/ai-enhancement-packs/ai-enhancement-packs_spec.md
// ═══════════════════════════════════════════════════════════
const aiEnhancementPacksList: AIEnhancementPack[] = [
    {
        "packId": MENULIST_CONTENT_CREDIT_PACK.packId,
        "name": "Content Enhancement Pack",
        "description": "More generated images, descriptions, and translations for your menu.",
        "creditAmount": MENULIST_CONTENT_CREDIT_PACK.creditAmount,
        "priceINR": { "price": MENULIST_CONTENT_CREDIT_PACK.priceINRPaise, "monthlyCredits": null },
        "priceUSD": { "price": MENULIST_CONTENT_CREDIT_PACK.priceUSDCents, "monthlyCredits": null }
    },
];

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

export { aiEnhancementPacksList, B2BplansList, B2CplansList, getB2BPlansList, getB2CPlansList };
