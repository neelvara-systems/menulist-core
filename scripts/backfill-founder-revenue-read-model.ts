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
import { initializeApp } from 'firebase-admin/app';
import {
  FieldPath,
  FieldValue,
  getFirestore,
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

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
  storeId: number;
  subscriptionId?: string | null;
  tenantId: number;
};

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
const ALLOWED_PROJECT_IDS = new Set(['menulist-qa', 'menulist']);

function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
}

function getArg(args: readonly string[], name: string): string | undefined {
  if (args.filter((arg) => arg === name).length > 1) {
    throw new Error(`Duplicate option: ${name}`);
  }
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function positiveSafeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function cleanText(value: unknown, max = 180): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function firstCleanText(max: number, ...values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value, max);
    if (text) return text;
  }
  return '';
}

function normalizeId(value: unknown): string {
  return cleanText(value, 240)
    .replace(/[^a-zA-Z0-9_.:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 220);
}

function hashPath(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export function toBackfillDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'object') {
    const timestampLike = value as {
      _seconds?: unknown;
      seconds?: unknown;
      toDate?: unknown;
    };
    if (typeof timestampLike.toDate === 'function') {
      try {
        const date = timestampLike.toDate.call(value);
        return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
      } catch {
        return null;
      }
    }
    const seconds = timestampLike.seconds ?? timestampLike._seconds;
    if (typeof seconds === 'number' && Number.isSafeInteger(seconds)) {
      const date = new Date(seconds * 1000);
      return Number.isFinite(date.getTime()) ? date : null;
    }
    return null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
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

export function shouldReplaceLatestMovement(
  data: FirebaseFirestore.DocumentData | undefined,
  occurredAt: Date,
  movementId: string,
): boolean {
  const existingAt = toBackfillDate(data?.latestMovementAt);
  if (!existingAt) return true;
  if (occurredAt.getTime() !== existingAt.getTime()) {
    return occurredAt.getTime() > existingAt.getTime();
  }
  return movementId > cleanText(data?.latestMovementId, 220);
}

export function shouldReplaceFirstPayment(
  data: FirebaseFirestore.DocumentData | undefined,
  occurredAt: Date,
): boolean {
  const existingAt = toBackfillDate(data?.paymentAt);
  return !existingAt || occurredAt.getTime() < existingAt.getTime();
}

function normalizeStatus(value: unknown): string {
  return cleanText(value, 80).toLowerCase().replace(/\s+/g, '_');
}

function normalizeCurrency(value: unknown): 'INR' | 'USD' | null {
  if (value == null) return 'INR';
  return value === 'INR' || value === 'USD' ? value : null;
}

function shouldTrack(data: Record<string, unknown>): data is Record<string, unknown> & {
  sId: number;
  storeId: number;
  tId: number;
  tenantId: number;
} {
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

function getDocumentDate(data: Record<string, unknown>): Date | null {
  return toBackfillDate(data.created_at)
    || toBackfillDate(data.paidAt)
    || toBackfillDate(data.createdAt)
    || toBackfillDate(data.createdOn)
    || toBackfillDate(data.subscriptionStartDate)
    || toBackfillDate(data.modifiedOn);
}

function getSubscriptionMrrPaise(data: Record<string, unknown>): number | null {
  const amount = positiveSafeInteger(data.amount);
  if (amount == null) return null;
  const billingMode = normalizeStatus(data.billingMode);
  const commitmentMonths = data.commitmentPeriodMonths == null
    ? null
    : positiveSafeInteger(data.commitmentPeriodMonths);
  if (data.commitmentPeriodMonths != null && commitmentMonths == null) return null;
  const planType = normalizeStatus(firstCleanText(40, data.planType, data.interval));
  const quantity = billingMode === 'manual'
    ? 1
    : data.quantity == null
      ? 1
      : positiveSafeInteger(data.quantity);
  if (quantity == null) return null;

  if (billingMode === 'manual' && commitmentMonths != null && commitmentMonths > 1) {
    return Math.round(amount / commitmentMonths);
  }
  if (planType === 'year') {
    return Math.round((amount * quantity) / 12);
  }
  return Math.round(amount * quantity);
}

function isActiveSubscription(data: Record<string, unknown>): boolean {
  const status = normalizeStatus(data.status);
  if (status === 'active' || status === 'paid') return true;
  if (normalizeStatus(data.billingMode) === 'manual' && data.manualPaymentConfirmed === true) {
    const validUntil = toBackfillDate(data.validUntil);
    return !validUntil || validUntil.getTime() >= Date.now();
  }
  return false;
}

function isChurnedSubscription(data: Record<string, unknown>): boolean {
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

export async function readSourceDocuments(
  query: Query,
  pageSize: number,
  scanAll: boolean,
): Promise<{ documents: QueryDocumentSnapshot[]; truncated: boolean }> {
  const documents: QueryDocumentSnapshot[] = [];
  let cursor: QueryDocumentSnapshot | null = null;

  do {
    let pageQuery = query.orderBy(FieldPath.documentId()).limit(scanAll ? pageSize : pageSize + 1);
    if (cursor) pageQuery = pageQuery.startAfter(cursor);
    const snapshot = await pageQuery.get();
    const page = scanAll ? snapshot.docs : snapshot.docs.slice(0, pageSize);
    documents.push(...page);
    if (!scanAll) {
      return { documents, truncated: snapshot.size > pageSize };
    }
    cursor = snapshot.size === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;
  } while (cursor);

  return { documents, truncated: false };
}

export function movementFromSubscription(doc: FirebaseFirestore.QueryDocumentSnapshot): MovementCandidate | null {
  const data: Record<string, unknown> = doc.data() || {};
  if (!shouldTrack(data)) return null;
  const subscriptionId = firstCleanText(160, data.id, data.providerSubscriptionId, doc.id);
  if (!subscriptionId) return null;
  const amountPaise = getSubscriptionMrrPaise(data);
  const currency = normalizeCurrency(data.currency);
  if (amountPaise == null || currency == null) return null;

  if (isActiveSubscription(data)) {
    const occurredAt = toBackfillDate(data.subscriptionStartDate) || getDocumentDate(data);
    if (!occurredAt) return null;
    return {
      amountPaise,
      currency,
      description: 'Backfilled active subscription MRR.',
      eventName: 'backfill.subscription.active_mrr',
      id: `new_mrr:${subscriptionId}`,
      kind: 'new_mrr',
      occurredAt,
      planId: cleanText(data.planId, 80) || null,
      planName: cleanText(data.planName, 120) || null,
      sourceDocPath: doc.ref.path,
      storeId: data.storeId,
      subscriptionId,
      tenantId: data.tenantId,
    };
  }

  if (isChurnedSubscription(data)) {
    const occurredAt = toBackfillDate(data.subscriptionEndDate)
      || toBackfillDate(data.cycleEndDate)
      || getDocumentDate(data);
    if (!occurredAt) return null;
    return {
      amountPaise,
      currency,
      description: 'Backfilled churned subscription MRR.',
      eventName: 'backfill.subscription.churned_mrr',
      id: `churn:${subscriptionId}`,
      kind: 'churn',
      occurredAt,
      planId: cleanText(data.planId, 80) || null,
      planName: cleanText(data.planName, 120) || null,
      sourceDocPath: doc.ref.path,
      storeId: data.storeId,
      subscriptionId,
      tenantId: data.tenantId,
    };
  }

  return null;
}

export function movementsFromPaymentTransaction(doc: FirebaseFirestore.QueryDocumentSnapshot): MovementCandidate[] {
  const data: Record<string, unknown> = doc.data() || {};
  if (!shouldTrack(data)) return [];
  const eventName = firstCleanText(120, data.event, data.status) || 'payment_transaction';
  const amountPaise = positiveSafeInteger(data.amount);
  const currency = normalizeCurrency(data.currency);
  if (amountPaise == null || currency == null) return [];
  const paymentId = firstCleanText(120, data.paymentId, data.providerPaymentId) || null;
  const createdAt = getDocumentDate(data);
  if (!createdAt) return [];
  const base = {
    amountPaise,
    currency,
    occurredAt: createdAt,
    paymentId,
    sourceDocPath: doc.ref.path,
    storeId: data.storeId,
    subscriptionId: cleanText(data.subscriptionId, 160) || null,
    tenantId: data.tenantId,
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
  const rawRefundedAmount = data.amount_refunded ?? data.amountRefunded;
  const refundedAmount = rawRefundedAmount == null ? null : positiveSafeInteger(rawRefundedAmount);
  if (rawRefundedAmount != null && refundedAmount == null) return [];
  if (eventName === 'payment.refunded' || refundedAmount != null) {
    movements.push({
      ...base,
      amountPaise: refundedAmount ?? amountPaise,
      description: 'Backfilled refund.',
      eventName: 'payment.refunded',
      id: `refund:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`,
      kind: 'refund',
    });
  }

  return movements;
}

export function movementFromTopup(doc: FirebaseFirestore.QueryDocumentSnapshot): MovementCandidate | null {
  const data: Record<string, unknown> = doc.data() || {};
  if (!shouldTrack(data)) return null;
  if (normalizeStatus(data.status) !== 'paid') return null;
  const amountPaise = positiveSafeInteger(data.amount);
  const currency = normalizeCurrency(data.currency);
  const occurredAt = toBackfillDate(data.paidAt) || getDocumentDate(data);
  if (amountPaise == null || currency == null || !occurredAt) return null;
  const paymentId = cleanText(data.providerPaymentId, 120) || null;
  return {
    amountPaise,
    currency,
    description: 'Backfilled credit top-up payment.',
    eventName: 'order.paid',
    id: `cash:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`,
    kind: 'cash_collected',
    occurredAt,
    paymentId,
    sourceDocPath: doc.ref.path,
    storeId: data.storeId,
    subscriptionId: null,
    tenantId: data.tenantId,
  };
}

async function writeMovement(db: FirebaseFirestore.Firestore, candidate: MovementCandidate): Promise<'created' | 'skipped'> {
  const movementId = normalizeId(candidate.id);
  if (!movementId) throw new Error('Founder revenue backfill movement identity is invalid.');
  const amountPaise = positiveSafeInteger(candidate.amountPaise);
  if (amountPaise == null) throw new Error('Founder revenue backfill amount is invalid.');
  const occurredAt = candidate.occurredAt;
  if (!(occurredAt instanceof Date) || !Number.isFinite(occurredAt.getTime())) {
    throw new Error('Founder revenue backfill time is invalid.');
  }
  const dayKey = getIndiaDayKey(occurredAt);
  const monthKey = getMonthKey(occurredAt);
  const mrrDeltaPaise = getMrrDelta(candidate.kind, amountPaise);
  const tenantId = String(candidate.tenantId);
  const storeId = String(candidate.storeId);
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
    const [summarySnap, dailySnap, transitionSnap] = await Promise.all([
      transaction.get(summaryRef),
      transaction.get(dailyRef),
      transitionRef ? transaction.get(transitionRef) : Promise.resolve(null),
    ]);
    const summaryLatest = shouldReplaceLatestMovement(summarySnap.data(), occurredAt, movementId);
    const dailyLatest = shouldReplaceLatestMovement(dailySnap.data(), occurredAt, movementId);

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
      ...(summaryLatest ? {
        latestMovementAt: Timestamp.fromDate(occurredAt),
        latestMovementId: movementId,
        latestMovementKind: candidate.kind,
      } : {}),
      pId: PRODUCT_ID,
      productId: PRODUCT_ID,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(dailyRef, {
      ...dailyCounterUpdates,
      dateKey: dayKey,
      ...(dailyLatest ? {
        latestMovementAt: Timestamp.fromDate(occurredAt),
        latestMovementId: movementId,
      } : {}),
      pId: PRODUCT_ID,
      productId: PRODUCT_ID,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    if (transitionRef && storeId && shouldReplaceFirstPayment(transitionSnap?.data(), occurredAt)) {
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

export async function main(argv: readonly string[] = process.argv.slice(2)) {
  const projectId = getArg(argv, '--project-id') || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running Founder Monitor revenue backfill.');
  }
  if (!ALLOWED_PROJECT_IDS.has(projectId)) {
    throw new Error(`Refusing Founder Monitor revenue backfill for non-MenuList project: ${projectId}.`);
  }

  const write = hasFlag(argv, '--write');
  const confirmedProjectId = getArg(argv, '--confirm-project');
  if (write && confirmedProjectId !== projectId) {
    throw new Error(`Refusing write: pass --confirm-project ${projectId} to confirm the target Firebase project.`);
  }
  if (write && !hasFlag(argv, '--all-founder-revenue')) {
    throw new Error('Refusing write: pass --all-founder-revenue after reviewing dry-run output and Firestore backup state.');
  }

  const rawLimit = getArg(argv, '--limit');
  const requestedLimit = rawLimit == null ? 2000 : Number(rawLimit);
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 10_000) {
    throw new Error('--limit must be an integer between 1 and 10000.');
  }
  const limitArg = requestedLimit;
  const app = initializeApp({ projectId });
  const db = getFirestore(app);

  console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);
  console.log(`Project: ${projectId}`);
  console.log(`Collection page size per source: ${limitArg}`);

  const scanAll = hasFlag(argv, '--all-founder-revenue');
  const [subscriptions, paymentTransactions, topups] = await Promise.all([
    readSourceDocuments(
    db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
      .where('pId', '==', PRODUCT_ID)
      .where('productId', '==', PRODUCT_ID),
    limitArg,
    scanAll,
    ),
    readSourceDocuments(
    db.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS)
      .where('pId', '==', PRODUCT_ID)
      .where('productId', '==', PRODUCT_ID),
    limitArg,
    scanAll,
    ),
    readSourceDocuments(
    db.collection(DB_COLLECTIONS.TOPUPS)
      .where('pId', '==', PRODUCT_ID)
      .where('productId', '==', PRODUCT_ID),
    limitArg,
    scanAll,
    ),
  ]);

  const candidates: MovementCandidate[] = [
    ...subscriptions.documents.map(movementFromSubscription).filter((candidate): candidate is MovementCandidate => Boolean(candidate)),
    ...paymentTransactions.documents.flatMap(movementsFromPaymentTransaction),
    ...topups.documents.map(movementFromTopup).filter((candidate): candidate is MovementCandidate => Boolean(candidate)),
  ].filter((candidate) => normalizeId(candidate.id).length > 0 && positiveSafeInteger(candidate.amountPaise) != null);

  const stats = {
    candidates: candidates.length,
    created: 0,
    skipped: 0,
    sourceReads: {
      paymentTransactions: paymentTransactions.documents.length,
      subscriptions: subscriptions.documents.length,
      topups: topups.documents.length,
    },
    sourceTruncated: {
      paymentTransactions: paymentTransactions.truncated,
      subscriptions: subscriptions.truncated,
      topups: topups.truncated,
    },
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
    console.log(`\nTo scan every matching source document: --all-founder-revenue`);
    console.log(`To apply after backup/review: --write --confirm-project ${projectId} --all-founder-revenue`);
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Founder Monitor revenue backfill failed.');
    process.exitCode = 1;
  });
}
