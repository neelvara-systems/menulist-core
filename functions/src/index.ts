// ═══════════════════════════════════════════════════════════════
// FIREBASE FUNCTIONS — Entry Point
// ═══════════════════════════════════════════════════════════════
//
// ⚠️  dotenv MUST load before any other imports (for emulator).
// This file is the single entry point. All function definitions
// live in focused modules under triggers/.
//
// File map:
//   config/secrets.ts       — Centralized secrets & function options
//   triggers/production.ts  — Firestore triggers (prod-only)
//   triggers/shared.ts      — Callable functions (all environments)
//   triggers/schedulers.ts  — Scheduled cron jobs
//   triggers/messaging.ts   — WhatsApp/messaging onboarding
//   triggers/operations.ts  — Admin tools, health checks, budget alerts
//   dev-triggers.ts         — Dev-only callable substitutes for triggers
// ═══════════════════════════════════════════════════════════════

// ⚠️ MUST BE FIRST: Load .env.local before any other imports
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config({ path: '.env.local' });
  const functionsLogger = require('firebase-functions').logger;
  functionsLogger.info('[Dev] Loaded .env.local for emulator', {
    emulator: true,
  });
}

import { isDeployed } from './config/secrets';
export { menulistEmailOsWebhook } from './emailOs/http';

// ═══════════════════════════════════════════════════════════════
// 1. PRODUCTION TRIGGERS (Firestore document triggers)
//    Only registered when deployed. In emulator, dev-triggers are used.
// ═══════════════════════════════════════════════════════════════

if (isDeployed) {
  const prodTriggers = require('./triggers/production');
  exports.startGeneration = prodTriggers.startGeneration;
  exports.retryGeneration = prodTriggers.retryGeneration;
  exports.finalizePublish = prodTriggers.finalizePublish;
  exports.processMenuImagesJob = prodTriggers.processMenuImagesJob;
} else {
  const devTriggers = require('./dev-triggers');
  exports.dev_triggerStartGeneration = devTriggers.dev_triggerStartGeneration;
  exports.dev_triggerFinalizePublish = devTriggers.dev_triggerFinalizePublish;
  exports.dev_triggerProcessMenuImages = devTriggers.dev_triggerProcessMenuImages;
}

// ═══════════════════════════════════════════════════════════════
// 2. SHARED CALLABLE FUNCTIONS (all environments)
// ═══════════════════════════════════════════════════════════════

import {
  embedArticleWorker,
  mapsPlaceCheck,
  processMenuImages,
  publishApprovedJobFn,
  regenerateEmbedding,
} from './triggers/shared';

export { embedArticleWorker, mapsPlaceCheck, processMenuImages, publishApprovedJobFn, regenerateEmbedding };

// ═══════════════════════════════════════════════════════════════
// 3. SCHEDULED FUNCTIONS (cron jobs)
// ═══════════════════════════════════════════════════════════════

import {
  menulistMaintenanceScheduler,
} from './triggers/schedulers';

export { menulistMaintenanceScheduler };

// Retired compatibility exports. Answerlattice chat analytics runs only in the
// dedicated Answerlattice Firebase project; these callables fail closed.
const aggregateModule = require('./aggregateDailyChatStats');
exports.backfillAggregates = aggregateModule.backfillAggregates;

const triggerModule = require('./triggerAggregationManual');
exports.triggerAggregationManual = triggerModule.triggerAggregationManual;

// AI Insights — manual triggers only (scheduled tasks migrated to decisionBlocksScoring.ts)
// @deprecated masterScheduler CF removed — tasks run inside unified nightly scheduler (2026-03-03)
const schedulerModule = require('./schedulers/masterScheduler');
exports.triggerSchedulerManually = schedulerModule.triggerSchedulerManually;
exports.triggerWeeklyNarrativeManually = schedulerModule.triggerWeeklyNarrativeManually;

// Customer analytics manual trigger only.
// Scheduled customer analytics now runs inside the unified timezone-aware nightly scheduler
// alongside OBP analytics, so both settle in one store-scoped flow.
const customerAnalyticsModule = require('./aggregateCustomerAnalytics');
exports.triggerCustomerAnalyticsManually = customerAnalyticsModule.triggerCustomerAnalyticsManually;

// Unified nightly scheduler (hourly at :30, timezone-aware — filters by store's schedulerHour)
const decisionBlocksModule = require('./decisionBlocksScoring');
exports.computeDecisionBlocksScores = decisionBlocksModule.computeDecisionBlocksScores;
exports.triggerDecisionBlocksScoring = decisionBlocksModule.triggerDecisionBlocksScoring;
exports.triggerStoreNightlyScheduler = decisionBlocksModule.triggerStoreNightlyScheduler;

// ═══════════════════════════════════════════════════════════════
// 4. MESSAGING ONBOARDING (WhatsApp webhook + extraction watcher)
// ═══════════════════════════════════════════════════════════════

import {
  messagingOnboarding,
  msgExtractionWatcher,
} from './triggers/messaging';

export { messagingOnboarding, msgExtractionWatcher };

// ═══════════════════════════════════════════════════════════════
// 5. OPERATIONAL INFRASTRUCTURE (admin tools, health, budget)
// ═══════════════════════════════════════════════════════════════

import {
  backfillStoresSummary,
  forceRepublish,
  gcpBudgetAlertWebhook,
  verifyMenuPublish,
} from './triggers/operations';

export { backfillStoresSummary, forceRepublish, gcpBudgetAlertWebhook, verifyMenuPublish };
