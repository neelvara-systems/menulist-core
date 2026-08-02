'use client';

/**
 * StoreSwitcher — Header dropdown for users with mapped multi-store access
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §8.4
 */

import { getStoreContextName } from '@lib/businessIdentity/names';
import { AUTH_ACCOUNT_REQUEST_POLICY, readAuthAccountResponse } from '@lib/auth/accountClientResponses';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import {
    claimStoreSwitchAttempt,
    getAccessibleStoreSummaries,
    getStoreSummaryId,
    normalizeStoreSwitchStoreId,
    releaseStoreSwitchAttempt,
    type SessionUserWithStores,
    type StoreSummary,
} from '@lib/multiOutlet/storeSwitchAccess';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Select } from 'antd';
import { useSession } from 'next-auth/react';
import { useContext, useMemo, useRef, useState } from 'react';
import { LuMapPin, LuStar } from 'react-icons/lu';

const HEADER_STORE_SWITCH_FAILED = 'header_store_switch_failed';

export default function StoreSwitcher() {
    const { tenantDetails, storeDetails, userPermissions, activeStoreContext, setActiveStoreContext } =
        useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();
    const [isSwitching, setIsSwitching] = useState(false);

    const accessibleStoresList = useMemo(
        () => getAccessibleStoreSummaries({
            sessionUser: session?.user as SessionUserWithStores | undefined,
            tenantDetails,
        }),
        [session?.user, tenantDetails],
    );
    const loginStoreId = normalizeStoreSwitchStoreId(session?.user?.storeId) || 0;
    const currentStoreId = normalizeStoreSwitchStoreId(
        activeStoreContext || storeDetails?.storeId || loginStoreId,
    ) || 0;
    const scopeKey = [session?.user?.id, session?.user?.tenantId, loginStoreId].map(String).join(':');
    const scopeKeyRef = useRef(scopeKey);
    scopeKeyRef.current = scopeKey;

    if (accessibleStoresList.length <= 1 || !userPermissions?.canSwitchStores) return null;

    const resolveStoreName = (store: StoreSummary) => {
        return getStoreContextName(store, `Store ${store?.storeId ?? ''}`);
    };

    const options = accessibleStoresList.map((store) => ({
        value: Number(store.storeId),
        label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {store.isMaster === true ? <LuStar size={14} /> : <LuMapPin size={14} />}
                {resolveStoreName(store)}
                {store.isMaster === true && <span style={{ fontSize: 11, opacity: 0.6 }}>(HQ)</span>}
            </span>
        ),
    }));

    const getHeaderStoreSwitchLogContext = (targetStoreId: number) => ({
        accessibleStoreCount: accessibleStoresList.length,
        hasStoreSwitchPermission: Boolean(userPermissions?.canSwitchStores),
        targetMatchesLoginStore: Number(targetStoreId) === loginStoreId,
        ...getBoundedAuthStringContext('currentStoreId', currentStoreId),
        ...getBoundedAuthStringContext('loginStoreId', loginStoreId),
        ...getBoundedAuthStringContext('targetStoreId', targetStoreId),
        ...getBoundedAuthStringContext('tenantId', session?.user?.tenantId),
        ...getBoundedAuthStringContext('userId', session?.user?.id),
    });

    const handleSwitch = async (targetStoreId: number) => {
        const normalizedTargetStoreId = normalizeStoreSwitchStoreId(targetStoreId);
        if (
            !normalizedTargetStoreId
            || normalizedTargetStoreId === currentStoreId
            || !accessibleStoresList.some((store) => getStoreSummaryId(store) === normalizedTargetStoreId)
        ) {
            return;
        }
        const attemptToken = claimStoreSwitchAttempt();
        if (attemptToken === null) return;
        const initiatingScopeKey = scopeKey;
        setIsSwitching(true);

        try {
            if (normalizedTargetStoreId === loginStoreId) {
                if (loginStoreId) await refreshFirebaseAuthClaims(loginStoreId);
                if (scopeKeyRef.current !== initiatingScopeKey) return;
                setActiveStoreContext(null);
                return;
            }

            const res = await fetch('/api/auth/switch-store', {
                ...AUTH_ACCOUNT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId: normalizedTargetStoreId }),
            });

            await readAuthAccountResponse(res, 'switch_store');
            if (scopeKeyRef.current !== initiatingScopeKey) return;

            await refreshFirebaseAuthClaims(normalizedTargetStoreId);
            if (scopeKeyRef.current !== initiatingScopeKey) return;
            setActiveStoreContext(normalizedTargetStoreId);
        } catch (error) {
            logAuthFailure(HEADER_STORE_SWITCH_FAILED, error, getHeaderStoreSwitchLogContext(normalizedTargetStoreId));
        } finally {
            releaseStoreSwitchAttempt(attemptToken);
            setIsSwitching(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuMapPin size={16} style={{ opacity: 0.6 }} />
            <Select
                value={currentStoreId}
                onChange={handleSwitch}
                options={options}
                disabled={isSwitching}
                loading={isSwitching}
                style={{ minWidth: 180 }}
                size="small"
                variant="borderless"
                popupMatchSelectWidth={false}
            />
        </div>
    );
}
