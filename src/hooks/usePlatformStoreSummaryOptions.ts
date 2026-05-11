'use client'

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { buildPlatformStoreSummaryOptions } from '@lib/platform/storeSummaryOptions';
import type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';

export function usePlatformStoreSummaryOptions(enabled = true) {
    const {
        platformStoreSummaryLoadedAt,
        platformStoreSummaryLoading,
        platformStoreSummaryOptions,
        setPlatformStoreSummaryLoadedAt,
        setPlatformStoreSummaryLoading,
        setPlatformStoreSummaryOptions,
    } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const [selectedStoreId, setSelectedStoreId] = useState<string>();

    const loadStores = useCallback(async (force = false) => {
        if (!enabled) return;
        if (!force && platformStoreSummaryLoadedAt) return;
        if (!force && platformStoreSummaryLoading) return;

        setPlatformStoreSummaryLoading(true);
        try {
            const summarySnap = await getDoc(doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary'));
            const summary = summarySnap.exists() ? summarySnap.data() : null;
            const nextStores = buildPlatformStoreSummaryOptions(summary);
            setPlatformStoreSummaryOptions(nextStores);
            setPlatformStoreSummaryLoadedAt(Date.now());
            setSelectedStoreId((current) => {
                if (current && nextStores.some((store) => store.sId === current)) return current;
                return nextStores[0]?.sId;
            });
        } finally {
            setPlatformStoreSummaryLoading(false);
        }
    }, [
        enabled,
        platformStoreSummaryLoadedAt,
        platformStoreSummaryLoading,
        setPlatformStoreSummaryLoadedAt,
        setPlatformStoreSummaryLoading,
        setPlatformStoreSummaryOptions,
    ]);

    useEffect(() => {
        void loadStores();
    }, [loadStores]);

    useEffect(() => {
        if (selectedStoreId && platformStoreSummaryOptions.some((store) => store.sId === selectedStoreId)) return;
        setSelectedStoreId(platformStoreSummaryOptions[0]?.sId);
    }, [platformStoreSummaryOptions, selectedStoreId]);

    const selectedStore = useMemo(
        () => platformStoreSummaryOptions.find((store: PlatformStoreSummaryOption) => store.sId === selectedStoreId),
        [platformStoreSummaryOptions, selectedStoreId],
    );

    const selectOptions = useMemo(
        () => platformStoreSummaryOptions.map((store: PlatformStoreSummaryOption) => ({ label: store.label, value: store.sId })),
        [platformStoreSummaryOptions],
    );

    return {
        loading: platformStoreSummaryLoading,
        loadStores,
        selectedStore,
        selectedStoreId,
        selectOptions,
        setSelectedStoreId,
        stores: platformStoreSummaryOptions,
    };
}
