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
    const [isLoading, setIsLoading] = useState(true);
    const [isSubscriptionFetched, setIsSubscriptionFetched] = useState(false);
    const [welcomeTenantName, setWelcomeTenantName] = useState<string | null>(null);

    const getSubscription = async () => {
        const [{ getActiveSubscriptionForStore }, { getTenantById }] = await Promise.all([
            import('@database/subscriptions'),
            import('@database/tenants'),
        ]);
        const sub = await getActiveSubscriptionForStore(session?.user?.tenantId, session?.user?.storeId);
        setActiveSubscription(sub);
        setIsLoading(false);
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
                    setIsLoading(false);
                    setIsSubscriptionFetched(true);
                }
            }
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
            setIsSubscriptionFetched(true);
        }
    }, [session, status, activeSubscription, update]);

    if (isLoading || !isSubscriptionFetched) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
                flexDirection: 'column',
                gap: 'var(--ws-space-4)',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid var(--ws-border-default)',
                    borderTopColor: 'var(--ws-brand-secondary)',
                    borderRadius: '50%',
                    animation: 'ws-spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes ws-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            <Toaster />
            {Boolean(activeSubscription) ? (
                <SubscriptionManagementPage
                    activeSubscription={activeSubscription}
                    refetchActiveSubscription={getSubscription}
                />
            ) : (
                <PricingPageRenderer
                    welcomeTenantName={welcomeTenantName}
                    activeSubscription={activeSubscription!}
                />
            )}
        </>
    );
}
