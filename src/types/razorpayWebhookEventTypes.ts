/**
 * Defines the metadata for the payment acquirer.
 */
interface AcquirerData {
    rrn: string;
    upi_transaction_id: string;
}

/**
 * Defines the custom notes attached to a subscription.
 */
interface SubscriptionNotes {
    email: string;
    interval: string;
    name: string;
    planId: string;
    price: string;
    priceKey: string;
    storeId: string;
    tenantId: string;
    userId: string;
    userType: string;
}

/**
 * Represents the payment entity within the event payload.
 */
interface Payment {
    acquirer_data: AcquirerData;
    amount: number;
    amount_refunded: number;
    amount_transferred: number;
    bank: null;
    captured: string; // "1" suggests a string-based boolean
    card_id: null;
    contact: string;
    created_at: number; // Unix timestamp
    currency: string;
    customer_id: null;
    description: string;
    email: string;
    entity: "payment";
    error_code: null;
    error_description: null;
    fee: number;
    id: string;
    international: boolean;
    invoice_id: string;
    method: string;
    notes: unknown[];
    order_id: string;
    refund_status: null;
    status: string;
    tax: number;
    token_id: string;
    vpa: string;
    wallet: null;
}

/**
 * Represents the subscription entity within the event payload.
 */
interface Subscription {
    auth_attempts: number;
    change_scheduled_at: null;
    charge_at: number; // Unix timestamp
    created_at: number; // Unix timestamp
    current_end: number; // Unix timestamp
    current_start: number; // Unix timestamp
    customer_id: null;
    customer_notify: boolean;
    end_at: number; // Unix timestamp
    ended_at: null;
    entity: "subscription";
    expire_by: null;
    has_scheduled_changes: boolean;
    id: string;
    notes: SubscriptionNotes;
    offer_id: null;
    paid_count: number;
    payment_method: string;
    plan_id: string;
    quantity: number;
    remaining_count: number;
    short_url: null;
    source: string;
    start_at: number; // Unix timestamp
    status: string;
    total_count: number;
}

/**
 * The main event payload containing payment and subscription data.
 * NOTE: The JSON provided has a strange `entity: { ... }` wrapper.
 * This type definition uses a more standard, flattened structure.
 */
interface EventPayload {
    payment: {
        entity: Payment;
    };
    subscription: {
        entity: Subscription;
    };
}

/**
 * The top-level event object. 📦
 */
export interface EventObject {
    account_id: string;
    contains: ("subscription" | "payment")[];
    createdBy: string;
    createdOn: string; // ISO Date string
    created_at: number; // Unix timestamp
    entity: "event";
    event: "subscription.activated" | "subscription.charged";
    modifiedBy: string;
    modifiedOn: string; // ISO Date string
    payload: EventPayload;
    role: string;
    sId: number;
    storeId: number;
    tId: number;
    tenantId: number;
    uId: number;
}
