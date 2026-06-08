import { randomUUID } from 'crypto';
import type { OwnerBusinessAssistantAnswerRequest } from '../schemas';
import type { OwnerBusinessAssistantAnswer, OwnerBusinessAssistantClientContext } from '../types';
import { resolveOwnerBusinessAnalyticsPeriod } from './analyticsPeriodResolver';
import { buildOwnerBusinessAssistantContextPacket } from './buildOwnerBusinessAssistantContextPacket';
import { generateAiOwnerBusinessAssistantAnswer } from './aiAnswerClient';
import { classifyOwnerBusinessAssistantIntent } from './intentClassifier';
import {
  buildActionOptionsForIntent,
  buildAnalyticsAnswer,
  buildBusinessStatusAnswer,
  describeHealthStatus,
} from './answerTemplates';
import { buildOwnerBusinessAssistantNotReady, buildOwnerBusinessAssistantRefusal } from './refusals';
import { validateAiOwnerBusinessAssistantAnswer } from './validateAiAnswer';

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
    packetProfile: 'answer',
    clientContext: params.request.clientContext as OwnerBusinessAssistantClientContext | undefined,
  });

  if (packet.health.status === 'not_ready' && !packet.health.sourceRefs.length) {
    return buildOwnerBusinessAssistantNotReady(answerId);
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

  const answer = await generateAiOwnerBusinessAssistantAnswer({
    question: params.request.question,
    packet,
    fallback,
  });

  return validateAiOwnerBusinessAssistantAnswer(answer);
}
