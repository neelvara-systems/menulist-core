import { isDataUrl } from '@lib/media/mediaStorage';
import { parseStoragePath } from '@lib/storage/pathGenerator';

export const ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT = 4;
export const ANSWERLATTICE_TICKET_ATTACHMENT_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json', 'application/xml',
    'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/xml',
] as const;

const ANSWERLATTICE_TICKET_ATTACHMENT_TYPE_SET = new Set<string>(
    ANSWERLATTICE_TICKET_ATTACHMENT_TYPES,
);

const normalizeSegment = (value: unknown, fallback: string, maxLength: number): string => {
    const normalized = String(value || fallback)
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLength);
    return normalized || fallback;
};

export type SupportTicketAttachmentUpload = Readonly<{
    name: string;
    size: number;
    type: string;
    uid?: string;
    url: string;
}>;

const getDataUrlByteLength = (value: string): number | null => {
    const separatorIndex = value.indexOf(',');
    if (separatorIndex < 0) return null;
    const payload = value.slice(separatorIndex + 1);
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    const size = (payload.length * 3) / 4 - padding;
    return Number.isSafeInteger(size) && size >= 0 ? size : null;
};

export const parseSupportTicketAttachmentUpload = (value: unknown): SupportTicketAttachmentUpload => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('answerlattice_ticket_attachment_invalid');
    }
    const attachment = value as Record<string, unknown>;
    const name = typeof attachment.name === 'string' ? attachment.name.trim() : '';
    const type = typeof attachment.type === 'string' ? attachment.type.trim().toLowerCase() : '';
    const size = attachment.size;
    const url = attachment.url;
    const uid = attachment.uid;
    if (
        !name
        || name.length > 300
        || !type
        || type.length > 120
        || !ANSWERLATTICE_TICKET_ATTACHMENT_TYPE_SET.has(type)
        || typeof size !== 'number'
        || !Number.isFinite(size)
        || size < 0
        || size > ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES
        || !isDataUrl(url)
        || !url.toLowerCase().startsWith(`data:${type};base64,`)
        || getDataUrlByteLength(url) !== size
        || (uid !== undefined && (typeof uid !== 'string' || uid.length > 180))
    ) {
        throw new TypeError('answerlattice_ticket_attachment_invalid');
    }
    return {
        name,
        size,
        type,
        url,
        ...(typeof uid === 'string' && uid ? { uid } : {}),
    };
};

export const isSupportTicketAttachmentStoragePath = ({
    collection,
    fileType,
    path,
    sId,
    tId,
}: {
    collection: string;
    fileType?: 'documents' | 'messages';
    path: string;
    sId: number | string;
    tId: number | string;
}): boolean => {
    const parsed = parseStoragePath(path);
    return Boolean(
        parsed
        && parsed.collection === collection
        && (fileType ? parsed.fileType === fileType : (parsed.fileType === 'documents' || parsed.fileType === 'messages'))
        && parsed.tId === String(tId)
        && parsed.sId === String(sId)
    );
};

const normalizeStorageBucket = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const bucket = value.trim().toLowerCase().replace(/^gs:\/\//, '').replace(/\/$/, '');
    return bucket && /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket) ? bucket : null;
};

export const getSupportTicketAttachmentDownloadUrl = ({
    bucket,
    collection,
    sId,
    tId,
    url,
}: {
    bucket: unknown;
    collection: string;
    sId: number | string;
    tId: number | string;
    url: unknown;
}): string | null => {
    if (typeof url !== 'string' || url.length === 0 || url.length > 2_000 || url.trim() !== url) {
        return null;
    }
    const expectedBucket = normalizeStorageBucket(bucket);
    if (!expectedBucket) return null;

    try {
        const parsedUrl = new URL(url);
        if (
            parsedUrl.protocol !== 'https:'
            || parsedUrl.hostname !== 'firebasestorage.googleapis.com'
            || parsedUrl.username
            || parsedUrl.password
            || parsedUrl.port
            || parsedUrl.searchParams.get('alt') !== 'media'
        ) {
            return null;
        }
        const match = parsedUrl.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        if (!match) return null;
        const urlBucket = normalizeStorageBucket(decodeURIComponent(match[1]));
        const storagePath = decodeURIComponent(match[2]);
        if (urlBucket !== expectedBucket || !isSupportTicketAttachmentStoragePath({
            collection,
            path: storagePath,
            tId,
            sId,
        })) {
            return null;
        }
        return parsedUrl.toString();
    } catch {
        return null;
    }
};

export const buildSupportTicketAttachmentFileId = ({
    attemptId,
    stableId,
    uid,
}: {
    attemptId: unknown;
    stableId?: unknown;
    uid?: unknown;
}): string => {
    const attempt = normalizeSegment(attemptId, '', 64);
    if (!attempt) throw new TypeError('answerlattice_ticket_attachment_attempt_id_invalid');
    const stable = normalizeSegment(stableId, 'ticket', 100);
    const file = normalizeSegment(uid, 'file', 80);
    return `${stable}-${file}-${attempt}`.slice(0, 260);
};
