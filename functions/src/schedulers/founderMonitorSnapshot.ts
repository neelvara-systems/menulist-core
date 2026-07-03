import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { createAlert } from '../monitoring/alerts';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../sharedData/platformNotificationRegistry';

const logger = functions.logger;
const INDIA_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_LIMIT = 500;
const SUPPORT_TICKET_LIMIT = 200;
const MOVEMENT_RECONCILE_LIMIT = 500;
const ONBOARDING_TRANSITION_LIMIT = 500;
const ONBOARDING_TRANSITION_WRITE_LIMIT = 50;

type ReconcileResult = {
    activity: boolean;
    details: {
        activeStores: number;
        currentMrrPaise: number;
        movementsToday: number;
        storeRows: number;
        trustedLiveStores: number;
    };
};

type SnapshotDocumentData = Record<string, any> & { id: string };

type OnboardingTransitionCandidate = {
    firstLiveAt: Date;
    hasCompleteTransition: boolean;
    paymentAt: Date;
    storeId: string;
    subscriptionId: string | null;
    tenantId: string | null;
    timeToLiveHours: number;
    transitionExists: boolean;
};

type DailyMovementSummary = {
    cashCollectedPaise: number;
    churnedMrrPaise: number;
    downgradeMrrPaise: number;
    expansionMrrPaise: number;
    failedPaymentAmountPaise: number;
    failedPaymentCount: number;
    netNewMrrPaise: number;
    newMrrPaise: number;
    newStoreIds: string[];
    newTenantIds: string[];
    refundAmountPaise: number;
};

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

function normalizeStatus(value: unknown): string {
    return cleanText(value, 80).toLowerCase().replace(/\s+/g, '_');
}

function toDate(value: any): Date | null {
    if (!value) return null;
    try {
        if (typeof value.toDate === 'function') return value.toDate();
        if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
        if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
        if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
        if (typeof value === 'number') {
            const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);
            return Number.isFinite(date.getTime()) ? date : null;
        }
        if (typeof value === 'string') {
            const date = new Date(value);
            return Number.isFinite(date.getTime()) ? date : null;
        }
    } catch {
        return null;
    }
    return null;
}

function toIso(value: any): string | null {
    return toDate(value)?.toISOString() || null;
}

function getIndiaDayKey(date: Date): string {
    const local = new Date(date.getTime() + INDIA_OFFSET_MS);
    return local.toISOString().slice(0, 10);
}

function isToday(value: Date | null, todayKey: string): boolean {
    return Boolean(value && getIndiaDayKey(value) === todayKey);
}

function daysSince(date: Date | null): number | null {
    if (!date) return null;
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
}

function finiteNumberOrNull(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function hoursBetween(start: Date, end: Date): number {
    return Math.max(0, Math.round(((end.getTime() - start.getTime()) / (60 * 60 * 1000)) * 10) / 10);
}

function getDocumentDate(data: Record<string, any>): Date | null {
    return toDate(data.createdAt)
        || toDate(data.createdOn)
        || toDate(data.created_at)
        || toDate(data.timestamp)
        || toDate(data.subscriptionStartDate)
        || toDate(data.modifiedOn);
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

function isPastDueSubscription(data: Record<string, any>): boolean {
    return ['past_due', 'pending', 'paused'].includes(normalizeStatus(data.status));
}

function isChurnedSubscription(data: Record<string, any>): boolean {
    return ['cancelled', 'canceled', 'expired', 'failed', 'completed'].includes(normalizeStatus(data.status));
}

function storeIsActive(summary: Record<string, any>): boolean {
    return summary.active !== false && summary.blocked !== true && summary.tenantBlocked !== true;
}

function isRecordedDistributionValue(value: unknown): boolean {
    return value === true || (typeof value === 'string' && cleanText(value).length > 0);
}

function hasDistributionSurface(summary: Record<string, any>): boolean {
    const presence = {
        ...((summary.presence || {}) as Record<string, any>),
        ...((summary.menuPresence || {}) as Record<string, any>),
    };
    const candidates = [
        presence.qrCodeInstalled,
        presence.qrInstalled,
        presence.websiteLinked,
        presence.websiteMenuLink,
        presence.instagramLinked,
        presence.instagramBioLinked,
        presence.whatsappLinked,
        presence.whatsappMenuLinked,
        presence.googleBusiness,
        presence.instagramBio,
        presence.whatsappProfile,
        presence.googleBusiness?.linked,
        presence.instagramBio?.linked,
        presence.whatsappProfile?.linked,
        summary.subdomain,
        summary.outletSlug,
    ];

    return candidates.some(isRecordedDistributionValue);
}

function getRiskLevel(reasons: string[]): 'none' | 'watch' | 'action_required' {
    if (reasons.some((reason) => /failed|not live|broken|critical|stale|past due/i.test(reason))) {
        return 'action_required';
    }
    return reasons.length > 0 ? 'watch' : 'none';
}

function buildStoreStage(active: boolean, hasPublishedMenu: boolean, hasPlan: boolean, distributionReady: boolean, stale: boolean): string {
    if (!active) return 'Inactive';
    if (!hasPlan) return 'Created';
    if (!hasPublishedMenu) return 'Onboarding';
    if (!distributionReady) return 'Published';
    if (stale) return 'At risk';
    return 'Active';
}

async function readCollection(collectionName: string, limit: number, orderField?: string) {
    try {
        let query: FirebaseFirestore.Query = db.collection(collectionName);
        if (orderField) query = query.orderBy(orderField, 'desc');
        return await query.limit(limit).get();
    } catch (error) {
        logger.warn('[FounderMonitor] Collection read failed', {
            collectionName,
            orderField: orderField || null,
            limit,
            errorName: error instanceof Error ? error.name : typeof error,
        });
        return null;
    }
}

function appendUniqueCleanId(value: unknown, target: string[]) {
    const id = cleanText(value, 80);
    if (id && !target.includes(id)) target.push(id);
}

function summarizeDailyMovements(docs: FirebaseFirestore.QueryDocumentSnapshot[]) {
    const initial: DailyMovementSummary = {
        cashCollectedPaise: 0,
        churnedMrrPaise: 0,
        downgradeMrrPaise: 0,
        expansionMrrPaise: 0,
        failedPaymentAmountPaise: 0,
        failedPaymentCount: 0,
        netNewMrrPaise: 0,
        newMrrPaise: 0,
        newStoreIds: [],
        newTenantIds: [],
        refundAmountPaise: 0,
    };

    return docs.reduce((acc, doc) => {
        const data = doc.data() || {};
        const amount = safeNumber(data.amountPaise);
        const kind = cleanText(data.kind, 80);
        if (kind === 'cash_collected') acc.cashCollectedPaise += amount;
        if (kind === 'failed_payment') {
            acc.failedPaymentAmountPaise += amount;
            acc.failedPaymentCount += 1;
        }
        if (kind === 'new_mrr') {
            acc.newMrrPaise += amount;
            acc.netNewMrrPaise += amount;
            appendUniqueCleanId(data.storeId || data.sId, acc.newStoreIds);
            appendUniqueCleanId(data.tenantId || data.tId, acc.newTenantIds);
        }
        if (kind === 'churn') {
            acc.churnedMrrPaise += amount;
            acc.netNewMrrPaise -= amount;
        }
        if (kind === 'refund') acc.refundAmountPaise += amount;
        if (kind === 'expansion_mrr') {
            acc.expansionMrrPaise += amount;
            acc.netNewMrrPaise += amount;
        }
        if (kind === 'downgrade_mrr') {
            acc.downgradeMrrPaise += amount;
            acc.netNewMrrPaise -= amount;
        }
        return acc;
    }, initial);
}

function buildTransitionCompletionPayload(candidate: OnboardingTransitionCandidate) {
    const payload: Record<string, any> = {
        firstLiveAt: Timestamp.fromDate(candidate.firstLiveAt),
        modifiedOn: FieldValue.serverTimestamp(),
        paymentAt: Timestamp.fromDate(candidate.paymentAt),
        source: 'menulistMaintenanceScheduler:founderMonitorSnapshot',
        storeId: candidate.storeId,
        subscriptionId: candidate.subscriptionId,
        tenantId: candidate.tenantId,
        timeToLiveHours: candidate.timeToLiveHours,
        sId: candidate.storeId,
        tId: candidate.tenantId,
    };

    if (!candidate.transitionExists) {
        payload.createdOn = FieldValue.serverTimestamp();
    }

    return payload;
}

async function writeOnboardingTransitionCompletions(candidates: OnboardingTransitionCandidate[]) {
    const writable = candidates
        .filter((candidate) => !candidate.hasCompleteTransition)
        .slice(0, ONBOARDING_TRANSITION_WRITE_LIMIT);

    if (writable.length === 0) {
        return {
            writeCount: 0,
            writeCapped: candidates.filter((candidate) => !candidate.hasCompleteTransition).length > 0,
        };
    }

    const batch = db.batch();
    writable.forEach((candidate) => {
        const ref = db.collection(DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS).doc(candidate.storeId);
        batch.set(ref, buildTransitionCompletionPayload(candidate), { merge: true });
    });
    await batch.commit();

    const pendingCount = candidates.filter((candidate) => !candidate.hasCompleteTransition).length;
    return {
        writeCount: writable.length,
        writeCapped: pendingCount > writable.length,
    };
}

async function emitFounderMonitorRiskAlerts(params: {
    criticalTickets: number;
    failedPaymentAmountPaise: number;
    failedPaymentCount: number;
    onboardingStuckStores: number;
    staleOrBrokenStores: number;
}) {
    const alertBase = {
        tId: 'platform',
        sId: 'founder-monitor',
        type: 'health' as const,
        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.MANUAL_PLATFORM_ALERT,
        productId: 'ML',
        category: 'manual',
    };

    const alerts: Array<Parameters<typeof createAlert>[0]> = [];
    if (params.failedPaymentCount > 0) {
        alerts.push({
            ...alertBase,
            severity: 'critical',
            title: 'Founder Monitor: payment failure risk',
            message: `${params.failedPaymentCount} MenuList payment failure(s) were recorded today.`,
            metadata: {
                subsystem: 'founder-monitor',
                failedPaymentAmountPaise: params.failedPaymentAmountPaise,
                failedPaymentCount: params.failedPaymentCount,
            },
            actionRequired: true,
        });
    }
    if (params.onboardingStuckStores > 0) {
        alerts.push({
            ...alertBase,
            severity: 'warning',
            title: 'Founder Monitor: onboarding stuck',
            message: `${params.onboardingStuckStores} paid store(s) are not live yet.`,
            metadata: {
                subsystem: 'founder-monitor',
                onboardingStuckStores: params.onboardingStuckStores,
            },
            actionRequired: true,
        });
    }
    if (params.criticalTickets > 0) {
        alerts.push({
            ...alertBase,
            severity: 'critical',
            title: 'Founder Monitor: critical support risk',
            message: `${params.criticalTickets} critical support ticket(s) are open across MenuList stores.`,
            metadata: {
                subsystem: 'founder-monitor',
                criticalTickets: params.criticalTickets,
            },
            actionRequired: true,
        });
    }
    if (params.staleOrBrokenStores > 0) {
        alerts.push({
            ...alertBase,
            severity: 'warning',
            title: 'Founder Monitor: store truth risk',
            message: `${params.staleOrBrokenStores} active store(s) are stale or have critical support risk.`,
            metadata: {
                subsystem: 'founder-monitor',
                staleOrBrokenStores: params.staleOrBrokenStores,
            },
            actionRequired: true,
        });
    }

    await Promise.all(alerts.map((alert) => createAlert(alert).catch((error) => {
        logger.error('[FounderMonitor] Failed to create risk alert', {
            title: alert.title,
            errorName: error instanceof Error ? error.name : typeof error,
        });
    })));
}

export async function rebuildFounderMonitorSnapshotLogic(): Promise<ReconcileResult> {
    const todayKey = getIndiaDayKey(new Date());
    const [
        storesSummarySnap,
        truthSnap,
        subscriptionSnap,
        supportSnap,
        todayMovementSnap,
        onboardingTransitionSnap,
    ] = await Promise.all([
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get(),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storeTruthConfidence').get(),
        readCollection(DB_COLLECTIONS.SUBSCRIPTIONS, SUBSCRIPTION_LIMIT, 'modifiedOn'),
        readCollection(DB_COLLECTIONS.SUPPORT_TICKETS, SUPPORT_TICKET_LIMIT, 'createdOn'),
        db.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS)
            .where('businessDayKey', '==', todayKey)
            .limit(MOVEMENT_RECONCILE_LIMIT)
            .get(),
        readCollection(DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS, ONBOARDING_TRANSITION_LIMIT),
    ]);

    const storesSummary = storesSummarySnap.exists ? (storesSummarySnap.data()?.stores || {}) : {};
    const truthStores = truthSnap.exists ? (truthSnap.data()?.stores || {}) : {};
    const subscriptionReadCapped = (subscriptionSnap?.size || 0) >= SUBSCRIPTION_LIMIT;
    const supportReadCapped = (supportSnap?.size || 0) >= SUPPORT_TICKET_LIMIT;
    const movementReadCapped = todayMovementSnap.size >= MOVEMENT_RECONCILE_LIMIT;
    const onboardingTransitionReadCapped = (onboardingTransitionSnap?.size || 0) >= ONBOARDING_TRANSITION_LIMIT;

    const subscriptions: SnapshotDocumentData[] = (subscriptionSnap?.docs || []).map((doc) => ({
        ...((doc.data() || {}) as Record<string, any>),
        id: doc.id,
    }));
    const subscriptionByStore = new Map<string, SnapshotDocumentData>();
    subscriptions.forEach((subscription) => {
        const storeId = cleanText(subscription.storeId || subscription.sId, 80);
        if (!storeId) return;
        const current = subscriptionByStore.get(storeId);
        if (!current || (isActiveSubscription(subscription) && !isActiveSubscription(current))) {
            subscriptionByStore.set(storeId, subscription);
        }
    });

    const supportByStore = new Map<string, { open: number; critical: number; recent: number }>();
    (supportSnap?.docs || []).forEach((doc) => {
        const data = doc.data() || {};
        if (data.deleted) return;
        const storeId = cleanText(data.sId || data.storeId, 80);
        if (!storeId) return;
        const status = normalizeStatus(data.status || 'Open');
        const priority = normalizeStatus(data.priority || 'Normal');
        const open = !['closed', 'resolved'].includes(status);
        const critical = open && ['high', 'urgent', 'critical'].includes(priority);
        const current = supportByStore.get(storeId) || { open: 0, critical: 0, recent: 0 };
        if (open) current.open += 1;
        if (critical) current.critical += 1;
        if (isToday(getDocumentDate(data), todayKey)) current.recent += 1;
        supportByStore.set(storeId, current);
    });

    const onboardingTransitionByStore = new Map<string, SnapshotDocumentData>();
    const completedTimeToLiveHoursByStore = new Map<string, number>();
    (onboardingTransitionSnap?.docs || []).forEach((doc) => {
        const data = doc.data() || {};
        const storeId = cleanText(data.storeId || data.sId || doc.id, 80);
        if (!storeId) return;
        onboardingTransitionByStore.set(storeId, {
            ...data,
            id: doc.id,
        });
        const timeToLiveHours = finiteNumberOrNull(data.timeToLiveHours);
        if (timeToLiveHours !== null) {
            completedTimeToLiveHoursByStore.set(storeId, timeToLiveHours);
        }
    });

    let activeStores = 0;
    let activeDistributionStores = 0;
    let trustedLiveStores = 0;
    let storesActivatedToday = 0;
    let onboardingStuckStores = 0;
    let staleOrBrokenStores = 0;
    let storesWithoutPublishedMenu = 0;
    let storesMissingDistributionSurface = 0;
    let storesBelow70 = 0;
    let payingStoresBelow70 = 0;
    let unscoredActiveStores = 0;
    let scoredStores = 0;
    let totalTruthScore = 0;
    const onboardingTransitionCandidates: OnboardingTransitionCandidate[] = [];

    const storeRows = Object.entries(storesSummary).map(([storeId, summaryValue]) => {
        const summary = (summaryValue || {}) as Record<string, any>;
        const active = storeIsActive(summary);
        const subscription = subscriptionByStore.get(storeId);
        const truth = truthStores[storeId] || {};
        const truthScore = Number.isFinite(Number(truth.score)) ? Number(truth.score) : null;
        const lastPublishedAt = toDate(summary.lastPublishedAt || summary.lastPublishedOn);
        const publishAgeDays = daysSince(lastPublishedAt);
        const projectCount = safeNumber(summary.projectCount);
        const hasPublishedMenu = projectCount > 0 || Boolean(lastPublishedAt);
        const distributionReady = hasDistributionSurface(summary);
        const hasPlan = Boolean(summary.activePlanType) || Boolean(subscription && (isActiveSubscription(subscription) || isPastDueSubscription(subscription)));
        const paying = Boolean(subscription && (isActiveSubscription(subscription) || isPastDueSubscription(subscription)));
        const stale = truth.staleFlag === true || (publishAgeDays !== null && publishAgeDays > 90);
        const supportCounts = supportByStore.get(storeId) || { open: 0, critical: 0, recent: 0 };
        const onboardingTransition = onboardingTransitionByStore.get(storeId);
        const transitionPaymentAt = toDate(onboardingTransition?.paymentAt)
            || toDate(subscription?.subscriptionStartDate)
            || getDocumentDate(subscription || {});
        const transitionFirstLiveAt = toDate(onboardingTransition?.firstLiveAt);
        const transitionTimeToLiveHours = finiteNumberOrNull(onboardingTransition?.timeToLiveHours);

        if (active) activeStores += 1;
        if (active && distributionReady) activeDistributionStores += 1;
        if (active && !hasPublishedMenu) storesWithoutPublishedMenu += 1;
        if (active && !distributionReady) storesMissingDistributionSurface += 1;
        if (active && isToday(lastPublishedAt, todayKey) && hasPublishedMenu) storesActivatedToday += 1;
        if (active && hasPlan && !hasPublishedMenu) onboardingStuckStores += 1;
        if (active && (stale || supportCounts.critical > 0)) staleOrBrokenStores += 1;
        if (active && truthScore === null) unscoredActiveStores += 1;
        if (truthScore !== null) {
            scoredStores += 1;
            totalTruthScore += truthScore;
            if (truthScore < 70) storesBelow70 += 1;
            if (paying && truthScore < 70) payingStoresBelow70 += 1;
        }
        if (active && hasPublishedMenu && hasPlan && !stale && (truthScore === null || truthScore >= 70)) trustedLiveStores += 1;
        if (active && hasPlan && hasPublishedMenu && lastPublishedAt && transitionPaymentAt) {
            const timeToLiveHours = transitionTimeToLiveHours !== null
                ? transitionTimeToLiveHours
                : hoursBetween(transitionPaymentAt, lastPublishedAt);
            completedTimeToLiveHoursByStore.set(storeId, timeToLiveHours);
            onboardingTransitionCandidates.push({
                firstLiveAt: transitionFirstLiveAt || lastPublishedAt,
                hasCompleteTransition: Boolean(transitionFirstLiveAt && transitionTimeToLiveHours !== null),
                paymentAt: transitionPaymentAt,
                storeId,
                subscriptionId: cleanText(subscription?.id || subscription?.providerSubscriptionId, 160) || cleanText(onboardingTransition?.subscriptionId, 160) || null,
                tenantId: cleanText(summary.tId || summary.tenantId || onboardingTransition?.tenantId, 80) || null,
                timeToLiveHours,
                transitionExists: Boolean(onboardingTransition),
            });
        }

        const riskReasons: string[] = [];
        if (!active) riskReasons.push('Store inactive or blocked');
        if (subscription && isPastDueSubscription(subscription)) riskReasons.push('Payment past due or pending');
        if (active && hasPlan && !hasPublishedMenu) riskReasons.push('Paid store not live');
        if (active && hasPublishedMenu && !distributionReady) riskReasons.push('Distribution surface not recorded');
        if (active && stale) riskReasons.push('Store truth stale');
        if (active && truthScore !== null && truthScore < 70) riskReasons.push('Store Truth Score below 70');
        if (supportCounts.critical > 0) riskReasons.push('Critical support ticket open');

        return {
            id: storeId,
            tenantId: cleanText(summary.tId || summary.tenantId, 80),
            tenantName: cleanText(summary.tenantName || 'Tenant not recorded', 120),
            storeId,
            storeName: cleanText(summary.name || summary.storeName || `Store ${storeId}`, 120),
            planName: cleanText(subscription?.planName || summary.activePlanType || 'No plan recorded', 120),
            subscriptionStatus: cleanText(subscription?.status || (summary.activePlanType ? 'entitled' : 'not_recorded'), 80),
            mrrPaise: subscription ? getSubscriptionMrrPaise(subscription) : 0,
            stage: buildStoreStage(active, hasPublishedMenu, hasPlan, distributionReady, stale),
            paymentStatus: cleanText(subscription?.status || (hasPlan ? 'entitled' : 'not_recorded'), 80),
            menuStatus: hasPublishedMenu ? (stale ? 'Stale' : 'Published') : 'Not live',
            distributionStatus: distributionReady ? 'Surface recorded' : 'Not recorded',
            truthScore,
            lastPublishedAt: toIso(lastPublishedAt),
            daysSincePublish: publishAgeDays,
            supportOpenTickets: supportCounts.open,
            riskLevel: getRiskLevel(riskReasons),
            riskReasons,
        };
    }).sort((left, right) => {
        const severity: Record<ReturnType<typeof getRiskLevel>, number> = { action_required: 2, watch: 1, none: 0 };
        const rightSeverity = severity[right.riskLevel as ReturnType<typeof getRiskLevel>] || 0;
        const leftSeverity = severity[left.riskLevel as ReturnType<typeof getRiskLevel>] || 0;
        return rightSeverity - leftSeverity
            || right.mrrPaise - left.mrrPaise
            || String(left.storeName).localeCompare(String(right.storeName));
    }).slice(0, 120);

    const activeSubscriptions = subscriptions.filter(isActiveSubscription);
    const pastDueSubscriptions = subscriptions.filter(isPastDueSubscription);
    const churnedSubscriptions = subscriptions.filter(isChurnedSubscription);
    const currentMrrPaise = activeSubscriptions.reduce((sum, subscription) => sum + getSubscriptionMrrPaise(subscription), 0);
    const pastDueMrrPaise = pastDueSubscriptions.reduce((sum, subscription) => sum + getSubscriptionMrrPaise(subscription), 0);
    const dailyRevenue = summarizeDailyMovements(todayMovementSnap.docs);
    const completedTimeToLiveHours = Array.from(completedTimeToLiveHoursByStore.values())
        .filter((value) => Number.isFinite(value));
    const averageTimeToLiveHours = completedTimeToLiveHours.length > 0
        ? Math.round((completedTimeToLiveHours.reduce((sum, value) => sum + value, 0) / completedTimeToLiveHours.length) * 10) / 10
        : null;
    const transitionWritePlan = onboardingTransitionCandidates
        .filter((candidate) => !candidate.hasCompleteTransition);

    const supportCounts = Array.from(supportByStore.values());
    const dataGaps = [
        ...(completedTimeToLiveHours.length === 0 ? [{
            id: 'time-to-live-ledger-warming',
            label: 'Time to live ledger is warming up',
            detail: 'Payment-to-live duration appears after the first paid store has both a payment timestamp and a published menu timestamp.',
            severity: 'info',
        }] : []),
        ...(onboardingTransitionReadCapped ? [{
            id: 'onboarding-transition-read-capped',
            label: 'Onboarding transition read reached the safety cap',
            detail: `Time-to-live calculation used ${ONBOARDING_TRANSITION_LIMIT} onboarding transition documents.`,
            severity: 'watch',
        }] : []),
        ...(transitionWritePlan.length > ONBOARDING_TRANSITION_WRITE_LIMIT ? [{
            id: 'onboarding-transition-write-capped',
            label: 'Onboarding transition catch-up reached the write cap',
            detail: `This run will complete ${ONBOARDING_TRANSITION_WRITE_LIMIT} transition documents. Remaining live stores will be completed on later scheduler runs.`,
            severity: 'watch',
        }] : []),
        ...(subscriptionReadCapped ? [{
            id: 'subscription-read-capped',
            label: 'Subscription reconciliation reached the safety cap',
            detail: `The 30-minute reconciliation read ${SUBSCRIPTION_LIMIT} subscription documents. Transaction-time revenue remains the live revenue source.`,
            severity: 'watch',
        }] : []),
        ...(supportReadCapped ? [{
            id: 'support-read-capped',
            label: 'Support ticket read reached the safety cap',
            detail: `Support risk used the latest ${SUPPORT_TICKET_LIMIT} tickets.`,
            severity: 'watch',
        }] : []),
        ...(movementReadCapped ? [{
            id: 'daily-movement-read-capped',
            label: 'Daily revenue movement read reached the safety cap',
            detail: `Daily reconciliation used ${MOVEMENT_RECONCILE_LIMIT} founder revenue movements for ${todayKey}. Runtime counters remain the live revenue source.`,
            severity: 'watch',
        }] : []),
    ];

    const revenueReconciliationPayload: Record<string, any> = {
        activeStores,
        trustedLiveStores,
        reconciliationLimited: subscriptionReadCapped,
        reconciliationSource: 'menulistMaintenanceScheduler:founderMonitorSnapshot',
        reconciledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (!subscriptionReadCapped) {
        revenueReconciliationPayload.activeSubscriptions = activeSubscriptions.length;
        revenueReconciliationPayload.churnedSubscriptions = churnedSubscriptions.length;
        revenueReconciliationPayload.currentMrrPaise = currentMrrPaise;
        revenueReconciliationPayload.pastDueMrrPaise = pastDueMrrPaise;
        revenueReconciliationPayload.pastDueSubscriptions = pastDueSubscriptions.length;
    } else {
        revenueReconciliationPayload.reconciledActiveSubscriptions = activeSubscriptions.length;
        revenueReconciliationPayload.reconciledChurnedSubscriptions = churnedSubscriptions.length;
        revenueReconciliationPayload.reconciledCurrentMrrPaise = currentMrrPaise;
        revenueReconciliationPayload.reconciledPastDueMrrPaise = pastDueMrrPaise;
        revenueReconciliationPayload.reconciledPastDueSubscriptions = pastDueSubscriptions.length;
    }

    const snapshot = {
        generatedAt: FieldValue.serverTimestamp(),
        status: dailyRevenue.failedPaymentCount > 0 || staleOrBrokenStores > 0 || supportCounts.some((counts) => counts.critical > 0)
            ? 'action_required'
            : onboardingStuckStores > 0 ? 'watch' : 'healthy',
        scorecard: {
            trustedLiveStores,
            activeStores,
            totalStores: Object.keys(storesSummary).length,
            newTenantsToday: dailyRevenue.newTenantIds.length,
            newStoresToday: dailyRevenue.newStoreIds.length,
            storesActivatedToday,
            onboardingStuckStores,
            staleOrBrokenStores,
            activeDistributionStores,
            criticalTickets: supportCounts.reduce((sum, counts) => sum + counts.critical, 0),
            failedPaymentsToday: dailyRevenue.failedPaymentCount,
            todayWindowLabel: 'Since 12:00 AM IST',
        },
        storeTruth: {
            averageScore: scoredStores > 0 ? Math.round((totalTruthScore / scoredStores) * 10) / 10 : 0,
            scoredStores,
            storesBelow70,
            payingStoresBelow70,
            staleStores: staleOrBrokenStores,
            unscoredActiveStores,
        },
        onboarding: {
            paidStoresNotLive: onboardingStuckStores,
            pendingSubscriptions: subscriptions.filter((subscription) => normalizeStatus(subscription.status) === 'pending').length,
            storesWithoutPublishedMenu,
            storesMissingDistributionSurface,
            averageTimeToLiveHours,
        },
        support: {
            openTickets: supportCounts.reduce((sum, counts) => sum + counts.open, 0),
            highPriorityOpenTickets: supportCounts.reduce((sum, counts) => sum + counts.critical, 0),
            ticketsOpenedToday: supportCounts.reduce((sum, counts) => sum + counts.recent, 0),
            storesWithRepeatedTickets: supportCounts.filter((counts) => counts.open >= 3).length,
        },
        storeRows,
        dataGaps,
        updatedAt: FieldValue.serverTimestamp(),
    };

    const transitionWriteResult = await writeOnboardingTransitionCompletions(onboardingTransitionCandidates);

    await Promise.all([
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('founderMonitorSnapshot').set(snapshot, { merge: true }),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('founderMonitorRevenue').set(revenueReconciliationPayload, { merge: true }),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`founderMonitorRevenueDaily_${todayKey}`).set({
            ...dailyRevenue,
            dateKey: todayKey,
            onboardingTransitionWrites: transitionWriteResult.writeCount,
            onboardingTransitionWriteCapped: transitionWriteResult.writeCapped,
            reconciliationSource: 'menulistMaintenanceScheduler:founderMonitorSnapshot',
            reconciledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true }),
        emitFounderMonitorRiskAlerts({
            criticalTickets: supportCounts.reduce((sum, counts) => sum + counts.critical, 0),
            failedPaymentAmountPaise: dailyRevenue.failedPaymentAmountPaise,
            failedPaymentCount: dailyRevenue.failedPaymentCount,
            onboardingStuckStores,
            staleOrBrokenStores,
        }),
    ]);

    return {
        activity: true,
        details: {
            activeStores,
            currentMrrPaise,
            movementsToday: todayMovementSnap.size,
            storeRows: storeRows.length,
            trustedLiveStores,
        },
    };
}
