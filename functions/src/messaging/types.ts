/**
 * Lifecycle Messaging System — Types
 * 
 * Event-driven operational messaging for store owners.
 * Email only (Phase 1). WhatsApp/Telegram deferred to Phase 2.
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
 */

import { Timestamp } from 'firebase-admin/firestore';

// ================================================================
// MESSAGE EVENTS
// ================================================================

export const MESSAGE_EVENTS = {
  STORE_PUBLISHED: 'STORE_PUBLISHED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  RENEWAL_REMINDER: 'RENEWAL_REMINDER',
  GRACE_PERIOD_STARTED: 'GRACE_PERIOD_STARTED',
  SUSPENSION_WARNING: 'SUSPENSION_WARNING',
  CREDIT_PURCHASE_SUCCESS: 'CREDIT_PURCHASE_SUCCESS',
  CREDITS_EXHAUSTED: 'CREDITS_EXHAUSTED',
} as const;

export type MessageEventType = typeof MESSAGE_EVENTS[keyof typeof MESSAGE_EVENTS];

// ================================================================
// MESSAGE PRIORITY
// ================================================================

export type MessagePriority = 'critical' | 'important' | 'warning';

export const EVENT_PRIORITY: Record<MessageEventType, MessagePriority> = {
  STORE_PUBLISHED: 'important',
  PAYMENT_SUCCESS: 'important',
  PAYMENT_FAILED: 'critical',
  RENEWAL_REMINDER: 'important',
  GRACE_PERIOD_STARTED: 'critical',
  SUSPENSION_WARNING: 'critical',
  CREDIT_PURCHASE_SUCCESS: 'important',
  CREDITS_EXHAUSTED: 'warning',
};

// ================================================================
// MESSAGING ENGINE PAYLOAD
// ================================================================

export interface SendMessagePayload {
  storeId: string;
  tenantId: string;
  eventType: MessageEventType;
  referenceId: string;        // Idempotency: paymentId, subscriptionId, publishId, etc.
  metadata?: Record<string, any>; // Event-specific data for template rendering
}

// ================================================================
// EMAIL TEMPLATE
// ================================================================

export interface EmailTemplate {
  subject: string;
  html: string;
}

// ================================================================
// PROVIDER RESPONSE
// ================================================================

export interface ProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

// ================================================================
// MESSAGE LOG (Firestore document)
// ================================================================

export interface MessageLogDoc {
  storeId: string;
  tenantId: string;
  eventType: MessageEventType;
  channel: 'email';
  status: 'sent' | 'failed';
  recipientEmail: string;
  subject: string;
  referenceId: string;
  providerMessageId?: string;
  error?: string;
  createdAt: Timestamp;
}

// ================================================================
// STORE NOTIFICATION SETTINGS (on store document)
// ================================================================

export interface NotificationSettings {
  primaryEmail: string;
  billingEmail?: string;
  preferredChannel: 'email';
  consentedAt?: string;
  quietHoursEnabled?: boolean;
}

// ================================================================
// DAILY RATE LIMIT
// ================================================================

export const MAX_MESSAGES_PER_STORE_PER_DAY = 10;
