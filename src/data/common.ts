// Common tag colors used across the application
export const antdTagColors = [
    'red',
    'orange',
    'green',
    'blue',
    'purple',
    'cyan',
    'magenta',
    'pink',
    'gold',
    'lime',
    'geekblue',
    'volcano'
] as const;

export const antdTagsColorCodes = {
    "red": { "color": "#FF4D4F", "inverse": "#00B2B0" },
    "volcano": { "color": "#FF7A45", "inverse": "#0085BA" },
    "orange": { "color": "#FFA940", "inverse": "#0056BF" },
    "gold": { "color": "#FFC53D", "inverse": "#003AC2" },
    "lime": { "color": "#A0D911", "inverse": "#5F26EE" },
    "green": { "color": "#52C41A", "inverse": "#AD3BE5" },
    "cyan": { "color": "#13C2C2", "inverse": "#E43D3D" },
    "blue": { "color": "#1890FF", "inverse": "#E76F00" },
    "geekblue": { "color": "#2F54EB", "inverse": "#D0AB14" },
    "purple": { "color": "#722ED1", "inverse": "#8DD12E" },
    "magenta": { "color": "#EB2F96", "inverse": "#14D069" },
    "pink": { "color": "#FF85C0", "inverse": "#007A3F" }
}

// --- PRICING PAGE TYPES ---

export type BillingInterval = 'MONTH' | 'YEAR';
export type Currency = 'USD' | 'INR';
export type PlanType = 'B2C' | 'B2B';

export interface Price {
    price: number | null;
    monthlyCredits: number | null;
}

export interface PurchaseIntent {
    plan: Plan;
    currency: Currency;
    businessName: string;
    businessIndustry: string;
    timeZone?: string;
    businessDayEndTime?: string;
}

export interface Plan {
    planId: string;
    type: PlanType;
    name: string;
    description: string;
    isRecommended?: boolean;
    priceINR: Price;
    priceUSD: Price;
    billingInterval: string;
    featuresList: { [key: string]: string | number | boolean };
}

export interface AIEnhancementPack {
    packId: string;
    name: string;
    description: string;
    creditAmount: number;
    priceINR: Price;
    priceUSD: Price;
}

/** @deprecated Use AIEnhancementPack instead — kept for backward compatibility during rename */
export type CreditPack = AIEnhancementPack;

export interface Feature {
    valueLabel: any;
    id: string;
    name: string;
    category: string;
    description: string;
    values: { [key: string]: string | number | boolean };
}

export interface FeatureCategory {
    name: string;
    features: Feature[];
}

// Platform pricing plan (admin-managed via Firestore)
export interface PricingPlan {
    id?: string;
    name: string;
    description: string;
    price: number;
    periodicity: 'MONTH' | 'YEAR';
    currency: 'USD' | 'INR';
    features: string[];
    recommended?: boolean;
    razorpayPlanId?: string;
    active: boolean;
    version: number;
    createdOn?: unknown;
    modifiedOn?: unknown;
    planType: 'B2C' | 'B2B';
}
