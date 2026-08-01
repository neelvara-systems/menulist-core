import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import {
    normalizeAnswerlatticeScopeDocumentId,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import { ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES } from '@lib/answerlattice/chatImagePolicy';
import {
    normalizeAnswerlatticePublicCitations,
    normalizeAnswerlatticePublicFallbackReason,
    normalizeAnswerlatticeScopeClarification,
} from '@lib/answerlattice/publicAnswerContracts';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type {
    ChatInternalNote,
    ChatInternalNoteContent,
    ChatMessage,
    ChatReference,
    ChatSession,
} from '@type/chatSession';
import type { JSONContent } from '@tiptap/core';
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export const ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT = 50;
export const ANSWERLATTICE_CHAT_SESSION_BATCH_UPDATE_LIMIT = 100;
export const ANSWERLATTICE_CHAT_SESSION_NOTE_MAX_BYTES = 32 * 1024;

export type AnswerlatticeChatSessionActorScope = {
    tId: number;
    sId: number;
    uId: string;
};

export const getAnswerlatticeChatSessionActorScope = (
    session: unknown,
): AnswerlatticeChatSessionActorScope | null => {
    const scope = resolveAnswerlatticeSessionScope(session);
    const sessionRecord = session && typeof session === 'object' && !Array.isArray(session)
        ? session as Record<string, unknown>
        : {};
    const userRecord = sessionRecord.user && typeof sessionRecord.user === 'object' && !Array.isArray(sessionRecord.user)
        ? sessionRecord.user as Record<string, unknown>
        : {};
    const userId = String(userRecord.id || sessionRecord.uId || '').trim();
    return scope && userId && userId.length <= 180
        ? { tId: scope.tenantId, sId: scope.storeId, uId: userId }
        : null;
};

export const getAnswerlatticeUserChatSessionsCacheKey = (
    scope: { tenantId: number; storeId: number } | null | undefined,
    userId: unknown,
): readonly ['answerlattice-user-chat-sessions', number, number, string] | null => {
    const tId = normalizeAnswerlatticeScopeDocumentId(scope?.tenantId);
    const sId = normalizeAnswerlatticeScopeDocumentId(scope?.storeId);
    const actorId = typeof userId === 'string' ? userId.trim() : '';
    return tId && sId && actorId && actorId.length <= 180
        ? ['answerlattice-user-chat-sessions', tId, sId, actorId]
        : null;
};

const ChatMetadataMutationSchema = z.object({
    title: z.string().trim().min(1).max(160).optional(),
    mode: z.enum(['qna', 'assistant']).optional(),
    adminStatus: z.enum(['new', 'in_progress', 'resolved', 'follow_up', 'closed']).optional(),
    priority: z.enum(['high', 'normal', 'low']).optional(),
    adminTags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    isUnread: z.boolean().optional(),
    lastAdminView: z.instanceof(Timestamp).optional(),
}).strict();

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const cleanString = (value: unknown, maxLength: number): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, maxLength) : undefined;
};

const cleanUrl = (value: unknown): string | undefined => {
    const url = cleanString(value, 1000);
    if (!url) return undefined;
    if (url.startsWith('/') && !url.startsWith('//')) return url;
    try {
        const parsed = new URL(url);
        return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password
            ? parsed.toString()
            : undefined;
    } catch {
        return undefined;
    }
};

const copyBoundedJson = (value: unknown, maxBytes: number): any | undefined => {
    if (value === undefined || value === null) return undefined;
    try {
        const serialized = JSON.stringify(value);
        if (!serialized || new TextEncoder().encode(serialized).length > maxBytes) return undefined;
        return JSON.parse(serialized);
    } catch {
        return undefined;
    }
};

export const normalizeAnswerlatticeChatSessionId = (value: unknown): string | null => {
    const raw = typeof value === 'string' ? value : '';
    const sessionId = raw.trim();
    return sessionId === raw && sessionId.length <= 180 && isValidFirestoreDocumentId(sessionId)
        ? sessionId
        : null;
};

const normalizeReference = (value: unknown): ChatReference | null => {
    if (!isRecord(value)) return null;
    const id = normalizeAnswerlatticeChatSessionId(value.id);
    const title = cleanString(value.title, 300);
    if (!id || !title) return null;
    const similarityScore = Number(value.similarityScore);
    return {
        id,
        title,
        ...(cleanString(value.categoryTitle, 160) ? { categoryTitle: cleanString(value.categoryTitle, 160) } : {}),
        ...(cleanString(value.sectionTitle, 160) ? { sectionTitle: cleanString(value.sectionTitle, 160) } : {}),
        ...(cleanString(value.slug, 180) ? { slug: cleanString(value.slug, 180) } : {}),
        ...(cleanUrl(value.url) ? { url: cleanUrl(value.url) } : {}),
        ...(Number.isFinite(similarityScore) ? { similarityScore: Math.max(0, Math.min(1, similarityScore)) } : {}),
    };
};

export const normalizeAnswerlatticeChatMessageForStorage = (value: unknown): ChatMessage => {
    if (!isRecord(value)) throw new Error('answerlattice_chat_message_invalid');
    const id = normalizeAnswerlatticeChatSessionId(value.id);
    if (!id || (value.role !== 'user' && value.role !== 'assistant')) {
        throw new Error('answerlattice_chat_message_invalid');
    }
    const content = cleanString(value.content, 4000);
    const craftedAnswer = cleanString(value.craftedAnswer, 12_000);
    const createdOn = value.createdOn instanceof Timestamp ? value.createdOn : undefined;
    if (value.createdOn !== undefined && !createdOn) {
        throw new Error('answerlattice_chat_message_timestamp_invalid');
    }
    if (value.role === 'user' && !content) throw new Error('answerlattice_chat_user_message_empty');
    if (value.role === 'assistant' && !craftedAnswer) throw new Error('answerlattice_chat_assistant_message_empty');

    const references = Array.isArray(value.references)
        ? value.references.slice(0, 5).map(normalizeReference).filter((item): item is ChatReference => Boolean(item))
        : [];
    const citations = normalizeAnswerlatticePublicCitations(value.citations);
    const fallbackReason = normalizeAnswerlatticePublicFallbackReason(value.fallbackReason);
    const clarification = normalizeAnswerlatticeScopeClarification(value.clarification);
    const confidence = ['high', 'medium', 'low', 'none'].includes(String(value.confidence))
        ? value.confidence as NonNullable<ChatMessage['confidence']>
        : undefined;
    const suggestedQuestions = Array.isArray(value.suggestedQuestions)
        ? Array.from(new Set(value.suggestedQuestions
            .map((item: unknown) => cleanString(item, 300))
            .filter((item: string | undefined): item is string => Boolean(item))))
            .slice(0, 5)
        : [];
    const feedback = value.feedback === undefined
        ? undefined
        : normalizeAnswerlatticeChatFeedback(value.feedback, value.feedback.submittedAt);
    let image: ChatMessage['image'];
    if (value.image !== undefined && value.image !== null) {
        if (!isRecord(value.image)) throw new Error('answerlattice_chat_image_invalid');
        const url = cleanUrl(value.image.url || value.image.source);
        const name = cleanString(value.image.name, 300);
        const type = cleanString(value.image.type, 120);
        const rawSize = value.image.size;
        const size = rawSize === undefined ? undefined : Number(rawSize);
        if (
            !url
            || (rawSize !== undefined && (!Number.isFinite(size) || size! < 0 || size! > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES))
        ) throw new Error('answerlattice_chat_image_invalid');
        image = {
            url,
            source: url,
            ...(name ? { name } : {}),
            ...(type ? { type } : {}),
            ...(size !== undefined ? { size } : {}),
        };
    }
    const relatedContent = copyBoundedJson(value.relatedContent, 8 * 1024);
    const generationMetadata = copyBoundedJson(value.generationMetadata, 2 * 1024);
    const escalation = copyBoundedJson(value.escalation, 8 * 1024);

    return {
        id,
        role: value.role,
        ...(content ? { content } : {}),
        ...(craftedAnswer ? { craftedAnswer } : {}),
        ...(createdOn ? { createdOn } : {}),
        ...(normalizeAnswerlatticeSearchHistoryId(value.searchHistoryId) ? { searchHistoryId: value.searchHistoryId } : {}),
        ...(references.length > 0 ? { references } : {}),
        ...(citations.length > 0 ? { citations } : {}),
        ...(cleanString(value.answerSource, 80) ? { answerSource: cleanString(value.answerSource, 80) } : {}),
        ...(confidence ? { confidence } : {}),
        ...(fallbackReason ? { fallbackReason } : {}),
        ...(clarification ? { clarification } : {}),
        ...(relatedContent ? { relatedContent } : {}),
        ...(suggestedQuestions.length > 0 ? { suggestedQuestions } : {}),
        ...(image?.url ? { image } : {}),
        ...(feedback ? { feedback } : {}),
        ...(generationMetadata ? { generationMetadata } : {}),
        ...(escalation ? { escalation } : {}),
    };
};

export const normalizeAnswerlatticeChatFeedback = (
    value: unknown,
    submittedAt?: unknown,
): NonNullable<ChatMessage['feedback']> => {
    if (!isRecord(value) || typeof value.isGood !== 'boolean') {
        throw new Error('answerlattice_chat_feedback_invalid');
    }
    const normalizedSubmittedAt = submittedAt instanceof Timestamp ? submittedAt : undefined;
    if (submittedAt !== undefined && !normalizedSubmittedAt) {
        throw new Error('answerlattice_chat_feedback_timestamp_invalid');
    }
    const reasonsToImprove = Array.isArray(value.reasonsToImprove)
        ? value.reasonsToImprove.slice(0, 10).flatMap((reason: unknown) => {
            if (!isRecord(reason)) return [];
            const reasonValue = cleanString(reason.value, 120);
            const label = cleanString(reason.label, 160);
            return reasonValue && label ? [{ value: reasonValue, label }] : [];
        })
        : [];
    return {
        isGood: value.isGood,
        reasonsToImprove,
        comments: cleanString(value.comments, 1000) || '',
        ...(normalizedSubmittedAt ? { submittedAt: normalizedSubmittedAt } : {}),
    };
};

export const normalizeAnswerlatticeChatMessagesForStorage = (value: unknown): ChatMessage[] => {
    if (!Array.isArray(value)) throw new Error('answerlattice_chat_messages_invalid');
    const normalized = value.map(normalizeAnswerlatticeChatMessageForStorage);
    const seen = new Set<string>();
    normalized.forEach((message) => {
        if (seen.has(message.id)) throw new Error('answerlattice_chat_message_id_duplicate');
        seen.add(message.id);
    });
    if (normalized.length <= ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT) return normalized;
    return [normalized[0], ...normalized.slice(-(ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT - 1))];
};

const normalizeTiptapJsonContent = (value: unknown): JSONContent | null => {
    if (!isRecord(value)) return null;
    const type = value.type === undefined ? undefined : cleanString(value.type, 120);
    const text = value.text === undefined ? undefined : cleanString(value.text, 12_000);
    const attrs = value.attrs === undefined
        ? undefined
        : (isRecord(value.attrs) ? value.attrs : null);
    const content = value.content === undefined
        ? undefined
        : (Array.isArray(value.content)
            ? value.content.map(normalizeTiptapJsonContent)
            : null);
    const marks = value.marks === undefined
        ? undefined
        : (Array.isArray(value.marks)
            ? value.marks.map((mark) => {
                if (!isRecord(mark)) return null;
                const markType = cleanString(mark.type, 120);
                const markAttrs = mark.attrs === undefined
                    ? undefined
                    : (isRecord(mark.attrs) ? mark.attrs : null);
                return markType && markAttrs !== null
                    ? { type: markType, ...(markAttrs ? { attrs: markAttrs } : {}) }
                    : null;
            })
            : null);
    if (
        (!type && !text)
        || attrs === null
        || content === null
        || marks === null
        || content?.some((item) => item === null)
        || marks?.some((item) => item === null)
    ) return null;
    return {
        ...(type ? { type } : {}),
        ...(attrs ? { attrs } : {}),
        ...(content ? { content: content.filter((item): item is JSONContent => Boolean(item)) } : {}),
        ...(marks ? {
            marks: marks.filter((item): item is { type: string; attrs?: Record<string, unknown> } => Boolean(item)),
        } : {}),
        ...(text ? { text } : {}),
    };
};

const normalizeStoredInternalNotes = (
    value: unknown,
): ChatInternalNote[] | undefined | null => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length > 1) return null;
    const notes: ChatInternalNote[] = [];
    for (const rawNote of value) {
        if (!isRecord(rawNote)) return null;
        let content: ChatInternalNoteContent;
        try {
            content = normalizeAnswerlatticeInternalNote(rawNote.content);
        } catch {
            return null;
        }
        const timestamps = {
            createdOn: rawNote.createdOn,
            modifiedOn: rawNote.modifiedOn,
        };
        if (Object.values(timestamps).some(
            (timestamp) => timestamp !== undefined && !(timestamp instanceof Timestamp),
        )) return null;
        const strings = {
            id: rawNote.id === undefined ? undefined : cleanString(rawNote.id, 180),
            createdBy: rawNote.createdBy === undefined ? undefined : cleanString(rawNote.createdBy, 180),
            createdByName: rawNote.createdByName === undefined ? undefined : cleanString(rawNote.createdByName, 300),
            modifiedBy: rawNote.modifiedBy === undefined ? undefined : cleanString(rawNote.modifiedBy, 180),
            modifiedByName: rawNote.modifiedByName === undefined ? undefined : cleanString(rawNote.modifiedByName, 300),
        };
        if (Object.entries(strings).some(
            ([key, normalized]) => rawNote[key] !== undefined && normalized === undefined,
        )) return null;
        notes.push({
            content,
            ...(strings.id ? { id: strings.id } : {}),
            ...(strings.createdBy ? { createdBy: strings.createdBy } : {}),
            ...(strings.createdByName ? { createdByName: strings.createdByName } : {}),
            ...(timestamps.createdOn instanceof Timestamp ? { createdOn: timestamps.createdOn } : {}),
            ...(strings.modifiedBy ? { modifiedBy: strings.modifiedBy } : {}),
            ...(strings.modifiedByName ? { modifiedByName: strings.modifiedByName } : {}),
            ...(timestamps.modifiedOn instanceof Timestamp ? { modifiedOn: timestamps.modifiedOn } : {}),
        });
    }
    return notes;
};

export const parseAnswerlatticeChatMetadataMutation = (value: unknown) => {
    const input = isRecord(value) ? value : {};
    const projected: Record<string, unknown> = {};
    Object.keys(ChatMetadataMutationSchema.shape).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(input, key)) projected[key] = input[key];
    });
    const parsed = ChatMetadataMutationSchema.safeParse(projected);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
        throw new Error('answerlattice_chat_metadata_mutation_invalid');
    }
    if (parsed.data.lastAdminView !== undefined && (
        !parsed.data.lastAdminView
        || typeof parsed.data.lastAdminView !== 'object'
    )) throw new Error('answerlattice_chat_last_admin_view_invalid');
    return parsed.data;
};

export const parseAnswerlatticeChatSessionDocument = (params: {
    id: string;
    value: unknown;
    scope: { tId: number; sId: number };
}): ChatSession | null => {
    const id = normalizeAnswerlatticeChatSessionId(params.id);
    if (!id || !isRecord(params.value)) return null;
    if (
        params.value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || normalizeAnswerlatticeScopeDocumentId(params.value.tId) !== params.scope.tId
        || normalizeAnswerlatticeScopeDocumentId(params.value.sId) !== params.scope.sId
        || typeof params.value.title !== 'string'
        || !params.value.title
        || params.value.title.trim() !== params.value.title
        || params.value.title.length > 160
        || (params.value.mode !== 'qna' && params.value.mode !== 'assistant')
        || (params.value.createdOn !== undefined && !(params.value.createdOn instanceof Timestamp))
        || (params.value.modifiedOn !== undefined && !(params.value.modifiedOn instanceof Timestamp))
        || (params.value.lastAdminView !== undefined && !(params.value.lastAdminView instanceof Timestamp))
    ) return null;
    const internalNotes = normalizeStoredInternalNotes(params.value.internalNotes);
    if (internalNotes === null) return null;
    try {
        return {
            ...params.value,
            id,
            tId: params.scope.tId,
            sId: params.scope.sId,
            messages: normalizeAnswerlatticeChatMessagesForStorage(params.value.messages),
            ...(internalNotes !== undefined ? { internalNotes } : {}),
        } as ChatSession;
    } catch {
        return null;
    }
};

export const normalizeAnswerlatticeInternalNote = (value: unknown): ChatInternalNoteContent => {
    const copied = copyBoundedJson(value, ANSWERLATTICE_CHAT_SESSION_NOTE_MAX_BYTES);
    if (typeof copied === 'string') {
        if (!copied.trim()) throw new Error('answerlattice_chat_internal_note_invalid');
        return copied;
    }
    const json = normalizeTiptapJsonContent(copied);
    if (!json || json.type !== 'doc') throw new Error('answerlattice_chat_internal_note_invalid');
    return json;
};

export const getAnswerlatticeInternalNotePlainText = (
    value: ChatInternalNoteContent,
): string => {
    if (typeof value === 'string') return value;
    const fragments: string[] = [];
    const visit = (node: JSONContent): void => {
        if (node.text) fragments.push(node.text);
        node.content?.forEach(visit);
        if (
            node.type === 'paragraph'
            || node.type === 'heading'
            || node.type === 'listItem'
            || node.type === 'blockquote'
        ) fragments.push('\n');
    };
    visit(value);
    return fragments.join('').replace(/\n{3,}/g, '\n\n').trim();
};
