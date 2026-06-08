import { FEATURE_FLAGS } from '@config/features';
import type { OwnerBusinessAssistantAnswer, OwnerBusinessAssistantContextPacket } from '../types';

export async function generateAiOwnerBusinessAssistantAnswer(
  params: {
    question: string;
    packet: OwnerBusinessAssistantContextPacket;
    fallback: OwnerBusinessAssistantAnswer;
  },
): Promise<OwnerBusinessAssistantAnswer> {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS) {
    return params.fallback;
  }

  // Provider integration intentionally remains isolated behind the AI flag.
  // Until enabled, the deterministic grounded answer is the production path.
  return params.fallback;
}
