import type {
  OwnerBusinessAssistantActionOption,
  OwnerBusinessAssistantAnswer,
  OwnerBusinessAssistantContextPacket,
} from '../types';

const addSourceFactIds = (target: Set<string>, ids?: Array<string | undefined>) => {
  ids?.forEach((id) => {
    const normalized = typeof id === 'string' ? id.trim() : '';
    if (normalized) target.add(normalized);
  });
};

const addActionSourceFactIds = (
  target: Set<string>,
  actions?: OwnerBusinessAssistantActionOption[],
) => {
  actions?.forEach((action) => addSourceFactIds(target, action.sourceFactIds));
};

const normalizeSourceFactIds = (
  ids?: string[],
  allowedSourceFactIds?: Set<string>,
): string[] => Array.from(new Set(
  (ids || [])
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id && (!allowedSourceFactIds || allowedSourceFactIds.has(id))),
));

const normalizeActionSourceFactIds = (
  actions?: OwnerBusinessAssistantActionOption[],
  allowedSourceFactIds?: Set<string>,
) => actions?.map((action) => ({
  ...action,
  sourceFactIds: normalizeSourceFactIds(action.sourceFactIds, allowedSourceFactIds),
}));

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
  addActionSourceFactIds(allowedSourceFactIds, packet.health.answerArtifacts?.flatMap((artifact) => (
    artifact.type === 'action_options' ? artifact.actions : []
  )));

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
  const normalizedActions = normalizeActionSourceFactIds(params.answer.actions, params.allowedSourceFactIds);
  const normalizedArtifacts = params.answer.artifacts?.map((artifact) => (
    artifact.type === 'action_options'
      ? {
        ...artifact,
        actions: normalizeActionSourceFactIds(artifact.actions, params.allowedSourceFactIds) || [],
      }
      : artifact
  ));

  if (params.answer.status === 'answered' && normalizedSourceFactIds.length === 0) {
    return {
      ...params.answer,
      actions: normalizedActions,
      artifacts: normalizedArtifacts,
      status: 'needs_more_data',
      text: 'MenuList does not have enough verified data to answer that yet.',
      confidence: 'low',
      sourceFactIds: [],
    };
  }

  return {
    ...params.answer,
    sourceFactIds: normalizedSourceFactIds,
    actions: normalizedActions,
    artifacts: normalizedArtifacts,
  };
}
