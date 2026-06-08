import { buildOwnerBusinessHealthQuestions } from '@data/shared/ownerBusinessHealthQuestionSuggestions';
import type {
  OwnerBusinessAssistantContextPacket,
  OwnerBusinessAssistantDomain,
  OwnerBusinessAssistantIntent,
  OwnerBusinessHealthQuestion,
} from '../types';

const getAvailablePeriods = (packet: OwnerBusinessAssistantContextPacket) => (
  Object.entries(packet.analytics?.periods || {})
    .filter(([, period]) => Boolean(period && period.status !== 'not_available'))
    .map(([periodKey]) => periodKey)
);

const getHasTopItem = (packet: OwnerBusinessAssistantContextPacket) => (
  Object.values(packet.analytics?.periods || {})
    .some((period) => Boolean(period?.topItems?.length))
);

const getSupportedDomains = (packet: OwnerBusinessAssistantContextPacket) => (
  (packet.health.supportedDomains || [])
    .filter((domain) => domain.status !== 'unsupported')
    .map((domain) => domain.domain)
);

const findCurrentQuestion = (
  packet: OwnerBusinessAssistantContextPacket,
  suggestedQuestionId?: string,
) => {
  if (!suggestedQuestionId) return undefined;
  return packet.health.suggestedQuestions.find((question) => question.id === suggestedQuestionId);
};

export function buildOwnerBusinessAnswerFollowUpQuestions(params: {
  currentIntent: OwnerBusinessAssistantIntent;
  packet: OwnerBusinessAssistantContextPacket;
  suggestedQuestionId?: string;
}): OwnerBusinessHealthQuestion[] {
  const currentQuestion = findCurrentQuestion(params.packet, params.suggestedQuestionId);
  const questions = buildOwnerBusinessHealthQuestions({
    availablePeriods: getAvailablePeriods(params.packet),
    currentDomain: currentQuestion?.domain || undefined,
    currentIntent: params.currentIntent,
    excludeQuestionIds: params.suggestedQuestionId ? [params.suggestedQuestionId] : undefined,
    hasChecks: params.packet.health.suggestedChecks.length > 0,
    hasTopItem: getHasTopItem(params.packet),
    limit: 3,
    mode: 'follow_up',
    supportedDomains: getSupportedDomains(params.packet),
  });

  return questions.map((question) => ({
    ...question,
    intent: question.intent as OwnerBusinessAssistantIntent,
    domain: question.domain as OwnerBusinessAssistantDomain,
  }));
}
