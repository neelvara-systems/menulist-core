const normalizeSafeSegment = (value: unknown, fallback: string, maxLength: number): string => {
    const normalized = String(value || fallback)
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLength);
    return normalized || fallback;
};

export const buildNoteAttachmentFileId = ({
    attemptId,
    index,
    label,
}: {
    attemptId: unknown;
    index: number;
    label: unknown;
}): string => {
    if (!Number.isSafeInteger(index) || index < 0) {
        throw new TypeError('invalid_note_attachment_index');
    }
    const normalizedAttemptId = normalizeSafeSegment(attemptId, '', 64);
    if (!normalizedAttemptId) throw new TypeError('invalid_note_attachment_attempt_id');
    const normalizedLabel = normalizeSafeSegment(label, 'attachment', 60);
    return `${index}-${normalizedLabel}-${normalizedAttemptId}`;
};

export const collectNoteAttachmentUrls = (note: unknown): string[] => {
    if (!note || typeof note !== 'object' || Array.isArray(note)) return [];
    const documents = (note as { documents?: unknown }).documents;
    if (!Array.isArray(documents)) return [];

    return Array.from(new Set(documents.flatMap((document) => {
        if (!document || typeof document !== 'object' || Array.isArray(document)) return [];
        const url = (document as { url?: unknown }).url;
        if (typeof url !== 'string') return [];
        const normalized = url.trim();
        if (!normalized || normalized.startsWith('data:')) return [];
        return [normalized];
    })));
};

export const getRemovedNoteAttachmentUrls = ({
    after,
    before,
}: {
    after: unknown;
    before: unknown;
}): string[] => {
    const retained = new Set(collectNoteAttachmentUrls(after));
    return collectNoteAttachmentUrls(before).filter((url) => !retained.has(url));
};

export type NoteAttachmentCommitStatus = 'all' | 'none' | 'partial';

export const getNoteAttachmentCommitStatus = (
    note: unknown,
    uploadedUrls: readonly string[],
): NoteAttachmentCommitStatus => {
    const expected = Array.from(new Set(uploadedUrls.map((url) => url.trim()).filter(Boolean)));
    if (expected.length === 0) return 'all';
    const referenced = new Set(collectNoteAttachmentUrls(note));
    const matched = expected.filter((url) => referenced.has(url)).length;
    if (matched === expected.length) return 'all';
    return matched === 0 ? 'none' : 'partial';
};
