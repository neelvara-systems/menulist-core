
export function extractPlainTextFromEditorContent(editorContent: any): string {
    if (!editorContent) return "";

    const traverse = (node: any): string => {
        if (!node) return "";
        if (node.type === "text") return node.text || "";
        if (node.content) return node.content.map(traverse).join(" ");
        return "";
    };

    return traverse(editorContent).trim();
}

export function extractEditortextForComparison(editorContent: any): string {
    let plaintext = extractPlainTextFromEditorContent(editorContent);
    return plaintext.toLowerCase().replace(/[^a-z0-9]/g, "");
}
