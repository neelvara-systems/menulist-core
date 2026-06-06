import type { PrintableAssetTypeId, PrintableTemplateFamilyId } from './types';

export const PRINTABLE_ASSETS_ROUTE = '/assets';

export function buildPrintableAssetsUrl(
    projectId?: string | null,
    assetTypeId?: PrintableAssetTypeId,
    templateFamilyId?: PrintableTemplateFamilyId,
): string {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (assetTypeId) params.set('asset', assetTypeId);
    if (templateFamilyId) params.set('template', templateFamilyId);
    const query = params.toString();
    return query ? `${PRINTABLE_ASSETS_ROUTE}?${query}` : PRINTABLE_ASSETS_ROUTE;
}
