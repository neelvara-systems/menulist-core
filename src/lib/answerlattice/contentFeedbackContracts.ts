import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { z } from 'zod';

const documentIdSchema = z.string().trim().min(1).max(180).refine(isValidFirestoreDocumentId);
const requestIdSchema = z.string().trim().min(8).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const AnswerlatticeContentFeedbackRequestSchema = z.object({
    requestId: requestIdSchema,
    type: z.enum(['article', 'changelog', 'faq']),
    contentId: documentIdSchema,
    pageId: documentIdSchema.optional(),
    sentiment: z.enum(['like', 'dislike']),
    increment: z.boolean(),
    comment: z.string().max(500).default(''),
    action: z.enum(['added', 'removed']),
}).strict().superRefine((value, context) => {
    if (value.type === 'changelog' && !value.pageId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['pageId'], message: 'Changelog page is required' });
    }
    if ((value.increment && value.action !== 'added') || (!value.increment && value.action !== 'removed')) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['action'], message: 'Feedback action does not match the counter operation' });
    }
});

export type AnswerlatticeContentFeedbackRequest = {
    requestId: string;
    type: 'article' | 'changelog' | 'faq';
    contentId: string;
    pageId?: string;
    sentiment: 'like' | 'dislike';
    increment: boolean;
    comment: string;
    action: 'added' | 'removed';
};

export const parseAnswerlatticeContentFeedbackRequest = (
    value: unknown,
): AnswerlatticeContentFeedbackRequest | null => {
    const parsed = AnswerlatticeContentFeedbackRequestSchema.safeParse(value);
    if (!parsed.success) return null;
    const data = parsed.data;
    if (!data.requestId || !data.type || !data.contentId || !data.sentiment || typeof data.increment !== 'boolean' || !data.action) return null;
    return {
        requestId: data.requestId,
        type: data.type,
        contentId: data.contentId,
        ...(data.pageId ? { pageId: data.pageId } : {}),
        sentiment: data.sentiment,
        increment: data.increment,
        comment: data.comment || '',
        action: data.action,
    };
};

export const AnswerlatticeContentFeedbackResultSchema = z.object({
    success: z.literal(true),
    likes: z.number().int().nonnegative(),
    dislikes: z.number().int().nonnegative(),
    feedbackId: documentIdSchema,
    feedbackLogged: z.boolean(),
    replayed: z.boolean(),
}).strict();
