"use client";

import Confetti from '@atoms/Confetti';
import { AIEnhancementPack, Currency } from '@data/common';
import { aiEnhancementPacksList } from '@data/PlatformPlansList';
import { getBoundedPaymentStringContext, logPaymentFailure } from '@hook/paymentDiagnostics';
import usePaymentHandler from '@hook/usePaymentHandler';
import { useToast } from '@shadcnhooks/use-toast';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import SectionHeading from '../../shared/SectionHeading';
import CreditPackCard from '../CreditPackCard';
import Loader from './Loader';

interface CreditPacksCtaSectionProps {
    currency: Currency;
    refetchActiveSubscription?: () => Promise<void>;
    activeSubscription?: FirestoreSubscriptionDoc;
}

const CreditPacksCtaSection: React.FC<CreditPacksCtaSectionProps> = ({ currency, refetchActiveSubscription, activeSubscription }) => {

    const t = useTranslations('Website');
    const { toast } = useToast();
    const normalizedCurrency = String(currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR';
    const [isLoading, setIsLoading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleLoader = (action: { type: string }) => {
        setIsLoading(action.type === "loader/startLoader");
    }
    const { handleTopupPurchase } = usePaymentHandler(handleLoader);
    const buildCreditPaymentLogContext = (flow: string, metadata: Record<string, unknown> = {}) => ({
        surface: 'website_pricing_credit_packs',
        flow,
        currency: normalizedCurrency,
        hasActiveSubscription: Boolean(activeSubscription),
        ...metadata,
    });

    const handleCreditsCardClick = (pack: AIEnhancementPack) => {
        try {
            setIsLoading(true);
            handleTopupPurchase(pack, normalizedCurrency).then((paymentResponse: any) => {
                setIsLoading(false);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 5000);
                toast({ variant: 'default', title: 'Credits added', description: 'Content generation credits are ready to use.' });
                refetchActiveSubscription?.();
            })
                .catch((error: any) => {
                    setIsLoading(false);
                    if (error === "UserClosed") {
                        return;
                    }
                    toast({ variant: 'destructive', title: 'Error', description: 'An error occurred during the final setup. Please contact support.' });
                    logPaymentFailure('payment_pricing_credit_pack_failed', error, buildCreditPaymentLogContext('credit_pack_click', {
                        ...getBoundedPaymentStringContext('packId', pack.packId),
                    }));
                });
        } catch (error) {
            setIsLoading(false);
            toast({ variant: 'destructive', title: 'Error', description: 'An error occurred during the final setup. Please contact support.' });
            logPaymentFailure('payment_pricing_credit_pack_failed', error, buildCreditPaymentLogContext('credit_pack_click', {
                ...getBoundedPaymentStringContext('packId', pack.packId),
            }));
        }
    }

    return (
        <>
            <div style={{ textAlign: 'center' }}>
                <SectionHeading
                    title={t('Pricing.creditTitle')}
                    highlightedText="your menu"
                    subtitle={t('Pricing.creditSubtitle')}
                    centered
                />
                <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-2)' }}>
                    {t('Pricing.creditNote')}
                </p>
                <div id="credit-packs" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-6)', flexWrap: 'wrap', maxWidth: '800px', margin: 'var(--ws-space-10) auto 0' }}>
                    {aiEnhancementPacksList.map((pack: AIEnhancementPack) => (
                        <CreditPackCard activeSubscription={activeSubscription} key={pack.packId} pack={pack} currency={normalizedCurrency} onPurchase={handleCreditsCardClick} />
                    ))}
                </div>
            </div>
            {isLoading && <Loader />}
            {showConfetti && (
                <div className="fixed top-0 left-0 w-full h-full z-50">
                    <Confetti totalHeight={window.innerHeight} totalWidth={window.innerWidth} />
                </div>
            )}
        </>
    );
};

export default CreditPacksCtaSection;
