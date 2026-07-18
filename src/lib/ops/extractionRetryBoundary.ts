import {
    MENU_EXTRACTION_DESTINATION_TYPES,
    MENU_EXTRACTION_JOB_LIMITS,
    MENU_EXTRACTION_SOURCES,
    MENU_LINK_IMPORT_MIME_TYPES,
    OWNER_MENU_UPLOAD_MIME_TYPES,
} from '@data/shared/menuExtractionJob';
import { normalizeMenuExtractionProjectId } from '@lib/menu-extraction/projectIdBoundary';

type UnknownRecord = Record<string, unknown>;
const MENU_LINK_IMPORT_MIME_TYPE_SET = new Set<string>(MENU_LINK_IMPORT_MIME_TYPES);
const OWNER_UPLOAD_MIME_TYPE_SET = new Set<string>(OWNER_MENU_UPLOAD_MIME_TYPES);

export type PlatformExtractionRetrySource = {
    action: string;
    businessCategory?: string;
    businessType?: string;
    files: Array<{ uid: string; name: string; size: number; type: string; url: string }>;
    forceReview: boolean;
    jobMode: 'SINGLE_STORE' | 'MASTER_PROJECT' | 'OUTLET_LINKED';
    projectId: string;
    retryCount: number;
    sId: string;
    source: 'menu_link_import' | 'owner_upload';
    tId: string;
    targetLanguages: Array<{ code: string; name: string }>;
    uId: string;
};

function isRecord(value: unknown): value is UnknownRecord {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cleanString(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeRetryFile(value: unknown): PlatformExtractionRetrySource['files'][number] | null {
    if (!isRecord(value)) return null;
    const uid = cleanString(value.uid, 120);
    const name = cleanString(value.name, 240);
    const type = cleanString(value.type, 120);
    const url = cleanString(value.url, 4000);
    const size = typeof value.size === 'number'
        && Number.isFinite(value.size)
        && value.size >= 0
        && value.size <= MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES
        ? value.size
        : null;
    if (!uid || !name || !type || !url || size === null) return null;
    return { uid, name, size, type, url };
}

function normalizeTargetLanguage(value: unknown): { code: string; name: string } | null {
    if (!isRecord(value)) return null;
    const code = cleanString(value.code, 16).toLowerCase();
    const name = cleanString(value.name, 80);
    return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(code) && name ? { code, name } : null;
}

export function normalizePlatformExtractionRetrySource(raw: unknown): PlatformExtractionRetrySource | null {
    if (!isRecord(raw) || raw.status !== 'failed' || getRetryable(raw.error) === false) return null;
    if (raw.skipProjectSave === true) return null;
    const destination = isRecord(raw.destination) ? raw.destination : {};
    const destinationType = raw.destinationType ?? destination.type;
    if (destinationType !== undefined && destinationType !== MENU_EXTRACTION_DESTINATION_TYPES.PROJECT) return null;

    const projectId = normalizeMenuExtractionProjectId(raw.projectId);
    const tId = cleanString(raw.tId, 160);
    const sId = cleanString(raw.sId, 160);
    const uId = cleanString(raw.uId, 160);
    const retryCount = raw.retryCount === undefined
        ? 0
        : typeof raw.retryCount === 'number' && Number.isInteger(raw.retryCount) && raw.retryCount >= 0
            ? raw.retryCount
            : null;
    const source = raw.source === undefined || raw.source === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD
        ? MENU_EXTRACTION_SOURCES.OWNER_UPLOAD
        : raw.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
            ? MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
            : null;
    if (!projectId || !tId || !sId || !uId || retryCount === null || retryCount >= 3 || !source) return null;
    if (!projectId.startsWith(`${tId}-`) || !projectId.endsWith(`-${sId}`)) return null;

    const rawFiles = Array.isArray(raw.files) ? raw.files : [];
    if (!rawFiles.length || rawFiles.length > MENU_EXTRACTION_JOB_LIMITS.MAX_FILES) return null;
    const files = rawFiles.map(normalizeRetryFile);
    if (files.some((file) => file === null)) return null;
    const uniqueUids = new Set(files.map((file) => file?.uid));
    if (uniqueUids.size !== files.length) return null;
    const mimeTypesAllowed = files.every((file) => file && (
        source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
            ? MENU_LINK_IMPORT_MIME_TYPE_SET.has(file.type)
            : OWNER_UPLOAD_MIME_TYPE_SET.has(file.type)
    ));
    if (!mimeTypesAllowed) return null;

    const rawLanguages = Array.isArray(raw.targetLanguages) ? raw.targetLanguages : [];
    if (!rawLanguages.length || rawLanguages.length > 12) return null;
    const targetLanguages = rawLanguages.map(normalizeTargetLanguage).filter((value): value is { code: string; name: string } => value !== null);
    if (!targetLanguages.length || targetLanguages.length !== rawLanguages.length) return null;
    if (new Set(targetLanguages.map((language) => language.code)).size !== targetLanguages.length) return null;

    const jobMode = raw.jobMode === 'MASTER_PROJECT' || raw.jobMode === 'OUTLET_LINKED'
        ? raw.jobMode
        : 'SINGLE_STORE';
    const businessCategory = cleanString(raw.businessCategory, 80) || undefined;
    const businessType = cleanString(raw.businessType, 80) || undefined;

    return {
        action: cleanString(raw.action, 80) || 'IMAGE_PROCESSING',
        ...(businessCategory ? { businessCategory } : {}),
        ...(businessType ? { businessType } : {}),
        files: files as PlatformExtractionRetrySource['files'],
        forceReview: raw.forceReview === true,
        jobMode,
        projectId,
        retryCount,
        sId,
        source,
        tId,
        targetLanguages,
        uId,
    };
}

function getRetryable(value: unknown): boolean | null {
    return isRecord(value) && typeof value.retryable === 'boolean' ? value.retryable : null;
}

export function isPlatformExtractionRetryFileUrlAllowed(
    urlValue: string,
    source: PlatformExtractionRetrySource['source'],
    scope: Pick<PlatformExtractionRetrySource, 'projectId' | 'sId' | 'tId'>,
    allowLocalDevelopment = false,
): boolean {
    try {
        const url = new URL(urlValue);
        if (allowLocalDevelopment && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true;

        let storagePath = '';
        if (url.hostname === 'firebasestorage.googleapis.com') {
            const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/([^?]+)$/);
            storagePath = match?.[1] ? decodeURIComponent(match[1]) : '';
        } else if (url.hostname === 'storage.googleapis.com') {
            const parts = url.pathname.split('/').filter(Boolean);
            storagePath = parts.length >= 2 ? decodeURIComponent(parts.slice(1).join('/')) : '';
        }
        if (!storagePath) return false;

        return source === 'menu_link_import'
            ? storagePath.startsWith(`menuLinkImports/${scope.tId}/${scope.sId}/${scope.projectId}/`)
            : storagePath.startsWith(`projects/files/${scope.tId}/${scope.sId}/`);
    } catch {
        return false;
    }
}
