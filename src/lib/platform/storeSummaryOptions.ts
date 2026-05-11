import { parseSummaryStores } from '@lib/firestore/parseSummaryStores';

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
        .map(([sId, data]: [string, any]) => {
            const tId = data?.tId != null ? String(data.tId) : '';
            const option: PlatformStoreSummaryOption = {
                key: sId,
                label: '',
                sId,
                tId,
                name: data?.name || '',
                tenantName: data?.tenantName || '',
                active: data?.active,
                city: data?.city || '',
                businessType: data?.businessType || '',
            };
            option.label = buildStoreLabel(option);
            return option;
        })
        .filter((store) => store.tId)
        .sort((a, b) => {
            const tenantCompare = (a.tenantName || '').localeCompare(b.tenantName || '');
            if (tenantCompare !== 0) return tenantCompare;
            return (a.name || a.sId).localeCompare(b.name || b.sId);
        });
}
