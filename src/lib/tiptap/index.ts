export interface TiptapNode {
    type: string;
    content?: TiptapNode[];
    text?: string;
    attrs?: Record<string, unknown>;
}

const INLINE_JOIN_NODES = new Set(['textStyle', 'link', 'bold', 'italic', 'underline', 'strike', 'code']);
const BLOCK_SEPARATOR_NODES = new Set([
    'doc',
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'taskList',
    'listItem',
    'taskItem',
    'blockquote',
    'table',
    'tableRow',
    'tableCell',
    'tableHeader',
]);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * Recursively extracts plain text from a Tiptap JSON object.
 * @param node The Tiptap node (or the root document object).
 * @returns A string containing all the concatenated text from the document.
 */
const normalizeTiptapNode = (value: unknown, depth = 0): TiptapNode | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 50) return null;
    try {
        const source = value as Record<string, unknown>;
        const type = typeof source.type === 'string' ? source.type.trim().slice(0, 80) : '';
        if (!type) return null;
        const text = typeof source.text === 'string' ? source.text : undefined;
        const content = Array.isArray(source.content)
            ? source.content
                .slice(0, 5_000)
                .map((child) => normalizeTiptapNode(child, depth + 1))
                .filter((child): child is TiptapNode => child !== null)
            : undefined;
        const attrs = source.attrs && typeof source.attrs === 'object' && !Array.isArray(source.attrs)
            ? source.attrs as Record<string, unknown>
            : undefined;
        return { type, ...(text !== undefined ? { text } : {}), ...(content ? { content } : {}), ...(attrs ? { attrs } : {}) };
    } catch {
        return null;
    }
};

export const getTiptapDocumentNodes = (value: unknown): TiptapNode[] => {
    const root = normalizeTiptapNode(value);
    return root?.type === 'doc' && Array.isArray(root.content) ? root.content : [];
};

export const getTextFromTiptapJson = (value: unknown): string => {
    const node = normalizeTiptapNode(value);
    if (!node) return '';
    if (node.type === 'text' && node.text) return node.text;
    if (node.type === 'hardBreak') return ' ';
    if (node.type === 'image') {
        return normalizeWhitespace(
            [node.attrs?.alt, node.attrs?.title]
                .filter((entry): entry is string => typeof entry === 'string')
                .join(' '),
        );
    }
    if (node.content) {
        const separator = INLINE_JOIN_NODES.has(node.type)
            ? ''
            : BLOCK_SEPARATOR_NODES.has(node.type)
                ? ' '
                : ' ';
        return normalizeWhitespace(node.content.map(getTextFromTiptapJson).filter(Boolean).join(separator));
    }
    return '';
};
