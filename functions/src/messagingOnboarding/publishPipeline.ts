/**
 * Messaging onboarding Cloud Functions publisher guard.
 *
 * Active publishing is owned exclusively by:
 *   src/lib/messaging-onboarding/publish.ts
 *
 * The former Functions implementation duplicated tenant/store/user/project
 * creation without the active owner-claim, time-slot, cache, and transaction
 * contracts. Keep this exported guard so an old import fails closed instead of
 * silently reviving a second publisher.
 */

import type { PublishedResult } from "../types/messagingOnboarding.types";

export interface PublishParams {
  address?: string;
  businessName: string;
  businessType?: string;
  phone?: string;
  sessionId: string;
}

export async function executePublish(
  _params: PublishParams,
): Promise<PublishedResult> {
  throw new Error("MESSAGING_FUNCTIONS_PUBLISH_PIPELINE_DISABLED");
}
