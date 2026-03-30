
import { Feature, Plan, PlanType } from '@data/common';
import { commonFeaturesList } from '@data/PlatformFeaturesList';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcncomponents/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shadcncomponents/tooltip';
import { FC, Fragment } from 'react';
import { LuCheckCircle, LuInfo, LuXCircle } from 'react-icons/lu';

const renderFeatureValue = (value: string | number | boolean) => {
    if (typeof value === 'boolean') {
        return value ? (
            <LuCheckCircle className="text-green-500 text-xl mx-auto" />
        ) : (
            <LuXCircle className="text-slate-400 text-xl mx-auto" />
        );
    }
    return <span className="text-slate-600 dark:text-slate-300 font-medium">{value}</span>;
};

const FeatureComparisonTable: FC<{ allFeaturesList: Feature[], plans: Plan[], planType: PlanType }> = ({ allFeaturesList, plans, planType }) => {

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
        <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 my-10">
            <Table>
                <TableHeader>
                    <TableRow className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableHead className="w-[300px] text-slate-800 dark:text-slate-100 font-semibold text-base">Features</TableHead>
                        {plans.map(plan => (
                            <TableHead key={plan.planId} className="text-center text-slate-800 dark:text-slate-100 font-semibold text-base">
                                {plan.name.replace(' (Yearly)', '').replace(' (Monthly)', '')}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(groupedFeatures).map(([category, features]) => (
                        <Fragment key={category}>
                            <TableRow className="border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-slate-800/80">
                                <TableCell colSpan={plans.length + 1} className="py-3">
                                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{category}</h3>
                                </TableCell>
                            </TableRow>
                            {features.map((feature, index) => (
                                <TableRow key={feature.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                    <TableCell className="font-medium text-slate-600 dark:text-slate-300">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className="flex items-center gap-2 cursor-help text-left">
                                                    <span>{feature.name}</span>
                                                    <LuInfo className="text-slate-400 dark:text-slate-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">{feature.description}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    {plans.map(plan => (
                                        <TableCell key={plan.planId} className="text-center">
                                            {renderFeatureValue(feature.values[plan.planId])}
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