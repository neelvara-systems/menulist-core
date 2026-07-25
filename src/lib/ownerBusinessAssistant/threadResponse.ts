export function serializeOwnerBusinessAssistantThreadValue(value: unknown): unknown {
  if (value == null) return value;
  if (
    typeof value === 'object'
    && typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    typeof value === 'object'
    && typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return value;
}

export function isOwnerBusinessAssistantThreadOwnedByScope(
  value: unknown,
  scope: { sId: string | number; tId: string | number; userId: string | number },
): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const thread = value as Record<string, unknown>;
  return String(thread.tId ?? '') === String(scope.tId)
    && String(thread.sId ?? '') === String(scope.sId)
    && String(thread.userId ?? '') === String(scope.userId);
}

const boundedThreadString = (value: unknown, maxLength: number): string | undefined => (
  typeof value === 'string' && value.length <= maxLength ? value : undefined
);

export const projectOwnerBusinessAssistantMessage = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  const id = boundedThreadString(message.id, 240);
  const content = boundedThreadString(message.content, 1600);
  const role = message.role === 'user' || message.role === 'assistant' ? message.role : null;
  if (!id || !content || !role) return null;

  return {
    id,
    role,
    content,
    ...(boundedThreadString(message.answerId, 180) ? { answerId: message.answerId } : {}),
    ...(boundedThreadString(message.answerStatus, 80) ? { answerStatus: message.answerStatus } : {}),
    ...(boundedThreadString(message.projectId, 180) ? { projectId: message.projectId } : {}),
    ...(boundedThreadString(message.suggestedQuestionId, 120)
      ? { suggestedQuestionId: message.suggestedQuestionId }
      : {}),
    sourceFactIds: Array.isArray(message.sourceFactIds)
      ? message.sourceFactIds
        .map((sourceFactId) => boundedThreadString(sourceFactId, 180))
        .filter((sourceFactId): sourceFactId is string => Boolean(sourceFactId))
        .slice(0, 20)
      : [],
    suggestedQuestions: Array.isArray(message.suggestedQuestions)
      ? message.suggestedQuestions
        .filter((question) => question && typeof question === 'object' && !Array.isArray(question))
        .map((question) => {
          const source = question as Record<string, unknown>;
          const questionId = boundedThreadString(source.id, 120);
          const label = boundedThreadString(source.label, 120);
          const questionText = boundedThreadString(source.question, 240);
          return questionId && label && questionText
            ? {
              id: questionId,
              label,
              question: questionText,
              ...(boundedThreadString(source.intent, 80) ? { intent: source.intent } : {}),
              ...(boundedThreadString(source.domain, 80) ? { domain: source.domain } : {}),
            }
            : null;
        })
        .filter((question): question is NonNullable<typeof question> => Boolean(question))
        .slice(0, 3)
      : [],
    createdAt: serializeOwnerBusinessAssistantThreadValue(message.createdAt),
  };
};
