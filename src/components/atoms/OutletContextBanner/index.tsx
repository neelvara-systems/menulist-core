'use client';

/**
 * OutletContextBanner — Persistent banner when HQ user is viewing an outlet
 * "You are viewing [outlet] — Changes here affect only this outlet"
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §17.3
 */

import { getStoreContextName } from '@lib/businessIdentity/names';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Typography } from 'antd';
import { useContext } from 'react';
import { LuArrowLeft } from 'react-icons/lu';

const { Text } = Typography;

export default function OutletContextBanner() {
    const { tenantDetails, activeStoreContext, setActiveStoreContext, isMasterUser } =
        useContext(PlatformGlobalDataContext);

    // Only show when master user is viewing a non-master outlet
    if (!isMasterUser || !activeStoreContext) return null;

    const outletStore = tenantDetails?.storesList?.find(
        (s) => s.storeId === activeStoreContext,
    );
    const outletName = getStoreContextName(outletStore, `Store ${activeStoreContext}`);

    return (
        <div
            style={{
                background: '#fffbe6',
                border: '1px solid #ffe58f',
                borderRadius: 6,
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
            }}
        >
            <Text style={{ color: '#ad6800' }}>
                You are viewing <Text strong style={{ color: '#ad6800' }}>{outletName}</Text> —
                Changes here affect only this outlet
            </Text>
            <Button
                size="small"
                icon={<LuArrowLeft />}
                onClick={() => setActiveStoreContext(null)}
            >
                Back to HQ
            </Button>
        </div>
    );
}
