'use client';

/**
 * StoreSwitcher — Header dropdown for master users to switch between stores
 * Visible only when isMasterUser === true (storesList.length > 1)
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §8.4
 */

import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Select } from 'antd';
import { useContext } from 'react';
import { HiOutlineLocationMarker } from 'react-icons/hi';

export default function StoreSwitcher() {
    const { tenantDetails, storeDetails, userPermissions, isMasterUser, activeStoreContext, setActiveStoreContext } =
        useContext(PlatformGlobalDataContext);

    // Only show for master users with canSwitchStores permission
    if (!isMasterUser || !tenantDetails?.storesList?.length || !userPermissions?.canSwitchStores) return null;

    const options = tenantDetails.storesList.map((store) => ({
        value: store.storeId,
        label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {store.isMaster ? '⭐' : '🏠'}
                {store.name || `Store ${store.storeId}`}
                {store.isMaster && <span style={{ fontSize: 11, opacity: 0.6 }}>(HQ)</span>}
            </span>
        ),
    }));

    const currentStoreId = activeStoreContext || storeDetails?.storeId;

    const handleSwitch = async (targetStoreId: number) => {
        if (targetStoreId === storeDetails?.storeId) {
            setActiveStoreContext(null);
            return;
        }
        try {
            const res = await fetch('/api/auth/switch-store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId }),
            });
            if (res.ok) {
                setActiveStoreContext(targetStoreId);
            }
        } catch (e) {
            console.error('[StoreSwitcher] Switch failed:', e);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineLocationMarker size={16} style={{ opacity: 0.6 }} />
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
