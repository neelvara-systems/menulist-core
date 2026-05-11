'use client'

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { parseSummaryStores } from '@lib/firestore/parseSummaryStores';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

export function usePlatformStoreSummaryOptions(enabled = true) {
    const [stores, setStores] = useState<PlatformStoreSummaryOption[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string>();
    const [loading, setLoading] = useState(false);

    const loadStores = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        try {
            const summarySnap = await getDoc(doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary'));
            const summary = summarySnap.exists() ? summarySnap.data() : null;
            const parsedStores = parseSummaryStores(summary);
            const nextStores = Object.entries(parsedStores)
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

            setStores(nextStores);
            setSelectedStoreId((current) => {
                if (current && nextStores.some((store) => store.sId === current)) return current;
                return nextStores[0]?.sId;
            });
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        void loadStores();
    }, [loadStores]);

    const selectedStore = useMemo(
        () => stores.find((store) => store.sId === selectedStoreId),
        [selectedStoreId, stores],
    );

    const selectOptions = useMemo(
        () => stores.map((store) => ({ label: store.label, value: store.sId })),
        [stores],
    );

    return {
        loading,
        loadStores,
        selectedStore,
        selectedStoreId,
        selectOptions,
        setSelectedStoreId,
        stores,
    };
}
