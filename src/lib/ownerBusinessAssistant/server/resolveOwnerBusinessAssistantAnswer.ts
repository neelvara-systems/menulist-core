import { randomUUID } from 'crypto';
import type { OwnerBusinessAssistantAnswerRequest } from '../schemas';
import type {
  OwnerBusinessAssistantAnswer,
  OwnerBusinessAssistantClientContext,
  OwnerBusinessAssistantDomain,
  OwnerBusinessAssistantIntent,
  OwnerBusinessAssistantContextPacket,
  OwnerBusinessAssistantRouteMetrics,
} from '../types';
import { resolveOwnerBusinessAnalyticsPeriod } from './analyticsPeriodResolver';
import { buildOwnerBusinessAssistantContextPacket } from './buildOwnerBusinessAssistantContextPacket';
import { generateAiOwnerBusinessAssistantAnswer } from './aiAnswerClient';
import { classifyOwnerBusinessAssistantIntent } from './intentClassifier';
import {
  buildActionOptionsForIntent,
  buildAnalyticsAnswer,
  buildBusinessStatusAnswer,
  buildFeedbackPatternAnswer,
  describeHealthStatus,
} from './answerTemplates';
import { buildOwnerBusinessAssistantNotReady, buildOwnerBusinessAssistantRefusal } from './refusals';
import { buildOwnerBusinessAnswerFollowUpQuestions } from './questionSuggestions';
import { validateAiOwnerBusinessAssistantAnswer } from './validateAiAnswer';

const INTENT_DOMAIN: Partial<Record<OwnerBusinessAssistantIntent, OwnerBusinessAssistantDomain>> = {
  business_status: 'business_health',
  next_action: 'business_health',
  item_needs_checking: 'business_health',
  weekly_changes: 'business_health',
  public_menu_status: 'menu',
  item_attention: 'analytics',
  analytics_period_summary: 'analytics',
  analytics_period_compare: 'analytics',
  customer_interest: 'analytics',
  feedback_pattern: 'feedback_reviews',
  outlet_attention: 'outlets',
  account_status: 'billing',
  store_profile_status: 'store_profile',
  share_asset_status: 'public_links',
  integration_status: 'pos_integrations',
  permission_status: 'users_permissions',
  review_reply_prepare: 'feedback_reviews',
};

const OWNER_DOMAIN_LABELS: Partial<Record<OwnerBusinessAssistantDomain, string>> = {
  feedback_reviews: 'feedback',
  pos_integrations: 'POS',
  users_permissions: 'users and permissions',
  store_profile: 'business profile',
  public_links: 'public link',
  outlets: 'location',
  billing: 'billing',
};

const getUnsupportedIntentDomain = (
  packet: OwnerBusinessAssistantContextPacket,
  intent: OwnerBusinessAssistantIntent,
) => {
  const domain = INTENT_DOMAIN[intent];
  if (!domain || domain === 'business_health' || domain === 'analytics') return null;

  const capability = packet.health.supportedDomains?.find((entry) => entry.domain === domain);
  if (domain === 'menu' && capability?.status !== 'unsupported') return null;
  if (capability?.status === 'supported') return null;

  return domain;
};

const buildUnsupportedAlternative = (domain: OwnerBusinessAssistantDomain | 'analytics_period') => {
  if (domain === 'analytics_period') {
    return 'I can show today, this week, last week, this month, or last month when that data is available.';
  }
  if (domain === 'feedback_reviews') {
    return 'I can show customer attention from MenuList activity instead.';
  }
  if (domain === 'pos_integrations') {
    return 'I can show MenuList visits and item attention instead.';
  }
  if (domain === 'billing') {
    return 'I can open the billing screen for account details.';
  }
  if (domain === 'outlets') {
    return 'I can show the selected location status from Business Health.';
  }
  return 'I can show the latest Business Health status instead.';
};

const attachAnswerMetrics = (
  answer: OwnerBusinessAssistantAnswer,
  packet: OwnerBusinessAssistantContextPacket,
  overrides: Partial<OwnerBusinessAssistantRouteMetrics> = {},
): OwnerBusinessAssistantAnswer => ({
  ...answer,
  cache: answer.cache || {
    source: packet.cacheSource,
    cacheKey: packet.cacheKey,
    generatedAt: packet.generatedAt,
  },
  metrics: {
    ...packet.metrics,
    cacheSource: packet.cacheSource,
    firestoreReadCount: packet.metrics?.firestoreReadCount ?? 0,
    firestoreWriteCount: packet.metrics?.firestoreWriteCount ?? 0,
    route: '/api/owner-business-assistant/answer',
    providerUsed: false,
    ...overrides,
  },
});

export async function resolveOwnerBusinessAssistantAnswer(params: {
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  request: OwnerBusinessAssistantAnswerRequest;
}): Promise<OwnerBusinessAssistantAnswer> {
  const answerId = randomUUID();
  const packet = await buildOwnerBusinessAssistantContextPacket({
    tId: params.tId,
    sId: params.sId,
    projectId: params.request.projectId || params.request.clientContext?.selectedProjectId,
    packetProfile: 'owner_question_actionable',
    clientContext: params.request.clientContext as OwnerBusinessAssistantClientContext | undefined,
  });

  if (packet.health.status === 'not_ready' && !packet.health.sourceRefs.length) {
    return attachAnswerMetrics(buildOwnerBusinessAssistantNotReady(answerId), packet, {
      unsupportedReason: 'not_ready',
    });
  }

  const intent = classifyOwnerBusinessAssistantIntent(params.request.question);
  let fallback: OwnerBusinessAssistantAnswer;

  if (
    intent === 'analytics_period_summary' ||
    intent === 'analytics_period_compare' ||
    intent === 'item_attention' ||
    intent === 'customer_interest'
  ) {
    const period = resolveOwnerBusinessAnalyticsPeriod(params.request.question, packet.analytics);
    if (!period) {
      fallback = buildOwnerBusinessAssistantRefusal({
        answerId,
        reason: 'MenuList does not have enough analytics data for that period yet.',
        alternative: buildUnsupportedAlternative('analytics_period'),
        sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
      });
    } else {
      const analyticsAnswer = buildAnalyticsAnswer(period, intent);
      fallback = {
        answerId,
        status: 'answered',
        text: analyticsAnswer.text,
        freshnessLabel: period.freshnessLabel,
        sourceFactIds: analyticsAnswer.sourceFactIds,
        artifacts: analyticsAnswer.artifacts,
        actions: buildActionOptionsForIntent(packet, intent),
        confidence: analyticsAnswer.confidence as OwnerBusinessAssistantAnswer['confidence'],
        cache: {
          source: packet.cacheSource,
          cacheKey: packet.cacheKey,
          generatedAt: packet.generatedAt,
        },
      };
    }
  } else if (intent === 'feedback_pattern') {
    const unsupportedDomain = getUnsupportedIntentDomain(packet, intent);
    if (unsupportedDomain) {
      fallback = buildOwnerBusinessAssistantRefusal({
        answerId,
        reason: `MenuList does not have enough ${OWNER_DOMAIN_LABELS[unsupportedDomain] || unsupportedDomain} data for that yet.`,
        alternative: buildUnsupportedAlternative(unsupportedDomain),
        sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
      });
      fallback.actions = buildActionOptionsForIntent(packet, intent);
      fallback.cache = {
        source: packet.cacheSource,
        cacheKey: packet.cacheKey,
        generatedAt: packet.generatedAt,
      };
    } else {
      const feedbackAnswer = buildFeedbackPatternAnswer(packet);
      fallback = {
        answerId,
        status: 'answered',
        text: feedbackAnswer.text,
        freshnessLabel: describeHealthStatus(packet),
        sourceFactIds: feedbackAnswer.sourceFactIds,
        artifacts: feedbackAnswer.artifacts,
        actions: buildActionOptionsForIntent(packet, intent),
        confidence: feedbackAnswer.confidence as OwnerBusinessAssistantAnswer['confidence'],
        cache: {
          source: packet.cacheSource,
          cacheKey: packet.cacheKey,
          generatedAt: packet.generatedAt,
        },
      };
    }
  } else {
    const unsupportedDomain = getUnsupportedIntentDomain(packet, intent);
    if (unsupportedDomain) {
      fallback = buildOwnerBusinessAssistantRefusal({
        answerId,
        reason: `MenuList does not have enough ${OWNER_DOMAIN_LABELS[unsupportedDomain] || unsupportedDomain} data for that yet.`,
        alternative: buildUnsupportedAlternative(unsupportedDomain),
        sourceFactIds: packet.health.sourceRefs.map((ref) => ref.id),
      });
      fallback.actions = buildActionOptionsForIntent(packet, intent);
      fallback.cache = {
        source: packet.cacheSource,
        cacheKey: packet.cacheKey,
        generatedAt: packet.generatedAt,
      };
    } else {
      const statusAnswer = buildBusinessStatusAnswer(packet);
      fallback = {
        answerId,
        status: 'answered',
        text: statusAnswer.text,
        freshnessLabel: describeHealthStatus(packet),
        sourceFactIds: statusAnswer.sourceFactIds,
        artifacts: statusAnswer.artifacts,
        actions: buildActionOptionsForIntent(packet, intent),
        confidence: statusAnswer.confidence as OwnerBusinessAssistantAnswer['confidence'],
        cache: {
          source: packet.cacheSource,
          cacheKey: packet.cacheKey,
          generatedAt: packet.generatedAt,
        },
      };
    }
  }

  fallback.suggestedQuestions = buildOwnerBusinessAnswerFollowUpQuestions({
    currentIntent: intent,
    packet,
    suggestedQuestionId: params.request.suggestedQuestionId,
  });
  fallback = attachAnswerMetrics(fallback, packet, {
    unsupportedReason: fallback.status === 'unsupported' ? fallback.text.slice(0, 160) : undefined,
  });

  const answer = await generateAiOwnerBusinessAssistantAnswer({
    question: params.request.question,
    packet,
    fallback,
  });

  const providerUsed = Boolean((answer as { providerUsed?: boolean }).providerUsed);
  return validateAiOwnerBusinessAssistantAnswer(attachAnswerMetrics(answer, packet, { providerUsed }), packet);
}
