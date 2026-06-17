import type {
  OwnerBusinessAssistantAnswer,
  OwnerBusinessAssistantContextPacket,
} from '../types';

const addSourceFactIds = (target: Set<string>, ids?: Array<string | undefined>) => {
  ids?.forEach((id) => {
    const normalized = typeof id === 'string' ? id.trim() : '';
    if (normalized) target.add(normalized);
  });
};

const normalizeSourceFactIds = (
  ids?: string[],
  allowedSourceFactIds?: Set<string>,
): string[] => Array.from(new Set(
  (ids || [])
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id && (!allowedSourceFactIds || allowedSourceFactIds.has(id))),
));

export function collectOwnerBusinessAssistantSourceFactIds(
  packet: OwnerBusinessAssistantContextPacket,
): Set<string> {
  const allowedSourceFactIds = new Set<string>();

  addSourceFactIds(allowedSourceFactIds, packet.health.sourceRefs.map((ref) => ref.id));
  addSourceFactIds(allowedSourceFactIds, packet.health.suggestedChecks.flatMap((check) => check.sourceFactIds));
  Object.values(packet.health.blocks || {}).forEach((block) => {
    addSourceFactIds(allowedSourceFactIds, block?.sourceFactIds);
  });
  packet.health.supportedDomains?.forEach((domain) => {
    addSourceFactIds(allowedSourceFactIds, domain.sourceFactIds);
  });

  addSourceFactIds(allowedSourceFactIds, packet.analytics?.sourceRefs.map((ref) => ref.id));
  Object.values(packet.analytics?.periods || {}).forEach((period) => {
    addSourceFactIds(allowedSourceFactIds, period?.sourceFactIds);
  });
  addSourceFactIds(allowedSourceFactIds, packet.todayOverlay?.sourceFactIds);

  return allowedSourceFactIds;
}

export function validateGroundedOwnerBusinessAssistantAnswer(params: {
  answer: OwnerBusinessAssistantAnswer;
  allowedSourceFactIds?: Set<string>;
}): OwnerBusinessAssistantAnswer {
  const normalizedSourceFactIds = normalizeSourceFactIds(
    params.answer.sourceFactIds,
    params.allowedSourceFactIds,
  );

  if (params.answer.status === 'answered' && normalizedSourceFactIds.length === 0) {
    return {
      ...params.answer,
      status: 'needs_more_data',
      text: 'MenuList does not have enough verified data to answer that yet.',
      confidence: 'low',
      sourceFactIds: [],
    };
  }

  return {
    ...params.answer,
    sourceFactIds: normalizedSourceFactIds,
  };
}
