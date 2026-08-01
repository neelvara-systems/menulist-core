'use client';

import PricingPageRenderer from '@/components/website/pricing-pages';
import { getBoundedPaymentStringContext, logPaymentFailure } from '@hook/paymentDiagnostics';
import { normalizeBillingSubscriptionScopeDocumentId } from '@lib/billing/subscriptionDocumentIdBoundary';
import { getMenuListSessionProviderScopeKey } from '@lib/multiOutlet/sessionProviderScopeBoundary';
import { Toaster } from '@shadcncomponents/toaster';
import { Button } from '@shadcncomponents/button';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

const SubscriptionManagementPage = dynamic(
    () => import('@/components/website/pricing-pages/SubscriptionManagement'),
    { ssr: false }
);

export default function PricingWrapper() {
    const { data: session, status, update } = useSession();
    const hasAttemptedSessionRefresh = useRef(false);
    const subscriptionRequestSequenceRef = useRef(0);
    const currentScopeKey = status === 'authenticated' ? getMenuListSessionProviderScopeKey(session) : null;
    const currentScopeKeyRef = useRef<string | null>(currentScopeKey);
    currentScopeKeyRef.current = currentScopeKey;
    const [loadedActiveSubscription, setLoadedActiveSubscription] = useState<FirestoreSubscriptionDoc | null>(null);
    const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
    const [subscriptionLoadErrorScopeKey, setSubscriptionLoadErrorScopeKey] = useState<string | null>(null);
    const [loadedWelcomeTenantName, setLoadedWelcomeTenantName] = useState<string | null>(null);
    const activeSubscription = loadedScopeKey === currentScopeKey ? loadedActiveSubscription : null;
    const welcomeTenantName = loadedScopeKey === currentScopeKey ? loadedWelcomeTenantName : null;
    const hasSubscriptionLoadError = Boolean(currentScopeKey && subscriptionLoadErrorScopeKey === currentScopeKey);
    const isSubscriptionFetched = Boolean(!currentScopeKey || loadedScopeKey === currentScopeKey);

    const getSubscription = useCallback(async () => {
        const tenantScope = normalizeBillingSubscriptionScopeDocumentId(session?.user?.tenantId);
        const storeScope = normalizeBillingSubscriptionScopeDocumentId(session?.user?.storeId);
        const requestScopeKey = currentScopeKey;
        if (!requestScopeKey || !tenantScope || !storeScope) return;
        const requestSequence = ++subscriptionRequestSequenceRef.current;
        setSubscriptionLoadErrorScopeKey(null);
        try {
            const [{ getActiveSubscriptionForStore }, { getTenantById }] = await Promise.all([
                import('@database/subscriptions'),
                import('@database/tenants'),
            ]);
            const [sub, tenantDetails] = await Promise.all([
                getActiveSubscriptionForStore(tenantScope.numericId, storeScope.numericId),
                getTenantById(tenantScope.numericId),
            ]);
            if (
                subscriptionRequestSequenceRef.current !== requestSequence
                || currentScopeKeyRef.current !== requestScopeKey
            ) return;
            setLoadedActiveSubscription(sub);
            setLoadedWelcomeTenantName(typeof tenantDetails?.name === 'string' ? tenantDetails.name : null);
            setLoadedScopeKey(requestScopeKey);
        } catch (error) {
            if (
                subscriptionRequestSequenceRef.current !== requestSequence
                || currentScopeKeyRef.current !== requestScopeKey
            ) return;
            setLoadedActiveSubscription(null);
            setLoadedWelcomeTenantName(null);
            setLoadedScopeKey(null);
            setSubscriptionLoadErrorScopeKey(requestScopeKey);
            logPaymentFailure('website_pricing_subscription_load_failed', error, {
                surface: 'website_pricing',
                flow: 'load_current_subscription',
                ...getBoundedPaymentStringContext('tenantId', tenantScope.numericId),
                ...getBoundedPaymentStringContext('storeId', storeScope.numericId),
            });
        }
    }, [currentScopeKey, session?.user?.storeId, session?.user?.tenantId]);

    useEffect(() => {
        if (status === 'loading') {
            return;
        }

        if (status === 'authenticated' && session?.user && currentScopeKey) {
            const tenantId = session.user.tenantId;
            const storeId = session.user.storeId;
            if (normalizeBillingSubscriptionScopeDocumentId(tenantId) && normalizeBillingSubscriptionScopeDocumentId(storeId)) {
                void getSubscription();
            }
        } else if (status === 'authenticated' && session?.user) {
            subscriptionRequestSequenceRef.current += 1;
            setLoadedActiveSubscription(null);
            setLoadedWelcomeTenantName(null);
            setLoadedScopeKey(null);
            setSubscriptionLoadErrorScopeKey(null);
            if ((!('id' in session.user) || !('tenantId' in session.user)) && !hasAttemptedSessionRefresh.current) {
                hasAttemptedSessionRefresh.current = true;
                void update();
            }
        } else if (status === 'unauthenticated') {
            subscriptionRequestSequenceRef.current += 1;
            setLoadedActiveSubscription(null);
            setLoadedWelcomeTenantName(null);
            setLoadedScopeKey(null);
            setSubscriptionLoadErrorScopeKey(null);
        }
        return () => {
            subscriptionRequestSequenceRef.current += 1;
        };
    }, [currentScopeKey, getSubscription, session, status, update]);

    const showSubscriptionManagement = status === 'authenticated' && isSubscriptionFetched && Boolean(activeSubscription);

    return (
        <>
            <Toaster />
            {status === 'authenticated' && currentScopeKey && !isSubscriptionFetched && !hasSubscriptionLoadError ? (
                <div aria-live="polite" className="ws-page" style={{ minHeight: '60vh', padding: '96px 24px', textAlign: 'center' }}>
                    Checking current billing details...
                </div>
            ) : hasSubscriptionLoadError ? (
                <div aria-live="polite" className="ws-page" style={{ minHeight: '60vh', padding: '96px 24px', textAlign: 'center' }}>
                    <p>Billing details could not be loaded. Subscription changes are unavailable until the current account is confirmed.</p>
                    <Button onClick={() => void getSubscription()} style={{ marginTop: 16 }} type="button">Retry</Button>
                </div>
            ) : showSubscriptionManagement && activeSubscription ? (
                <SubscriptionManagementPage
                    activeSubscription={activeSubscription}
                    refetchActiveSubscription={getSubscription}
                />
            ) : (
                <PricingPageRenderer
                    welcomeTenantName={welcomeTenantName ?? undefined}
                    activeSubscription={activeSubscription ?? undefined}
                />
            )}
        </>
    );
}
