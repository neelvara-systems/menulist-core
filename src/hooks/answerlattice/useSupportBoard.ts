import { FEATURE_FLAGS } from '@config/features';
import { addMutationProposal } from '@database/answerlattice/mutationProposals';
import {
    addAnswerlatticeSupportBoardNote,
    createAnswerlatticeSupportBoardCard,
    createAnswerlatticeSupportBoardCards,
    getAnswerlatticeSupportBoardSummary,
    listAnswerlatticeSupportBoardCards,
    redactAnswerlatticeSupportBoardSourceIdentity,
    updateAnswerlatticeSupportBoardCard,
    type CreateAnswerlatticeSupportBoardCardInput,
    type UpdateAnswerlatticeSupportBoardCardInput,
} from '@database/answerlattice/supportBoard';
import { getRecentSignalEvents } from '@database/answerlattice/signalEvents';
import { getStoresTickets } from '@database/tickets';
import { getAnswerlatticeCustomerIdentity } from '@lib/answerlattice/customerIdentity';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';
import {
    ANSWERLATTICE_MUTATION_STATUS,
    ANSWERLATTICE_MUTATION_TYPE,
    ANSWERLATTICE_SIGNAL_TYPE,
    ANSWERLATTICE_SUPPORT_BOARD_PRIORITY,
    ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE,
    ANSWERLATTICE_SUPPORT_BOARD_STATUS,
    type AnswerlatticeSignalEvent,
    type AnswerlatticeSupportBoardCard,
    type AnswerlatticeSupportBoardSummary,
    type AnswerlatticeSupportBoardPriority,
    type AnswerlatticeSupportBoardStatus,
} from '@type/answerlattice';
import { SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_STATUS, type SupportTicketType } from '@type/supportTicket';
import { message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Actor = {
    id: string;
    name: string;
    email?: string | null;
};

const ANSWERLATTICE_SUPPORT_BOARD_LOAD_FAILED = 'Could not load support board';
const ANSWERLATTICE_SUPPORT_BOARD_CARD_CREATE_FAILED = 'Could not create support card';
const ANSWERLATTICE_SUPPORT_BOARD_CARD_UPDATE_FAILED = 'Could not update support card';
const ANSWERLATTICE_SUPPORT_BOARD_NOTE_ADD_FAILED = 'Could not add note';
const ANSWERLATTICE_SUPPORT_BOARD_TICKET_SYNC_FAILED = 'Could not sync tickets';
const ANSWERLATTICE_SUPPORT_BOARD_SIGNAL_SYNC_FAILED = 'Could not sync support signals';
const ANSWERLATTICE_SUPPORT_BOARD_PROPOSAL_CREATE_FAILED = 'Could not create answer proposal';

const getActorStatusMeta = (actor?: Actor | null, remark?: string) => ({
    statusActorId: actor?.id || 'unknown',
    statusActorName: actor?.name || 'Team member',
    statusActorEmail: actor?.email || 'team@answerlattice.internal',
    statusRemark: remark,
});

const getSupportBoardSummaryLogContext = (tId: number, sId: number) => ({
    ...getBoundedAnswerlatticeStringContext('tenantId', tId),
    ...getBoundedAnswerlatticeStringContext('storeId', sId),
});

const loadSupportBoardSummary = async (
    tId: number,
    sId: number,
): Promise<AnswerlatticeSupportBoardSummary | null> => {
    try {
        return await getAnswerlatticeSupportBoardSummary(tId, sId);
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_support_board_summary_load_failed',
            error,
            getSupportBoardSummaryLogContext(tId, sId),
        );
        return null;
    }
};

const ACTIONABLE_SIGNAL_TYPES = new Set<string>([
    ANSWERLATTICE_SIGNAL_TYPE.TICKET,
    ANSWERLATTICE_SIGNAL_TYPE.CHAT_NEGATIVE,
    ANSWERLATTICE_SIGNAL_TYPE.ESCALATION,
    ANSWERLATTICE_SIGNAL_TYPE.FEEDBACK,
]);

const isOpenTicket = (ticket: SupportTicketType) => {
    const status = ticket.status || '';
    return !ticket.deleted
        && status !== SUPPORT_TICKET_STATUS.RESOLVED
        && status !== SUPPORT_TICKET_STATUS.CLOSED;
};

const mapTicketPriority = (priority?: string): AnswerlatticeSupportBoardPriority => {
    if (priority === SUPPORT_TICKET_PRIORITY.HIGH) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH;
    if (priority === SUPPORT_TICKET_PRIORITY.LOW) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW;
    return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM;
};

const getTicketEntityId = (ticket: SupportTicketType) => (
    normalizeAnswerlatticeResolvedEntityId(
        ticket.escalationContext?.entityDebug?.resolvedEntityId
        || ticket.escalationContext?.retrievalDebug?.canonicalResult?.matchedEntityIds?.[0]
    )
);

const getSignalText = (signal: AnswerlatticeSignalEvent) => {
    const metadata = signal.metadata || {};
    return String(
        metadata.summary
        || metadata.featureRequest
        || metadata.commentPreview
        || metadata.featureCommentPreview
        || metadata.query
        || metadata.subject
        || metadata.message
        || metadata.reason
        || `Support signal: ${signal.type}`
    ).slice(0, 900);
};

const getSignalTitle = (signal: AnswerlatticeSignalEvent) => {
    const metadata = signal.metadata || {};
    if (signal.type === ANSWERLATTICE_SIGNAL_TYPE.FEEDBACK) {
        const label = String(metadata.feedbackLabel || metadata.feedbackType || 'Feedback');
        const rating = Number(metadata.rating);
        const suffix = Number.isFinite(rating) && rating > 0 ? ` (${rating}/5)` : '';
        return `${label}${suffix}`.slice(0, 140);
    }

    return String(metadata.subject || metadata.query || `${signal.type.replace(/_/g, ' ')} signal`).slice(0, 140);
};

const getSignalPriority = (signal: AnswerlatticeSignalEvent): AnswerlatticeSupportBoardPriority => {
    const metadata = signal.metadata || {};
    if (signal.type === ANSWERLATTICE_SIGNAL_TYPE.ESCALATION) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH;
    if (signal.type !== ANSWERLATTICE_SIGNAL_TYPE.FEEDBACK) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM;

    const rating = Number(metadata.rating);
    if (Number.isFinite(rating) && rating > 0 && rating <= 2) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.HIGH;
    if (Number.isFinite(rating) && rating >= 4 && !metadata.hasFeatureRequest) return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.LOW;
    return ANSWERLATTICE_SUPPORT_BOARD_PRIORITY.MEDIUM;
};

const getSignalTags = (signal: AnswerlatticeSignalEvent, contextKeys: string[]) => {
    const metadata = signal.metadata || {};
    const tags = [signal.type, ...contextKeys];
    if (signal.type === ANSWERLATTICE_SIGNAL_TYPE.FEEDBACK) {
        if (metadata.feedbackType) tags.push(String(metadata.feedbackType));
        if (metadata.rating) tags.push(`rating:${metadata.rating}`);
        if (metadata.hasFeatureRequest) tags.push('feature-request');
    }
    return tags.filter(Boolean);
};

const getSignalContextKeys = (metadata: Record<string, any>) => (
    Array.from(new Set([
        ...(Array.isArray(metadata.contextKeys) ? metadata.contextKeys : []),
        ...(Array.isArray(metadata.relatedContextKeys) ? metadata.relatedContextKeys : []),
        metadata.contextKey,
    ]
        .map((item) => String(item || '').trim())
        .filter(Boolean)))
        .slice(0, 10)
);

const sourceKeyForCard = (sourceType?: string | null, sourceId?: string | null) => (
    sourceType && sourceId ? `${sourceType}:${sourceId}` : null
);

const sourceIdentityFields = (record: Parameters<typeof getAnswerlatticeCustomerIdentity>[0]) => {
    const identity = getAnswerlatticeCustomerIdentity(record);
    const hasIdentity = Boolean(identity.userId || identity.email || identity.phone || identity.displayName !== 'Unknown customer');

    return {
        sourceCustomerName: hasIdentity ? identity.displayName : null,
        sourceCustomerEmail: identity.email || null,
        sourceCustomerPhone: identity.phone || null,
        sourceCustomerUserId: identity.userId || null,
        sourceOrigin: identity.origin || null,
        sourcePath: identity.path || null,
        sourceSessionId: identity.sessionId || null,
    };
};

const signalIdentityRecord = (metadata: Record<string, any>) => ({
    uId: metadata.userId || metadata.uId,
    userName: metadata.userName || metadata.customerName || metadata.name,
    userEmail: metadata.userEmail || metadata.customerEmail || metadata.email,
    userPhone: metadata.userPhone || metadata.customerPhone || metadata.phone,
    visitorId: metadata.visitorId,
    visitorName: metadata.visitorName,
    visitorEmail: metadata.visitorEmail,
    sourceContext: metadata.sourceContext,
    requestOrigin: metadata.requestOrigin || metadata.origin,
    requestPath: metadata.requestPath || metadata.path,
    widgetSessionId: metadata.widgetSessionId || metadata.sessionId,
});

const cardInputFromTicket = (ticket: SupportTicketType, tId: number, sId: number): CreateAnswerlatticeSupportBoardCardInput => ({
    tId,
    sId,
    title: ticket.subject || `Ticket ${ticket.displayId || ticket.id}`,
    description: ticket.message || 'Ticket needs review.',
    status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
    priority: mapTicketPriority(ticket.priority),
    sourceType: ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.TICKET,
    sourceId: ticket.id,
    ...sourceIdentityFields({
        uId: ticket.uId,
        clientDetails: ticket.clientDetails,
        requestPath: ticket.escalationContext?.productContext?.page,
        widgetSessionId: ticket.escalationContext?.conversationId,
    }),
    relatedTicketId: ticket.id,
    relatedEntityId: getTicketEntityId(ticket),
    relatedConversationId: ticket.escalationContext?.conversationId || null,
    relatedContextKeys: ticket.contextKeys || [],
    tags: [ticket.category, ticket.priority, ...(ticket.contextKeys || [])].filter(Boolean),
});

const cardInputFromSignal = (signal: AnswerlatticeSignalEvent, tId: number, sId: number): CreateAnswerlatticeSupportBoardCardInput => {
    const metadata = signal.metadata || {};
    const ticketId = typeof metadata.ticketId === 'string' ? metadata.ticketId : null;
    const conversationId = typeof metadata.conversationId === 'string' ? metadata.conversationId : null;
    const contextKeys = getSignalContextKeys(metadata);
    const surfaceId = typeof metadata.surfaceId === 'string' ? metadata.surfaceId : null;
    const entityId = normalizeAnswerlatticeResolvedEntityId(signal.entityId);

    return {
        tId,
        sId,
        title: getSignalTitle(signal),
        description: getSignalText(signal),
        status: signal.type === ANSWERLATTICE_SIGNAL_TYPE.ESCALATION
            ? ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEW_SIGNALS
            : ANSWERLATTICE_SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
        priority: getSignalPriority(signal),
        sourceType: ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.SIGNAL,
        sourceId: signal.id,
        ...sourceIdentityFields(signalIdentityRecord(metadata)),
        relatedTicketId: ticketId,
        relatedConversationId: conversationId,
        relatedSurfaceId: surfaceId,
        relatedEntityId: entityId,
        relatedContextKeys: contextKeys,
        tags: getSignalTags(signal, contextKeys),
    };
};

export function useSupportBoard(tId?: number, sId?: number, actor?: Actor | null) {
    const [cards, setCards] = useState<AnswerlatticeSupportBoardCard[]>([]);
    const [summary, setSummary] = useState<AnswerlatticeSupportBoardSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const enabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD === true;
    const sourceSyncEnabled = enabled && Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC);
    const nightlySummaryEnabled = enabled && Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY);
    const hasScope = Boolean(tId && sId);

    const existingSourceKeys = useMemo(() => {
        const keys = new Set<string>();
        cards.forEach((card) => {
            const key = sourceKeyForCard(card.sourceType, card.sourceId);
            if (key) keys.add(key);
        });
        return keys;
    }, [cards]);

    const refresh = useCallback(async () => {
        if (!enabled || !tId || !sId) {
            setCards([]);
            setSummary(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const [result, nextSummary] = await Promise.all([
                listAnswerlatticeSupportBoardCards(tId, sId),
                nightlySummaryEnabled
                    ? loadSupportBoardSummary(tId, sId)
                    : Promise.resolve(null),
            ]);
            setCards(result || []);
            setSummary(nextSummary);
        } catch {
            setError(ANSWERLATTICE_SUPPORT_BOARD_LOAD_FAILED);
            message.error(ANSWERLATTICE_SUPPORT_BOARD_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, [enabled, nightlySummaryEnabled, sId, tId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const createCard = useCallback(async (input: Omit<CreateAnswerlatticeSupportBoardCardInput, 'tId' | 'sId'>) => {
        if (!tId || !sId) return null;
        setSaving(true);
        try {
            const created = await createAnswerlatticeSupportBoardCard({
                ...input,
                ...getActorStatusMeta(actor, 'Card created'),
                tId,
                sId,
            });
            message.success('Support card created');
            await refresh();
            return created;
        } catch {
            message.error(ANSWERLATTICE_SUPPORT_BOARD_CARD_CREATE_FAILED);
            return null;
        } finally {
            setSaving(false);
        }
    }, [actor, refresh, sId, tId]);

    const updateCard = useCallback(async (cardId: string, patch: UpdateAnswerlatticeSupportBoardCardInput) => {
        setSaving(true);
        try {
            await updateAnswerlatticeSupportBoardCard(cardId, {
                ...patch,
                ...(patch.status ? getActorStatusMeta(actor, 'Status updated from Support Board') : {}),
            });
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_SUPPORT_BOARD_CARD_UPDATE_FAILED);
        } finally {
            setSaving(false);
        }
    }, [actor, refresh]);

    const moveCard = useCallback(async (cardId: string, status: AnswerlatticeSupportBoardStatus) => {
        await updateCard(cardId, { status });
    }, [updateCard]);

    const addNote = useCallback(async (cardId: string, text: string) => {
        setSaving(true);
        try {
            await addAnswerlatticeSupportBoardNote(cardId, {
                text,
                authorId: actor?.id || 'unknown',
                authorName: actor?.name || 'Team member',
            });
            message.success('Internal note added');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_SUPPORT_BOARD_NOTE_ADD_FAILED);
        } finally {
            setSaving(false);
        }
    }, [actor?.id, actor?.name, refresh]);

    const redactSourceIdentity = useCallback(async (cardId: string) => {
        setSaving(true);
        try {
            const redacted = await redactAnswerlatticeSupportBoardSourceIdentity(cardId, {
                id: actor?.id || 'unknown',
                name: actor?.name || 'Team member',
            });
            if (redacted) {
                message.success('Source customer details removed');
                await refresh();
            }
            return redacted;
        } catch {
            message.error('Could not remove source customer details');
            return false;
        } finally {
            setSaving(false);
        }
    }, [actor?.id, actor?.name, refresh]);

    const syncTickets = useCallback(async () => {
        if (!sourceSyncEnabled) {
            message.info('Ticket sync is disabled for this workspace');
            return 0;
        }
        if (!tId || !sId) return 0;
        setSyncing(true);
        try {
            const tickets = await getStoresTickets(50) as SupportTicketType[];
            const inputs = (tickets || [])
                .filter(isOpenTicket)
                .filter((ticket) => !existingSourceKeys.has(`${ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.TICKET}:${ticket.id}`))
                .slice(0, 20)
                .map((ticket) => ({
                    ...cardInputFromTicket(ticket, tId, sId),
                    ...getActorStatusMeta(actor, 'Card created from ticket sync'),
                }));

            const created = await createAnswerlatticeSupportBoardCards(inputs);
            if (created.length > 0) {
                message.success(`${created.length} ticket${created.length === 1 ? '' : 's'} added to Support Board`);
                await refresh();
            } else {
                message.info('No new unresolved tickets to add');
            }
            return created.length;
        } catch {
            message.error(ANSWERLATTICE_SUPPORT_BOARD_TICKET_SYNC_FAILED);
            return 0;
        } finally {
            setSyncing(false);
        }
    }, [actor, existingSourceKeys, refresh, sId, sourceSyncEnabled, tId]);

    const syncSignals = useCallback(async () => {
        if (!sourceSyncEnabled) {
            message.info('Signal sync is disabled for this workspace');
            return 0;
        }
        if (!tId || !sId) return 0;
        setSyncing(true);
        try {
            const signals = await getRecentSignalEvents(tId, sId, 14, 50);
            const inputs = (signals || [])
                .filter((signal) => ACTIONABLE_SIGNAL_TYPES.has(signal.type))
                .filter((signal) => !existingSourceKeys.has(`${ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.SIGNAL}:${signal.id}`))
                .slice(0, 20)
                .map((signal) => ({
                    ...cardInputFromSignal(signal, tId, sId),
                    ...getActorStatusMeta(actor, 'Card created from signal sync'),
                }));

            const created = await createAnswerlatticeSupportBoardCards(inputs);
            if (created.length > 0) {
                message.success(`${created.length} support signal${created.length === 1 ? '' : 's'} added to Support Board`);
                await refresh();
            } else {
                message.info('No new actionable support signals to add');
            }
            return created.length;
        } catch {
            message.error(ANSWERLATTICE_SUPPORT_BOARD_SIGNAL_SYNC_FAILED);
            return 0;
        } finally {
            setSyncing(false);
        }
    }, [actor, existingSourceKeys, refresh, sId, sourceSyncEnabled, tId]);

    const createAnswerProposal = useCallback(async (card: AnswerlatticeSupportBoardCard) => {
        if (!tId || !sId) return;
        const relatedEntityId = normalizeAnswerlatticeResolvedEntityId(card.relatedEntityId);
        if (!relatedEntityId) {
            message.warning('Add a related entity before creating an answer proposal');
            return;
        }

        setSaving(true);
        try {
            const proposal = await addMutationProposal({
                tId,
                sId,
                requestId: `support_board_${card.id}`,
                targetAnswerId: card.relatedAnswerId || '',
                relatedEntityIds: [relatedEntityId],
                mutationType: card.relatedAnswerId
                    ? ANSWERLATTICE_MUTATION_TYPE.CONTENT_REFINEMENT
                    : ANSWERLATTICE_MUTATION_TYPE.NEW_ANSWER_REQUIRED,
                signalSummary: {
                    ticketCount: card.relatedTicketId || card.sourceType === ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.TICKET ? 1 : 0,
                    chatCount: card.relatedConversationId || card.sourceType === ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.CONVERSATION ? 1 : 0,
                    negativeFeedbackRate: card.sourceType === ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE.SIGNAL ? 1 : 0,
                    exampleReferences: [card.sourceId || card.id],
                },
                suggestedChange: {
                    draftTitle: card.title,
                    structuredSummary: card.description?.slice(0, 500) || card.title,
                    detailedExplanation: card.description || card.title,
                    draftStatus: 'pending',
                    draftSource: card.relatedTicketId ? 'ticket_resolution' : 'recurring_fallback',
                    draftSignalExamples: [card.description || card.title].filter(Boolean),
                    ...(card.relatedTicketId ? {
                        sourceTicketIds: [card.relatedTicketId],
                        sourceTicketCount: 1,
                    } : {}),
                },
                confidenceScore: 0.55,
                status: ANSWERLATTICE_MUTATION_STATUS.PENDING_REVIEW,
            });

            await updateAnswerlatticeSupportBoardCard(card.id, {
                status: ANSWERLATTICE_SUPPORT_BOARD_STATUS.DRAFT_READY,
                relatedProposalId: proposal.id,
                ...getActorStatusMeta(actor, 'Answer proposal created'),
            });

            let noteAdded = true;
            try {
                await addAnswerlatticeSupportBoardNote(card.id, {
                    text: `Governance proposal ${proposal.id.slice(0, 8)} created. Generate and approve the draft from Knowledge Governance.`,
                    authorId: actor?.id || 'system',
                    authorName: actor?.name || 'Answerlattice',
                });
            } catch (error) {
                noteAdded = false;
                logAnswerlatticeFailure(
                    'answerlattice_support_board_proposal_note_add_failed',
                    error,
                    {
                        ...getBoundedAnswerlatticeStringContext('cardId', card.id),
                        ...getBoundedAnswerlatticeStringContext('proposalId', proposal.id),
                    },
                );
            }

            message.success(noteAdded
                ? 'Answer proposal created'
                : 'Answer proposal created; private board note was not added');
            await refresh();
        } catch {
            message.error(ANSWERLATTICE_SUPPORT_BOARD_PROPOSAL_CREATE_FAILED);
        } finally {
            setSaving(false);
        }
    }, [actor, refresh, sId, tId]);

    return {
        cards,
        createAnswerProposal,
        createCard,
        enabled,
        error,
        hasScope,
        loading,
        moveCard,
        refresh,
        redactSourceIdentity,
        saving,
        sourceSyncEnabled,
        nightlySummaryEnabled,
        summary,
        addNote,
        syncing,
        syncSignals,
        syncTickets,
        updateCard,
    };
}
