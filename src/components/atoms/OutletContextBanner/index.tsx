'use client';

/**
 * OutletContextBanner — Persistent banner when HQ user is viewing an outlet
 * "You are viewing [outlet] — Changes here affect only this outlet"
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §17.3
 */

import { getStoreContextName } from '@lib/businessIdentity/names';
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import {
    claimStoreSwitchAttempt,
    normalizeStoreSwitchStoreId,
    releaseStoreSwitchAttempt,
} from '@lib/multiOutlet/storeSwitchAccess';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useContext, useRef, useState } from 'react';
import { LuArrowLeft } from 'react-icons/lu';

const { Text } = Typography;

export default function OutletContextBanner() {
    const { tenantDetails, activeStoreContext, setActiveStoreContext, isMasterUser } =
        useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();
    const [isReturningToHq, setIsReturningToHq] = useState(false);
    const returnScopeKey = `${session?.user?.id ?? ''}:${session?.user?.tenantId ?? ''}:${session?.user?.storeId ?? ''}:${activeStoreContext ?? ''}`;
    const returnScopeKeyRef = useRef(returnScopeKey);
    returnScopeKeyRef.current = returnScopeKey;

    // Only show when master user is viewing a non-master outlet
    if (!isMasterUser || !activeStoreContext) return null;

    const outletStore = tenantDetails?.storesList?.find(
        (s) => s.storeId === activeStoreContext,
    );
    const outletName = getStoreContextName(outletStore, `Store ${activeStoreContext}`);
    const handleReturnToHq = async () => {
        const loginStoreId = normalizeStoreSwitchStoreId(session?.user?.storeId);
        if (!loginStoreId) return;
        const attemptToken = claimStoreSwitchAttempt();
        if (attemptToken === null) return;
        const initiatingScopeKey = returnScopeKey;
        setIsReturningToHq(true);

        try {
            await refreshFirebaseAuthClaims(loginStoreId);
            if (returnScopeKeyRef.current !== initiatingScopeKey) return;
            setActiveStoreContext(null);
        } catch (error) {
            if (returnScopeKeyRef.current !== initiatingScopeKey) return;
            logAuthFailure('outlet_context_return_to_hq_failed', error, {
                ...getBoundedAuthStringContext('activeStoreId', activeStoreContext),
                ...getBoundedAuthStringContext('loginStoreId', loginStoreId),
                ...getBoundedAuthStringContext('tenantId', session?.user?.tenantId),
            });
        } finally {
            releaseStoreSwitchAttempt(attemptToken);
            setIsReturningToHq(false);
        }
    };

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
                disabled={isReturningToHq}
                loading={isReturningToHq}
                onClick={() => void handleReturnToHq()}
            >
                Back to HQ
            </Button>
        </div>
    );
}
