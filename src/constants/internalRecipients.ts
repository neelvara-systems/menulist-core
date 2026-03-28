/**
 * Internal Notification Recipients
 * 
 * Centralized constants for founder/team contact info.
 * Used by internal messaging (Telegram alerts, email notifications to US — not clients).
 * 
 * Two messaging channels exist in MenuList:
 * 1. EXTERNAL (to clients) — Lifecycle messaging via nodemailer SMTP
 *    → Payment confirmations, welcome emails, renewal reminders
 *    → Recipient: store owner's email (from store doc or subscription)
 *    → @see src/lib/messaging/index.ts
 * 
 * 2. INTERNAL (to us/founder) — Telegram alerts + email
 *    → Revenue events (subscription purchased, credit pack bought)
 *    → System failures (payment failures, scheduler crashes, health check failures)
 *    → Recipient: founder email/Telegram (constants below)
 *    → @see src/lib/ops/alerts.ts (Telegram)
 *    → @see src/lib/messaging/index.ts (email with INTERNAL_ events)
 * 
 * IMPORTANT: Telegram bot token and chat ID are in Firebase secrets / env vars.
 * These constants are for email-based internal notifications.
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
 */

export const INTERNAL_RECIPIENTS = {
    /**
     * Primary founder email — receives revenue notifications
     * Change this when adding team members
     */
    FOUNDER_EMAIL: process.env.INTERNAL_NOTIFICATION_EMAIL || 'founder@menulist.ai',

    /**
     * Finance/billing email — receives payment summaries
     * Same as founder for solo operation, separate when team grows
     */
    BILLING_EMAIL: process.env.INTERNAL_BILLING_EMAIL || 'founder@menulist.ai',
} as const;

/**
 * Internal event types — notifications sent to US (founder/team)
 * These are separate from lifecycle events sent to clients.
 */
export const INTERNAL_EVENTS = {
    /** New subscription purchased — revenue event */
    SUBSCRIPTION_PURCHASED: 'INTERNAL_SUBSCRIPTION_PURCHASED',
    /** Credit pack purchased — revenue event */
    CREDIT_PACK_PURCHASED: 'INTERNAL_CREDIT_PACK_PURCHASED',
    /** Subscription renewed (recurring payment) — revenue event */
    SUBSCRIPTION_RENEWED: 'INTERNAL_SUBSCRIPTION_RENEWED',
} as const;

export type InternalEventType = typeof INTERNAL_EVENTS[keyof typeof INTERNAL_EVENTS];
