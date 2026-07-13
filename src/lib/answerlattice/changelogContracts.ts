import { CHANGELOG_TAG_OPTIONS } from '@constant/changelog';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type { ChangelogEntry, ChangelogPage } from '@type/changelog';
import type { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export const ANSWERLATTICE_CHANGELOG_PAGE_MAX_BYTES = 900_000;
export const ANSWERLATTICE_CHANGELOG_PAGE_MAX_ENTRIES = 100;
export const ANSWERLATTICE_CHANGELOG_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ANSWERLATTICE_CHANGELOG_MAX_FILES = 4;

const documentIdSchema = z.string().trim().min(1).max(180).refine(isValidFirestoreDocumentId);
const requestIdSchema = z.string().trim().min(8).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const boundedString = (max: number) => z.string().transform((value) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).pipe(z.string().min(1).max(max));
const uniqueStrings = (maxItems: number, maxLength: number) => z.array(boundedString(maxLength)).max(maxItems).superRefine((values, context) => {
    if (new Set(values).size !== values.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Values must be unique' });
});

const tiptapDocumentSchema = z.unknown().superRefine((value, context) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Description must be a rich-text document' });
        return;
    }
    try {
        if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 512 * 1024) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: 'Description is too large' });
        }
    } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Description is invalid' });
    }
});

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const fileSchema = z.object({
    name: boundedString(240),
    size: z.number().int().nonnegative().max(ANSWERLATTICE_CHANGELOG_MAX_FILE_BYTES),
    type: z.string().trim().refine((value) => allowedImageTypes.has(value.toLowerCase())),
    url: z.string().url().max(2_000).refine((value) => value.startsWith('https://')),
    uid: boundedString(180),
}).strict();

const kbSourceSchema = z.object({
    categoryId: documentIdSchema,
    sectionId: documentIdSchema.optional(),
    articleId: documentIdSchema.optional(),
}).strict();

const youtubeUrlSchema = z.string().url().max(2_000).refine((value) => {
    try {
        const host = new URL(value).hostname.toLowerCase();
        return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
    } catch {
        return false;
    }
});

const changelogEntrySchema = z.object({
    title: boundedString(300),
    description: tiptapDocumentSchema,
    tags: z.array(z.enum(CHANGELOG_TAG_OPTIONS as [string, ...string[]])).max(20).default([]),
    releasedOn: z.string().datetime({ offset: true }),
    published: z.boolean(),
    version: z.string().trim().min(1).max(64).nullable(),
    contextKeys: uniqueStrings(30, 180).default([]),
    kbSources: z.array(kbSourceSchema).max(50).default([]),
    youtubeLinks: z.array(youtubeUrlSchema).max(20).default([]),
    files: z.array(fileSchema).max(ANSWERLATTICE_CHANGELOG_MAX_FILES).default([]),
    entityChanges: z.array(documentIdSchema).max(25).superRefine((values, context) => {
        if (new Set(values).size !== values.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Changed entities must be unique' });
    }).default([]),
    releaseId: documentIdSchema.nullable().optional(),
}).strict().superRefine((value, context) => {
    if (value.published && value.version && value.entityChanges.length === 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['entityChanges'], message: 'Published versioned entries require changed entities' });
    }
});

export const AnswerlatticeChangelogActionSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('create'), requestId: requestIdSchema, entry: changelogEntrySchema }).strict(),
    z.object({ action: z.literal('update'), requestId: requestIdSchema, entryId: documentIdSchema, entry: changelogEntrySchema }).strict(),
    z.object({ action: z.literal('delete'), requestId: requestIdSchema, entryId: documentIdSchema }).strict(),
]);

export type AnswerlatticeChangelogEntryInput = {
    title: string;
    description: unknown;
    tags: string[];
    releasedOn: string;
    published: boolean;
    version: string | null;
    contextKeys: string[];
    kbSources: Array<{ categoryId: string; sectionId?: string; articleId?: string }>;
    youtubeLinks: string[];
    files: Array<{ name: string; size: number; type: string; url: string; uid: string }>;
    entityChanges: string[];
    releaseId?: string | null;
};

export type AnswerlatticeChangelogAction =
    | { action: 'create'; requestId: string; entry: AnswerlatticeChangelogEntryInput }
    | { action: 'update'; requestId: string; entryId: string; entry: AnswerlatticeChangelogEntryInput }
    | { action: 'delete'; requestId: string; entryId: string };

export const parseAnswerlatticeChangelogAction = (value: unknown): AnswerlatticeChangelogAction | null => {
    const parsed = AnswerlatticeChangelogActionSchema.safeParse(value);
    if (!parsed.success) return null;
    const data = parsed.data as Record<string, any>;
    if (data.action === 'delete' && typeof data.requestId === 'string' && typeof data.entryId === 'string') {
        return { action: 'delete', requestId: data.requestId, entryId: data.entryId };
    }
    if ((data.action === 'create' || data.action === 'update') && data.entry && typeof data.requestId === 'string') {
        const entry = data.entry as AnswerlatticeChangelogEntryInput;
        return data.action === 'create'
            ? { action: 'create', requestId: data.requestId, entry }
            : typeof data.entryId === 'string'
                ? { action: 'update', requestId: data.requestId, entryId: data.entryId, entry }
                : null;
    }
    return null;
};

export const AnswerlatticeChangelogActionResultSchema = z.object({
    success: z.literal(true),
    action: z.enum(['create', 'update', 'delete']),
    entryId: documentIdSchema,
    pageId: documentIdSchema,
    replayed: z.boolean(),
    removedFileUrls: z.array(z.string().url().max(2_000)).max(ANSWERLATTICE_CHANGELOG_MAX_FILES),
}).strict();

const toIsoTimestamp = (value: unknown): string | null => {
    if (!value || typeof value !== 'object' || typeof (value as { toDate?: unknown }).toDate !== 'function') return null;
    try {
        const date = (value as { toDate(): Date }).toDate();
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const normalizeStoredTimestamp = (value: unknown): Timestamp | null => {
    if (!value || typeof value !== 'object') return null;
    const timestamp = value as { toDate?: unknown; toMillis?: unknown };
    if (typeof timestamp.toDate !== 'function' || typeof timestamp.toMillis !== 'function') return null;
    try {
        const date = timestamp.toDate() as Date;
        const millis = timestamp.toMillis() as number;
        return date instanceof Date && Number.isFinite(date.getTime()) && Number.isFinite(millis)
            ? value as Timestamp
            : null;
    } catch {
        return null;
    }
};

const normalizeStoredEntry = (value: unknown): ChangelogEntry | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const releasedOnTimestamp = normalizeStoredTimestamp(record.releasedOn);
    const releasedOn = releasedOnTimestamp ? toIsoTimestamp(releasedOnTimestamp) : null;
    const entry = releasedOn ? changelogEntrySchema.safeParse({
        title: record.title,
        description: record.description,
        tags: record.tags ?? [],
        releasedOn,
        published: record.published === true,
        version: record.version ?? null,
        contextKeys: record.contextKeys ?? [],
        kbSources: record.kbSources ?? [],
        youtubeLinks: record.youtubeLinks ?? [],
        files: record.files ?? [],
        entityChanges: record.entityChanges ?? [],
        releaseId: record.releaseId ?? null,
    }) : null;
    const id = documentIdSchema.safeParse(record.id);
    const likes = record.likes === undefined ? 0 : record.likes;
    const dislikes = record.dislikes === undefined ? 0 : record.dislikes;
    if (!entry?.success
        || !id.success
        || typeof likes !== 'number'
        || !Number.isSafeInteger(likes)
        || likes < 0
        || typeof dislikes !== 'number'
        || !Number.isSafeInteger(dislikes)
        || dislikes < 0) return null;
    const createdOn = record.createdOn === undefined
        ? releasedOnTimestamp
        : normalizeStoredTimestamp(record.createdOn);
    const modifiedOn = record.modifiedOn === undefined || record.modifiedOn === null
        ? null
        : normalizeStoredTimestamp(record.modifiedOn);
    const kbSources = entry.data.kbSources.flatMap((source) => (
        typeof source.categoryId === 'string'
            ? [{
                categoryId: source.categoryId,
                ...(typeof source.sectionId === 'string' ? { sectionId: source.sectionId } : {}),
                ...(typeof source.articleId === 'string' ? { articleId: source.articleId } : {}),
            }]
            : []
    ));
    if (!releasedOnTimestamp || !createdOn || kbSources.length !== entry.data.kbSources.length) return null;
    return {
        id: id.data,
        title: entry.data.title,
        description: entry.data.description,
        tags: entry.data.tags,
        releasedOn: releasedOnTimestamp,
        createdOn,
        createdBy: typeof record.createdBy === 'string' ? record.createdBy.slice(0, 200) : 'Unknown',
        modifiedOn,
        modifiedBy: typeof record.modifiedBy === 'string' ? record.modifiedBy.slice(0, 200) : null,
        published: entry.data.published,
        version: entry.data.version || undefined,
        likes,
        dislikes,
        files: entry.data.files,
        kbSources,
        contextKeys: entry.data.contextKeys,
        youtubeLinks: entry.data.youtubeLinks,
        entityChanges: entry.data.entityChanges,
        releaseId: entry.data.releaseId || undefined,
    };
};

export const normalizeAnswerlatticeStoredChangelogPage = (
    value: unknown,
    documentId: unknown,
    scope: { tId: number; sId: number },
): ChangelogPage | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const id = documentIdSchema.safeParse(documentId);
    const pageNumber = typeof record.pageNumber === 'number' ? record.pageNumber : Number.NaN;
    const entries = Array.isArray(record.entries) ? record.entries.map(normalizeStoredEntry) : [];
    const entryIds = Array.isArray(record.entryIds) ? record.entryIds : [];
    if (!id.success
        || record.pId !== 'AL'
        || record.tId !== scope.tId
        || record.sId !== scope.sId
        || !Number.isSafeInteger(pageNumber)
        || pageNumber <= 0
        || entries.some((entry) => !entry)
        || entries.length > ANSWERLATTICE_CHANGELOG_PAGE_MAX_ENTRIES
        || entryIds.length !== entries.length
        || entryIds.some((entryId, index) => entryId !== entries[index]?.id)) {
        return null;
    }
    const nextPageId = record.nextPageId === null
        ? null
        : documentIdSchema.safeParse(record.nextPageId);
    if (nextPageId !== null && !nextPageId.success) return null;
    const createdOn = normalizeStoredTimestamp(record.createdOn ?? record.modifiedOn);
    const modifiedOn = normalizeStoredTimestamp(record.modifiedOn ?? record.createdOn);
    if (!createdOn || !modifiedOn) return null;
    return {
        id: id.data,
        pageNumber,
        nextPageId: nextPageId === null ? null : nextPageId.data,
        entries: entries.filter((entry): entry is ChangelogEntry => Boolean(entry)),
        entryIds: entries.map((entry) => entry!.id),
        approxSizeBytes: Number.isSafeInteger(record.approxSizeBytes) && Number(record.approxSizeBytes) >= 0
            ? Number(record.approxSizeBytes)
            : undefined,
        createdOn,
        createdBy: typeof record.createdBy === 'string' ? record.createdBy.slice(0, 200) : 'Unknown',
        modifiedOn,
        modifiedBy: typeof record.modifiedBy === 'string' ? record.modifiedBy.slice(0, 200) : 'Unknown',
    };
};
