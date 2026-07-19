export const ANSWERLATTICE_DRIFT_CLASSES = {
    VERSION_MISMATCH: 'version_mismatch',
    SIGNAL_ANOMALY: 'signal_anomaly',
    SCOPE_CONFLICT: 'scope_conflict',
    DEPRECATED_ENTITY: 'deprecated_entity',
} as const;

export type AnswerlatticeDriftClass = typeof ANSWERLATTICE_DRIFT_CLASSES[keyof typeof ANSWERLATTICE_DRIFT_CLASSES];

export const ANSWERLATTICE_SIGNAL_DRIFT_THRESHOLDS = {
    negativeFeedbackCount: 5,
    ticketCount: 11,
    minRelevantSignalCount: 5,
} as const;

export type AnswerlatticeDriftAnswer = {
    id: string;
    entityIds: string[];
    planIds?: string[];
    roleIds?: string[];
    stateIds?: string[];
    versionFrom: number;
    versionTo?: number | null;
    lastValidatedInVersion: number;
    lastValidatedAtMs: number;
};

export type AnswerlatticeDriftEntity = {
    id: string;
    name: string;
    status: string;
};

export type AnswerlatticeDriftSignal = {
    entityId: string;
    type: 'ticket' | 'chat_negative';
    timestampMs: number;
};

export type AnswerlatticeAutomatedDriftEvaluation = {
    driftReasons: string[];
    signalCounts: {
        ticket: number;
        chatNegative: number;
        total: number;
    };
    conflictingAnswerIds: string[];
    deprecatedEntityIds: string[];
};

export interface AutomatedDriftState {
    driftFlag: boolean;
    driftReason: string | null;
    shouldWrite: boolean;
}

const uniqueSortedIds = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim())))
        .sort((left, right) => left.localeCompare(right));
};

const scopeListsOverlap = (left: unknown, right: unknown): boolean => {
    const leftIds = uniqueSortedIds(left);
    const rightIds = uniqueSortedIds(right);
    return leftIds.length === 0 || rightIds.length === 0 || leftIds.some(id => rightIds.includes(id));
};

const versionWindowsOverlap = (
    left: Pick<AnswerlatticeDriftAnswer, 'versionFrom' | 'versionTo'>,
    right: Pick<AnswerlatticeDriftAnswer, 'versionFrom' | 'versionTo'>,
): boolean => (
    (left.versionTo == null || left.versionTo >= right.versionFrom)
    && (right.versionTo == null || right.versionTo >= left.versionFrom)
);

const summarizeIds = (ids: string[], maxItems = 5): string => {
    const displayed = ids.slice(0, maxItems);
    const remaining = ids.length - displayed.length;
    return remaining > 0 ? `${displayed.join(', ')} and ${remaining} more` : displayed.join(', ');
};

export const buildAnswerlatticeVersionDriftReason = (
    answer: Pick<AnswerlatticeDriftAnswer, 'entityIds' | 'lastValidatedInVersion'>,
    release: { versionLabel: string; versionNormalized: number; changedEntityIds: string[] },
): string | null => {
    const changedEntityIds = new Set(uniqueSortedIds(release.changedEntityIds));
    const affectedEntityIds = uniqueSortedIds(answer.entityIds).filter(entityId => changedEntityIds.has(entityId));
    if (
        affectedEntityIds.length === 0
        || answer.lastValidatedInVersion >= release.versionNormalized
    ) {
        return null;
    }

    return `[${ANSWERLATTICE_DRIFT_CLASSES.VERSION_MISMATCH}] ${summarizeIds(affectedEntityIds)} changed in ${release.versionLabel}; answer was last validated at version ${answer.lastValidatedInVersion}`;
};

export const evaluateAnswerlatticeAutomatedDrift = (
    answer: AnswerlatticeDriftAnswer,
    allActiveAnswers: AnswerlatticeDriftAnswer[],
    entitiesById: ReadonlyMap<string, AnswerlatticeDriftEntity>,
    signalsByEntity: ReadonlyMap<string, AnswerlatticeDriftSignal[]>,
): AnswerlatticeAutomatedDriftEvaluation => {
    const answerEntityIds = uniqueSortedIds(answer.entityIds);
    const signalCounts = { ticket: 0, chatNegative: 0, total: 0 };

    for (const entityId of answerEntityIds) {
        for (const signal of signalsByEntity.get(entityId) || []) {
            if (signal.timestampMs <= answer.lastValidatedAtMs) continue;
            if (signal.type === 'ticket') signalCounts.ticket += 1;
            else if (signal.type === 'chat_negative') signalCounts.chatNegative += 1;
        }
    }
    signalCounts.total = signalCounts.ticket + signalCounts.chatNegative;

    const driftReasons: string[] = [];
    if (signalCounts.total >= ANSWERLATTICE_SIGNAL_DRIFT_THRESHOLDS.minRelevantSignalCount) {
        const signalDetails: string[] = [];
        if (signalCounts.chatNegative >= ANSWERLATTICE_SIGNAL_DRIFT_THRESHOLDS.negativeFeedbackCount) {
            signalDetails.push(`${signalCounts.chatNegative} negative feedback events occurred after the last validation`);
        }
        if (signalCounts.ticket >= ANSWERLATTICE_SIGNAL_DRIFT_THRESHOLDS.ticketCount) {
            signalDetails.push(`${signalCounts.ticket} ticket events occurred after the last validation`);
        }
        if (signalDetails.length > 0) {
            driftReasons.push(`[${ANSWERLATTICE_DRIFT_CLASSES.SIGNAL_ANOMALY}] ${signalDetails.join(' and ')}`);
        }
    }

    const conflictingAnswerIds = allActiveAnswers
        .filter(other => other.id !== answer.id)
        .filter(other => answerEntityIds.some(entityId => uniqueSortedIds(other.entityIds).includes(entityId)))
        .filter(other => versionWindowsOverlap(answer, other))
        .filter(other => scopeListsOverlap(answer.planIds, other.planIds))
        .filter(other => scopeListsOverlap(answer.roleIds, other.roleIds))
        .filter(other => scopeListsOverlap(answer.stateIds, other.stateIds))
        .map(other => other.id)
        .sort((left, right) => left.localeCompare(right));

    if (conflictingAnswerIds.length > 0) {
        driftReasons.push(`[${ANSWERLATTICE_DRIFT_CLASSES.SCOPE_CONFLICT}] Overlap with answer ${summarizeIds(conflictingAnswerIds, 3)} for entity, version, plan, role, and state scope`);
    }

    const deprecatedEntities = answerEntityIds.map(entityId => {
        const entity = entitiesById.get(entityId);
        if (!entity) throw new Error(`Bound entity ${entityId} is missing from the drift evaluation input.`);
        return entity.status === 'deprecated' ? entity : null;
    }).filter((entity): entity is AnswerlatticeDriftEntity => entity !== null);
    const deprecatedEntityIds = deprecatedEntities.map(entity => entity.id);

    if (deprecatedEntities.length > 0) {
        const labels = deprecatedEntities.map(entity => `${entity.name} (${entity.id})`);
        driftReasons.push(`[${ANSWERLATTICE_DRIFT_CLASSES.DEPRECATED_ENTITY}] Deprecated bound entity ${summarizeIds(labels, 5)}`);
    }

    return {
        driftReasons,
        signalCounts,
        conflictingAnswerIds,
        deprecatedEntityIds,
    };
};

/** Automated evaluation may raise or refresh drift, but only governed validation may clear it. */
export function deriveAutomatedDriftState(
    previousDriftFlag: boolean,
    previousDriftReason: unknown,
    driftReasons: string[],
): AutomatedDriftState {
    const normalizedPreviousReason = typeof previousDriftReason === 'string' && previousDriftReason.trim()
        ? previousDriftReason.trim()
        : null;
    const normalizedReasons = Array.from(new Set(driftReasons
        .map(reason => reason.trim())
        .filter(Boolean)));

    if (normalizedReasons.length === 0) {
        return {
            driftFlag: previousDriftFlag,
            driftReason: normalizedPreviousReason,
            shouldWrite: false,
        };
    }

    const driftReason = normalizedReasons.join('; ').slice(0, 4_000);
    return {
        driftFlag: true,
        driftReason,
        shouldWrite: !previousDriftFlag || normalizedPreviousReason !== driftReason,
    };
}
