/**
 * Messaging Provider Interface (Provider-Agnostic)
 *
 * Every messaging provider implements this interface.
 * The core session engine interacts ONLY through this interface.
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §2
 */

import * as functions from "firebase-functions";
import { MessagingProvider, NormalizedMessage } from "../../types/messagingOnboarding.types";

export interface IMessagingProvider {
  /** Provider identifier */
  readonly providerId: MessagingProvider;

  /** Verify incoming webhook authenticity (signature check) */
  verifyWebhook(req: functions.https.Request): boolean;

  /** Parse raw webhook payload into normalized message */
  parseIncomingMessage(req: functions.https.Request): NormalizedMessage | null;

  /** Download media file from provider API to Buffer */
  downloadMedia(providerMediaId: string): Promise<Buffer>;

  /** Send a text message to the user */
  sendTextMessage(userId: string, text: string): Promise<void>;

  /** Send a message with a link/button */
  sendLinkMessage(
    userId: string,
    text: string,
    url: string,
    buttonLabel: string,
  ): Promise<void>;

  /** Get webhook challenge response (for initial webhook registration) */
  handleWebhookChallenge?(req: functions.https.Request): string | null;
}
