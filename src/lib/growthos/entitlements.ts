import { FEATURE_FLAGS } from "@config/features";
import { GROWTHOS_SUPPORTED_PAID_PLANS } from "@constant/growthos";
import type { GrowthOSAccessMode } from "@type/growthos";
import type { StoreDataType } from "@type/platform/store";
import type { FirestoreSubscriptionDoc } from "@type/razorpay";
import { hasValidSubscriptionAccess } from "@util/razorpay";
import { isMenuListSubscriptionEntitledForTenant } from "@lib/billing/menuListSubscriptionEntitlementBoundary";

export interface GrowthOSEntitlementInput {
    activeSubscription?: FirestoreSubscriptionDoc | null;
    storeDetails?: Partial<StoreDataType> | null;
    storeId?: string | number | null;
    tenantId?: string | number | null;
}

export interface GrowthOSEntitlementResult {
    allowed: boolean;
    mode: GrowthOSAccessMode;
    reason: "feature_off" | "access_disabled" | "not_pilot_store" | "not_paid" | "allowed";
    message: string;
}

const normalizeId = (value: unknown) => String(value ?? "").trim();

function getPilotStoreIds(): string[] {
    return (FEATURE_FLAGS.GROWTHOS_PILOT_STORE_IDS || []).map(normalizeId).filter(Boolean);
}

function getPaidPlanIds(): string[] {
    const configured = (FEATURE_FLAGS.GROWTHOS_PAID_PLAN_IDS || []).map((plan) => String(plan).trim().toLowerCase()).filter(Boolean);
    return configured.length ? configured : GROWTHOS_SUPPORTED_PAID_PLANS;
}

export function isGrowthOSMasterEnabled(): boolean {
    return Boolean((FEATURE_FLAGS as any).ENABLE_GROWTHOS_ADDON);
}

function hasEligibleGrowthOSPlan(input: GrowthOSEntitlementInput): boolean {
    const subscription = input.activeSubscription || null;
    const tenantId = input.tenantId ?? input.storeDetails?.tenantId;
    const activePlan = String(subscription?.planId || "").toLowerCase();
    return isMenuListSubscriptionEntitledForTenant(subscription, tenantId)
        && hasValidSubscriptionAccess(subscription)
        && getPaidPlanIds().includes(activePlan);
}

export function evaluateGrowthOSEntitlement(input: GrowthOSEntitlementInput = {}): GrowthOSEntitlementResult {
    const mode = FEATURE_FLAGS.GROWTHOS_ADDON_ACCESS as GrowthOSAccessMode;
    if (!isGrowthOSMasterEnabled()) {
        return {
            allowed: false,
            mode,
            reason: "feature_off",
            message: "Growth Kits is not available yet.",
        };
    }

    if (mode === "disabled") {
        return {
            allowed: false,
            mode,
            reason: "access_disabled",
            message: "Growth Kits is not available for this store yet.",
        };
    }

    const storeId = normalizeId(input.storeId || input.storeDetails?.storeId);

    if (mode === "pilot") {
        const pilotStoreIds = getPilotStoreIds();
        if (!storeId || !pilotStoreIds.includes(storeId)) {
            return {
                allowed: false,
                mode,
                reason: "not_pilot_store",
                message: "Growth Kits is available only for selected pilot stores right now.",
            };
        }
    }

    const hasPaidPlan = hasEligibleGrowthOSPlan(input);

    if (!hasPaidPlan) {
        return {
            allowed: false,
            mode,
            reason: "not_paid",
            message: "Growth Kits is available on Pro and Premium MenuList plans.",
        };
    }

    return { allowed: true, mode, reason: "allowed", message: "Growth Kits is available." };
}

export function shouldShowGrowthOSNavigation(input: GrowthOSEntitlementInput = {}): boolean {
    return evaluateGrowthOSEntitlement(input).allowed;
}
