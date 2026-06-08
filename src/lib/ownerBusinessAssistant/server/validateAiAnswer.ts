import type { OwnerBusinessAssistantAnswer } from '../types';
import { validateGroundedOwnerBusinessAssistantAnswer } from './factGrounding';

export function validateAiOwnerBusinessAssistantAnswer(
  answer: OwnerBusinessAssistantAnswer,
): OwnerBusinessAssistantAnswer {
  return validateGroundedOwnerBusinessAssistantAnswer({
    ...answer,
    text: answer.text.trim().slice(0, 2400),
  });
}
