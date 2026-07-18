type LocalExportScopeSource = Record<string, unknown> | null | undefined;

function normalizeNumericScopePart(value: unknown): string {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const normalized = raw.trim();
    if (!normalized || normalized !== raw || !/^[1-9]\d*$/.test(normalized)) return '';
    const numeric = Number(normalized);
    return Number.isSafeInteger(numeric) && numeric > 0 && String(numeric) === normalized
        ? normalized
        : '';
}

export function resolveLocalExportStorageScope(source: LocalExportScopeSource): string {
    const tenantId = normalizeNumericScopePart(source?.tenantId ?? source?.tId);
    const storeId = normalizeNumericScopePart(source?.storeId ?? source?.sId);
    return tenantId && storeId ? `${tenantId}:${storeId}` : '';
}

function localPdfKey(
    kind: 'download' | 'version',
    storageScope: string,
    projectId: string,
): string {
    return `menulist_last_pdf_${kind}_${encodeURIComponent(storageScope)}_${encodeURIComponent(projectId)}`;
}

export function readLocalPdfDownloadAt(
    storageScope: string,
    projectId: string,
): number | null {
    if (typeof window === 'undefined' || !storageScope || !projectId) return null;
    try {
        const value = Number(localStorage.getItem(localPdfKey('download', storageScope, projectId)));
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

export function recordLocalPdfDownload(
    storageScope: string,
    projectId: string,
    sourceHash?: string | null,
): void {
    if (typeof window === 'undefined' || !storageScope || !projectId) return;
    try {
        localStorage.setItem(
            localPdfKey('download', storageScope, projectId),
            Date.now().toString(),
        );
        if (sourceHash) {
            localStorage.setItem(
                localPdfKey('version', storageScope, projectId),
                sourceHash,
            );
        }
    } catch {
        // The PDF was already delivered. Freshness markers are device-local and
        // best-effort, so storage rejection must not become a download failure.
    }
}
