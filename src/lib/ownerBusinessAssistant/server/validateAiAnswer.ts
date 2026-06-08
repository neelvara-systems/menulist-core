import type { OwnerBusinessAssistantAnswer, OwnerBusinessAssistantContextPacket } from '../types';
import {
  collectOwnerBusinessAssistantSourceFactIds,
  validateGroundedOwnerBusinessAssistantAnswer,
} from './factGrounding';

const normalizeSuggestedQuestions = (answer: OwnerBusinessAssistantAnswer) => (
  (answer.suggestedQuestions || [])
    .filter((question) => question && typeof question.id === 'string' && typeof question.question === 'string')
    .map((question) => ({
      ...question,
      id: question.id.trim().slice(0, 120),
      label: String(question.label || question.question).trim().slice(0, 120),
      question: question.question.trim().slice(0, 240),
    }))
    .filter((question) => question.id && question.label && question.question)
    .slice(0, 3)
);

export function validateAiOwnerBusinessAssistantAnswer(
  answer: OwnerBusinessAssistantAnswer,
  packet?: OwnerBusinessAssistantContextPacket,
): OwnerBusinessAssistantAnswer {
  return validateGroundedOwnerBusinessAssistantAnswer({
    answer: {
      ...answer,
      text: answer.text.trim().slice(0, 2400),
      suggestedQuestions: normalizeSuggestedQuestions(answer),
    },
    allowedSourceFactIds: packet ? collectOwnerBusinessAssistantSourceFactIds(packet) : undefined,
  });
}
