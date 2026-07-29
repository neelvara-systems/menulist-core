import { resolveStorePermissionScopeDocumentIdAliases } from '@lib/permissions/scopeDocumentId';

type LocalExportScopeSource = Record<string, unknown> | null | undefined;

export function resolveLocalExportStorageScope(source: LocalExportScopeSource): string {
    const tenantScope = resolveStorePermissionScopeDocumentIdAliases([
        source?.tenantId,
        source?.tId,
    ]);
    const storeScope = resolveStorePermissionScopeDocumentIdAliases([
        source?.storeId,
        source?.sId,
    ]);
    return tenantScope && storeScope
        ? `${tenantScope.documentId}:${storeScope.documentId}`
        : '';
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
        const raw = localStorage.getItem(localPdfKey('download', storageScope, projectId));
        if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
        const value = Number(raw);
        return Number.isSafeInteger(value) && value <= Date.now() ? value : null;
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
