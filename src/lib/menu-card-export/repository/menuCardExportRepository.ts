import type { MenuCardGeneratedArtifact, MenuCardLocalHistoryRecord } from '../models/exportTypes';

const HISTORY_PREFIX = 'menulist_menu_card_exports_';
const MAX_HISTORY = 20;

function key(projectId: string, storageScope: string): string {
    return `${HISTORY_PREFIX}${encodeURIComponent(storageScope)}_${encodeURIComponent(projectId)}`;
}

function isMenuCardLocalHistoryRecord(value: unknown): value is MenuCardLocalHistoryRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Partial<MenuCardLocalHistoryRecord>;
    return typeof record.id === 'string'
        && typeof record.projectId === 'string'
        && typeof record.projectName === 'string'
        && typeof record.storeName === 'string'
        && typeof record.preset === 'string'
        && typeof record.styleId === 'string'
        && typeof record.pageCount === 'number'
        && Number.isFinite(record.pageCount)
        && typeof record.sourceHash === 'string'
        && typeof record.fileName === 'string'
        && typeof record.generatedAt === 'string';
}

export function listLocalMenuCardExports(
    projectId: string,
    storageScope: string,
): MenuCardLocalHistoryRecord[] {
    if (typeof window === 'undefined' || !projectId || !storageScope) return [];
    try {
        const raw = localStorage.getItem(key(projectId, storageScope));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed
                .filter((record) => isMenuCardLocalHistoryRecord(record) && record.projectId === projectId)
                .slice(0, MAX_HISTORY)
            : [];
    } catch {
        return [];
    }
}

export function saveLocalMenuCardExport(params: {
    projectId: string;
    projectName: string;
    storeName: string;
    preset: MenuCardLocalHistoryRecord['preset'];
    storageScope: string;
    styleId: string;
    artifact: MenuCardGeneratedArtifact;
}): MenuCardLocalHistoryRecord[] {
    if (typeof window === 'undefined' || !params.projectId || !params.storageScope) return [];

    const record: MenuCardLocalHistoryRecord = {
        id: `${Date.now()}-${params.artifact.sourceHash}`,
        projectId: params.projectId,
        projectName: params.projectName,
        storeName: params.storeName,
        preset: params.preset,
        styleId: params.styleId,
        pageCount: params.artifact.pageCount,
        sourceHash: params.artifact.sourceHash,
        fileName: params.artifact.filename,
        generatedAt: new Date().toISOString(),
    };

    const next = [
        record,
        ...listLocalMenuCardExports(params.projectId, params.storageScope)
            .filter((item) => item.sourceHash !== record.sourceHash),
    ].slice(0, MAX_HISTORY);

    try {
        localStorage.setItem(key(params.projectId, params.storageScope), JSON.stringify(next));
    } catch {
        // The file was already delivered. Device-local history is best-effort and
        // must never turn a successful export into an owner-visible failure.
    }
    return next;
}
