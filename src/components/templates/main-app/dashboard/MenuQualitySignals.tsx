'use client';

/**
 * Menu Quality Signals — Dashboard Panel
 * 
 * A gentle quality nudge panel that surfaces actionable improvement signals
 * about the owner's menu and connects each signal to the existing AI feature.
 * 
 * Pure read layer — computes signals from project data already in memory.
 * Zero new Firestore reads. Zero new API routes.
 * 
 * @see __docs__/menu-quality-signals/
 */

import { CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import { FEATURE_FLAGS } from '@config/features';
import { getProjectData } from '@database/projects';
import { computeQualitySignals, getVisibleSignals, isAllClear, QualitySignal } from '@lib/mce/qualitySignals';
import { Button, Card, Flex, Skeleton, theme, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { LuDollarSign, LuEyeOff, LuFileText, LuImage, LuLanguages, LuSparkles, LuTrendingDown } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;

interface MenuQualitySignalsProps {
    projectId: string | null;
}

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
    descriptions: <LuFileText size={16} />,
    images: <LuImage size={16} />,
    prices: <LuDollarSign size={16} />,
    hidden: <LuEyeOff size={16} />,
    priceOutliers: <LuTrendingDown size={16} />,
    translations: <LuLanguages size={16} />,
};

const MenuQualitySignals: React.FC<MenuQualitySignalsProps> = ({ projectId }) => {
    const router = useRouter();
    const { token } = useToken();
    const [signals, setSignals] = useState<QualitySignal[]>([]);
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
                    const computed = computeQualitySignals(project.files, project.languages);
                    setSignals(getVisibleSignals(computed));
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

    const allClear = useMemo(() => isAllClear(signals), [signals]);

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
        // Navigate to the projects/editor page
        // The editor opens with the active project
        router.push(`/projects`);
    };

    return (
        <Card
            size="small"
            style={{ borderRadius: token.borderRadiusLG }}
            title={
                <Flex align="center" gap={8}>
                    <LuSparkles size={16} style={{ color: allClear ? token.colorSuccess : token.colorWarning }} />
                    <Text strong style={{ fontSize: 14 }}>Menu Quality</Text>
                </Flex>
            }
        >
            {allClear ? (
                <Flex align="center" gap={12} style={{ padding: '8px 0' }}>
                    <CheckCircleFilled style={{ fontSize: 24, color: token.colorSuccess }} />
                    <div>
                        <Text strong>Your menu looks great</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Descriptions, images, prices — all set
                        </Text>
                    </div>
                </Flex>
            ) : (
                <Flex vertical gap={8}>
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
                                    {signal.actionLabel}
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
