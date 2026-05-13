'use client'

import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';
import OwnerDashboard from './OwnerDashboard';

function DashboardPage() {
    const { activeSubscription, activeSubscriptionLoading } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const router = useRouter()

    useEffect(() => {
        // Only redirect after the subscription lookup has finished.
        if (!activeSubscriptionLoading && !hasValidSubscriptionAccess(activeSubscription)) {
            router.replace('/billing')
        }
    }, [activeSubscription, activeSubscriptionLoading, router])

    // Subscription still loading - don't render or redirect yet.
    if (activeSubscriptionLoading) {
        return <Spin style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />
    }

    // Subscription loaded but invalid — redirect in progress via useEffect
    if (!hasValidSubscriptionAccess(activeSubscription)) {
        return null
    }

    return (
        <OwnerDashboard />
    )
}

export default DashboardPage
