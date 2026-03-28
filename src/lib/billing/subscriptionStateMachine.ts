import { PaymentStatus } from "@type/razorpay";
import { logger } from "@lib/monitoring/logger";

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
 *   pending  ─→ active
 *   active   ─→ past_due | paused | cancelled | completed | expired (upgrade)
 *   past_due ─→ active | expired
 *   paused   ─→ active | cancelled | expired (upgrade)
 *   cancelled ─→ expired
 *   expired  ─→ (terminal)
 *   completed ─→ (terminal)
 */
const VALID_TRANSITIONS: Record<string, PaymentStatus[]> = {
    pending:   ["active"],
    active:    ["past_due", "paused", "cancelled", "completed", "expired"],
    past_due:  ["active", "expired"],
    paused:    ["active", "cancelled", "expired"],
    cancelled: ["expired"],
    expired:   [],
    completed: [],
};

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
        logger.warn(`[StateMachine] Unknown current state: "${from}" → "${to}" (${context})`);
        return false;
    }

    const isValid = allowed.includes(to);
    if (!isValid) {
        logger.warn(`[StateMachine] Invalid transition: "${from}" → "${to}" (${context})`, {
            from,
            to,
            context,
            allowedTransitions: allowed,
        });
    }
    return isValid;
}
