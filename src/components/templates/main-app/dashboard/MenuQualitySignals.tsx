'use client';

/**
 * Menu Quality Signals — Dashboard Panel
 * 
 * A gentle quality nudge panel that surfaces actionable improvement signals
 * about the owner's menu and connects each signal to the existing AI feature.
 * 
 * Pure read layer — computes signals from the selected project document.
 * One project read on dashboard load. Zero new API routes.
 * 
 * @see __docs__/menu-quality-signals/
 */

import { CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import { FEATURE_FLAGS } from '@config/features';
import { getProjectData } from '@database/projects';
import { computeQualitySignals, getPrimaryQualitySignal, getVisibleSignals, isAllClear, isRepairMenuSignal, QualitySignal } from '@lib/mce/qualitySignals';
import { Button, Card, Flex, Skeleton, theme, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { LuDollarSign, LuEyeOff, LuFileText, LuFolder, LuImage, LuLanguages, LuSparkles, LuTrendingDown } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;

interface MenuQualitySignalsProps {
    projectId: string | null;
}

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
    descriptions: <LuFileText size={16} />,
    categoryIcons: <LuFolder size={16} />,
    images: <LuImage size={16} />,
    prices: <LuDollarSign size={16} />,
    hidden: <LuEyeOff size={16} />,
    priceOutliers: <LuTrendingDown size={16} />,
    projectContent: <LuFileText size={16} />,
    translations: <LuLanguages size={16} />,
};
const PENDING_QUALITY_ACTION_STORAGE_KEY = 'menulist:pendingQualityAction';

const MenuQualitySignals: React.FC<MenuQualitySignalsProps> = ({ projectId }) => {
    const router = useRouter();
    const { token } = useToken();
    const [signals, setSignals] = useState<QualitySignal[]>([]);
    const [allSignals, setAllSignals] = useState<QualitySignal[]>([]);
    const [checkedAt, setCheckedAt] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId || !FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadSignals = async () => {
            try {
                setLoading(true);
                const project = await getProjectData(projectId);
                if (!cancelled && project?.files) {
                    const computed = computeQualitySignals(project.files, project.languages, {
                        projectPublicContent: project,
                        showCategoryIcons: project?.config?.design?.menu?.showCategoryIcons ?? true,
                        showItemPrices: project?.config?.design?.menu?.showItemPrices ?? true,
                    });
                    setAllSignals(computed);
                    setSignals(getVisibleSignals(computed));
                    setCheckedAt(Date.now());
                }
            } catch {
                // Silent fail — quality signals are non-critical
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadSignals();

        return () => { cancelled = true; };
    }, [projectId]);

    const allClear = useMemo(() => isAllClear(allSignals), [allSignals]);
    const primarySignal = useMemo(() => getPrimaryQualitySignal(allSignals), [allSignals]);

    if (!FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS || !projectId) return null;

    if (loading) {
        return (
            <Card size="small" style={{ borderRadius: token.borderRadiusLG }}>
                <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
        );
    }

    if (signals.length === 0) return null;

    const handleAction = (signal: QualitySignal) => {
        if (!signal.actionRoute) return;
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(PENDING_QUALITY_ACTION_STORAGE_KEY, JSON.stringify({
                action: signal.id,
                createdAt: Date.now(),
                projectId,
            }));
        }
        router.push(`/projects`);
    };

    return (
        <Card
            size="small"
            style={{ borderRadius: token.borderRadiusLG }}
            title={
                <Flex align="center" gap={8}>
                    <LuSparkles size={16} style={{ color: allClear ? token.colorSuccess : token.colorWarning }} />
                    <Text strong style={{ fontSize: 14 }}>Menu Check</Text>
                </Flex>
            }
            extra={checkedAt ? (
                <Text type="secondary" style={{ fontSize: 11 }}>Checked just now</Text>
            ) : null}
        >
            {allClear ? (
                <Flex align="center" gap={12} style={{ padding: '8px 0' }}>
                    <CheckCircleFilled style={{ fontSize: 24, color: token.colorSuccess }} />
                    <div>
                        <Text strong>No action needed</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Your public menu is ready.
                        </Text>
                    </div>
                </Flex>
            ) : (
                <Flex vertical gap={8}>
                    {primarySignal ? (
                        <Flex
                            align="center"
                            justify="space-between"
                            gap={12}
                            style={{
                                background: token.colorFillAlter,
                                borderRadius: token.borderRadius,
                                padding: '8px 10px',
                            }}
                        >
                            <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                <Text strong style={{ fontSize: 13 }}>
                                    {isRepairMenuSignal(primarySignal) ? 'Repair what can be fixed now' : 'Review the top issue'}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {primarySignal.label}
                                </Text>
                            </Flex>
                            <Button
                                size="small"
                                type="primary"
                                onClick={() => handleAction(primarySignal)}
                            >
                                {isRepairMenuSignal(primarySignal) ? 'Repair Menu' : 'Review'}
                            </Button>
                        </Flex>
                    ) : null}
                    {signals.map((signal) => (
                        <Flex
                            key={signal.id}
                            align="center"
                            justify="space-between"
                            style={{
                                padding: '6px 0',
                                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            }}
                        >
                            <Flex align="center" gap={10}>
                                <span style={{
                                    color: signal.status === 'ok' ? token.colorSuccess : token.colorWarning,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    {signal.status === 'ok'
                                        ? <CheckCircleFilled style={{ fontSize: 16 }} />
                                        : <ExclamationCircleFilled style={{ fontSize: 16 }} />
                                    }
                                </span>
                                <Flex align="center" gap={6}>
                                    <span style={{ color: token.colorTextSecondary, display: 'flex' }}>
                                        {SIGNAL_ICONS[signal.id]}
                                    </span>
                                    <div>
                                        <Text style={{ fontSize: 13 }}>{signal.label}</Text>
                                        {signal.helpText && (
                                            <br />
                                        )}
                                        {signal.helpText && (
                                            <Text type="secondary" style={{ fontSize: 11 }}>{signal.helpText}</Text>
                                        )}
                                    </div>
                                </Flex>
                            </Flex>
                            {signal.actionLabel && signal.actionRoute && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => handleAction(signal)}
                                    style={{ fontSize: 12, padding: '0 4px' }}
                                >
                                    {isRepairMenuSignal(signal) ? 'Repair' : signal.actionLabel}
                                </Button>
                            )}
                        </Flex>
                    ))}
                </Flex>
            )}
        </Card>
    );
};

export default MenuQualitySignals;
