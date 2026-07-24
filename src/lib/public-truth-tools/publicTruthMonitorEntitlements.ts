import { FEATURE_FLAGS } from "@config/features";
import { PUBLIC_TRUTH_MONITOR_SUPPORTED_PAID_PLANS } from "@constant/publicTruthMonitor";
import type { PublicTruthMonitorAccessMode, PublicTruthMonitorEntitlementResult } from "@type/publicTruthMonitor";
import type { StoreDataType } from "@type/platform/store";
import type { FirestoreSubscriptionDoc } from "@type/razorpay";
import { hasValidSubscriptionAccess } from "@util/razorpay";
import { isMenuListSubscriptionEntitledForTenant } from "@lib/billing/menuListSubscriptionEntitlementBoundary";

export interface PublicTruthMonitorEntitlementInput {
    activeSubscription?: FirestoreSubscriptionDoc | null;
    storeDetails?: Partial<StoreDataType> | null;
    storeId?: string | number | null;
    tenantId?: string | number | null;
}

const normalizeId = (value: unknown) => String(value ?? "").trim();

function getPilotStoreIds(): string[] {
    return (FEATURE_FLAGS.PUBLIC_TRUTH_MONITOR_PILOT_STORE_IDS || [])
        .map(normalizeId)
        .filter(Boolean);
}

export function getPublicTruthMonitorPaidPlanIds(): string[] {
    const configured = (FEATURE_FLAGS.PUBLIC_TRUTH_MONITOR_PAID_PLAN_IDS || [])
        .map((plan) => String(plan).trim().toLowerCase())
        .filter(Boolean);
    return configured.length ? configured : PUBLIC_TRUTH_MONITOR_SUPPORTED_PAID_PLANS;
}

export function isPublicTruthMonitorEnabled(): boolean {
    return Boolean(
        FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS
        && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_OWNER_CHECK
        && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MONITOR_ADDON,
    );
}

function hasEligiblePlan(input: PublicTruthMonitorEntitlementInput): boolean {
    const subscription = input.activeSubscription || null;
    const tenantId = input.tenantId ?? input.storeDetails?.tenantId;
    const activePlan = String(subscription?.planId || "").toLowerCase();
    return isMenuListSubscriptionEntitledForTenant(subscription, tenantId)
        && hasValidSubscriptionAccess(subscription)
        && getPublicTruthMonitorPaidPlanIds().includes(activePlan);
}

export function evaluatePublicTruthMonitorEntitlement(
    input: PublicTruthMonitorEntitlementInput = {},
): PublicTruthMonitorEntitlementResult {
    const mode = FEATURE_FLAGS.PUBLIC_TRUTH_MONITOR_ACCESS as PublicTruthMonitorAccessMode;
    if (!isPublicTruthMonitorEnabled()) {
        return {
            allowed: false,
            message: "Public truth history is not available yet.",
            mode,
            reason: "feature_off",
        };
    }

    if (mode === "disabled") {
        return {
            allowed: false,
            message: "Public truth history is not available for this store yet.",
            mode,
            reason: "access_disabled",
        };
    }

    const storeId = normalizeId(input.storeId || input.storeDetails?.storeId);
    if (mode === "pilot") {
        const pilotStoreIds = getPilotStoreIds();
        if (!storeId || !pilotStoreIds.includes(storeId)) {
            return {
                allowed: false,
                message: "Public truth history is available for selected stores.",
                mode,
                reason: "not_pilot_store",
            };
        }
    }

    if (!hasEligiblePlan(input)) {
        return {
            allowed: false,
            message: "Public truth history is available on Pro and Premium MenuList plans.",
            mode,
            reason: "not_paid",
        };
    }

    return {
        allowed: true,
        message: "Public truth history is available.",
        mode,
        reason: "allowed",
    };
}
