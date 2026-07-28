const MAX_TIPTAP_DEPTH = 100;
const MAX_TIPTAP_NODES = 10_000;

type JsonRecord = Record<string, unknown>;

export type TiptapProvenance = Readonly<{
    sourceFile: string;
    timestamp?: number | string;
}>;

const asRecord = (value: unknown): JsonRecord | null => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as JsonRecord
        : null
);

export const tiptapToText = (node: unknown): string => {
    let visitedNodes = 0;

    const visit = (value: unknown, depth: number): string => {
        if (depth > MAX_TIPTAP_DEPTH || visitedNodes >= MAX_TIPTAP_NODES) return '';
        const candidate = asRecord(value);
        if (!candidate) return '';
        visitedNodes += 1;

        if (candidate.type === 'text') {
            return typeof candidate.text === 'string' ? candidate.text : '';
        }
        if (!Array.isArray(candidate.content)) return '';
        return candidate.content
            .map(child => visit(child, depth + 1))
            .join(candidate.type !== 'doc' ? ' ' : '');
    };

    return visit(node, 0);
};

const normalizeProvenance = (value: unknown): TiptapProvenance | null => {
    const candidate = asRecord(value);
    const sourceFile = typeof candidate?.sourceFile === 'string'
        ? candidate.sourceFile.trim().slice(0, 2_048)
        : '';
    if (!sourceFile) return null;

    const rawTimestamp = candidate?.timestamp;
    const timestamp = typeof rawTimestamp === 'string'
        ? rawTimestamp.trim().slice(0, 128)
        : (typeof rawTimestamp === 'number' && Number.isFinite(rawTimestamp) ? rawTimestamp : undefined);
    return timestamp === undefined || timestamp === ''
        ? { sourceFile }
        : { sourceFile, timestamp };
};

export const extractProvenance = (node: unknown): TiptapProvenance[] => {
    const sources: TiptapProvenance[] = [];
    const seen = new Set<string>();
    let visitedNodes = 0;

    const visit = (value: unknown, depth: number): void => {
        if (depth > MAX_TIPTAP_DEPTH || visitedNodes >= MAX_TIPTAP_NODES) return;
        const candidate = asRecord(value);
        if (!candidate) return;
        visitedNodes += 1;

        const attrs = asRecord(candidate.attrs);
        const provenance = normalizeProvenance(attrs?.provenance);
        if (provenance) {
            const key = `${provenance.sourceFile}\u0000${String(provenance.timestamp ?? '')}`;
            if (!seen.has(key)) {
                seen.add(key);
                sources.push(provenance);
            }
        }

        if (Array.isArray(candidate.content)) {
            candidate.content.forEach(child => visit(child, depth + 1));
        }
    };

    visit(node, 0);
    return sources;
};
