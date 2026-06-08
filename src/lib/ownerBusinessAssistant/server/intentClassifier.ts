import type { OwnerBusinessAssistantIntent } from '../types';

const INTENT_RULES: Array<{ intent: OwnerBusinessAssistantIntent; patterns: RegExp[] }> = [
  { intent: 'analytics_period_compare', patterns: [/compare/i, /vs/i, /versus/i, /better than/i] },
  { intent: 'item_attention', patterns: [/top item/i, /popular/i, /most viewed/i, /most clicked/i, /item/i] },
  { intent: 'analytics_period_summary', patterns: [/today/i, /week/i, /month/i, /visits/i, /clicks/i, /search/i, /stats/i, /analytics/i] },
  { intent: 'public_menu_status', patterns: [/public menu/i, /link/i, /published/i, /qr/i] },
  { intent: 'feedback_pattern', patterns: [/review/i, /feedback/i, /rating/i] },
  { intent: 'next_action', patterns: [/what should i do/i, /next action/i, /need to do/i, /fix/i, /check/i] },
  { intent: 'outlet_attention', patterns: [/outlet/i, /location/i, /branch/i] },
  { intent: 'store_profile_status', patterns: [/profile/i, /business page/i, /store/i] },
  { intent: 'integration_status', patterns: [/pos/i, /integration/i] },
  { intent: 'permission_status', patterns: [/permission/i, /staff/i, /user/i] },
  { intent: 'review_reply_prepare', patterns: [/reply/i, /respond/i] },
];

export function classifyOwnerBusinessAssistantIntent(question: string): OwnerBusinessAssistantIntent {
  const normalized = question.trim();
  const matched = INTENT_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized)));
  return matched?.intent || 'business_status';
}
