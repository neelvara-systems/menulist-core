"use client";

import { Currency, Feature, Plan } from '@data/common';
import { CustomPlanFeaturesList, PremiumPlanFeaturesList, ProPlanFeaturesList, StarterPlanFeaturesList } from '@data/PlatformFeaturesList';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shadcncomponents/tooltip';

import React from 'react';
import { LuBuilding2, LuCheck, LuInfo, LuStore, LuZap } from 'react-icons/lu';
import { formatCurrencyOnPricingPage } from '.';
import './main.css';

const getPlanfeaturesLable = (plan: Plan) => {
    let label = "";
    if (plan.planId == "pro") {
        label = "Everything in Starter, plus:";
    } else if (plan.planId == "premium") {
        label = "Everything in Pro, plus:";
    }
    return label;
}

type PlanCardProps = {
    plan: Plan;
    currency: Currency;
    allFeaturesList: Feature[];
    onPurchase: (plan: Plan) => void;
};

const PlanCard: React.FC<PlanCardProps> = ({ plan, currency, allFeaturesList, onPurchase }) => {

    const price = plan[`price${currency}`].price;
    const monthlyCreditAllowance = plan[`price${currency}`].monthlyCredits || "Custom";

    const featuresList = plan.planId === 'starter' ?
        StarterPlanFeaturesList : plan.planId === 'pro' ?
            ProPlanFeaturesList : plan.planId === 'premium' ?
                PremiumPlanFeaturesList : CustomPlanFeaturesList;

    const planStyles = {
        starter: {
            icon: <LuStore className="w-full h-full text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-slate-200 dark:border-slate-700',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            buttonText: 'Create your MenuList'
        },
        pro: {
            icon: <LuBuilding2 className="w-full h-full text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-blue-400 dark:border-blue-500',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            buttonText: 'Create your MenuList'
        },
        premium: {
            icon: <LuZap className="w-full h-full text-blue-500" />,
            bgColor: 'bg-gradient-to-b from-blue-500/5 to-transparent',
            borderColor: 'border-slate-200 dark:border-slate-700',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            buttonText: 'Create your MenuList'
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
            ? `border-2 shadow-[0_0_25px_hsl(var(--primary)/0.4)]`
            : `border`
        }
    `;

    return (
        <div className={cardClasses}>
            {plan.isRecommended && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white px-4 py-1 text-sm font-semibold rounded-full shadow-md bg-blue-600">Recommended</div>}

            <div className="text-center flex justify-center items-center gap-6">
                <div className="flex justify-center w-12">{currentStyle.icon}</div>
                <div className="flex flex-col align-start gap-1">
                    <h3 className="text-xl font-semibold m-0 text-left text-gray-600 dark:text-gray-400">{plan.name.replace(` (Yearly)`, '').replace(` (Monthly)`, '')}</h3>
                    {plan.planId !== 'custom' && <div className="flex items-center gap-2">
                        <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{price !== null ? formatCurrencyOnPricingPage(price, currency) : 'N/A'}</span>
                        <span className="text-gray-500 dark:text-gray-400"> / {plan.billingInterval === 'MONTH' ? 'mo' : 'yr'}</span>
                    </div>}
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
                <TooltipProvider delayDuration={100}>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                        {Boolean(getPlanfeaturesLable(plan)) && (
                            <li className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">{getPlanfeaturesLable(plan)}</li>
                        )}

                        {plan.planId !== 'custom' && (
                            <li className="flex items-center">
                                <LuCheck className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-green-500" />
                                <span className='text-gray-800 dark:text-gray-100 text-sm font-semibold'>
                                    Structured content preparation included
                                </span>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <LuInfo className="h-4 w-4 ml-2 text-gray-400 cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Includes unlimited data extraction, description generation, and language translation.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </li>
                        )}
                        {plan.planId !== 'custom' && (
                            <li className="flex items-center">
                                <LuCheck className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-green-500" />
                                <span className='text-gray-800 dark:text-gray-100 text-sm font-semibold'>
                                    {monthlyCreditAllowance} Monthly Credits
                                </span>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <LuInfo className="h-4 w-4 ml-2 text-gray-400 cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Includes {monthlyCreditAllowance} monthly credits.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </li>
                        )}
                        {allFeaturesList.map((feature) => {
                            if (!featuresList.includes(feature.id) || (!feature.values[plan.planId] && plan.planId !== 'custom')) return null;
                            return (
                                <li key={feature.id} className="flex items-center">
                                    <LuCheck className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-green-500" />
                                    <span className='text-gray-600 dark:text-gray-300 text-sm'>
                                        {feature.valueLabel.replace('{value}', String(feature.values[plan.planId])).replace('{name}', feature.name)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </TooltipProvider>
            </div>
        </div>
    );
};

export default PlanCard;