import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';

export type FounderRevenueMovementKind =
  | 'new_mrr'
  | 'cash_collected'
  | 'failed_payment'
  | 'churn'
  | 'refund'
  | 'expansion_mrr'
  | 'downgrade_mrr';

export interface FounderRevenueMovementInput {
  amountPaise: number;
  currency?: string | null;
  description?: string | null;
  eventName?: string | null;
  id: string;
  kind: FounderRevenueMovementKind;
  occurredAt?: Date | number | string | null;
  paymentId?: string | null;
  planId?: string | null;
  planName?: string | null;
  productId?: ProductId | string | null;
  source: string;
  storeId?: number | string | null;
  subscriptionId?: string | null;
  tenantId?: number | string | null;
}

const INDIA_OFFSET_MS = 330 * 60 * 1000;
const SUMMARY_DOC_ID = 'founderMonitorRevenue';
const DAILY_DOC_PREFIX = 'founderMonitorRevenueDaily_';
const ONBOARDING_TRANSITION_SOURCE = 'founderRevenueReadModel:new_mrr';

function safeNumber(value: unknown): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanText(value: unknown, max = 180): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizeMovementId(value: string): string {
  return cleanText(value, 240)
    .replace(/[^a-zA-Z0-9_.:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 220);
}

function normalizeFounderRevenueMovementDocumentId(value: string): string | null {
  const movementId = normalizeMovementId(value);
  return isValidFirestoreDocumentId(movementId) ? movementId : null;
}

function normalizeFounderRevenueStoreDocumentId(value: unknown): string | null {
  const storeId = cleanText(value, 80);
  return isValidFirestoreDocumentId(storeId) ? storeId : null;
}

function toDate(value: FounderRevenueMovementInput['occurredAt']): Date {
  if (!value) return new Date();
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'number') {
    const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);
    return Number.isFinite(date.getTime()) ? date : new Date();
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function getIndiaDayKey(date: Date): string {
  const local = new Date(date.getTime() + INDIA_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

function getMonthKey(date: Date): string {
  const local = new Date(date.getTime() + INDIA_OFFSET_MS);
  return local.toISOString().slice(0, 7);
}

function normalizedProductId(productId: unknown): string {
  return cleanText(productId || PRODUCT_IDS.MENULIST, 12) || PRODUCT_IDS.MENULIST;
}

function shouldTrackProduct(productId: unknown): boolean {
  return normalizedProductId(productId) === PRODUCT_IDS.MENULIST;
}

function getMrrDelta(kind: FounderRevenueMovementKind, amountPaise: number): number {
  if (kind === 'new_mrr' || kind === 'expansion_mrr') return amountPaise;
  if (kind === 'churn' || kind === 'downgrade_mrr') return -amountPaise;
  return 0;
}

function getDailyCounterUpdates(kind: FounderRevenueMovementKind, amountPaise: number) {
  const FieldValue = admin.firestore.FieldValue;
  const updates: Record<string, FirebaseFirestore.FieldValue | number> = {
    movementCount: FieldValue.increment(1),
  };

  if (kind === 'cash_collected') {
    updates.cashCollectedPaise = FieldValue.increment(amountPaise);
  } else if (kind === 'failed_payment') {
    updates.failedPaymentAmountPaise = FieldValue.increment(amountPaise);
    updates.failedPaymentCount = FieldValue.increment(1);
  } else if (kind === 'new_mrr') {
    updates.newMrrPaise = FieldValue.increment(amountPaise);
    updates.netNewMrrPaise = FieldValue.increment(amountPaise);
    updates.activeSubscriptionDelta = FieldValue.increment(1);
  } else if (kind === 'churn') {
    updates.churnedMrrPaise = FieldValue.increment(amountPaise);
    updates.netNewMrrPaise = FieldValue.increment(-amountPaise);
    updates.churnedSubscriptionCount = FieldValue.increment(1);
    updates.activeSubscriptionDelta = FieldValue.increment(-1);
  } else if (kind === 'refund') {
    updates.refundAmountPaise = FieldValue.increment(amountPaise);
  } else if (kind === 'expansion_mrr') {
    updates.expansionMrrPaise = FieldValue.increment(amountPaise);
    updates.netNewMrrPaise = FieldValue.increment(amountPaise);
  } else if (kind === 'downgrade_mrr') {
    updates.downgradeMrrPaise = FieldValue.increment(amountPaise);
    updates.netNewMrrPaise = FieldValue.increment(-amountPaise);
  }

  return updates;
}

function getSummaryCounterUpdates(kind: FounderRevenueMovementKind, amountPaise: number, mrrDeltaPaise: number) {
  const FieldValue = admin.firestore.FieldValue;
  const updates: Record<string, FirebaseFirestore.FieldValue | number> = {
    currentMrrPaise: FieldValue.increment(mrrDeltaPaise),
    movementCount: FieldValue.increment(1),
  };

  if (kind === 'cash_collected') {
    updates.cashCollectedLifetimePaise = FieldValue.increment(amountPaise);
  } else if (kind === 'failed_payment') {
    updates.failedPaymentLifetimePaise = FieldValue.increment(amountPaise);
    updates.failedPaymentLifetimeCount = FieldValue.increment(1);
  } else if (kind === 'new_mrr') {
    updates.newMrrLifetimePaise = FieldValue.increment(amountPaise);
    updates.activeSubscriptions = FieldValue.increment(1);
  } else if (kind === 'churn') {
    updates.churnedMrrLifetimePaise = FieldValue.increment(amountPaise);
    updates.churnedSubscriptions = FieldValue.increment(1);
    updates.activeSubscriptions = FieldValue.increment(-1);
  } else if (kind === 'refund') {
    updates.refundLifetimePaise = FieldValue.increment(amountPaise);
  } else if (kind === 'expansion_mrr') {
    updates.expansionMrrLifetimePaise = FieldValue.increment(amountPaise);
  } else if (kind === 'downgrade_mrr') {
    updates.downgradeMrrLifetimePaise = FieldValue.increment(amountPaise);
  }

  return updates;
}

function buildTransitionPaymentPayload(params: {
  movementId: string;
  occurredAt: Date;
  storeId: string;
  subscriptionId: string | null;
  tenantId: string | null;
}) {
  const FieldValue = admin.firestore.FieldValue;
  return {
    paymentAt: admin.firestore.Timestamp.fromDate(params.occurredAt),
    paymentMovementId: params.movementId,
    source: ONBOARDING_TRANSITION_SOURCE,
    storeId: params.storeId,
    subscriptionId: params.subscriptionId,
    tenantId: params.tenantId,
    sId: params.storeId,
    tId: params.tenantId,
    createdOn: FieldValue.serverTimestamp(),
    modifiedOn: FieldValue.serverTimestamp(),
  };
}

export function getFounderSubscriptionMrrPaise(subscription: Partial<FirestoreSubscriptionDoc>): number {
  const amount = Math.max(0, Math.round(safeNumber(subscription.amount)));
  const billingMode = cleanText((subscription as any).billingMode, 40).toLowerCase();
  const commitmentMonths = Math.max(0, Math.round(safeNumber((subscription as any).commitmentPeriodMonths)));
  const planType = cleanText(subscription.planType, 40).toUpperCase();
  const quantity = billingMode === 'manual' ? 1 : Math.max(1, Math.round(safeNumber(subscription.quantity) || 1));

  if (billingMode === 'manual' && commitmentMonths > 1) {
    return Math.round(amount / commitmentMonths);
  }
  if (planType === 'YEAR') {
    return Math.round((amount * quantity) / 12);
  }
  return Math.round(amount * quantity);
}

export async function recordFounderRevenueMovement(input: FounderRevenueMovementInput): Promise<{ recorded: boolean; movementId: string | null }> {
  if (!shouldTrackProduct(input.productId)) {
    return { recorded: false, movementId: null };
  }

  const movementId = normalizeFounderRevenueMovementDocumentId(input.id);
  if (!movementId) {
    return { recorded: false, movementId: null };
  }

  const amountPaise = Math.max(0, Math.round(safeNumber(input.amountPaise)));
  const occurredAt = toDate(input.occurredAt);
  const dayKey = getIndiaDayKey(occurredAt);
  const monthKey = getMonthKey(occurredAt);
  const mrrDeltaPaise = getMrrDelta(input.kind, amountPaise);
  const productId = PRODUCT_IDS.MENULIST;
  const tenantId = cleanText(input.tenantId, 80) || null;
  const storeId = normalizeFounderRevenueStoreDocumentId(input.storeId);
  const FieldValue = admin.firestore.FieldValue;
  const dailyCounterUpdates = getDailyCounterUpdates(input.kind, amountPaise);
  if (input.kind === 'new_mrr') {
    if (tenantId) dailyCounterUpdates.newTenantIds = FieldValue.arrayUnion(tenantId);
    if (storeId) dailyCounterUpdates.newStoreIds = FieldValue.arrayUnion(storeId);
  }

  try {
    const movementRef = firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(movementId);
    const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(SUMMARY_DOC_ID);
    const dailyRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`${DAILY_DOC_PREFIX}${dayKey}`);
    const onboardingTransitionRef = input.kind === 'new_mrr' && storeId
      ? firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS).doc(storeId)
      : null;

    let recorded = false;
    await firestoreAdmin.runTransaction(async (transaction) => {
      const movementSnap = await transaction.get(movementRef);
      if (movementSnap.exists) return;
      const onboardingTransitionSnap = onboardingTransitionRef
        ? await transaction.get(onboardingTransitionRef)
        : null;

      const movementPayload = {
        amountPaise,
        businessDayKey: dayKey,
        currency: cleanText(input.currency || 'INR', 12) || 'INR',
        description: cleanText(input.description || input.eventName || input.kind, 220),
        eventName: cleanText(input.eventName, 120) || null,
        kind: input.kind,
        monthKey,
        mrrDeltaPaise,
        occurredAt: admin.firestore.Timestamp.fromDate(occurredAt),
        paymentId: cleanText(input.paymentId, 120) || null,
        planId: cleanText(input.planId, 80) || null,
        planName: cleanText(input.planName, 120) || null,
        pId: productId,
        productId,
        source: cleanText(input.source, 120),
        storeId,
        subscriptionId: cleanText(input.subscriptionId, 160) || null,
        tenantId,
        tId: tenantId,
        sId: storeId,
        createdOn: FieldValue.serverTimestamp(),
        modifiedOn: FieldValue.serverTimestamp(),
      };

      transaction.set(movementRef, movementPayload);
      transaction.set(summaryRef, {
        ...getSummaryCounterUpdates(input.kind, amountPaise, mrrDeltaPaise),
        latestMovementAt: admin.firestore.Timestamp.fromDate(occurredAt),
        latestMovementId: movementId,
        latestMovementKind: input.kind,
        pId: productId,
        productId,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(dailyRef, {
        ...dailyCounterUpdates,
        dateKey: dayKey,
        latestMovementAt: admin.firestore.Timestamp.fromDate(occurredAt),
        latestMovementId: movementId,
        pId: productId,
        productId,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (
        onboardingTransitionRef
        && storeId
        && (!onboardingTransitionSnap?.exists || !onboardingTransitionSnap.data()?.paymentAt)
      ) {
        transaction.set(onboardingTransitionRef, buildTransitionPaymentPayload({
          movementId,
          occurredAt,
          storeId,
          subscriptionId: cleanText(input.subscriptionId, 160) || null,
          tenantId,
        }), { merge: true });
      }
      recorded = true;
    });

    return { recorded, movementId };
  } catch (error) {
    logRuntimeFailure('founder_revenue_movement_record_failed', error, {
      ...getBoundedRuntimeStringContext('movementId', movementId),
      ...getBoundedRuntimeStringContext('kind', input.kind),
      ...getBoundedRuntimeStringContext('source', input.source),
      ...getBoundedRuntimeStringContext('tenantId', tenantId),
      ...getBoundedRuntimeStringContext('storeId', storeId),
    });
    return { recorded: false, movementId };
  }
}

export async function recordFounderSubscriptionNewMrr(params: {
  productId?: ProductId | string | null;
  source: string;
  subscription: Partial<FirestoreSubscriptionDoc> & { id?: string };
  occurredAt?: Date | number | string | null;
}) {
  const subscriptionId = cleanText(params.subscription.id || params.subscription.providerSubscriptionId, 160);
  if (!subscriptionId) return { recorded: false, movementId: null };
  return recordFounderRevenueMovement({
    amountPaise: getFounderSubscriptionMrrPaise(params.subscription),
    currency: params.subscription.currency || 'INR',
    description: `${params.subscription.planName || 'Subscription'} became recurring revenue.`,
    eventName: 'subscription.active_mrr',
    id: `new_mrr:${subscriptionId}`,
    kind: 'new_mrr',
    occurredAt: params.occurredAt,
    planId: params.subscription.planId,
    planName: params.subscription.planName,
    productId: params.productId,
    source: params.source,
    storeId: params.subscription.storeId || params.subscription.sId,
    subscriptionId,
    tenantId: params.subscription.tenantId || params.subscription.tId,
  });
}

export async function recordFounderSubscriptionChurn(params: {
  productId?: ProductId | string | null;
  source: string;
  subscription: Partial<FirestoreSubscriptionDoc> & { id?: string };
  occurredAt?: Date | number | string | null;
}) {
  const subscriptionId = cleanText(params.subscription.id || params.subscription.providerSubscriptionId, 160);
  if (!subscriptionId) return { recorded: false, movementId: null };
  return recordFounderRevenueMovement({
    amountPaise: getFounderSubscriptionMrrPaise(params.subscription),
    currency: params.subscription.currency || 'INR',
    description: `${params.subscription.planName || 'Subscription'} left recurring revenue.`,
    eventName: 'subscription.churned_mrr',
    id: `churn:${subscriptionId}`,
    kind: 'churn',
    occurredAt: params.occurredAt,
    planId: params.subscription.planId,
    planName: params.subscription.planName,
    productId: params.productId,
    source: params.source,
    storeId: params.subscription.storeId || params.subscription.sId,
    subscriptionId,
    tenantId: params.subscription.tenantId || params.subscription.tId,
  });
}

export async function recordFounderSubscriptionMrrChange(params: {
  eventKey: string;
  occurredAt?: Date | number | string | null;
  previousMrrPaise?: number | null;
  previousSubscription?: Partial<FirestoreSubscriptionDoc> | null;
  productId?: ProductId | string | null;
  source: string;
  subscription: Partial<FirestoreSubscriptionDoc> & { id?: string };
}) {
  const subscriptionId = cleanText(params.subscription.id || params.subscription.providerSubscriptionId, 160);
  const eventKey = normalizeFounderRevenueMovementDocumentId(params.eventKey || 'change');
  if (!subscriptionId || !eventKey) return { recorded: false, movementId: null };

  const previousMrrPaise = Math.max(
    0,
    Math.round(
      safeNumber(params.previousMrrPaise)
      || (params.previousSubscription ? getFounderSubscriptionMrrPaise(params.previousSubscription) : 0),
    ),
  );
  const nextMrrPaise = getFounderSubscriptionMrrPaise(params.subscription);
  const deltaPaise = nextMrrPaise - previousMrrPaise;
  if (deltaPaise === 0) return { recorded: false, movementId: null };

  const kind: FounderRevenueMovementKind = deltaPaise > 0 ? 'expansion_mrr' : 'downgrade_mrr';
  const amountPaise = Math.abs(deltaPaise);
  return recordFounderRevenueMovement({
    amountPaise,
    currency: params.subscription.currency || 'INR',
    description: deltaPaise > 0
      ? `${params.subscription.planName || 'Subscription'} increased recurring revenue.`
      : `${params.subscription.planName || 'Subscription'} reduced recurring revenue.`,
    eventName: 'subscription.mrr_changed',
    id: `${kind}:${subscriptionId}:${eventKey}`,
    kind,
    occurredAt: params.occurredAt,
    planId: params.subscription.planId,
    planName: params.subscription.planName,
    productId: params.productId,
    source: params.source,
    storeId: params.subscription.storeId || params.subscription.sId,
    subscriptionId,
    tenantId: params.subscription.tenantId || params.subscription.tId,
  });
}
