import { createHash } from 'crypto';
import { tiptapToText } from '../utils/tiptapUtils';

const EMBEDDING_MAX_TEXT_CHARS = 32_000;

function cleanEmbeddingText(value: unknown, maxLength: number): string {
    return (typeof value === 'string' ? value : '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export function getAnswerlatticeEmbeddingInput(article: {
    categoryTitle: unknown;
    content: unknown;
    sectionTitle?: unknown;
    title: unknown;
}): { sourceHash: string; text: string } | null {
    const title = cleanEmbeddingText(article.title, 300);
    const body = cleanEmbeddingText(tiptapToText(article.content), EMBEDDING_MAX_TEXT_CHARS);
    if (!title || body.length < 40) return null;

    const text = [
        cleanEmbeddingText(article.categoryTitle, 300),
        cleanEmbeddingText(article.sectionTitle, 300),
        title,
        body,
    ].filter(Boolean).join('\n\n');

    return {
        sourceHash: createHash('sha256').update(text).digest('hex'),
        text,
    };
}
