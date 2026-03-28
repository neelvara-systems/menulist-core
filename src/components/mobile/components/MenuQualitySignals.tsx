'use client';

/**
 * Menu Quality Signals — Mobile Component
 * 
 * Read-only quality signals panel for mobile.
 * Action buttons show a message directing to desktop for AI features.
 * 
 * @see __docs__/menu-quality-signals/menu-quality-signals_mobile-support.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { computeQualitySignals, getVisibleSignals, isAllClear, QualitySignal } from '@lib/mce/qualitySignals';
import type { ProjectFileType } from '@template/main-app/projects/types/project.types';
import { Card, List, Toast } from 'antd-mobile';
import React, { useMemo } from 'react';
import { LuAlertCircle, LuCheckCircle, LuDollarSign, LuEyeOff, LuFileText, LuImage, LuSparkles, LuTrendingDown } from 'react-icons/lu';

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
    descriptions: <LuFileText size={16} />,
    images: <LuImage size={16} />,
    prices: <LuDollarSign size={16} />,
    hidden: <LuEyeOff size={16} />,
    priceOutliers: <LuTrendingDown size={16} />,
};

interface MobileMenuQualitySignalsProps {
    files: ProjectFileType[] | undefined;
}

const MobileMenuQualitySignals: React.FC<MobileMenuQualitySignalsProps> = ({ files }) => {
    const allSignals = useMemo(() => computeQualitySignals(files), [files]);
    const signals = useMemo(() => getVisibleSignals(allSignals), [allSignals]);
    const allClear = useMemo(() => isAllClear(allSignals), [allSignals]);

    if (!FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS) return null;
    if (signals.length === 0) return null;

    const handleAction = (signal: QualitySignal) => {
        if (signal.actionRoute === 'descriptions' || signal.actionRoute === 'images') {
            Toast.show({
                content: 'Open MenuList on desktop to generate content',
                duration: 2000,
            });
        } else {
            Toast.show({
                content: 'Open the editor on desktop to review',
                duration: 2000,
            });
        }
    };

    return (
        <Card
            title={
                <div className="flex items-center gap-2">
                    <LuSparkles size={16} className={allClear ? 'text-green-500' : 'text-amber-500'} />
                    <span className="text-sm font-semibold">Menu Quality</span>
                </div>
            }
            style={{ borderRadius: 12 }}
        >
            {allClear ? (
                <div className="flex items-center gap-3 py-2">
                    <LuCheckCircle size={24} className="text-green-500 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 m-0">
                            Your menu looks great
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                            Descriptions, images, prices — all set
                        </p>
                    </div>
                </div>
            ) : (
                <List style={{ '--border-inner': 'none', '--border-top': 'none', '--border-bottom': 'none', '--padding-left': '0' } as React.CSSProperties}>
                    {signals.map((signal) => (
                        <List.Item
                            key={signal.id}
                            prefix={
                                <span className={signal.status === 'ok' ? 'text-green-500' : 'text-amber-500'}>
                                    {signal.status === 'ok'
                                        ? <LuCheckCircle size={16} />
                                        : <LuAlertCircle size={16} />
                                    }
                                </span>
                            }
                            description={
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-400">{SIGNAL_ICONS[signal.id]}</span>
                                    <div>
                                        <span className="text-xs text-gray-600 dark:text-gray-300">{signal.label}</span>
                                        {signal.helpText && (
                                            <span className="block text-[10px] text-gray-400 dark:text-gray-500">{signal.helpText}</span>
                                        )}
                                    </div>
                                </div>
                            }
                            extra={
                                signal.actionLabel && signal.actionRoute ? (
                                    <button
                                        onClick={() => handleAction(signal)}
                                        className="text-xs text-blue-500 font-medium px-2 py-1 rounded active:bg-blue-50 dark:active:bg-blue-900/20 min-h-[44px] flex items-center"
                                    >
                                        {signal.actionLabel}
                                    </button>
                                ) : null
                            }
                            style={{ paddingLeft: 0 }}
                        />
                    ))}
                </List>
            )}
        </Card>
    );
};

export default MobileMenuQualitySignals;
