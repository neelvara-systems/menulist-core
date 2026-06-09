/**
 * Shared Business Health question suggestion catalog.
 *
 * Primary source:
 *   src/data/shared/ownerBusinessHealthQuestionSuggestions.ts
 *
 * Exact copy target:
 *   functions/src/sharedData/ownerBusinessHealthQuestionSuggestions.ts
 *
 * Keep this file self-contained. Do not import app or Functions types here.
 */

export type OwnerBusinessQuestionSuggestionMode = 'starter' | 'follow_up';

export type SharedOwnerBusinessHealthQuestion = {
  id: string;
  label: string;
  question: string;
  intent: string;
  domain: string;
};

type QuestionCatalogEntry = SharedOwnerBusinessHealthQuestion & {
  requiresPeriod?: string;
  requiresTopItem?: boolean;
  requiresChecks?: boolean;
  requiresDomainAny?: string[];
  starterWeight: number;
  followUpWeight: number;
  followUpAfter?: Record<string, number>;
};

export type BuildOwnerBusinessHealthQuestionInput = {
  availablePeriods?: string[];
  currentDomain?: string;
  currentIntent?: string;
  excludeQuestionIds?: string[];
  hasChecks?: boolean;
  hasTopItem?: boolean;
  limit?: number;
  mode?: OwnerBusinessQuestionSuggestionMode;
  supportedDomains?: string[];
};

const QUESTION_CATALOG: QuestionCatalogEntry[] = [
  {
    id: 'checks',
    label: 'What needs checking?',
    question: 'What should I check next?',
    intent: 'next_action',
    domain: 'business_health',
    starterWeight: 95,
    followUpWeight: 90,
    followUpAfter: {
      analytics_period_summary: 20,
      business_status: 25,
      item_attention: 15,
    },
  },
  {
    id: 'today_stats',
    label: 'How is today going?',
    question: 'How is today going?',
    intent: 'analytics_period_summary',
    domain: 'analytics',
    requiresPeriod: 'today',
    starterWeight: 90,
    followUpWeight: 85,
    followUpAfter: {
      business_status: 15,
      next_action: 20,
    },
  },
  {
    id: 'this_week_stats',
    label: 'What happened this week?',
    question: 'What happened this week?',
    intent: 'analytics_period_summary',
    domain: 'analytics',
    requiresPeriod: 'thisWeek',
    starterWeight: 82,
    followUpWeight: 82,
    followUpAfter: {
      item_attention: 18,
      next_action: 14,
    },
  },
  {
    id: 'top_item',
    label: 'Which item is getting attention?',
    question: 'Which item is getting the most attention?',
    intent: 'item_attention',
    domain: 'menu',
    requiresTopItem: true,
    starterWeight: 78,
    followUpWeight: 88,
    followUpAfter: {
      analytics_period_summary: 24,
      business_status: 16,
      next_action: 14,
    },
  },
  {
    id: 'last_week_stats',
    label: 'What happened last week?',
    question: 'What happened last week?',
    intent: 'analytics_period_summary',
    domain: 'analytics',
    requiresPeriod: 'lastWeek',
    starterWeight: 64,
    followUpWeight: 72,
    followUpAfter: {
      analytics_period_summary: 10,
      analytics_period_compare: 18,
    },
  },
  {
    id: 'this_month_stats',
    label: 'How is this month?',
    question: 'How is this month going?',
    intent: 'analytics_period_summary',
    domain: 'analytics',
    requiresPeriod: 'thisMonth',
    starterWeight: 58,
    followUpWeight: 68,
    followUpAfter: {
      analytics_period_summary: 8,
      item_attention: 8,
    },
  },
  {
    id: 'last_month_stats',
    label: 'What happened last month?',
    question: 'What happened last month?',
    intent: 'analytics_period_summary',
    domain: 'analytics',
    requiresPeriod: 'lastMonth',
    starterWeight: 52,
    followUpWeight: 62,
    followUpAfter: {
      analytics_period_summary: 12,
      analytics_period_compare: 20,
    },
  },
  {
    id: 'public_menu_status',
    label: 'Is my public menu okay?',
    question: 'Is my public menu okay?',
    intent: 'public_menu_status',
    domain: 'menu',
    requiresDomainAny: ['menu', 'public_links'],
    starterWeight: 48,
    followUpWeight: 60,
    followUpAfter: {
      next_action: 8,
      business_status: 8,
    },
  },
  {
    id: 'profile_status',
    label: 'Is my business profile complete?',
    question: 'Is my business profile complete?',
    intent: 'store_profile_status',
    domain: 'store_profile',
    requiresDomainAny: ['store_profile'],
    starterWeight: 42,
    followUpWeight: 55,
    followUpAfter: {
      business_status: 6,
      next_action: 8,
    },
  },
  {
    id: 'feedback_reviews',
    label: 'Any guest feedback to check?',
    question: 'Is there any guest feedback I should check?',
    intent: 'feedback_pattern',
    domain: 'feedback_reviews',
    requiresDomainAny: ['feedback_reviews'],
    starterWeight: 70,
    followUpWeight: 74,
    followUpAfter: {
      business_status: 18,
      next_action: 16,
    },
  },
  {
    id: 'feedback_recent',
    label: 'What did guests say recently?',
    question: 'What did guests say recently?',
    intent: 'feedback_pattern',
    domain: 'feedback_reviews',
    requiresDomainAny: ['feedback_reviews'],
    starterWeight: 62,
    followUpWeight: 72,
    followUpAfter: {
      feedback_pattern: 12,
      business_status: 12,
    },
  },
];

export function getOwnerBusinessHealthQuestionById(
  id?: string,
): SharedOwnerBusinessHealthQuestion | null {
  if (!id) return null;
  const entry = QUESTION_CATALOG.find((question) => question.id === id);
  if (!entry) return null;

  return {
    id: entry.id,
    label: entry.label,
    question: entry.question,
    intent: entry.intent,
    domain: entry.domain,
  };
}

const uniqueStrings = (values?: string[]) => Array.from(new Set((values || []).filter(Boolean)));

const isQuestionAvailable = (
  entry: QuestionCatalogEntry,
  input: BuildOwnerBusinessHealthQuestionInput,
  availablePeriods: Set<string>,
  supportedDomains: Set<string>,
) => {
  if (entry.requiresPeriod && !availablePeriods.has(entry.requiresPeriod)) return false;
  if (entry.requiresTopItem && !input.hasTopItem) return false;
  if (entry.requiresChecks && !input.hasChecks) return false;
  if (entry.requiresDomainAny?.length && !entry.requiresDomainAny.some((domain) => supportedDomains.has(domain))) {
    return false;
  }
  return true;
};

export function buildOwnerBusinessHealthQuestions(
  input: BuildOwnerBusinessHealthQuestionInput = {},
): SharedOwnerBusinessHealthQuestion[] {
  const mode = input.mode || 'starter';
  const limit = Math.max(1, Math.min(input.limit || (mode === 'follow_up' ? 3 : 6), 6));
  const availablePeriods = new Set(uniqueStrings(input.availablePeriods));
  const supportedDomains = new Set(uniqueStrings(input.supportedDomains));
  const excluded = new Set(uniqueStrings(input.excludeQuestionIds));

  return QUESTION_CATALOG
    .filter((entry) => !excluded.has(entry.id))
    .filter((entry) => isQuestionAvailable(entry, input, availablePeriods, supportedDomains))
    .map((entry) => {
      const followUpBoost = mode === 'follow_up' && input.currentIntent
        ? entry.followUpAfter?.[input.currentIntent] || 0
        : 0;
      const currentDomainBoost = mode === 'follow_up' && input.currentDomain && entry.domain !== input.currentDomain
        ? 4
        : 0;
      const checkBoost = input.hasChecks && entry.id === 'checks' ? 18 : 0;
      const weight = (mode === 'follow_up' ? entry.followUpWeight : entry.starterWeight)
        + followUpBoost
        + currentDomainBoost
        + checkBoost;

      return { entry, weight };
    })
    .sort((a, b) => b.weight - a.weight || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit)
    .map(({ entry }) => ({
      id: entry.id,
      label: entry.label,
      question: entry.question,
      intent: entry.intent,
      domain: entry.domain,
    }));
}
