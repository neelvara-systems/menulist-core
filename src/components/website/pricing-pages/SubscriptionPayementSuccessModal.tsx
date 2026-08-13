'use client';

import { DASHBOARD_URL } from '@constant/urls';
import { PurchaseIntent } from '@data/common';
import { getBoundedPaymentStringContext, logPaymentFailure } from '@hook/paymentDiagnostics';
import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import { Button } from '@shadcncomponents/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shadcncomponents/dialog';
import { useTranslations } from 'next-intl';
import React from 'react';
import { LuCheckCircle, LuClock3 } from 'react-icons/lu';

interface SubscriptionPayementSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseIntent: PurchaseIntent | null;
    paymentDetails: unknown;
}

const SubscriptionPayementSuccessModal: React.FC<SubscriptionPayementSuccessModalProps> = ({
    isOpen,
    onClose,
    purchaseIntent,
    paymentDetails,
}) => {
    const t = useTranslations('Website');

    const handleDashboardRedirect = () => {
        const diagnosticContext = {
            surface: 'website_pricing_success_modal',
            flow: 'dashboard_handoff',
            hasPurchaseIntent: Boolean(purchaseIntent),
            hasPaymentDetails: Boolean(paymentDetails),
            ...getBoundedPaymentStringContext('dashboardUrl', DASHBOARD_URL),
        };

        try {
            openIsolatedBrowserUrl(DASHBOARD_URL);
            onClose();
        } catch (openError) {
            logPaymentFailure('website_pricing_dashboard_open_failed', openError, diagnosticContext);

            try {
                window.location.assign(DASHBOARD_URL);
            } catch (redirectError) {
                logPaymentFailure('website_pricing_dashboard_redirect_failed', redirectError, diagnosticContext);
            }
        }
    };

    const planName = purchaseIntent?.plan?.name
        ?.replace(' (Yearly)', '')
        .replace(' (Monthly)', '') || t('Pricing.successPlanFallback');
    const isActivationProcessing = typeof paymentDetails === 'object'
        && paymentDetails !== null
        && 'activationStatus' in paymentDetails
        && paymentDetails.activationStatus === 'processing';

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="items-center text-center">
                    {isActivationProcessing
                        ? <LuClock3 aria-hidden="true" className="mb-3 h-16 w-16 text-blue-600" />
                        : <LuCheckCircle aria-hidden="true" className="mb-3 h-16 w-16 text-green-600" />}
                    <DialogTitle>
                        {isActivationProcessing ? 'Payment received' : t('Pricing.successPaymentTitle')}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {isActivationProcessing
                            ? `We are confirming your ${planName} subscription. Your dashboard will update automatically after Razorpay activates it.`
                            : t('Pricing.successPaymentBody', { plan: planName })}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:justify-center">
                    <Button onClick={handleDashboardRedirect}>
                        {t('Pricing.successDashboardCta')}
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        {t('Pricing.successStayCta')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SubscriptionPayementSuccessModal;
