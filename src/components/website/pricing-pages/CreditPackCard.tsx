import { AIEnhancementPack, Currency } from '@data/common';

import { Button } from '@shadcncomponents/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shadcncomponents/card';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { signIn, useSession } from 'next-auth/react';
import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { LuCoins } from 'react-icons/lu';
import { formatCurrencyOnPricingPage } from '.';
import './main.css';

type CreditPackCardProps = {
    pack: AIEnhancementPack;
    currency: Currency;
    onPurchase: (pack: AIEnhancementPack, currency: Currency) => void;
    activeSubscription?: FirestoreSubscriptionDoc;
};

const CreditPackCard: React.FC<CreditPackCardProps> = ({ pack, currency, onPurchase, activeSubscription }) => {
    const { data: session, status } = useSession();

    const price = pack[`price${currency}`].price;

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
            relative flex flex-col h-full p-6 pb-4 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 text-white
            ${currentStyle.bgColor} ${currentStyle.borderColor} border w-full max-w-[320px]
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
                className={`mt-8 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                variant='ghost'
                onClick={() => signIn('google', { callbackUrl: window.location.href })}
            >
                Sign In to Purchase<>&nbsp; <FcGoogle /></>
            </Button>
        } else if (Boolean(activeSubscription?.id)) {
            return <Button
                className={`mt-8 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                variant='ghost'
                onClick={() => onPurchase(pack, currency)}
            >
                Purchase<>&nbsp; {currentStyle.icon}</>
            </Button>
        } else {
            return <Button
                className={`mt-8 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                variant='ghost'
                onClick={() => onClickOurchasePlan()}
            >
                Purchase Plan
            </Button>
        }
    }

    return (
        <Card className={cardClasses}>
            <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-semibold m-0 text-center text-gray-600 dark:text-gray-400">{pack.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow flex flex-col items-center justify-between">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{pack.description || 'AI Enhancement Pack'}</p>
                    <span className="text-4xl font-bold text-slate-900 dark:text-white mt-2 block">{price !== null ? formatCurrencyOnPricingPage(price, currency) : 'N/A'}</span>
                </div>
                <CTAButton />
                {/* {status === 'authenticated' && session?.user ? <Button
                    className={`mt-8 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                    variant='ghost'
                    onClick={() => onPurchase(pack, currency)}
                >
                    Purchase<>&nbsp; {currentStyle.icon}</>
                </Button> : <Button
                    className={`mt-8 w-full flex items-center justify-center ${currentStyle.buttonClass}`}
                    variant='ghost'
                    onClick={() => signIn('google', { callbackUrl: window.location.href })}
                >
                    Sign In to Purchase<>&nbsp; {currentStyle.icon}</>
                </Button>} */}
            </CardContent>
        </Card>
    );
};

export default CreditPackCard;