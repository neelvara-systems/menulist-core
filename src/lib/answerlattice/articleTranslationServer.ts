import { createHash } from 'node:crypto';
import { z } from 'zod';

export const ANSWERLATTICE_TRANSLATION_SOURCE_LOCALE = 'en-US' as const;
export const ANSWERLATTICE_TRANSLATION_SOURCE_HASH_PATTERN = /^[a-f0-9]{64}$/;
export const ANSWERLATTICE_TRANSLATED_TITLE_MAX_CHARS = 300;
export const ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS = 12_000;
const ANSWERLATTICE_TRANSLATION_SOURCE_MAX_NODES = 10_000;

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

const readNodeValue = (node: object, key: PropertyKey): unknown => {
    try {
        return Reflect.get(node, key);
    } catch {
        return undefined;
    }
};

export const extractAnswerlatticeArticlePlainText = (node: unknown): string => {
    const seen = new WeakSet<object>();
    let visitedNodes = 0;
    let text = '';

    const append = (value: string) => {
        if (!value || text.length >= ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS) return;
        text += value.slice(0, ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS - text.length);
    };
    const visit = (value: unknown): void => {
        if (!value || text.length >= ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS) return;
        if (typeof value === 'string') {
            append(value);
            return;
        }
        if (typeof value !== 'object' || Array.isArray(value) || seen.has(value)) return;
        visitedNodes += 1;
        if (visitedNodes > ANSWERLATTICE_TRANSLATION_SOURCE_MAX_NODES) return;
        seen.add(value);

        const type = readNodeValue(value, 'type');
        if (type === 'text') {
            const nodeText = readNodeValue(value, 'text');
            if (typeof nodeText === 'string') append(nodeText);
            return;
        }

        const content = readNodeValue(value, 'content');
        if (!Array.isArray(content)) return;
        try {
            for (const child of content) {
                visit(child);
                const childType = child && typeof child === 'object' && !Array.isArray(child)
                    ? readNodeValue(child, 'type')
                    : undefined;
                if (
                    typeof childType === 'string'
                    && ['paragraph', 'heading', 'bulletList', 'orderedList']
                        .includes(childType)
                ) {
                    append('\n\n');
                }
                if (text.length >= ANSWERLATTICE_TRANSLATED_CONTENT_MAX_CHARS) break;
            }
        } catch {
            return;
        }
    };

    visit(node);
    return text;
};

export const getAnswerlatticeArticleTranslationSource = (
    article: Record<string, unknown>,
): { title: string; plainContent: string; sourceHash: string } => {
    const titleValue = readNodeValue(article, 'title');
    const title = typeof titleValue === 'string' ? titleValue.trim() : '';
    const plainContent = extractAnswerlatticeArticlePlainText(readNodeValue(article, 'content'))
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
