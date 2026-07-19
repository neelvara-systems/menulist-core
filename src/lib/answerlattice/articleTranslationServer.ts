import { createHash } from 'node:crypto';
import { z } from 'zod';

export const ANSWERLATTICE_TRANSLATION_SOURCE_LOCALE = 'en-US' as const;
export const ANSWERLATTICE_TRANSLATION_SOURCE_HASH_PATTERN = /^[a-f0-9]{64}$/;
export const ANSWERLATTICE_TRANSLATED_TITLE_MAX_CHARS = 300;
export const ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS = 12_000;

const TranslationProviderOutputSchema = z.object({
    translatedTitle: z.string().trim().min(1).max(ANSWERLATTICE_TRANSLATED_TITLE_MAX_CHARS),
    translatedContent: z.string().trim().min(1).max(ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS),
}).strict();

export class AnswerlatticeTranslationProviderOutputError extends Error {
    readonly code: 'ANSWERLATTICE_TRANSLATION_RESPONSE_TOO_LARGE' | 'ANSWERLATTICE_TRANSLATION_RESPONSE_INVALID';

    constructor(code: AnswerlatticeTranslationProviderOutputError['code']) {
        super(code);
        this.code = code;
        this.name = 'AnswerlatticeTranslationProviderOutputError';
    }
}

export type AnswerlatticeTranslationDraftWriteBlockReason = 'source_changed' | 'translation_exists' | null;

export const getAnswerlatticeTranslationDraftWriteBlockReason = (input: {
    currentSourceHash: string;
    expectedSourceHash: string;
    existingTranslation: unknown;
}): AnswerlatticeTranslationDraftWriteBlockReason => {
    if (input.currentSourceHash !== input.expectedSourceHash) return 'source_changed';
    return input.existingTranslation ? 'translation_exists' : null;
};

export const extractAnswerlatticeArticlePlainText = (node: unknown): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node !== 'object' || Array.isArray(node)) return '';

    const record = node as Record<string, unknown>;
    if (record.type === 'text') {
        return typeof record.text === 'string' ? record.text : '';
    }

    if (!Array.isArray(record.content)) return '';
    let text = '';
    for (const child of record.content) {
        text += extractAnswerlatticeArticlePlainText(child);
        if (
            child
            && typeof child === 'object'
            && !Array.isArray(child)
            && ['paragraph', 'heading', 'bulletList', 'orderedList'].includes(String((child as Record<string, unknown>).type || ''))
        ) {
            text += '\n\n';
        }
    }
    return text;
};

export const getAnswerlatticeArticleTranslationSource = (
    article: Record<string, unknown>,
): { title: string; plainContent: string; sourceHash: string } => {
    const title = typeof article.title === 'string' ? article.title.trim() : '';
    const plainContent = extractAnswerlatticeArticlePlainText(article.content)
        .replace(/\s+\n/g, '\n')
        .trim();
    const sourceHash = createHash('sha256')
        .update(JSON.stringify({ locale: ANSWERLATTICE_TRANSLATION_SOURCE_LOCALE, title, plainContent }))
        .digest('hex');
    return { title, plainContent, sourceHash };
};

export const parseAnswerlatticeTranslationProviderOutput = (
    responseText: string,
): { translatedTitle: string; translatedContent: string } => {
    const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        const parsed = TranslationProviderOutputSchema.parse(JSON.parse(cleaned));
        return {
            translatedTitle: parsed.translatedTitle,
            translatedContent: parsed.translatedContent,
        };
    } catch {
        throw new AnswerlatticeTranslationProviderOutputError('ANSWERLATTICE_TRANSLATION_RESPONSE_INVALID');
    }
};

export const buildAnswerlatticeTranslationDraftContent = (translatedContent: string) => ({
    type: 'doc',
    content: translatedContent
        .split(/\n{2,}/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .map(paragraph => ({
            type: 'paragraph',
            content: [{ type: 'text', text: paragraph }],
        })),
});
