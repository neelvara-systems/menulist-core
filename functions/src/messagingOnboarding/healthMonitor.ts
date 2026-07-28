/**
 * Messaging Onboarding health and cost guardrails.
 *
 * Runs from the intake scheduler with an hourly guard so normal two-minute
 * intake checks do not create a Firestore read loop.
 */

import { Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { randomUUID } from "node:crypto";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import { createAlert } from "../monitoring/alerts";
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from "../sharedData/platformNotificationRegistry";
import {
  MSG_ONBOARDING_EVENT_TYPES,
  MsgOnboardingEventType,
} from "../types/messagingOnboarding.types";
import { COST_MONITORING } from "./constants";
import { normalizeMessagingPublishedResult } from "./publishedResultBoundary";
import { getBoundedFunctionsErrorName, getBoundedFunctionsErrorCode } from '../utils/boundedErrorContext';

const logger = functions.logger;
const db = firestoreAdmin;
const MESSAGING_HEALTH_SNAPSHOT_WRITE_FAILED = "MESSAGING_HEALTH_SNAPSHOT_WRITE_FAILED";
const MESSAGING_HEALTH_ALERT_EMIT_FAILED = "MESSAGING_HEALTH_ALERT_EMIT_FAILED";

const HEALTH_CONTROL_DOC = "messaging_onboarding_control";
const HEALTH_DOC_PREFIX = "messaging_onboarding";
const HEALTH_COMPUTE_LEASE_MS = 15 * 60 * 1000;
const HEALTH_CONTROL_CHECK_WINDOW_MINUTES = 4;
const MAX_HEALTH_LEASE_ID_LENGTH = 80;

function getMessagingHealthErrorName(error: unknown): string {
    return getBoundedFunctionsErrorName(error) || 'Error';
}

function getMessagingHealthErrorCode(error: unknown): string | undefined {
    return getBoundedFunctionsErrorCode(error);
}

function getMessagingHealthErrorContext(error: unknown): Record<string, string | undefined> {
  return {
    errorName: getMessagingHealthErrorName(error),
    errorCode: getMessagingHealthErrorCode(error),
  };
}

export interface MessagingOnboardingRunMetrics {
  inboundProcessed: number;
  processed: number;
  errors: number;
}

export interface HealthAlert {
  key: string;
  severity: "warning" | "critical";
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

const MSG_ONBOARDING_EVENT_TYPE_SET = new Set<string>(MSG_ONBOARDING_EVENT_TYPES);

function isMessagingEventType(value: unknown): value is MsgOnboardingEventType {
  return typeof value === "string" && MSG_ONBOARDING_EVENT_TYPE_SET.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readTimestampMillis(value: unknown): number | null {
  if (!isRecord(value) || typeof value.toMillis !== "function") return null;
  try {
    const millis = value.toMillis.call(value);
    return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
  } catch {
    return null;
  }
}

export function isMessagingHealthComputationDue(
  control: unknown,
  nowMillis: number,
): boolean {
  if (!Number.isFinite(nowMillis) || nowMillis < 0) return false;
  const source = isRecord(control) ? control : {};
  const lastComputedAt = readTimestampMillis(source.lastComputedAt);
  const computeLeaseUntil = readTimestampMillis(source.computeLeaseUntil);
  const recentlyCompleted = lastComputedAt !== null
    && lastComputedAt <= nowMillis
    && nowMillis - lastComputedAt < COST_MONITORING.HEALTH_SNAPSHOT_INTERVAL_MS;
  const activeLease = computeLeaseUntil !== null
    && computeLeaseUntil > nowMillis
    && computeLeaseUntil <= nowMillis + HEALTH_COMPUTE_LEASE_MS;
  return !recentlyCompleted && !activeLease;
}

export function isMessagingHealthLeaseOwner(
  control: unknown,
  expectedLeaseId: string,
): boolean {
  if (
    expectedLeaseId.length === 0
    || expectedLeaseId.length > MAX_HEALTH_LEASE_ID_LENGTH
    || expectedLeaseId.trim() !== expectedLeaseId
  ) {
    return false;
  }
  return isRecord(control) && control.computeLeaseId === expectedLeaseId;
}

export function shouldCheckMessagingOnboardingHealth(nowMillis: number): boolean {
  if (!Number.isFinite(nowMillis) || nowMillis < 0) return false;
  return new Date(nowMillis).getUTCMinutes() < HEALTH_CONTROL_CHECK_WINDOW_MINUTES;
}

export function normalizeMessagingHealthSessionSample(
  value: unknown,
): { processingRuns: number; published: boolean } | null {
  if (!isRecord(value)) return null;
  const processingRuns = readNonNegativeInteger(value.processingRuns);
  const knownState = typeof value.state === "string" && [
    "COLLECTING_INPUT",
    "VALIDATING_ASSETS",
    "AWAITING_MORE_UPLOADS",
    "PROCESSING_MENU",
    "PREVIEW_READY",
    "AWAITING_APPROVAL",
    "PUBLISHING",
    "LIVE",
    "FAILED",
    "EXPIRED",
    "COOLDOWN",
  ].includes(value.state);
  const publishedResultIsValid = normalizeMessagingPublishedResult(value.publishedResult) !== null;
  if (
    processingRuns === null
    || !knownState
    || value.state === "LIVE" && !publishedResultIsValid
    || value.state !== "LIVE" && value.publishedResult !== null
  ) {
    return null;
  }
  return { processingRuns, published: value.state === "LIVE" };
}

export async function recordMessagingOnboardingHealth(
  runMetrics: MessagingOnboardingRunMetrics,
): Promise<void> {
  const controlRef = db
    .collection(DB_COLLECTIONS.SYSTEM_HEALTH)
    .doc(HEALTH_CONTROL_DOC);
  const computeLeaseId = randomUUID();
  let computationClaimed = false;
  try {
    if (
      readNonNegativeInteger(runMetrics.inboundProcessed) === null
      || readNonNegativeInteger(runMetrics.processed) === null
      || readNonNegativeInteger(runMetrics.errors) === null
    ) {
      throw new Error("MESSAGING_HEALTH_RUN_METRICS_INVALID");
    }
    const now = Timestamp.now();

    const shouldCompute = await db.runTransaction(async (transaction) => {
      const controlSnapshot = await transaction.get(controlRef);
      if (!isMessagingHealthComputationDue(controlSnapshot.data(), now.toMillis())) return false;

      transaction.set(
        controlRef,
        {
          computeLeaseId,
          computeLeaseUntil: Timestamp.fromMillis(now.toMillis() + HEALTH_COMPUTE_LEASE_MS),
          lastAttemptAt: now,
          lastRunMetrics: runMetrics,
          status: "computing",
          updatedAt: now,
        },
        { merge: true },
      );
      return true;
    });

    if (!shouldCompute) return;
    computationClaimed = true;

    const snapshot = await buildHealthSnapshot(runMetrics);
    const snapshotId = getHourlySnapshotId(snapshot.windowEnd.toDate());
    const snapshotRef = db
      .collection(DB_COLLECTIONS.SYSTEM_HEALTH)
      .doc(snapshotId);

    const settled = await db.runTransaction(async (transaction) => {
      const currentControl = await transaction.get(controlRef);
      if (!isMessagingHealthLeaseOwner(currentControl.data(), computeLeaseId)) {
        return false;
      }
      transaction.set(snapshotRef, snapshot);
      transaction.set(
        controlRef,
        {
          computeLeaseId: null,
          computeLeaseUntil: null,
          lastComputedAt: snapshot.windowEnd,
          lastSnapshotId: snapshotId,
          lastStatus: snapshot.status,
          status: snapshot.status,
          updatedAt: snapshot.windowEnd,
        },
        { merge: true },
      );
      return true;
    });
    computationClaimed = false;
    if (!settled) {
      logger.warn("[MessagingHealth] Discarded stale health computation", {
        failureCode: "MESSAGING_HEALTH_LEASE_OWNERSHIP_LOST",
      });
      return;
    }

    await emitHealthAlerts(snapshot.alerts);
  } catch (error) {
    if (computationClaimed) {
      try {
        const failedAt = Timestamp.now();
        await db.runTransaction(async (transaction) => {
          const currentControl = await transaction.get(controlRef);
          if (!isMessagingHealthLeaseOwner(currentControl.data(), computeLeaseId)) {
            return;
          }
          transaction.set(controlRef, {
            computeLeaseId: null,
            computeLeaseUntil: null,
            lastFailureAt: failedAt,
            status: "failed",
            updatedAt: failedAt,
          }, { merge: true });
        });
      } catch (releaseError) {
        logger.error("[MessagingHealth] Failed to release health computation lease", {
          failureCode: "MESSAGING_HEALTH_LEASE_RELEASE_FAILED",
          ...getMessagingHealthErrorContext(releaseError),
        });
      }
    }
    logger.error("[MessagingHealth] Failed to record health snapshot", {
      failureCode: MESSAGING_HEALTH_SNAPSHOT_WRITE_FAILED,
      ...getMessagingHealthErrorContext(error),
    });
  }
}

async function buildHealthSnapshot(runMetrics: MessagingOnboardingRunMetrics) {
  const now = Timestamp.now();
  const windowStart = Timestamp.fromMillis(
    now.toMillis() - COST_MONITORING.HEALTH_WINDOW_MS,
  );

  const [sessionsSnapshot, eventsSnapshot, liveSessionsSnapshot] =
    await Promise.all([
      db
        .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
        .where("createdAt", ">=", windowStart)
        .limit(COST_MONITORING.HEALTH_SESSION_SAMPLE_LIMIT)
        .get(),
      db
        .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
        .where("timestamp", ">=", windowStart)
        .orderBy("timestamp", "desc")
        .limit(COST_MONITORING.HEALTH_EVENT_SAMPLE_LIMIT)
        .get(),
      db
        .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
        .where("state", "==", "LIVE")
        .orderBy("publishedAt", "asc")
        .limit(COST_MONITORING.PUBLISHED_SOURCE_SAMPLE_LIMIT)
        .get(),
    ]);

  const sessions = sessionsSnapshot.docs.map((doc) => normalizeMessagingHealthSessionSample(doc.data()));
  const validSessions = sessions.filter(
    (session): session is NonNullable<typeof session> => session !== null,
  );
  const invalidSessionRecords = sessions.length - validSessions.length;
  const eventsByType = countEventsByType(eventsSnapshot.docs);

  const sessionsStarted = sessionsSnapshot.size;
  const publishedSessions = validSessions.filter((session) => session.published).length;
  const processingRuns = validSessions.reduce(
    (total, session) => total + session.processingRuns,
    0,
  );
  const publishRate =
    sessionsStarted > 0 ? publishedSessions / sessionsStarted : 0;
  const estimatedAiCostInr =
    processingRuns * COST_MONITORING.ESTIMATED_AI_COST_PER_PROCESSING_RUN_INR;
  const estimatedCostPerPublishInr =
    publishedSessions > 0 ? estimatedAiCostInr / publishedSessions : 0;

  const failedEvents =
    (eventsByType.EXTRACTION_FAILED || 0) +
    (eventsByType.PUBLISH_FAILED || 0) +
    (eventsByType.MESSAGE_SEND_FAILED || 0) +
    (eventsByType.INBOUND_MESSAGE_FAILED || 0);

  let publishedSourceBytesSampled = 0;
  let invalidUploadRecords = 0;
  for (const doc of liveSessionsSnapshot.docs) {
    const uploadSample = getMessagingSessionUploadByteSample(doc.data());
    publishedSourceBytesSampled += uploadSample.bytes;
    invalidUploadRecords += uploadSample.invalidRecords;
  }

  const alerts = buildAlerts({
    sessionsStarted,
    publishedSessions,
    publishRate,
    estimatedCostPerPublishInr,
    failedEvents,
    eventsByType,
    publishedSourceBytesSampled,
    liveSessionsSampled: liveSessionsSnapshot.size,
    invalidDataRecords: invalidSessionRecords + invalidUploadRecords,
  });

  const status = alerts.some((alert) => alert.severity === "critical")
    ? "critical"
    : alerts.length > 0
      ? "degraded"
      : "healthy";

  return {
    subsystem: "messaging_onboarding",
    status,
    windowStart,
    windowEnd: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000),
    runMetrics,
    sampleLimits: {
      sessions: COST_MONITORING.HEALTH_SESSION_SAMPLE_LIMIT,
      events: COST_MONITORING.HEALTH_EVENT_SAMPLE_LIMIT,
      publishedSources: COST_MONITORING.PUBLISHED_SOURCE_SAMPLE_LIMIT,
    },
    metrics: {
      sessionsStarted,
      publishedSessions,
      publishRate,
      processingRuns,
      failedEvents,
      eventsByType,
      invalidSessionRecords,
    },
    costs: {
      currency: "INR",
      estimatedAiCostInr,
      estimatedCostPerPublishInr,
      targetCostPerPublishInr: COST_MONITORING.TARGET_COST_PER_PUBLISH,
      alertCostPerPublishInr: COST_MONITORING.ALERT_COST_PER_PUBLISH,
    },
    retention: {
      retainPublishedSourceFiles: true,
      reviewAfterDays: COST_MONITORING.SOURCE_FILE_RETENTION_REVIEW_DAYS,
      publishedSourceBytesSampled,
      liveSessionsSampled: liveSessionsSnapshot.size,
      invalidUploadRecords,
      warnBytes: COST_MONITORING.PUBLISHED_SOURCE_STORAGE_WARN_BYTES,
      criticalBytes: COST_MONITORING.PUBLISHED_SOURCE_STORAGE_CRITICAL_BYTES,
    },
    alerts: alerts.map((alert) => ({
      key: alert.key,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

function countEventsByType(
  docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[],
): Partial<Record<MsgOnboardingEventType, number>> {
  return countMessagingEventTypes(docs.map((doc) => doc.get("eventType")));
}

export function countMessagingEventTypes(
  values: readonly unknown[],
): Partial<Record<MsgOnboardingEventType, number>> {
  const counts: Partial<Record<MsgOnboardingEventType, number>> = {};
  for (const eventType of values) {
    if (!isMessagingEventType(eventType)) continue;
    counts[eventType] = (counts[eventType] || 0) + 1;
  }
  return counts;
}

export function getMessagingSessionUploadByteSample(
  data: unknown,
): { bytes: number; invalidRecords: number } {
  if (!isRecord(data) || !Array.isArray(data.uploads)) {
    return { bytes: 0, invalidRecords: 1 };
  }
  let bytes = 0;
  let invalidRecords = 0;
  for (const upload of data.uploads) {
    const fileSize = isRecord(upload) ? readNonNegativeInteger(upload.fileSize) : null;
    if (fileSize === null || fileSize === 0 || fileSize > 10 * 1024 * 1024) {
      invalidRecords++;
      continue;
    }
    bytes += fileSize;
  }
  return { bytes, invalidRecords };
}

function buildAlerts(params: {
  sessionsStarted: number;
  publishedSessions: number;
  publishRate: number;
  estimatedCostPerPublishInr: number;
  failedEvents: number;
  eventsByType: Partial<Record<MsgOnboardingEventType, number>>;
  publishedSourceBytesSampled: number;
  liveSessionsSampled: number;
  invalidDataRecords: number;
}): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  if (params.invalidDataRecords > 0) {
    alerts.push({
      key: "invalid_health_source_data",
      severity: "warning",
      title: "Messaging Onboarding Health Data Invalid",
      message: `${params.invalidDataRecords} sampled messaging records failed health-data validation.`,
      metadata: { invalidDataRecords: params.invalidDataRecords },
    });
  }

  if (params.sessionsStarted > COST_MONITORING.MAX_SESSIONS_PER_DAY_ALERT) {
    alerts.push({
      key: "session_volume_high",
      severity: "warning",
      title: "Messaging Onboarding Volume High",
      message: `${params.sessionsStarted} messaging onboarding sessions started in the last 24 hours.`,
      metadata: { sessionsStarted: params.sessionsStarted },
    });
  }

  if (
    params.sessionsStarted >= COST_MONITORING.MIN_SESSIONS_FOR_PUBLISH_RATE_ALERT &&
    params.publishRate < COST_MONITORING.TARGET_PUBLISH_RATE
  ) {
    alerts.push({
      key: "publish_rate_low",
      severity: "warning",
      title: "Messaging Onboarding Publish Rate Low",
      message: `Publish rate is ${(params.publishRate * 100).toFixed(1)}% over the last 24 hours.`,
      metadata: {
        sessionsStarted: params.sessionsStarted,
        publishedSessions: params.publishedSessions,
        targetPublishRate: COST_MONITORING.TARGET_PUBLISH_RATE,
      },
    });
  }

  if (
    params.publishedSessions > 0 &&
    params.estimatedCostPerPublishInr >
      COST_MONITORING.ALERT_COST_PER_PUBLISH
  ) {
    alerts.push({
      key: "cost_per_publish_high",
      severity: "critical",
      title: "Messaging Onboarding Cost Per Publish High",
      message: `Estimated AI cost is ₹${params.estimatedCostPerPublishInr.toFixed(2)} per publish.`,
      metadata: {
        estimatedCostPerPublishInr: params.estimatedCostPerPublishInr,
        alertCostPerPublishInr: COST_MONITORING.ALERT_COST_PER_PUBLISH,
      },
    });
  }

  if (params.failedEvents >= COST_MONITORING.FAILED_EVENT_ALERT_THRESHOLD) {
    alerts.push({
      key: "failure_events_high",
      severity: "warning",
      title: "Messaging Onboarding Failures High",
      message: `${params.failedEvents} messaging onboarding failure events were recorded in the last 24 hours.`,
      metadata: {
        failedEvents: params.failedEvents,
        eventsByType: params.eventsByType,
      },
    });
  }

  if (
    params.publishedSourceBytesSampled >
    COST_MONITORING.PUBLISHED_SOURCE_STORAGE_CRITICAL_BYTES
  ) {
    alerts.push({
      key: "source_storage_critical",
      severity: "critical",
      title: "Messaging Onboarding Source Storage Critical",
      message: `Sampled retained source files are ${(params.publishedSourceBytesSampled / (1024 * 1024 * 1024)).toFixed(2)} GB.`,
      metadata: {
        publishedSourceBytesSampled: params.publishedSourceBytesSampled,
        liveSessionsSampled: params.liveSessionsSampled,
      },
    });
  } else if (
    params.publishedSourceBytesSampled >
    COST_MONITORING.PUBLISHED_SOURCE_STORAGE_WARN_BYTES
  ) {
    alerts.push({
      key: "source_storage_warning",
      severity: "warning",
      title: "Messaging Onboarding Source Storage Review",
      message: `Sampled retained source files are ${(params.publishedSourceBytesSampled / (1024 * 1024 * 1024)).toFixed(2)} GB.`,
      metadata: {
        publishedSourceBytesSampled: params.publishedSourceBytesSampled,
        liveSessionsSampled: params.liveSessionsSampled,
      },
    });
  }

  return alerts;
}

export async function emitHealthAlerts(
  alerts: HealthAlert[],
  alertWriter: typeof createAlert = createAlert,
): Promise<number> {
  let failedAlerts = 0;
  for (const alert of alerts) {
    const triggerType = alert.key.includes("cost")
      ? PLATFORM_NOTIFICATION_TRIGGER_TYPES.AI_COST_RUNAWAY
      : alert.key.includes("failure")
        ? PLATFORM_NOTIFICATION_TRIGGER_TYPES.WHATSAPP_PROVIDER_FAILURE
        : PLATFORM_NOTIFICATION_TRIGGER_TYPES.WHATSAPP_ONBOARDING_QUEUE_STUCK;

    try {
      await alertWriter({
        tId: "system",
        sId: "system",
        type: alert.key.includes("cost") ? "usage" : "health",
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: {
          subsystem: "messaging_onboarding",
          alertKey: alert.key,
          ...alert.metadata,
        },
        triggerType,
        productId: "ML",
        category: alert.key.includes("cost") ? "ai" : "extraction",
        actionRequired: alert.severity === "critical",
      });
    } catch (error) {
      failedAlerts += 1;
      logger.error("[MessagingHealth] Failed to emit threshold alert", {
        failureCode: MESSAGING_HEALTH_ALERT_EMIT_FAILED,
        alertKey: alert.key,
        severity: alert.severity,
        ...getMessagingHealthErrorContext(error),
      });
    }
  }
  return failedAlerts;
}

function getHourlySnapshotId(date: Date): string {
  const hour = date.toISOString().slice(0, 13).replace(/[-T]/g, "");
  return `${HEALTH_DOC_PREFIX}_${hour}`;
}
