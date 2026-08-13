import { AIEnhancementPack, Currency } from '@data/common';
import { getContentCreditOutcomeExamples } from '@data/shared/contentCreditPolicy';

import { Button } from '@shadcncomponents/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shadcncomponents/card';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { LuCoins } from 'react-icons/lu';
import { buildCurrentWebsiteSignInPath } from '@/lib/website/signInLinks';
import { formatCurrencyOnPricingPage } from '.';
import './main.css';

type CreditPackCardProps = {
    pack: AIEnhancementPack;
    currency: Currency;
    onPurchase: (pack: AIEnhancementPack, currency: Currency) => void;
    activeSubscription?: FirestoreSubscriptionDoc;
};

const CreditPackCard: React.FC<CreditPackCardProps> = ({ pack, currency, onPurchase, activeSubscription }) => {
    const { data: session } = useSession();
    const t = useTranslations('Website.Pricing');

    const price = pack[`price${currency}`].price;
    const examples = getContentCreditOutcomeExamples(pack.creditAmount);

    const planStyles = {
        starter: {
            icon: <LuCoins className="h-5 w-5 text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-slate-200',
            buttonClass: 'bg-blue-600 hover:bg-blue-700'
        },
        value: {
            icon: <LuCoins className="h-5 w-5 text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-blue-400',
            buttonClass: 'bg-blue-600 hover:bg-blue-700'
        },
        pro: {
            icon: <LuCoins className="h-5 w-5 text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-slate-200',
            buttonClass: 'bg-blue-600 hover:bg-blue-700'
        },
        enhancement: {
            icon: <LuCoins className="h-5 w-5 text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-blue-400',
            buttonClass: 'bg-blue-600 hover:bg-blue-700'
        },
    };

    const defaultStyle = {
        icon: <LuCoins className="h-5 w-5 text-blue-500" />,
        bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
        borderColor: 'border-slate-200',
        buttonClass: 'bg-blue-600 hover:bg-blue-700'
    };

    const currentStyle = planStyles[pack.packId as keyof typeof planStyles] || defaultStyle;

    const cardClasses = `
            relative flex flex-col h-full p-4 pb-3 rounded-xl transition-all duration-300 hover:-translate-y-1 text-white
            ${currentStyle.bgColor} ${currentStyle.borderColor} border w-full max-w-[280px]
        `;

    const onClickOurchasePlan = () => {
        const targetElement = document.querySelector('#subscription-plans');
        if (targetElement) {
            window.scrollTo({
                top: targetElement.getBoundingClientRect().top + window.pageYOffset - 80,
                behavior: 'smooth'
            });
        }
    }

    const CTAButton = () => {
        if (!Boolean(session?.user)) {
            return <Button
                className={`mt-6 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                variant='ghost'
                onClick={() => window.location.assign(buildCurrentWebsiteSignInPath())}
            >
                {t('creditPackSignIn')}
            </Button>
        } else if (activeSubscription && hasValidSubscriptionAccess(activeSubscription)) {
            return <Button
                className={`mt-6 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                variant='ghost'
                onClick={() => onPurchase(pack, currency)}
            >
                {t('creditPackAdd')}<>&nbsp; {currentStyle.icon}</>
            </Button>
        } else if (!activeSubscription) {
            return <Button
                className={`mt-6 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                variant='ghost'
                onClick={() => onClickOurchasePlan()}
            >
                {t('creditPackChoosePlan')}
            </Button>
        }
        return <Button className="mt-6 w-full" disabled>{t('creditPackChoosePlan')}</Button>
    }

    return (
        <Card className={cardClasses}>
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg font-semibold m-0 text-center text-gray-600 dark:text-gray-400">{t('creditPackName')}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-grow flex flex-col items-center justify-between">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{t('creditPackDescription')}</p>
                    <p className="mt-3 mb-1 text-base font-semibold text-slate-900 dark:text-white">
                        {t('creditPackAmount', { credits: pack.creditAmount })}
                    </p>
                    <p className="m-0 text-xs leading-5 text-gray-600 dark:text-gray-300">
                        {t('creditPackExample', {
                            descriptions: examples.descriptionRewrites,
                            images: examples.generatedMenuImages,
                        })}
                    </p>
                    <span className="text-3xl font-bold text-slate-900 dark:text-white mt-1 block">{price !== null ? formatCurrencyOnPricingPage(price, currency) : t('planPriceUnavailable')}</span>
                </div>
                <CTAButton />
            </CardContent>
        </Card>
    );
};

export default CreditPackCard;
