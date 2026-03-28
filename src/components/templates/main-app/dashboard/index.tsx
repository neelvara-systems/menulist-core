'use client'

import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { redirect } from 'next/navigation';
import { useContext } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';


function DashboardPage() {
    const { activeSubscription } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    if (!hasValidSubscriptionAccess(activeSubscription)) redirect('/billing')

    return (
        <>
            <AnalyticsDashboard />
        </>
    )
}

export default DashboardPage