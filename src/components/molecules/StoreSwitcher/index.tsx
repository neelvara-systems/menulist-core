'use client';

/**
 * StoreSwitcher — Header dropdown for users with mapped multi-store access
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §8.4
 */

import { getStoreContextName } from '@lib/businessIdentity/names';
import { AUTH_ACCOUNT_REQUEST_POLICY, readAuthAccountResponse } from '@lib/auth/accountClientResponses';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import { getAccessibleStoreSummaries } from '@lib/multiOutlet/storeSwitchAccess';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Select } from 'antd';
import { useSession } from 'next-auth/react';
import { useContext, useMemo } from 'react';
import { LuMapPin, LuStar } from 'react-icons/lu';

const HEADER_STORE_SWITCH_FAILED = 'header_store_switch_failed';

export default function StoreSwitcher() {
    const { tenantDetails, storeDetails, userPermissions, activeStoreContext, setActiveStoreContext } =
        useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();

    const accessibleStoresList = useMemo(
        () => getAccessibleStoreSummaries({ sessionUser: session?.user as any, tenantDetails }),
        [session?.user, tenantDetails],
    );
    const loginStoreId = Number(session?.user?.storeId || 0);
    const currentStoreId = Number(activeStoreContext || storeDetails?.storeId || loginStoreId || 0);

    if (accessibleStoresList.length <= 1 || !userPermissions?.canSwitchStores) return null;

    const resolveStoreName = (store: any) => {
        return getStoreContextName(store, `Store ${store?.storeId ?? ''}`);
    };

    const options = accessibleStoresList.map((store) => ({
        value: Number(store.storeId),
        label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {store.isMaster ? <LuStar size={14} /> : <LuMapPin size={14} />}
                {resolveStoreName(store)}
                {store.isMaster && <span style={{ fontSize: 11, opacity: 0.6 }}>(HQ)</span>}
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
        try {
            if (Number(targetStoreId) === loginStoreId) {
                if (loginStoreId) await refreshFirebaseAuthClaims(loginStoreId);
                setActiveStoreContext(null);
                return;
            }

            const res = await fetch('/api/auth/switch-store', {
                ...AUTH_ACCOUNT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId }),
            });

            await readAuthAccountResponse(res, 'switch_store');

            await refreshFirebaseAuthClaims(targetStoreId);
            setActiveStoreContext(targetStoreId);
        } catch (error) {
            logAuthFailure(HEADER_STORE_SWITCH_FAILED, error, getHeaderStoreSwitchLogContext(targetStoreId));
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuMapPin size={16} style={{ opacity: 0.6 }} />
            <Select
                value={currentStoreId}
                onChange={handleSwitch}
                options={options}
                style={{ minWidth: 180 }}
                size="small"
                variant="borderless"
                popupMatchSelectWidth={false}
            />
        </div>
    );
}
