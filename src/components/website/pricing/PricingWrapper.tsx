'use client';

import PricingPageRenderer from '@/components/website/pricing-pages';
import { Toaster } from '@shadcncomponents/toaster';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const SubscriptionManagementPage = dynamic(
    () => import('@/components/website/pricing-pages/SubscriptionManagement'),
    { ssr: false }
);

export default function PricingWrapper() {
    const { data: session, status, update } = useSession();
    const hasAttemptedSessionRefresh = useRef(false);
    const [activeSubscription, setActiveSubscription] = useState<FirestoreSubscriptionDoc | null>(null);
    const [isSubscriptionFetched, setIsSubscriptionFetched] = useState(false);
    const [welcomeTenantName, setWelcomeTenantName] = useState<string | null>(null);

    const getSubscription = async () => {
        const [{ getActiveSubscriptionForStore }, { getTenantById }] = await Promise.all([
            import('@database/subscriptions'),
            import('@database/tenants'),
        ]);
        const sub = await getActiveSubscriptionForStore(session?.user?.tenantId, session?.user?.storeId);
        setActiveSubscription(sub);
        setIsSubscriptionFetched(true);
        const tenantDetails = await getTenantById(session?.user?.tenantId);
        setWelcomeTenantName(tenantDetails?.name);
    };

    useEffect(() => {
        if (status === 'loading') {
            return;
        }

        if (status === 'authenticated' && session?.user && !activeSubscription) {
            const tenantId = session.user.tenantId;
            const storeId = session.user.storeId;
            if ((tenantId || tenantId === 0) && (storeId || storeId === 0)) {
                getSubscription();
            } else {
                if ((!('id' in session.user) || !('tenantId' in session.user)) && !hasAttemptedSessionRefresh.current) {
                    hasAttemptedSessionRefresh.current = true;
                    update();
                } else {
                    setIsSubscriptionFetched(true);
                }
            }
        } else if (status === 'unauthenticated') {
            setActiveSubscription(null);
            setIsSubscriptionFetched(true);
        }
    }, [session, status, activeSubscription, update]);

    const showSubscriptionManagement = status === 'authenticated' && isSubscriptionFetched && Boolean(activeSubscription);

    return (
        <>
            <Toaster />
            {showSubscriptionManagement ? (
                <SubscriptionManagementPage
                    activeSubscription={activeSubscription!}
                    refetchActiveSubscription={getSubscription}
                />
            ) : (
                <PricingPageRenderer
                    welcomeTenantName={welcomeTenantName}
                    activeSubscription={activeSubscription ?? undefined}
                />
            )}
        </>
    );
}
