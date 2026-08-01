import { OWNER_BUSINESS_ASSISTANT_DOMAINS } from '../constants';
import type {
  OwnerBusinessAssistantContextPacket,
  OwnerBusinessAssistantDomain,
  OwnerBusinessDomainCapability,
} from '../types';

const SUMMARY_ONLY_DOMAINS: OwnerBusinessAssistantDomain[] = [
  'billing',
  'users_permissions',
  'pos_integrations',
  'compliance',
  'external',
];
const BUSINESS_HEALTH_DOMAIN: OwnerBusinessAssistantDomain = 'business_health';

export function buildOwnerBusinessDomainCapabilities(
  packet: Pick<OwnerBusinessAssistantContextPacket, 'health' | 'analytics' | 'domainFacts'>,
): OwnerBusinessDomainCapability[] {
  const supportedFromHealth = new Set(packet.health.supportedDomains?.map((entry) => entry.domain) || []);

  return OWNER_BUSINESS_ASSISTANT_DOMAINS.map((domain): OwnerBusinessDomainCapability => {
    if (domain === BUSINESS_HEALTH_DOMAIN) {
      return {
        domain,
        status: 'supported',
        sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
      };
    }

    if (supportedFromHealth.has(domain)) {
      return {
        domain,
        status: 'supported',
        sourceFactIds: packet.health.supportedDomains?.find((entry) => entry.domain === domain)?.sourceFactIds || [],
      };
    }

    if (domain === 'analytics' && packet.analytics) {
      return {
        domain,
        status: 'supported',
        sourceFactIds: packet.analytics.sourceRefs.map((ref) => ref.id),
      };
    }

    if (SUMMARY_ONLY_DOMAINS.includes(domain)) {
      return {
        domain,
        status: 'summary_only',
        reason: 'MenuList can answer from the current store summary, not from live external systems.',
        sourceFactIds: [],
      };
    }

    return {
      domain,
      status: 'unsupported',
      reason: 'No cached business source is available for this area yet.',
      sourceFactIds: [],
    };
  });
}
