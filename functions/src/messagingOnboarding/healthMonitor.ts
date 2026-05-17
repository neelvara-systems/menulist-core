/**
 * Messaging Onboarding health and cost guardrails.
 *
 * Runs from the intake scheduler with an hourly guard so normal two-minute
 * intake checks do not create a Firestore read loop.
 */

import { Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import { createAlert } from "../monitoring/alerts";
import {
  MessagingOnboardingSession,
  MsgOnboardingEventType,
} from "../types/messagingOnboarding.types";
import { COST_MONITORING } from "./constants";

const logger = functions.logger;
const db = firestoreAdmin;

const HEALTH_CONTROL_DOC = "messaging_onboarding_control";
const HEALTH_DOC_PREFIX = "messaging_onboarding";

export interface MessagingOnboardingRunMetrics {
  inboundProcessed: number;
  processed: number;
  errors: number;
}

interface HealthAlert {
  key: string;
  severity: "warning" | "critical";
  title: string;
  message: string;
  metadata: Record<string, any>;
}

export async function recordMessagingOnboardingHealth(
  runMetrics: MessagingOnboardingRunMetrics,
): Promise<void> {
  try {
    const now = Timestamp.now();
    const controlRef = db
      .collection(DB_COLLECTIONS.SYSTEM_HEALTH)
      .doc(HEALTH_CONTROL_DOC);

    const shouldCompute = await db.runTransaction(async (transaction) => {
      const controlSnapshot = await transaction.get(controlRef);
      const lastComputedAt = controlSnapshot.data()?.lastComputedAt as
        | Timestamp
        | undefined;

      if (
        lastComputedAt &&
        now.toMillis() - lastComputedAt.toMillis() <
          COST_MONITORING.HEALTH_SNAPSHOT_INTERVAL_MS
      ) {
        return false;
      }

      transaction.set(
        controlRef,
        {
          lastComputedAt: now,
          lastRunMetrics: runMetrics,
          status: "computing",
          updatedAt: now,
        },
        { merge: true },
      );
      return true;
    });

    if (!shouldCompute) return;

    const snapshot = await buildHealthSnapshot(runMetrics);
    const snapshotId = getHourlySnapshotId(snapshot.windowEnd.toDate());

    await db
      .collection(DB_COLLECTIONS.SYSTEM_HEALTH)
      .doc(snapshotId)
      .set(snapshot, { merge: true });

    await controlRef.set(
      {
        lastComputedAt: snapshot.windowEnd,
        lastSnapshotId: snapshotId,
        lastStatus: snapshot.status,
        status: snapshot.status,
        updatedAt: snapshot.windowEnd,
      },
      { merge: true },
    );

    await emitHealthAlerts(snapshot.alerts);
  } catch (error) {
    logger.error("[MessagingHealth] Failed to record health snapshot", {
      error: error instanceof Error ? error.message : String(error),
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

  const sessions = sessionsSnapshot.docs.map(
    (doc) => doc.data() as MessagingOnboardingSession,
  );
  const eventsByType = countEventsByType(eventsSnapshot.docs);

  const sessionsStarted = sessions.length;
  const publishedSessions = sessions.filter(
    (session) => session.state === "LIVE" || !!session.publishedResult,
  ).length;
  const processingRuns = sessions.reduce(
    (total, session) => total + Number(session.processingRuns || 0),
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

  const publishedSourceBytesSampled = liveSessionsSnapshot.docs.reduce(
    (total, doc) => total + getSessionUploadBytes(doc.data()),
    0,
  );

  const alerts = buildAlerts({
    sessionsStarted,
    publishedSessions,
    publishRate,
    estimatedCostPerPublishInr,
    failedEvents,
    eventsByType,
    publishedSourceBytesSampled,
    liveSessionsSampled: liveSessionsSnapshot.size,
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
): Record<MsgOnboardingEventType, number> {
  return docs.reduce((counts, doc) => {
    const eventType = doc.data().eventType as MsgOnboardingEventType | undefined;
    if (!eventType) return counts;
    counts[eventType] = (counts[eventType] || 0) + 1;
    return counts;
  }, {} as Record<MsgOnboardingEventType, number>);
}

function getSessionUploadBytes(data: FirebaseFirestore.DocumentData): number {
  if (!Array.isArray(data.uploads)) return 0;
  return data.uploads.reduce(
    (total: number, upload: any) => total + Number(upload?.fileSize || 0),
    0,
  );
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
}): HealthAlert[] {
  const alerts: HealthAlert[] = [];

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

async function emitHealthAlerts(alerts: HealthAlert[]): Promise<void> {
  for (const alert of alerts) {
    await createAlert({
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
      actionRequired: alert.severity === "critical",
    });
  }
}

function getHourlySnapshotId(date: Date): string {
  const hour = date.toISOString().slice(0, 13).replace(/[-T]/g, "");
  return `${HEALTH_DOC_PREFIX}_${hour}`;
}
