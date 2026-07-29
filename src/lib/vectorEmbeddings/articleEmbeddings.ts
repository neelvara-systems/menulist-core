export const ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS = 64_000;
const ARTICLE_EDITOR_MAX_NODES = 10_000;
const ARTICLE_EDITOR_MAX_DEPTH = 64;

const safeGet = (value: object, key: PropertyKey): unknown => {
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
};

export function extractPlainTextFromEditorContent(editorContent: unknown): string {
    if (!editorContent || typeof editorContent !== "object") return "";

    const fragments: string[] = [];
    const seen = new WeakSet<object>();
    const stack: Array<{ depth: number; node: unknown }> = [{ depth: 0, node: editorContent }];
    let visitedNodes = 0;
    let collectedChars = 0;

    const append = (value: unknown) => {
        if (typeof value !== "string" || collectedChars >= ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS) return;
        const remaining = ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS - collectedChars;
        const fragment = value.slice(0, remaining);
        if (!fragment) return;
        fragments.push(fragment);
        collectedChars += fragment.length;
    };

    while (stack.length > 0 && visitedNodes < ARTICLE_EDITOR_MAX_NODES && collectedChars < ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS) {
        const current = stack.pop();
        if (!current || current.depth > ARTICLE_EDITOR_MAX_DEPTH) continue;
        const node = current.node;
        if (!node || typeof node !== "object" || seen.has(node)) continue;
        seen.add(node);
        visitedNodes += 1;

        const type = safeGet(node, "type");
        if (type === "text") {
            append(safeGet(node, "text"));
            continue;
        }
        if (type === "hardBreak") {
            append(" ");
            continue;
        }
        if (type === "image") {
            const attrs = safeGet(node, "attrs");
            if (attrs && typeof attrs === "object") {
                append(safeGet(attrs, "alt"));
                append(" ");
                append(safeGet(attrs, "title"));
            }
            continue;
        }

        const content = safeGet(node, "content");
        if (!Array.isArray(content)) continue;
        for (let index = content.length - 1; index >= 0; index -= 1) {
            stack.push({ depth: current.depth + 1, node: content[index] });
        }
    }

    return fragments.join(" ").replace(/\s+/g, " ").trim().slice(0, ARTICLE_EDITOR_PLAIN_TEXT_MAX_CHARS);
}

export function extractEditortextForComparison(editorContent: unknown): string {
    const plaintext = extractPlainTextFromEditorContent(editorContent);
    return plaintext.toLowerCase().replace(/[^a-z0-9]/g, "");
}
