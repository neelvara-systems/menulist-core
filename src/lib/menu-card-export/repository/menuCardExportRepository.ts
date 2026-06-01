import type { MenuCardGeneratedArtifact, MenuCardLocalHistoryRecord } from '../models/exportTypes';

const HISTORY_PREFIX = 'menulist_menu_card_exports_';
const MAX_HISTORY = 20;

function key(projectId: string): string {
    return `${HISTORY_PREFIX}${projectId}`;
}

export function listLocalMenuCardExports(projectId: string): MenuCardLocalHistoryRecord[] {
    if (typeof window === 'undefined' || !projectId) return [];
    try {
        const raw = localStorage.getItem(key(projectId));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveLocalMenuCardExport(params: {
    projectId: string;
    projectName: string;
    storeName: string;
    preset: MenuCardLocalHistoryRecord['preset'];
    styleId: string;
    artifact: MenuCardGeneratedArtifact;
}): MenuCardLocalHistoryRecord[] {
    if (typeof window === 'undefined' || !params.projectId) return [];

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
        ...listLocalMenuCardExports(params.projectId).filter((item) => item.sourceHash !== record.sourceHash),
    ].slice(0, MAX_HISTORY);

    localStorage.setItem(key(params.projectId), JSON.stringify(next));
    return next;
}
