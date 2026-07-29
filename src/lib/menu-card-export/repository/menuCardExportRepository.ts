import type { MenuCardGeneratedArtifact, MenuCardLocalHistoryRecord } from '../models/exportTypes';

const HISTORY_PREFIX = 'menulist_menu_card_exports_';
const MAX_HISTORY = 20;
const MAX_HISTORY_TEXT_LENGTH = 240;
const MAX_HISTORY_PAGE_COUNT = 1000;
const MENU_CARD_EXPORT_PRESETS = new Set<MenuCardLocalHistoryRecord['preset']>([
    'home_print',
    'whatsapp',
    'print_shop_packet',
    'table_menu',
    'takeaway_insert',
    'staff_reference',
    'multi_location_batch',
    'page_images',
    'qr_insert',
]);

function key(projectId: string, storageScope: string): string {
    return `${HISTORY_PREFIX}${encodeURIComponent(storageScope)}_${encodeURIComponent(projectId)}`;
}

const isBoundedHistoryText = (value: unknown): value is string => (
    typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_HISTORY_TEXT_LENGTH
);

const isCanonicalPastIsoTimestamp = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length > 40) return false;
    const millis = Date.parse(value);
    return Number.isFinite(millis)
        && millis <= Date.now()
        && new Date(millis).toISOString() === value;
};

export function projectMenuCardLocalHistoryRecord(value: unknown): MenuCardLocalHistoryRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Partial<MenuCardLocalHistoryRecord>;
    return isBoundedHistoryText(record.id)
        && isBoundedHistoryText(record.projectId)
        && isBoundedHistoryText(record.projectName)
        && isBoundedHistoryText(record.storeName)
        && MENU_CARD_EXPORT_PRESETS.has(record.preset as MenuCardLocalHistoryRecord['preset'])
        && isBoundedHistoryText(record.styleId)
        && typeof record.pageCount === 'number'
        && Number.isSafeInteger(record.pageCount)
        && record.pageCount > 0
        && record.pageCount <= MAX_HISTORY_PAGE_COUNT
        && isBoundedHistoryText(record.sourceHash)
        && isBoundedHistoryText(record.fileName)
        && isCanonicalPastIsoTimestamp(record.generatedAt)
        ? {
            id: record.id,
            projectId: record.projectId,
            projectName: record.projectName,
            storeName: record.storeName,
            preset: record.preset as MenuCardLocalHistoryRecord['preset'],
            styleId: record.styleId,
            pageCount: record.pageCount,
            sourceHash: record.sourceHash,
            fileName: record.fileName,
            generatedAt: record.generatedAt,
        }
        : null;
}

export function listLocalMenuCardExports(
    projectId: string,
    storageScope: string,
): MenuCardLocalHistoryRecord[] {
    if (typeof window === 'undefined' || !projectId || !storageScope) return [];
    try {
        const raw = localStorage.getItem(key(projectId, storageScope));
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed) || parsed.length > MAX_HISTORY) {
            localStorage.removeItem(key(projectId, storageScope));
            return [];
        }
        const projected = parsed.map(projectMenuCardLocalHistoryRecord);
        if (projected.some((record) => !record || record.projectId !== projectId)) {
            localStorage.removeItem(key(projectId, storageScope));
            return [];
        }
        return projected as MenuCardLocalHistoryRecord[];
    } catch {
        try {
            localStorage.removeItem(key(projectId, storageScope));
        } catch {
            // Browser storage can be unavailable in privacy/quota-constrained contexts.
        }
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
    artifact: Pick<MenuCardGeneratedArtifact, 'filename' | 'pageCount' | 'sourceHash'>;
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
    const projectedRecord = projectMenuCardLocalHistoryRecord(record);
    if (!projectedRecord) {
        return listLocalMenuCardExports(params.projectId, params.storageScope);
    }

    const next = [
        projectedRecord,
        ...listLocalMenuCardExports(params.projectId, params.storageScope)
            .filter((item) => item.sourceHash !== projectedRecord.sourceHash),
    ].slice(0, MAX_HISTORY);

    try {
        localStorage.setItem(key(params.projectId, params.storageScope), JSON.stringify(next));
    } catch {
        // The file was already delivered. Device-local history is best-effort and
        // must never turn a successful export into an owner-visible failure.
    }
    return next;
}
