'use client'

import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasStarterWorkspaceAccess } from '@lib/onboarding/starterActivation';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';
import OwnerDashboard from './OwnerDashboard';

function DashboardPage() {
    const { activeSubscription, activeSubscriptionLoading, storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const router = useRouter()
    const hasPaidAccess = hasValidSubscriptionAccess(activeSubscription);
    const hasStarterAccess = hasStarterWorkspaceAccess(storeDetails, hasPaidAccess);

    useEffect(() => {
        // Only redirect after the subscription lookup has finished.
        if (!activeSubscriptionLoading && !hasPaidAccess) {
            router.replace(hasStarterAccess ? '/use-menulist' : '/billing')
        }
    }, [activeSubscriptionLoading, hasPaidAccess, hasStarterAccess, router])

    // Subscription still loading - don't render or redirect yet.
    if (activeSubscriptionLoading) {
        return <Spin style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />
    }

    // Subscription loaded but invalid — redirect in progress via useEffect
    if (!hasPaidAccess) {
        return null
    }

    return (
        <OwnerDashboard />
    )
}

export default DashboardPage
