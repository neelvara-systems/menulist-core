
import { Feature, Plan, PlanType } from '@data/common';
import { commonFeaturesList } from '@data/PlatformFeaturesList';
import { MENULIST_B2C_PLAN_IDS } from '@constant/menulistPlans';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcncomponents/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shadcncomponents/tooltip';
import { FC, Fragment } from 'react';
import { LuCheckCircle, LuInfo, LuXCircle } from 'react-icons/lu';
import { useTranslations } from 'next-intl';

const featureCategoryKeys: Record<string, string> = {
    'Core Platform': 'corePlatform',
    'Content preparation': 'contentPreparation',
    'Marketing & Growth': 'marketingGrowth',
    'Online Presence': 'onlinePresence',
    'Support & Services': 'supportServices',
    'Platform Essentials': 'platformEssentials',
    'API & Integrations': 'apiIntegrations',
};

const planNameKeys: Record<string, string> = {
    [MENULIST_B2C_PLAN_IDS.OFFICIAL]: 'planOfficial',
    [MENULIST_B2C_PLAN_IDS.PRO]: 'planPro',
    [MENULIST_B2C_PLAN_IDS.MULTI_LOCATION]: 'planMultiLocation',
};

const renderFeatureValue = (
    value: string | number | boolean,
    labels: {
        included: string;
        notIncluded: string;
        coreMetrics: string;
        coreAndActions: string;
        emailSupport: string;
        standardEmailSupport: string;
        priorityEmailSupport: string;
    },
) => {
    if (typeof value === 'boolean') {
        return value ? (
            <span className="flex justify-center">
                <LuCheckCircle aria-hidden="true" className="text-green-500 text-xl" />
                <span className="sr-only">{labels.included}</span>
            </span>
        ) : (
            <span className="flex justify-center">
                <LuXCircle aria-hidden="true" className="text-slate-400 text-xl" />
                <span className="sr-only">{labels.notIncluded}</span>
            </span>
        );
    }
    const localizedValues: Record<string, string> = {
        Included: labels.included,
        'Core metrics': labels.coreMetrics,
        'Core + action summaries': labels.coreAndActions,
        'Email Support': labels.emailSupport,
        'Standard Email Support': labels.standardEmailSupport,
        'Priority Email Support': labels.priorityEmailSupport,
    };
    return <span className="text-slate-600 dark:text-slate-300 font-medium">{localizedValues[String(value)] || value}</span>;
};

const FeatureComparisonTable: FC<{ allFeaturesList: Feature[], plans: Plan[], planType: PlanType }> = ({ allFeaturesList, plans, planType }) => {
    const t = useTranslations('Website');

    const featuresToDisplay = [...commonFeaturesList[planType], ...allFeaturesList];

    const groupedFeatures = featuresToDisplay.reduce((acc, feature) => {
        const { category } = feature;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(feature);
        return acc;
    }, {} as Record<string, Feature[]>);

    return (
        <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto shadow-sm bg-white dark:bg-slate-900 my-10">
            <Table className="min-w-[760px]">
                <caption className="sr-only">{t('Pricing.comparisonCaption')}</caption>
                <TableHeader>
                    <TableRow className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableHead scope="col" className="w-[300px] text-slate-800 dark:text-slate-100 font-semibold text-base">{t('Pricing.comparisonFeatures')}</TableHead>
                        {plans.map(plan => (
                            <TableHead scope="col" key={plan.planId} className="text-center text-slate-800 dark:text-slate-100 font-semibold text-base">
                                {t(`Pricing.${planNameKeys[plan.planId] || 'planCustom'}`)}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(groupedFeatures).map(([category, features]) => (
                        <Fragment key={category}>
                            <TableRow className="border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-slate-800/80">
                                <TableCell colSpan={plans.length + 1} className="py-3">
                                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                                        {t(`Pricing.featureCategory.${featureCategoryKeys[category]}`)}
                                    </h3>
                                </TableCell>
                            </TableRow>
                            {features.map((feature, index) => (
                                <TableRow key={feature.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                    <TableHead scope="row" className="font-medium text-slate-600 dark:text-slate-300">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className="flex items-center gap-2 cursor-help text-left">
                                                    <span>{t(`Pricing.featureComparison.${feature.id}.name`)}</span>
                                                    <LuInfo aria-hidden="true" className="text-slate-400 dark:text-slate-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">{t(`Pricing.featureComparison.${feature.id}.description`)}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableHead>
                                    {plans.map(plan => (
                                        <TableCell key={plan.planId} className="text-center">
                                            {renderFeatureValue(feature.values[plan.planId], {
                                                included: t('Pricing.comparisonIncluded'),
                                                notIncluded: t('Pricing.comparisonNotIncluded'),
                                                coreMetrics: t('Pricing.comparisonCoreMetrics'),
                                                coreAndActions: t('Pricing.comparisonCoreAndActions'),
                                                emailSupport: t('Pricing.comparisonEmailSupport'),
                                                standardEmailSupport: t('Pricing.comparisonStandardEmailSupport'),
                                                priorityEmailSupport: t('Pricing.comparisonPriorityEmailSupport'),
                                            })}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default FeatureComparisonTable;
