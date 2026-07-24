'use client'

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { assertCurrentPlatformAccess } from '@lib/auth/currentPlatformAccessClient';
import { logOpsFailure } from '@lib/ops/opsDiagnostics';
import { buildPlatformStoreSummaryOptions } from '@lib/platform/storeSummaryOptions';
import type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { doc, getDoc } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';

let latestPlatformStoreSummaryRequestId = 0;

export function usePlatformStoreSummaryOptions(enabled = true) {
    const { data: session } = useSession();
    const {
        platformStoreSummaryLoadedAt,
        platformStoreSummaryLoading,
        platformStoreSummaryOptions,
        setPlatformStoreSummaryLoadedAt,
        setPlatformStoreSummaryLoading,
        setPlatformStoreSummaryOptions,
    } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const [selectedStoreId, setSelectedStoreId] = useState<string>();
    const [loadError, setLoadError] = useState(false);
    const [admittedAccessIdentity, setAdmittedAccessIdentity] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const enabledRef = useRef(enabled);
    const accessIdentityRef = useRef<string | null>(null);
    enabledRef.current = enabled;
    const platformRole = session?.platformRole || session?.user.platformRole;
    const sessionUserId = session?.uId || session?.user.id;
    const accessIdentity = platformRole === 'PLATFORM' && typeof sessionUserId === 'string'
        ? sessionUserId
        : null;
    accessIdentityRef.current = accessIdentity;
    const hasCurrentAccessAdmission = Boolean(
        enabled
        && accessIdentity
        && admittedAccessIdentity === accessIdentity,
    );

    const loadStores = useCallback(async (force = false) => {
        if (!enabled || !accessIdentity) return;
        const requestAccessIdentity = accessIdentity;
        const isCurrentRequestIdentity = () => (
            mountedRef.current
            && enabledRef.current
            && accessIdentityRef.current === requestAccessIdentity
        );
        if (
            !force
            && platformStoreSummaryLoadedAt
            && admittedAccessIdentity === requestAccessIdentity
        ) return;
        if (!force && platformStoreSummaryLoadedAt) {
            setLoadError(false);
            try {
                await assertCurrentPlatformAccess();
                if (!isCurrentRequestIdentity()) return;
                setAdmittedAccessIdentity(requestAccessIdentity);
            } catch (error) {
                if (!isCurrentRequestIdentity()) return;
                setAdmittedAccessIdentity(null);
                setLoadError(true);
                logOpsFailure('platform_store_summary_options_access_failed', error, {
                    cachedSummaryAvailable: true,
                });
            }
            return;
        }
        if (!force && platformStoreSummaryLoading) return;

        const requestId = latestPlatformStoreSummaryRequestId + 1;
        latestPlatformStoreSummaryRequestId = requestId;
        setPlatformStoreSummaryLoading(true);
        setLoadError(false);
        try {
            await assertCurrentPlatformAccess();
            if (
                !mountedRef.current
                || !enabledRef.current
                || accessIdentityRef.current !== requestAccessIdentity
                || latestPlatformStoreSummaryRequestId !== requestId
            ) return;
            const summarySnap = await getDoc(doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, 'storesSummary'));
            if (
                !mountedRef.current
                || !enabledRef.current
                || accessIdentityRef.current !== requestAccessIdentity
                || latestPlatformStoreSummaryRequestId !== requestId
            ) return;
            const summary = summarySnap.exists() ? summarySnap.data() : null;
            const nextStores = buildPlatformStoreSummaryOptions(summary);
            setAdmittedAccessIdentity(requestAccessIdentity);
            setPlatformStoreSummaryOptions(nextStores);
            setPlatformStoreSummaryLoadedAt(Date.now());
            setSelectedStoreId((current) => {
                if (current && nextStores.some((store) => store.sId === current)) return current;
                return nextStores[0]?.sId;
            });
        } catch (error) {
            if (
                !mountedRef.current
                || !enabledRef.current
                || accessIdentityRef.current !== requestAccessIdentity
                || latestPlatformStoreSummaryRequestId !== requestId
            ) return;
            setAdmittedAccessIdentity(null);
            setLoadError(true);
            logOpsFailure('platform_store_summary_options_load_failed', error, {
                force,
            });
        } finally {
            if (latestPlatformStoreSummaryRequestId === requestId) {
                setPlatformStoreSummaryLoading(false);
            }
        }
    }, [
        accessIdentity,
        admittedAccessIdentity,
        enabled,
        platformStoreSummaryLoadedAt,
        platformStoreSummaryLoading,
        setPlatformStoreSummaryLoadedAt,
        setPlatformStoreSummaryLoading,
        setPlatformStoreSummaryOptions,
    ]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        void loadStores();
    }, [loadStores]);

    useEffect(() => {
        if (selectedStoreId && platformStoreSummaryOptions.some((store) => store.sId === selectedStoreId)) return;
        setSelectedStoreId(platformStoreSummaryOptions[0]?.sId);
    }, [platformStoreSummaryOptions, selectedStoreId]);

    const selectedStore = useMemo(
        () => hasCurrentAccessAdmission
            ? platformStoreSummaryOptions.find((store: PlatformStoreSummaryOption) => store.sId === selectedStoreId)
            : undefined,
        [hasCurrentAccessAdmission, platformStoreSummaryOptions, selectedStoreId],
    );

    const selectOptions = useMemo(
        () => hasCurrentAccessAdmission
            ? platformStoreSummaryOptions.map((store: PlatformStoreSummaryOption) => ({ label: store.label, value: store.sId }))
            : [],
        [hasCurrentAccessAdmission, platformStoreSummaryOptions],
    );

    return {
        loading: platformStoreSummaryLoading || Boolean(enabled && !hasCurrentAccessAdmission && !loadError),
        error: loadError,
        loadStores,
        selectedStore,
        selectedStoreId,
        selectOptions,
        setSelectedStoreId,
        stores: hasCurrentAccessAdmission ? platformStoreSummaryOptions : [],
    };
}
