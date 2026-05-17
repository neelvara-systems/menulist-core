"use client";

import { Currency, Plan } from '@data/common';

import React from 'react';
import { LuBuilding2, LuCheck, LuStore, LuZap } from 'react-icons/lu';
import { formatCurrencyOnPricingPage } from '.';
import './main.css';

const getPlanBullets = (planId: string, monthlyCreditAllowance: string | number) => {
    switch (planId) {
        case 'starter':
            return [
                '1 outlet',
                'QR + web menu',
                'Official business page',
                'Upload menu from image, PDF, or link',
                'Basic updates (limited)'
            ];
        case 'pro':
            return [
                'Your menu looks professional everywhere your customers see it',
                'Generated descriptions and images',
                'Multi-language menu',
                'Pro analytics action summaries',
                'Branding and presentation control',
                'Update once, publish from the approved source'
            ];
        case 'premium':
            return [
                'Run your entire brand from one place',
                'Control all your outlets from one place',
                'Keep menus consistent across every location',
                'Pro analytics action summaries',
                'Central menu with outlet-level overrides',
                'Priority support'
            ];
        default:
            return ['Custom pricing and features'];
    }
};

type PlanCardProps = {
    plan: Plan;
    currency: Currency;
    onPurchase: (plan: Plan) => void;
};

const PlanCard: React.FC<PlanCardProps> = ({ plan, currency, onPurchase }) => {

    const price = plan[`price${currency}`].price;
    const monthlyCreditAllowance = plan[`price${currency}`].monthlyCredits || "Custom";

    const planStyles = {
        starter: {
            icon: <LuStore className="w-full h-full text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-slate-200 dark:border-slate-700',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            buttonText: 'Start Simple Menu'
        },
        pro: {
            icon: <LuBuilding2 className="w-full h-full text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-blue-400 dark:border-blue-500',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            buttonText: 'Launch Professional Menu'
        },
        premium: {
            icon: <LuZap className="w-full h-full text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-slate-200 dark:border-slate-700',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            buttonText: 'Scale Across Locations'
        },
        custom: {
            icon: <LuZap className="w-full h-full text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-slate-200 dark:border-slate-700',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            buttonText: 'Contact us'
        },
    };

    const currentStyle = planStyles[plan.planId as keyof typeof planStyles];

    const cardClasses = `
        relative flex flex-col h-full p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 text-white
        ${currentStyle.bgColor} ${currentStyle.borderColor}
        ${plan.isRecommended
            ? `border-2 shadow-[0_0_25px_hsl(var(--primary)/0.4)] scale-[1.03] z-10`
            : `border`
        }
    `;

    const getDailyPrice = () => {
        if (!price || plan.billingInterval !== 'YEAR') return null;
        const dailyAmount = (price / 100) / 365;
        return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(dailyAmount);
    };

    return (
        <div className={cardClasses}>
            {plan.isRecommended && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white px-4 py-1 text-sm font-semibold rounded-full shadow-md bg-blue-600">Most chosen</div>}

            <div className="text-center flex justify-center items-center gap-6">
                <div className="flex justify-center w-12">{currentStyle.icon}</div>
                <div className="flex flex-col align-start gap-1">
                    <h3 className="text-xl font-semibold m-0 text-left text-gray-600 dark:text-gray-400">{plan.name.replace(` (Yearly)`, '').replace(` (Monthly)`, '')}</h3>
                    {plan.planId !== 'custom' && <div className="flex items-center gap-2">
                        <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{price !== null ? formatCurrencyOnPricingPage(price, currency) : 'N/A'}</span>
                        <span className="text-gray-500 dark:text-gray-400"> / {plan.billingInterval === 'MONTH' ? 'mo' : 'yr'}</span>
                    </div>}
                    {getDailyPrice() && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{getDailyPrice()}/day · billed yearly</p>
                    )}
                </div>
            </div>

            <div className="text-center flex justify-center items-center gap-6 mt-4 text-gray-300">
                {plan.description}
            </div>

            {/* <div className="w-full h-[1px] bg-white/10 my-4"></div> */}
            <div className="mt-auto pt-8 pb-8">
                <button
                    className={`w-full inline-flex items-center justify-center rounded-md px-8 h-11 font-semibold text-white transition-transform duration-300 hover:scale-105 ${currentStyle.buttonClass}`}
                    onClick={() => onPurchase(plan)}
                >
                    {currentStyle.buttonText}
                </button>
            </div>

            <div className="flex-grow">
                <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                    {getPlanBullets(plan.planId, monthlyCreditAllowance).map((bullet, index) => (
                        <li key={index} className="flex items-start">
                            <LuCheck className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                            <span className='text-gray-700 dark:text-gray-200 text-sm'>{bullet}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default PlanCard;
