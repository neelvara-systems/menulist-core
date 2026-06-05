interface TiptapNode {
    type: string;
    content?: TiptapNode[];
    text?: string;
    attrs?: Record<string, any>;
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
export const getTextFromTiptapJson = (node: TiptapNode): string => {
    if (!node) {
        return '';
    }

    if (node.type === 'text' && node.text) {
        return node.text;
    }

    if (node.type === 'hardBreak') {
        return ' ';
    }

    if (node.type === 'image') {
        return normalizeWhitespace([node.attrs?.alt, node.attrs?.title].filter(Boolean).join(' '));
    }

    if (node.content && Array.isArray(node.content)) {
        const separator = INLINE_JOIN_NODES.has(node.type)
            ? ''
            : BLOCK_SEPARATOR_NODES.has(node.type)
                ? ' '
                : ' ';
        return normalizeWhitespace(node.content.map(getTextFromTiptapJson).filter(Boolean).join(separator));
    }

    return '';
};
