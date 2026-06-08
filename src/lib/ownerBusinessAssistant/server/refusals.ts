import { OWNER_BUSINESS_ASSISTANT_COPY } from '../constants';
import type { OwnerBusinessAssistantAnswer } from '../types';

export const buildOwnerBusinessAssistantRefusal = (params: {
  answerId: string;
  reason?: string;
  sourceFactIds?: string[];
}): OwnerBusinessAssistantAnswer => ({
  answerId: params.answerId,
  status: 'unsupported',
  text: params.reason || OWNER_BUSINESS_ASSISTANT_COPY.unsupported,
  freshnessLabel: 'No supported source',
  sourceFactIds: params.sourceFactIds || [],
  confidence: 'low',
});

export const buildOwnerBusinessAssistantNotReady = (answerId: string): OwnerBusinessAssistantAnswer => ({
  answerId,
  status: 'needs_more_data',
  text: 'Business Health is not ready yet. MenuList will show this after the first store check finishes.',
  freshnessLabel: 'Not ready',
  sourceFactIds: [],
  confidence: 'low',
});
