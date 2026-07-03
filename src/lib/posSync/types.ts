/**
 * POS Webhook Sync — Shared Types
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §3
 */

import { Timestamp } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────
// Store posSync config (stored on store document)
// ─────────────────────────────────────────────────────────────

export type PosSyncStatus = 'healthy' | 'retrying' | 'connection_issue' | 'disabled';
export type PosSyncLastStatus = 'success' | 'failed' | 'never_sent';

export interface PosSyncConfig {
    enabled: boolean;
    webhookUrl: string;
    webhookSecret: string;
    status: PosSyncStatus;
    lastSentAt: Timestamp | null;
    lastStatus: PosSyncLastStatus;
    lastError: string;
    menuVersion: number;
    consecutiveFailures?: number;
    instructionsSentCount: number;
    instructionsSentDate: string;
}

// ─────────────────────────────────────────────────────────────
// Delivery Queue Document (posDeliveryQueue collection)
// ─────────────────────────────────────────────────────────────

export type DeliveryJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PosDeliveryJob {
    storeId: number;
    tId: number;
    projectId: string;
    menuVersion: number;
    status: DeliveryJobStatus;
    attempt: number;
    maxAttempts: number;
    payload: string;
    createdOn: Timestamp;
    processedAt: Timestamp | null;
    nextRetryAt: Timestamp | null;
    lastError: string | null;
    webhookUrl: string;
    webhookSecret: string;
}

// ─────────────────────────────────────────────────────────────
// Delivery Log (stores/{storeId}/posDeliveryLogs subcollection)
// ─────────────────────────────────────────────────────────────

export type DeliveryLogStatus = 'success' | 'failed' | 'timeout';

export interface PosDeliveryLog {
    deliveryId: string;
    menuVersion: number;
    status: DeliveryLogStatus;
    responseCode: number | null;
    attempt: number;
    sentAt: Timestamp;
    duration: number;
    error: string | null;
    payloadSize: number;
}

// ─────────────────────────────────────────────────────────────
// Webhook Payload (sent to POS endpoint)
// ─────────────────────────────────────────────────────────────

export interface PosSyncPayload {
    event: 'menu.full.sync' | 'menu.pull' | 'test.ping';
    version: number;
    timestamp: string;
    tenantId: number;
    projectId: string;
    storeId: number;
    currency: string;
    languages: Array<{
        code: string;
        name: string;
        isPrimary: boolean;
    }>;
    menu: {
        categories: PosSyncCategory[];
        items: PosSyncItem[];
    };
}

export interface PosSyncCategory {
    id: string;
    active: boolean;
    name: { [key: string]: string };
    images?: Array<{ url?: string; name?: string }>;
    timeSlots?: Array<{
        presetId?: string;
        startTime?: string;
        endTime?: string;
        days?: number[];
    }>;
    orderIndex?: number;
}

export interface PosSyncItem {
    id: string;
    category: string;
    active: boolean;
    available?: boolean;
    name: { [key: string]: string };
    description?: { [key: string]: string };
    price?: string;
    images?: Array<{ url?: string; name?: string }>;
    tags?: string[];
    isBestSeller?: boolean;
    duration?: number;
    attributes?: Array<{
        id: string;
        name: { [key: string]: string };
        price: string;
        active: boolean;
        orderIndex?: number;
    }>;
    orderIndex?: number;
}

// ─────────────────────────────────────────────────────────────
// Webhook Headers
// ─────────────────────────────────────────────────────────────

export interface PosSyncHeaders {
    'X-MenuList-Signature': string;
    'X-MenuList-Event': string;
    'X-MenuList-Version': string;
    'X-MenuList-Timestamp': string;
    'X-MenuList-Delivery-Id': string;
    'Content-Type': 'application/json';
}

// ─────────────────────────────────────────────────────────────
// Test Webhook Response
// ─────────────────────────────────────────────────────────────

export interface TestWebhookResult {
    success: boolean;
    statusCode: number | null;
    responseTime: number;
    error?: string;
}
