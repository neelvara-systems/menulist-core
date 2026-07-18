import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES } from '@lib/answerlattice/chatImagePolicy';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type { ChatMessage, ChatReference, ChatSession } from '@type/chatSession';
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export const ANSWERLATTICE_CHAT_SESSION_MESSAGE_LIMIT = 50;
export const ANSWERLATTICE_CHAT_SESSION_BATCH_UPDATE_LIMIT = 100;
export const ANSWERLATTICE_CHAT_SESSION_NOTE_MAX_BYTES = 32 * 1024;

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
        ...(cleanString(value.answerSource, 80) ? { answerSource: cleanString(value.answerSource, 80) } : {}),
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
    try {
        return {
            ...params.value,
            id,
            tId: params.scope.tId,
            sId: params.scope.sId,
            messages: normalizeAnswerlatticeChatMessagesForStorage(params.value.messages),
        } as ChatSession;
    } catch {
        return null;
    }
};

export const normalizeAnswerlatticeInternalNote = (value: unknown): unknown => {
    const copied = copyBoundedJson(value, ANSWERLATTICE_CHAT_SESSION_NOTE_MAX_BYTES);
    if (
        !copied
        || (typeof copied !== 'string' && !isRecord(copied))
        || (typeof copied === 'string' && !copied.trim())
    ) throw new Error('answerlattice_chat_internal_note_invalid');
    return copied;
};
