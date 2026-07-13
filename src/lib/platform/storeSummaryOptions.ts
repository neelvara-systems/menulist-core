import { parseSummaryStores } from '@lib/firestore/parseSummaryStores';
import { normalizeMultiOutletNumericDocumentId } from '@lib/multiOutlet/projectIdBoundary';

export interface PlatformStoreSummaryOption {
    key: string;
    label: string;
    sId: string;
    tId: string;
    name: string;
    tenantName?: string;
    active?: boolean;
    city?: string;
    businessType?: string;
}

function buildStoreLabel(store: PlatformStoreSummaryOption): string {
    const name = store.name || `Store ${store.sId}`;
    const tenant = store.tenantName ? ` · ${store.tenantName}` : '';
    const city = store.city ? ` · ${store.city}` : '';
    const status = store.active === false ? ' · inactive' : '';
    return `${name}${tenant}${city} · T${store.tId} / S${store.sId}${status}`;
}

export function buildPlatformStoreSummaryOptions(summary: unknown): PlatformStoreSummaryOption[] {
    const parsedStores = parseSummaryStores(summary);

    return Object.entries(parsedStores)
        .map(([sId, data]) => {
            const storeScope = normalizeMultiOutletNumericDocumentId(sId);
            const tenantScope = normalizeMultiOutletNumericDocumentId(data.tId);
            if (!storeScope || !tenantScope) return null;
            const option: PlatformStoreSummaryOption = {
                key: storeScope.documentId,
                label: '',
                sId: storeScope.documentId,
                tId: tenantScope.documentId,
                name: typeof data.name === 'string' ? data.name : '',
                tenantName: typeof data.tenantName === 'string' ? data.tenantName : '',
                active: typeof data.active === 'boolean' ? data.active : undefined,
                city: typeof data.city === 'string' ? data.city : '',
                businessType: typeof data.businessType === 'string' ? data.businessType : '',
            };
            option.label = buildStoreLabel(option);
            return option;
        })
        .filter((store): store is PlatformStoreSummaryOption => Boolean(store))
        .sort((a, b) => {
            const tenantCompare = (a.tenantName || '').localeCompare(b.tenantName || '');
            if (tenantCompare !== 0) return tenantCompare;
            return (a.name || a.sId).localeCompare(b.name || b.sId);
        });
}
