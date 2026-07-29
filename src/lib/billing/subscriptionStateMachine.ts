import { PaymentStatus } from "@type/razorpay";
import { logger } from "@lib/monitoring/logger";
import { getBoundedRazorpayStringContext } from "@lib/billing/razorpayDiagnostics";

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────
// Single authority for all subscription status transitions.
// Every route, webhook handler, and DAL function that changes status
// MUST call validateTransition() before writing to Firestore.
//
// ⚠️ BILLING IMMUTABILITY RULE:
// DO NOT modify subscription documents manually in Firestore.
// All updates must come through: webhook, verified API routes, or reconciliation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines the ONLY valid state transitions for a subscription.
 * Any transition not listed here is considered invalid and will be logged as a warning.
 *
 * State diagram:
 *   pending  ─→ active | past_due | cancelled
 *   active   ─→ past_due | paused | cancelled | completed | expired (upgrade)
 *   past_due ─→ active | cancelled | expired
 *   paused   ─→ active | cancelled | expired (upgrade)
 *   cancelled ─→ expired
 *   expired  ─→ (terminal)
 *   completed ─→ (terminal)
 */
const VALID_TRANSITIONS: Readonly<Record<string, readonly PaymentStatus[]>> = {
    pending:   ["active", "past_due", "cancelled"],
    active:    ["past_due", "paused", "cancelled", "completed", "expired"],
    past_due:  ["active", "cancelled", "expired"],
    paused:    ["active", "cancelled", "expired"],
    cancelled: ["expired"],
    expired:   [],
    completed: [],
};

const getTransitionLogContext = (
    from: PaymentStatus,
    to: PaymentStatus,
    context: string,
    allowedTransitions: readonly PaymentStatus[] = [],
) => ({
    ...getBoundedRazorpayStringContext('fromStatus', from),
    ...getBoundedRazorpayStringContext('toStatus', to),
    ...getBoundedRazorpayStringContext('transitionContext', context),
    allowedTransitionCount: allowedTransitions.length,
});

/**
 * Validates whether a status transition is allowed.
 * Logs a warning for invalid transitions but does NOT throw — Razorpay webhooks
 * are authoritative and should never be rejected due to local state mismatch.
 *
 * @param from     Current subscription status in Firestore
 * @param to       Target status to transition to
 * @param context  Descriptive context for logging (e.g., "webhook:subscription.charged", "api:cancel-subscription")
 * @returns true if transition is valid, false if invalid (with warning logged)
 */
export function validateTransition(from: PaymentStatus, to: PaymentStatus, context: string): boolean {
    // Same-state "transition" is always valid (idempotent webhook replays)
    if (from === to) return true;

    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) {
        logger.warn('[StateMachine] Unknown current state', getTransitionLogContext(from, to, context));
        return false;
    }

    const isValid = allowed.includes(to);
    if (!isValid) {
        logger.warn('[StateMachine] Invalid transition', getTransitionLogContext(from, to, context, allowed));
    }
    return isValid;
}

export function getAllowedSubscriptionTransitions(from: PaymentStatus): readonly PaymentStatus[] {
    return [...(VALID_TRANSITIONS[from] || [])];
}
