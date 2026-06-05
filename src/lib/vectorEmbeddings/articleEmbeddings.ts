
export function extractPlainTextFromEditorContent(editorContent: any): string {
    if (!editorContent) return "";

    const traverse = (node: any): string => {
        if (!node) return "";
        if (node.type === "text") return node.text || "";
        if (node.type === "hardBreak") return " ";
        if (node.type === "image") {
            return [node.attrs?.alt, node.attrs?.title].filter(Boolean).join(" ");
        }
        if (Array.isArray(node.content)) {
            return node.content.map(traverse).filter(Boolean).join(" ");
        }
        return "";
    };

    return traverse(editorContent).replace(/\s+/g, " ").trim();
}

export function extractEditortextForComparison(editorContent: any): string {
    let plaintext = extractPlainTextFromEditorContent(editorContent);
    return plaintext.toLowerCase().replace(/[^a-z0-9]/g, "");
}
