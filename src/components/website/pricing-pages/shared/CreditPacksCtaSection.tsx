"use client";

import Confetti from '@atoms/Confetti';
import { AIEnhancementPack, Currency } from '@data/common';
import { aiEnhancementPacksList } from '@data/PlatformPlansList';
import usePaymentHandler from '@hook/usePaymentHandler';
import CtaSection from '@shadcncomponents/CtaSection';
import { useToast } from '@shadcnhooks/use-toast';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import React, { useState } from 'react';
import CreditPackCard from '../CreditPackCard';
import Loader from './Loader';

interface CreditPacksCtaSectionProps {
    currency: Currency;
    refetchActiveSubscription?: () => Promise<void>;
    activeSubscription?: FirestoreSubscriptionDoc;
}

const CreditPacksCtaSection: React.FC<CreditPacksCtaSectionProps> = ({ currency, refetchActiveSubscription, activeSubscription }) => {

    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleLoader = (action: { type: string }) => {
        setIsLoading(action.type === "loader/startLoader");
    }
    const { handleTopupPurchase } = usePaymentHandler(handleLoader);

    const handleCreditsCardClick = (pack: AIEnhancementPack) => {
        try {
            setIsLoading(true);
            handleTopupPurchase(pack, currency).then((paymentResponse: any) => {
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
                    console.error('Credit Payment flow failed in handleCreditsCardClick', error);
                });
        } catch (error) {
            setIsLoading(false);
            toast({ variant: 'destructive', title: 'Error', description: 'An error occurred during the final setup. Please contact support.' });
            console.error('Credit Payment flow failed in handleCreditsCardClick', error);
        }
    }

    return (
        <>
            <CtaSection
                heading="Need more content generation credits?"
                subheading="Purchase additional credits for image and description generation. Credits are added to your account immediately."
                primaryButton={
                    <div id="credit-packs" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-4xl mx-auto mt-8">
                        {aiEnhancementPacksList.map((pack: AIEnhancementPack) => (
                            <CreditPackCard activeSubscription={activeSubscription} key={pack.packId} pack={pack} currency={currency} onPurchase={handleCreditsCardClick} />
                        ))}
                    </div>
                }
            />
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
