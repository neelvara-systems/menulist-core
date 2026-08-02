/**
 * Retained callable names for the legacy MenuList help-center analytics
 * triggers. Help-center analytics now run only in the isolated Answerlattice
 * Firebase project. These callables deliberately perform no reads, writes, or
 * provider calls so existing clients receive an explicit migration response
 * instead of invoking the obsolete cross-product workers.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  analyticsLogger,
  getAnalyticsIdContext,
} from '../analytics/analyticsDiagnostics';
import { FUNCTION_MAX_INSTANCES } from '../config/secrets';
import { MENULIST_PLATFORM_USER_ROLE } from '../constants/user';

const LEGACY_ANALYTICS_RETIRED_CODE = 'LEGACY_HELP_CENTER_ANALYTICS_MOVED_TO_ANSWERLATTICE';
const LEGACY_ANALYTICS_RETIRED_MESSAGE = 'Help-center analytics now run in the Answerlattice workspace.';

function assertPlatformOwner(request: { auth?: { token?: Record<string, unknown> } }, action: string) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', `Must be authenticated to ${action}.`);
  }

  const requesterRole = String(request.auth.token?.platformRole || request.auth.token?.role || '');
  if (requesterRole !== MENULIST_PLATFORM_USER_ROLE) {
    throw new HttpsError('permission-denied', `Only platform owners can ${action}.`);
  }
}

function throwRetired(requesterId: unknown, callableName: string): never {
  analyticsLogger.info('[ManualTrigger] Legacy help-center analytics callable rejected', {
    callableName,
    failureCode: LEGACY_ANALYTICS_RETIRED_CODE,
    requesterId: getAnalyticsIdContext(requesterId),
  });
  throw new HttpsError('failed-precondition', LEGACY_ANALYTICS_RETIRED_MESSAGE, {
    code: LEGACY_ANALYTICS_RETIRED_CODE,
  });
}

export const triggerSchedulerManually = onCall({
  region: 'us-central1',
  timeoutSeconds: 60,
  memory: '256MiB' as const,
  maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
}, async (request) => {
  assertPlatformOwner(request, 'trigger the legacy analytics scheduler');
  return throwRetired(request.auth?.uid, 'triggerSchedulerManually');
});

export const triggerWeeklyNarrativeManually = onCall({
  region: 'us-central1',
  timeoutSeconds: 60,
  memory: '256MiB' as const,
  maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
}, async (request) => {
  assertPlatformOwner(request, 'trigger the legacy weekly narrative');
  return throwRetired(request.auth?.uid, 'triggerWeeklyNarrativeManually');
});
