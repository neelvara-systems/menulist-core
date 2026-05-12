export const tiptapToText = (node: any): string => {
    if (node.type === 'text' && node.text) {
        return node.text;
    }
    if (node.content && Array.isArray(node.content)) {
        // Add a space between block nodes for better readability
        return node.content.map(tiptapToText).join(node.type !== 'doc' ? ' ' : '');
    }
    return '';
};

/**
 * Recursively traverses a Tiptap node and its children to find all unique provenance attributes.
 * @param {any} node - The Tiptap node to process.
 * @param {any[]} sources - An accumulator for the found sources.
 * @returns {any[]} An array of unique provenance objects.
 */
export const extractProvenance = (node: any, sources: any[] = []): any[] => {
    if (node.attrs && node.attrs.provenance) {
        // Ensure uniqueness to avoid duplicate source entries
        const isDuplicate = sources.some(
            s => s.sourceFile === node.attrs.provenance.sourceFile && s.timestamp === node.attrs.provenance.timestamp
        );
        if (!isDuplicate) {
            sources.push(node.attrs.provenance);
        }
    }

    if (node.content && Array.isArray(node.content)) {
        node.content.forEach((childNode: any) => extractProvenance(childNode, sources));
    }

    return sources;
};
