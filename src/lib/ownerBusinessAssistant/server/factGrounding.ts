import type { OwnerBusinessAssistantAnswer } from '../types';

export function validateGroundedOwnerBusinessAssistantAnswer(
  answer: OwnerBusinessAssistantAnswer,
): OwnerBusinessAssistantAnswer {
  if (answer.status === 'answered' && (!answer.sourceFactIds || answer.sourceFactIds.length === 0)) {
    return {
      ...answer,
      status: 'needs_more_data',
      text: 'MenuList does not have enough verified data to answer that yet.',
      confidence: 'low',
      sourceFactIds: [],
    };
  }

  return {
    ...answer,
    sourceFactIds: Array.from(new Set((answer.sourceFactIds || []).filter(Boolean))),
  };
}
