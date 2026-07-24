/**
 * Backfills the Founder Monitor revenue read model from existing Firestore
 * billing documents.
 *
 * Dry-run is the default. Write mode requires explicit project confirmation and
 * an acknowledgement flag because this script mutates platformSummary counters.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-founder-revenue-read-model.ts --project-id menulist-qa
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-founder-revenue-read-model.ts --project-id menulist-qa --write --confirm-project menulist-qa --all-founder-revenue
 */
import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type MovementKind =
  | 'new_mrr'
  | 'cash_collected'
  | 'failed_payment'
  | 'churn'
  | 'refund'
  | 'expansion_mrr'
  | 'downgrade_mrr';

type MovementCandidate = {
  amountPaise: number;
  currency: string;
  description: string;
  eventName: string;
  id: string;
  kind: MovementKind;
  occurredAt: Date;
  paymentId?: string | null;
  planId?: string | null;
  planName?: string | null;
  sourceDocPath: string;
  storeId?: string | number | null;
  subscriptionId?: string | null;
  tenantId?: string | number | null;
};

const args = process.argv.slice(2);
const DB_COLLECTIONS = {
  FOUNDER_ONBOARDING_TRANSITIONS: 'founderOnboardingTransitions',
  FOUNDER_REVENUE_MOVEMENTS: 'founderRevenueMovements',
  PAYMENT_TRANSACTIONS: 'payment_transactions',
  PLATFORM_SUMMARY: 'platformSummary',
  SUBSCRIPTIONS: 'subscriptions',
  TOPUPS: 'topups',
};
const PRODUCT_ID = 'ML';
const INDIA_OFFSET_MS = 330 * 60 * 1000;
const SUMMARY_DOC_ID = 'founderMonitorRevenue';
const DAILY_DOC_PREFIX = 'founderMonitorRevenueDaily_';
const SOURCE = 'scripts/backfill-founder-revenue-read-model';

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

function getArg(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

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

function normalizeId(value: string): string {
  return cleanText(value, 240)
    .replace(/[^a-zA-Z0-9_.:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 220);
}

function hashPath(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000);
  if (typeof value === 'number') {
    const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function getIndiaDayKey(date: Date): string {
  const local = new Date(date.getTime() + INDIA_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

function getMonthKey(date: Date): string {
  const local = new Date(date.getTime() + INDIA_OFFSET_MS);
  return local.toISOString().slice(0, 7);
}

function normalizeStatus(value: unknown): string {
  return cleanText(value, 80).toLowerCase().replace(/\s+/g, '_');
}

function shouldTrack(data: Record<string, any>): boolean {
  const tenantId = data.tenantId;
  const storeId = data.storeId;
  return data.pId === PRODUCT_ID
    && data.productId === PRODUCT_ID
    && typeof tenantId === 'number'
    && Number.isSafeInteger(tenantId)
    && tenantId > 0
    && data.tId === tenantId
    && typeof storeId === 'number'
    && Number.isSafeInteger(storeId)
    && storeId > 0
    && data.sId === storeId;
}

function getDocumentDate(data: Record<string, any>): Date {
  return toDate(data.created_at)
    || toDate(data.paidAt)
    || toDate(data.createdAt)
    || toDate(data.createdOn)
    || toDate(data.subscriptionStartDate)
    || toDate(data.modifiedOn)
    || new Date();
}

function getSubscriptionMrrPaise(data: Record<string, any>): number {
  const amount = Math.max(0, Math.round(safeNumber(data.amount)));
  const billingMode = normalizeStatus(data.billingMode);
  const commitmentMonths = Math.max(0, Math.round(safeNumber(data.commitmentPeriodMonths)));
  const planType = normalizeStatus(data.planType || data.interval);
  const quantity = billingMode === 'manual' ? 1 : Math.max(1, Math.round(safeNumber(data.quantity) || 1));

  if (billingMode === 'manual' && commitmentMonths > 1) {
    return Math.round(amount / commitmentMonths);
  }
  if (planType === 'year') {
    return Math.round((amount * quantity) / 12);
  }
  return Math.round(amount * quantity);
}

function isActiveSubscription(data: Record<string, any>): boolean {
  const status = normalizeStatus(data.status);
  if (status === 'active' || status === 'paid') return true;
  if (normalizeStatus(data.billingMode) === 'manual' && data.manualPaymentConfirmed === true) {
    const validUntil = toDate(data.validUntil);
    return !validUntil || validUntil.getTime() >= Date.now();
  }
  return false;
}

function isChurnedSubscription(data: Record<string, any>): boolean {
  return ['cancelled', 'canceled', 'expired', 'failed', 'completed'].includes(normalizeStatus(data.status));
}

function getMrrDelta(kind: MovementKind, amountPaise: number): number {
  if (kind === 'new_mrr' || kind === 'expansion_mrr') return amountPaise;
  if (kind === 'churn' || kind === 'downgrade_mrr') return -amountPaise;
  return 0;
}

function getDailyCounterUpdates(kind: MovementKind, amountPaise: number) {
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

function getSummaryCounterUpdates(kind: MovementKind, amountPaise: number, mrrDeltaPaise: number) {
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

function movementFromSubscription(doc: FirebaseFirestore.QueryDocumentSnapshot): MovementCandidate | null {
  const data = doc.data() || {};
  if (!shouldTrack(data)) return null;
  const subscriptionId = cleanText(data.id || data.providerSubscriptionId || doc.id, 160);
  if (!subscriptionId) return null;

  if (isActiveSubscription(data)) {
    return {
      amountPaise: getSubscriptionMrrPaise(data),
      currency: cleanText(data.currency || 'INR', 12) || 'INR',
      description: 'Backfilled active subscription MRR.',
      eventName: 'backfill.subscription.active_mrr',
      id: `new_mrr:${subscriptionId}`,
      kind: 'new_mrr',
      occurredAt: toDate(data.subscriptionStartDate) || getDocumentDate(data),
      planId: cleanText(data.planId, 80) || null,
      planName: cleanText(data.planName, 120) || null,
      sourceDocPath: doc.ref.path,
      storeId: data.storeId || data.sId,
      subscriptionId,
      tenantId: data.tenantId || data.tId,
    };
  }

  if (isChurnedSubscription(data)) {
    return {
      amountPaise: getSubscriptionMrrPaise(data),
      currency: cleanText(data.currency || 'INR', 12) || 'INR',
      description: 'Backfilled churned subscription MRR.',
      eventName: 'backfill.subscription.churned_mrr',
      id: `churn:${subscriptionId}`,
      kind: 'churn',
      occurredAt: toDate(data.subscriptionEndDate) || toDate(data.cycleEndDate) || getDocumentDate(data),
      planId: cleanText(data.planId, 80) || null,
      planName: cleanText(data.planName, 120) || null,
      sourceDocPath: doc.ref.path,
      storeId: data.storeId || data.sId,
      subscriptionId,
      tenantId: data.tenantId || data.tId,
    };
  }

  return null;
}

function movementsFromPaymentTransaction(doc: FirebaseFirestore.QueryDocumentSnapshot): MovementCandidate[] {
  const data = doc.data() || {};
  if (!shouldTrack(data)) return [];
  const eventName = cleanText(data.event || data.status || 'payment_transaction', 120);
  const amountPaise = Math.max(0, Math.round(safeNumber(data.amount)));
  const paymentId = cleanText(data.paymentId || data.providerPaymentId, 120) || null;
  const createdAt = getDocumentDate(data);
  const base = {
    amountPaise,
    currency: cleanText(data.currency || 'INR', 12) || 'INR',
    occurredAt: createdAt,
    paymentId,
    sourceDocPath: doc.ref.path,
    storeId: data.storeId || data.sId,
    subscriptionId: cleanText(data.subscriptionId, 160) || null,
    tenantId: data.tenantId || data.tId,
  };

  const movements: MovementCandidate[] = [];
  if (['subscription.charged', 'order.paid'].includes(eventName) || ['captured', 'paid'].includes(normalizeStatus(data.status))) {
    movements.push({
      ...base,
      description: 'Backfilled collected payment.',
      eventName,
      id: `cash:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`,
      kind: 'cash_collected',
    });
  }
  if (['payment.failed', 'subscription.pending', 'subscription.halted'].includes(eventName) || normalizeStatus(data.status) === 'failed') {
    movements.push({
      ...base,
      description: 'Backfilled failed payment.',
      eventName,
      id: `failed_payment:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`,
      kind: 'failed_payment',
    });
  }
  const refundedAmount = Math.max(0, Math.round(safeNumber(data.amount_refunded || data.amountRefunded)));
  if (eventName === 'payment.refunded' || refundedAmount > 0) {
    movements.push({
      ...base,
      amountPaise: refundedAmount || amountPaise,
      description: 'Backfilled refund.',
      eventName: 'payment.refunded',
      id: `refund:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`,
      kind: 'refund',
    });
  }

  return movements;
}

function movementFromTopup(doc: FirebaseFirestore.QueryDocumentSnapshot): MovementCandidate | null {
  const data = doc.data() || {};
  if (!shouldTrack(data)) return null;
  if (normalizeStatus(data.status) !== 'paid') return null;
  const paymentId = cleanText(data.providerPaymentId, 120) || null;
  return {
    amountPaise: Math.max(0, Math.round(safeNumber(data.amount))),
    currency: cleanText(data.currency || 'INR', 12) || 'INR',
    description: 'Backfilled credit top-up payment.',
    eventName: 'order.paid',
    id: `cash:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`,
    kind: 'cash_collected',
    occurredAt: toDate(data.paidAt) || getDocumentDate(data),
    paymentId,
    sourceDocPath: doc.ref.path,
    storeId: data.storeId || data.sId,
    subscriptionId: null,
    tenantId: data.tenantId || data.tId,
  };
}

async function writeMovement(db: FirebaseFirestore.Firestore, candidate: MovementCandidate): Promise<'created' | 'skipped'> {
  const movementId = normalizeId(candidate.id);
  const amountPaise = Math.max(0, Math.round(safeNumber(candidate.amountPaise)));
  const occurredAt = candidate.occurredAt;
  const dayKey = getIndiaDayKey(occurredAt);
  const monthKey = getMonthKey(occurredAt);
  const mrrDeltaPaise = getMrrDelta(candidate.kind, amountPaise);
  const tenantId = cleanText(candidate.tenantId, 80) || null;
  const storeId = cleanText(candidate.storeId, 80) || null;
  const subscriptionId = cleanText(candidate.subscriptionId, 160) || null;
  const dailyCounterUpdates = getDailyCounterUpdates(candidate.kind, amountPaise);
  if (candidate.kind === 'new_mrr') {
    if (tenantId) dailyCounterUpdates.newTenantIds = FieldValue.arrayUnion(tenantId);
    if (storeId) dailyCounterUpdates.newStoreIds = FieldValue.arrayUnion(storeId);
  }

  return db.runTransaction(async (transaction) => {
    const movementRef = db.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(movementId);
    const movementSnap = await transaction.get(movementRef);
    if (movementSnap.exists) return 'skipped';

    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(SUMMARY_DOC_ID);
    const dailyRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`${DAILY_DOC_PREFIX}${dayKey}`);
    const transitionRef = candidate.kind === 'new_mrr' && storeId
      ? db.collection(DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS).doc(storeId)
      : null;
    const transitionSnap = transitionRef ? await transaction.get(transitionRef) : null;

    transaction.set(movementRef, {
      amountPaise,
      backfilledAt: FieldValue.serverTimestamp(),
      businessDayKey: dayKey,
      currency: candidate.currency,
      description: candidate.description,
      eventName: candidate.eventName,
      kind: candidate.kind,
      monthKey,
      mrrDeltaPaise,
      occurredAt: Timestamp.fromDate(occurredAt),
      paymentId: cleanText(candidate.paymentId, 120) || null,
      planId: cleanText(candidate.planId, 80) || null,
      planName: cleanText(candidate.planName, 120) || null,
      pId: PRODUCT_ID,
      productId: PRODUCT_ID,
      source: SOURCE,
      sourceDocPath: candidate.sourceDocPath,
      storeId,
      subscriptionId,
      tenantId,
      tId: tenantId,
      sId: storeId,
      createdOn: FieldValue.serverTimestamp(),
      modifiedOn: FieldValue.serverTimestamp(),
    });
    transaction.set(summaryRef, {
      ...getSummaryCounterUpdates(candidate.kind, amountPaise, mrrDeltaPaise),
      latestMovementAt: Timestamp.fromDate(occurredAt),
      latestMovementId: movementId,
      latestMovementKind: candidate.kind,
      pId: PRODUCT_ID,
      productId: PRODUCT_ID,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(dailyRef, {
      ...dailyCounterUpdates,
      dateKey: dayKey,
      latestMovementAt: Timestamp.fromDate(occurredAt),
      latestMovementId: movementId,
      pId: PRODUCT_ID,
      productId: PRODUCT_ID,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    if (transitionRef && storeId && (!transitionSnap?.exists || !transitionSnap.data()?.paymentAt)) {
      transaction.set(transitionRef, {
        paymentAt: Timestamp.fromDate(occurredAt),
        paymentMovementId: movementId,
        source: SOURCE,
        storeId,
        subscriptionId,
        tenantId,
        sId: storeId,
        tId: tenantId,
        createdOn: FieldValue.serverTimestamp(),
        modifiedOn: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return 'created';
  });
}

async function main() {
  const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running Founder Monitor revenue backfill.');
  }

  const write = hasFlag('--write');
  const confirmedProjectId = getArg('--confirm-project');
  if (write && confirmedProjectId !== projectId) {
    throw new Error(`Refusing write: pass --confirm-project ${projectId} to confirm the target Firebase project.`);
  }
  if (write && !hasFlag('--all-founder-revenue')) {
    throw new Error('Refusing write: pass --all-founder-revenue after reviewing dry-run output and Firestore backup state.');
  }

  const requestedLimit = Math.round(safeNumber(getArg('--limit')) || 2000);
  const limitArg = Math.max(1, Math.min(10_000, requestedLimit));
  admin.initializeApp({ projectId });
  const db = admin.firestore();

  console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);
  console.log(`Project: ${projectId}`);
  console.log(`Collection limit per source: ${limitArg}`);

  const [subscriptionSnap, paymentTransactionSnap, topupSnap] = await Promise.all([
    db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
      .where('pId', '==', PRODUCT_ID)
      .where('productId', '==', PRODUCT_ID)
      .limit(limitArg)
      .get(),
    db.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS)
      .where('pId', '==', PRODUCT_ID)
      .where('productId', '==', PRODUCT_ID)
      .limit(limitArg)
      .get(),
    db.collection(DB_COLLECTIONS.TOPUPS)
      .where('pId', '==', PRODUCT_ID)
      .where('productId', '==', PRODUCT_ID)
      .limit(limitArg)
      .get(),
  ]);

  const candidates: MovementCandidate[] = [
    ...subscriptionSnap.docs.map(movementFromSubscription).filter((candidate): candidate is MovementCandidate => Boolean(candidate)),
    ...paymentTransactionSnap.docs.flatMap(movementsFromPaymentTransaction),
    ...topupSnap.docs.map(movementFromTopup).filter((candidate): candidate is MovementCandidate => Boolean(candidate)),
  ].filter((candidate) => normalizeId(candidate.id).length > 0 && candidate.amountPaise >= 0);

  const stats = {
    candidates: candidates.length,
    created: 0,
    skipped: 0,
    wouldCreate: 0,
    byKind: {} as Record<string, number>,
  };

  for (const candidate of candidates) {
    stats.byKind[candidate.kind] = (stats.byKind[candidate.kind] || 0) + 1;
    const movementId = normalizeId(candidate.id);
    const exists = (await db.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(movementId).get()).exists;
    if (exists) {
      stats.skipped += 1;
      continue;
    }

    if (!write) {
      stats.wouldCreate += 1;
      continue;
    }

    const result = await writeMovement(db, candidate);
    if (result === 'created') stats.created += 1;
    if (result === 'skipped') stats.skipped += 1;
  }

  console.log(JSON.stringify(stats, null, 2));
  if (!write) {
    console.log(`\nTo apply after backup/review: --write --confirm-project ${projectId} --all-founder-revenue`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
