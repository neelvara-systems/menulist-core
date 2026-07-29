import crypto from 'crypto';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';

const ANSWERLATTICE_EMBEDDING_MAX_TEXT_CHARS = 32_000;

const cleanEmbeddingText = (value: unknown, maxLength: number): string => (
    typeof value === 'string' ? value : ''
)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

export function getAnswerlatticeArticleEmbeddingInput(article: {
    categoryTitle?: unknown;
    content: unknown;
    plainText?: unknown;
    sectionTitle?: unknown;
    title: unknown;
}): { sourceHash: string; text: string; title: string } | null {
    const title = cleanEmbeddingText(article.title, 300);
    const persistedPlainText = cleanEmbeddingText(
        article.plainText,
        ANSWERLATTICE_EMBEDDING_MAX_TEXT_CHARS,
    );
    const body = persistedPlainText || cleanEmbeddingText(
        extractPlainTextFromEditorContent(article.content),
        ANSWERLATTICE_EMBEDDING_MAX_TEXT_CHARS,
    );
    if (!title || body.length < 40) return null;

    const text = [
        cleanEmbeddingText(article.categoryTitle, 300),
        cleanEmbeddingText(article.sectionTitle, 300),
        title,
        body,
    ].filter(Boolean).join('\n\n');

    return {
        sourceHash: crypto.createHash('sha256').update(text).digest('hex'),
        text,
        title,
    };
}
