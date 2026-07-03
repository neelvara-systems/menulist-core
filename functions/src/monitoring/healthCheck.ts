/**
 * System Health Check
 * Monitors system components and generates health reports
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { ALERT_THRESHOLDS } from '../../../src/constants/analyticsMetrics';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const logger = functions.logger;

// ================================================================
// TYPES
// ================================================================

export interface HealthMetric {
  component: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime?: number; // in ms
  errorRate?: number; // percentage
  uptime?: number; // percentage
  details?: Record<string, any>;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'down';
  timestamp: Date;
  components: HealthMetric[];
  summary: {
    healthyCount: number;
    degradedCount: number;
    downCount: number;
    avgResponseTime: number;
  };
}

function getErrorLogContext(error: unknown): { name?: string; code?: string; status?: number } {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: error instanceof Error ? error.name : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}

function buildHealthFailureDetails(code: string, error: unknown): Record<string, any> {
  return {
    failureCode: code,
    source: getErrorLogContext(error),
  };
}

// ================================================================
// HEALTH CHECK FUNCTIONS
// ================================================================

/**
 * Perform comprehensive system health check
 */
export async function performHealthCheck(tId: string, sId: string): Promise<SystemHealthReport> {
  const startTime = Date.now();
  const components: HealthMetric[] = [];

  // Check Firestore connectivity
  components.push(await checkFirestore(tId, sId));

  // Check AI service availability
  components.push(await checkAIService(tId, sId));

  // Check KB coverage
  components.push(await checkKBCoverage(tId, sId));

  // Check recent errors
  components.push(await checkErrorRate(tId, sId));

  // Check analytics pipeline
  components.push(await checkAnalyticsPipeline(tId, sId));

  // Calculate overall health
  const healthyCount = components.filter(c => c.status === 'healthy').length;
  const degradedCount = components.filter(c => c.status === 'degraded').length;
  const downCount = components.filter(c => c.status === 'down').length;

  let overall: 'healthy' | 'degraded' | 'down' = 'healthy';
  if (downCount > 0) {
    overall = 'down';
  } else if (degradedCount > 0) {
    overall = 'degraded';
  }

  const avgResponseTime =
    components
      .filter(c => c.responseTime)
      .reduce((sum, c) => sum + (c.responseTime || 0), 0) / components.length;

  const report: SystemHealthReport = {
    overall,
    timestamp: new Date(),
    components,
    summary: {
      healthyCount,
      degradedCount,
      downCount,
      avgResponseTime,
    },
  };

  // Store health report
  await storeHealthReport(tId, sId, report);

  logger.info('[Health Check] Completed', {
    tId,
    sId,
    durationMs: Date.now() - startTime,
    overall,
    healthyCount,
    degradedCount,
    downCount,
  });

  return report;
}

// ================================================================
// COMPONENT CHECKS
// ================================================================

async function checkFirestore(tId: string, sId: string): Promise<HealthMetric> {
  const startTime = Date.now();
  try {
    // Test read/write
    const testDoc = db.collection(DB_COLLECTIONS.HEALTH).doc(`${tId}_${sId}`);
    await testDoc.set({ timestamp: Timestamp.now() });
    await testDoc.get();
    await testDoc.delete();

    const responseTime = Date.now() - startTime;

    return {
      component: 'Firestore',
      status: responseTime < ALERT_THRESHOLDS.FIRESTORE_RESPONSE_SLOW ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      responseTime,
      uptime: 100,
    };
  } catch (error) {
    return {
      component: 'Firestore',
      status: 'down',
      lastCheck: new Date(),
      responseTime: Date.now() - startTime,
      details: buildHealthFailureDetails('FIRESTORE_HEALTH_CHECK_FAILED', error),
    };
  }
}

async function checkAIService(tId: string, sId: string): Promise<HealthMetric> {
  const startTime = Date.now();
  try {
    // Check recent AI operations
    const recentOps = await db
      .collection(DB_COLLECTIONS.INSIGHTS)
      .doc(tId)
      .collection(DB_COLLECTIONS.STORES)
      .doc(sId)
      .collection(DB_COLLECTIONS.AI)
      .limit(1)
      .get();

    const responseTime = Date.now() - startTime;
    const hasRecentData = !recentOps.empty;

    return {
      component: 'AI Services',
      status: hasRecentData ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      responseTime,
      details: {
        hasRecentData,
        lastUpdate: hasRecentData
          ? recentOps.docs[0].data().analyzedAt || 'Unknown'
          : 'No data',
      },
    };
  } catch (error) {
    return {
      component: 'AI Services',
      status: 'down',
      lastCheck: new Date(),
      details: buildHealthFailureDetails('AI_HEALTH_CHECK_FAILED', error),
    };
  }
}

async function checkKBCoverage(tId: string, sId: string): Promise<HealthMetric> {
  const startTime = Date.now();
  try {
    // Check KB articles count
    const kbSnapshot = await db
      .collection(DB_COLLECTIONS.TENANTS)
      .doc(tId)
      .collection(DB_COLLECTIONS.STORES)
      .doc(sId)
      .collection(DB_COLLECTIONS.KNOWLEDGE_BASE)
      .count()
      .get();

    const articleCount = kbSnapshot.data().count;
    const responseTime = Date.now() - startTime;

    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (articleCount === 0) {
      status = 'down';
    } else if (articleCount < ALERT_THRESHOLDS.KB_ARTICLES_MIN) {
      status = 'degraded';
    }

    return {
      component: 'KB Coverage',
      status,
      lastCheck: new Date(),
      responseTime,
      details: {
        articleCount,
        coverage: articleCount > 0 ? 'Active' : 'No articles',
      },
    };
  } catch (error) {
    return {
      component: 'KB Coverage',
      status: 'degraded',
      lastCheck: new Date(),
      details: buildHealthFailureDetails('KB_HEALTH_CHECK_FAILED', error),
    };
  }
}

async function checkErrorRate(tId: string, sId: string): Promise<HealthMetric> {
  const startTime = Date.now();
  try {
    // Check errors in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const errorsSnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_ERRORS)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('timestamp', '>=', Timestamp.fromDate(yesterday))
      .get();

    const errorCount = errorsSnapshot.size;
    const criticalErrors = errorsSnapshot.docs.filter(
      doc => doc.data().severity === 'critical'
    ).length;

    const responseTime = Date.now() - startTime;

    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (criticalErrors > ALERT_THRESHOLDS.CRITICAL_ERROR_COUNT) {
      status = 'down';
    } else if (errorCount > ALERT_THRESHOLDS.ERROR_RATE_HIGH) {
      status = 'degraded';
    }

    return {
      component: 'Error Rate',
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate: errorCount,
      details: {
        totalErrors: errorCount,
        criticalErrors,
        period: '24h',
      },
    };
  } catch (error) {
    return {
      component: 'Error Rate',
      status: 'degraded',
      lastCheck: new Date(),
      details: buildHealthFailureDetails('ERROR_RATE_HEALTH_CHECK_FAILED', error),
    };
  }
}

async function checkAnalyticsPipeline(tId: string, sId: string): Promise<HealthMetric> {
  const startTime = Date.now();
  try {
    // Check last telemetry entry
    const today = new Date().toISOString().split('T')[0];
    const telemetrySnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_TELEMETRY)
      .doc(today)
      .get();

    const responseTime = Date.now() - startTime;
    const hasData = telemetrySnapshot.exists;

    return {
      component: 'Analytics Pipeline',
      status: hasData ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      responseTime,
      details: {
        lastRun: hasData ? telemetrySnapshot.data()?.timestamp : 'No recent runs',
        status: hasData ? 'Active' : 'No recent data',
      },
    };
  } catch (error) {
    return {
      component: 'Analytics Pipeline',
      status: 'degraded',
      lastCheck: new Date(),
      details: buildHealthFailureDetails('ANALYTICS_HEALTH_CHECK_FAILED', error),
    };
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

async function storeHealthReport(
  tId: string,
  sId: string,
  report: SystemHealthReport
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    await db
      .collection(DB_COLLECTIONS.SYSTEM_HEALTH)
      .doc(`${tId}_${sId}_${today}`)
      .set({
        tId,
        sId,
        overall: report.overall,
        timestamp: Timestamp.fromDate(report.timestamp),
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), // TTL: 7 days
        summary: report.summary,
        components: report.components.map(c => ({
          ...c,
          lastCheck: Timestamp.fromDate(c.lastCheck),
        })),
      });
  } catch (error) {
    logger.error('[Health Check] Failed to store health report', {
      tId,
      sId,
      overall: report.overall,
      error: getErrorLogContext(error),
    });
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  performHealthCheck,
};
