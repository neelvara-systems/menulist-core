/**
 * Provider Registry — Factory + Lookup for Messaging Providers
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §2
 */

import { MessagingProvider } from "../../types/messagingOnboarding.types";
import { IMessagingProvider } from "./IMessagingProvider";
import { WhatsAppAdapter } from "./whatsapp/WhatsAppAdapter";

const providerRegistry: Partial<Record<MessagingProvider, () => IMessagingProvider>> = {
  whatsapp: () => new WhatsAppAdapter(),
};

/** Resolve adapter for a given provider */
export function getProviderAdapter(
  provider: MessagingProvider,
): IMessagingProvider {
  const factory = providerRegistry[provider];
  if (!factory) throw new Error(`Unsupported messaging provider: ${provider}`);
  return factory();
}

/** Resolve provider from webhook request path */
export function getProviderFromWebhookPath(
  path: string,
): MessagingProvider | null {
  // Firebase onRequest req.path is relative to the function name:
  //   /whatsapp  (emulator + production)
  // Also handles full path for safety:
  //   /messagingOnboarding/whatsapp
  const match = path.match(/\/(\w+)$/);
  if (!match) return null;
  const candidate = match[1];
  if (candidate in providerRegistry && providerRegistry[candidate as MessagingProvider]) {
    return candidate as MessagingProvider;
  }
  return null;
}
