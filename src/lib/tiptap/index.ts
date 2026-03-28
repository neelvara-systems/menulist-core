interface TiptapNode {
    type: string;
    content?: TiptapNode[];
    text?: string;
}

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

    if (node.content && Array.isArray(node.content)) {
        return node.content.map(getTextFromTiptapJson).join('');
    }

    return '';
};
