import type { CampaignCueBusinessType } from "@type/campaigncue";

export interface CampaignCueVerticalPlaybook {
    id: string;
    businessType: CampaignCueBusinessType;
    ownerLabel: string;
    ownerJobs: string[];
    recipeIds: string[];
    protectedEvidence: string[];
    prohibitedClaims: string[];
}

const SHARED_RECIPE_IDS = [
    "local_review_request",
    "return_customer_reminder",
    "asset_reuse_old_poster",
    "google_local_visibility_refresh",
] as const;

export const CAMPAIGNCUE_VERTICAL_PLAYBOOKS: CampaignCueVerticalPlaybook[] = [
    {
        id: "playbook_restaurant",
        businessType: "restaurant",
        ownerLabel: "Restaurant and food business",
        ownerJobs: ["Bring people in today", "Promote a current item", "Prepare catering inquiries"],
        recipeIds: ["restaurant_today_item_push", "restaurant_slow_lunch_push", "restaurant_catering_inquiry", ...SHARED_RECIPE_IDS],
        protectedEvidence: ["item", "price", "availability", "offer date", "order path", "service area"],
        prohibitedClaims: ["unconfirmed availability", "invented menu item", "invented price", "unsupported delivery coverage"],
    },
    {
        id: "playbook_salon",
        businessType: "salon",
        ownerLabel: "Salon and appointment business",
        ownerJobs: ["Fill open slots", "Promote weekend availability", "Remind eligible members"],
        recipeIds: ["salon_slot_fill", "salon_weekend_slots", "salon_membership_reminder", ...SHARED_RECIPE_IDS],
        protectedEvidence: ["service", "slot", "price", "membership terms", "booking path", "person-image consent"],
        prohibitedClaims: ["guaranteed result", "unverified before and after", "invented membership benefit", "customer contact import"],
    },
    {
        id: "playbook_retail",
        businessType: "retail",
        ownerLabel: "Retail and local shop",
        ownerJobs: ["Sell a current product", "Announce a new arrival", "Share a back-in-stock update"],
        recipeIds: ["retail_product_push", "retail_new_arrival", "retail_back_in_stock", ...SHARED_RECIPE_IDS],
        protectedEvidence: ["product", "price", "stock", "variant", "offer date", "purchase destination"],
        prohibitedClaims: ["false scarcity", "invented stock", "invented discount", "unsupported product guarantee"],
    },
    {
        id: "playbook_local_service",
        businessType: "local_service",
        ownerLabel: "Local service business",
        ownerJobs: ["Book a service", "Remind nearby customers", "Prepare seasonal maintenance"],
        recipeIds: ["local_service_reminder", "local_service_seasonal_maintenance", ...SHARED_RECIPE_IDS],
        protectedEvidence: ["service", "service area", "availability", "price range", "contact path", "property-image rights"],
        prohibitedClaims: ["invented emergency", "guaranteed repair", "unsupported safety claim", "customer property exposure"],
    },
    {
        id: "playbook_fitness",
        businessType: "fitness",
        ownerLabel: "Fitness and class business",
        ownerJobs: ["Fill a class", "Promote a trial session", "Bring back eligible customers"],
        recipeIds: ["fitness_class_fill", "fitness_trial_session", ...SHARED_RECIPE_IDS],
        protectedEvidence: ["class", "time", "capacity", "price", "eligibility", "person-image consent"],
        prohibitedClaims: ["weight-loss promise", "medical outcome", "guaranteed fitness result", "unconsented member image"],
    },
    {
        id: "playbook_clinic",
        businessType: "clinic",
        ownerLabel: "Clinic and health-adjacent business",
        ownerJobs: ["Share routine availability", "Prepare an appointment reminder", "Keep local information current"],
        recipeIds: ["clinic_appointment_reminder", "clinic_service_availability", ...SHARED_RECIPE_IDS],
        protectedEvidence: ["approved service wording", "availability", "booking path", "location", "privacy", "review requirement"],
        prohibitedClaims: ["diagnosis", "medical advice", "cure claim", "emergency guidance", "patient data", "guaranteed outcome"],
    },
    {
        id: "playbook_other",
        businessType: "other",
        ownerLabel: "Local business",
        ownerJobs: ["Promote one current thing", "Request honest reviews", "Refresh local visibility"],
        recipeIds: ["generic_local_campaign", ...SHARED_RECIPE_IDS],
        protectedEvidence: ["current offer or service", "price or date", "contact path", "location", "asset rights"],
        prohibitedClaims: ["invented offer", "invented business fact", "unsupported outcome", "unverified rights"],
    },
];

const FALLBACK_PLAYBOOK = CAMPAIGNCUE_VERTICAL_PLAYBOOKS.find((playbook) => playbook.businessType === "other")!;

export const campaignCueVerticalPlaybookForBusinessType = (businessType: CampaignCueBusinessType) => (
    CAMPAIGNCUE_VERTICAL_PLAYBOOKS.find((playbook) => playbook.businessType === businessType)
    || FALLBACK_PLAYBOOK
);
