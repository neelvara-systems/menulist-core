import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from '../constants';
import type {
  OwnerBusinessAssistantActionOption,
  OwnerBusinessAssistantContextPacket,
  OwnerBusinessAssistantIntent,
  OwnerBusinessAnalyticsPeriod,
} from '../types';
import { buildAnalyticsPeriodArtifacts } from './answerArtifacts';

const formatNumber = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('en').format(value);
};

export function buildBusinessStatusAnswer(packet: OwnerBusinessAssistantContextPacket) {
  const health = packet.health;
  const checks = health.suggestedChecks.filter((check) => check.priority !== 'low').slice(0, 3);
  const checkText = checks.length
    ? ` ${checks.map((check) => check.message).join(' ')}`
    : '';

  return {
    text: `${health.summary.ownerMessage || health.summary.headline} ${health.summary.noActionNeeded ? 'No action needed.' : ''}${checkText}`.trim(),
    sourceFactIds: [
      ...health.sourceRefs.map((ref) => ref.id),
      ...checks.flatMap((check) => check.sourceFactIds),
    ].filter(Boolean),
    artifacts: health.answerArtifacts,
    confidence: health.status === 'not_ready' || health.status === 'insufficient_data' ? 'low' : 'high',
  };
}

export function buildAnalyticsAnswer(
  period: OwnerBusinessAnalyticsPeriod,
  intent: OwnerBusinessAssistantIntent,
) {
  const topItem = period.topItems?.[0];
  const base = `${period.label}: ${formatNumber(period.metrics.menuVisits)} menu visits, ${formatNumber(period.metrics.itemClicks)} item clicks, and ${formatNumber(period.metrics.searches)} searches.`;
  const extra = topItem
    ? ` Top item was ${topItem.name || topItem.itemId} with ${formatNumber(topItem.value)} ${topItem.signal}.`
    : '';
  const intentSuffix = intent === 'item_attention' && topItem
    ? ` This is the item getting the most attention for ${period.rangeLabel}.`
    : '';

  return {
    text: `${base}${extra}${intentSuffix}`.trim(),
    sourceFactIds: period.sourceFactIds,
    artifacts: buildAnalyticsPeriodArtifacts(period),
    confidence: period.status === 'available' ? 'high' : 'medium',
  };
}

export function buildActionOptionsForIntent(
  packet: OwnerBusinessAssistantContextPacket,
  intent: OwnerBusinessAssistantIntent,
): OwnerBusinessAssistantActionOption[] {
  const allowedTypes = new Set(packet.allowedActions.map((action) => action.actionType));
  if (allowedTypes.size === 0) return [];

  if (intent === 'business_status' || intent === 'next_action') {
    return packet.health.suggestedChecks
      .filter((check) => Boolean(check.actionType))
      .filter((check) => allowedTypes.has(check.actionType!))
      .slice(0, 3)
      .map((check) => ({
        actionType: check.actionType!,
        label: check.title,
        riskLevel: 'navigate',
        sourceFactIds: check.sourceFactIds,
      }));
  }

  if (intent === 'analytics_period_summary' || intent === 'item_attention') {
    if (!allowedTypes.has('navigate_analytics')) return [];
    return [{
      actionType: 'navigate_analytics',
      label: 'Open analytics',
      riskLevel: 'navigate',
      href: '/dashboard',
      sourceFactIds: packet.analytics?.sourceRefs.map((ref) => ref.id) || [],
    }];
  }

  if (intent === 'public_menu_status') {
    const actionType = allowedTypes.has('open_qr_share') ? 'open_qr_share' : 'navigate_menu';
    if (!allowedTypes.has(actionType)) return [];
    return [{
      actionType,
      label: actionType === 'open_qr_share' ? 'Open QR code' : 'Open menu',
      riskLevel: 'navigate',
      href: actionType === 'open_qr_share' ? '/qr-code' : '/projects',
      sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
    }];
  }

  if (intent === 'feedback_pattern' && allowedTypes.has('open_feedback_reviews')) {
    return [{
      actionType: 'open_feedback_reviews',
      label: 'Open feedback',
      riskLevel: 'navigate',
      href: '/feedback',
      sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
    }];
  }

  if (intent === 'store_profile_status' && allowedTypes.has('open_business_settings')) {
    return [{
      actionType: 'open_business_settings',
      label: 'Open business settings',
      riskLevel: 'navigate',
      href: '/business-settings',
      sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
    }];
  }

  if (intent === 'integration_status' && allowedTypes.has('open_pos_sync_settings')) {
    return [{
      actionType: 'open_pos_sync_settings',
      label: 'Open POS settings',
      riskLevel: 'navigate',
      href: '/business-settings',
      sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
    }];
  }

  if (intent === 'permission_status' && allowedTypes.has('open_users_permissions')) {
    return [{
      actionType: 'open_users_permissions',
      label: 'Open users and permissions',
      riskLevel: 'navigate',
      href: '/users/permissions',
      sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
    }];
  }

  return [];
}

export const describeHealthStatus = (packet: OwnerBusinessAssistantContextPacket) => {
  const label = OWNER_BUSINESS_HEALTH_STATUS_LABELS[packet.health.status];
  return `${label} for ${packet.health.localDate}`;
};
