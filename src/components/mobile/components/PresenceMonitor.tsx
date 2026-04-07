'use client';

/**
 * Menu Presence Monitor — Mobile Component (v2)
 *
 * Guided deployment checklist for MobileShareScreen.
 * Groups: Online Discovery (manual) + Inside Your Store (auto-detected).
 * Timestamp-only schema: exists = confirmed, missing = not confirmed.
 * Max 6 surfaces forever — do NOT expand.
 *
 * @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { type MenuPresenceSurface, updateMenuPresence } from '@database/stores';
import { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FaInstagram } from 'react-icons/fa6';
import {
    LuAlertTriangle,
    LuCheck,
    LuClipboard,
    LuExternalLink,
    LuGlobe,
    LuMessageCircle,
    LuMonitor,
    LuQrCode,
} from 'react-icons/lu';
import { Button, Card, Flex, List, Tag, Text, Title, Toast } from '../antd';

type ManualSurfaceId = 'googleBusiness' | 'instagramBio' | 'whatsappProfile';

interface MobilePresenceMonitorProps {
    hasPublishedMenu: boolean;
    hasScreen: boolean;
    hasFeedbackEnabled: boolean;
    storeDetails: StoreDataType;
    menuLink: string;
}

interface ManualSurfaceConfig {
    id: ManualSurfaceId;
    dalKey: MenuPresenceSurface;
    icon: React.ReactNode;
    labelKey: string;
    explanationKey: string;
    guideStepKeys: string[];
    openUrl?: string;
}

const MANUAL_SURFACES: ManualSurfaceConfig[] = [
    {
        id: 'googleBusiness',
        dalKey: 'googleBusiness',
        labelKey: 'surfaces.googleBusiness.label',
        explanationKey: 'surfaces.googleBusiness.explanation',
        icon: <LuGlobe size={16} />,
        guideStepKeys: [
            'surfaces.googleBusiness.steps.open',
            'surfaces.googleBusiness.steps.edit',
            'surfaces.googleBusiness.steps.paste',
        ],
        openUrl: 'https://business.google.com',
    },
    {
        id: 'instagramBio',
        dalKey: 'instagramBio',
        labelKey: 'surfaces.instagramBio.label',
        explanationKey: 'surfaces.instagramBio.explanation',
        icon: <FaInstagram size={16} />,
        guideStepKeys: [
            'surfaces.instagramBio.steps.open',
            'surfaces.instagramBio.steps.edit',
            'surfaces.instagramBio.steps.paste',
        ],
        openUrl: 'https://instagram.com',
    },
    {
        id: 'whatsappProfile',
        dalKey: 'whatsappProfile',
        labelKey: 'surfaces.whatsappProfile.label',
        explanationKey: 'surfaces.whatsappProfile.explanation',
        icon: <LuMessageCircle size={16} />,
        guideStepKeys: [
            'surfaces.whatsappProfile.steps.open',
            'surfaces.whatsappProfile.steps.edit',
            'surfaces.whatsappProfile.steps.paste',
        ],
    },
];

export default function MobilePresenceMonitor({
    hasPublishedMenu,
    hasScreen,
    hasFeedbackEnabled,
    storeDetails,
    menuLink,
}: MobilePresenceMonitorProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobilePresenceMonitor');
    const [updating, setUpdating] = useState<string | null>(null);
    const [localPresence, setLocalPresence] = useState<Record<string, string | undefined>>(
        storeDetails.menuPresence || {}
    );
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

    if (!FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR) return null;

    const isActive = (id: string) => !!localPresence[id];

    const autoSurfaces = [
        {
            id: 'tableQr',
            label: t('autoSurfaces.tableQr.label'),
            active: hasPublishedMenu,
            desc: hasPublishedMenu ? t('autoSurfaces.tableQr.ready') : t('autoSurfaces.tableQr.pending'),
            icon: <LuQrCode size={16} />,
        },
        {
            id: 'digitalScreens',
            label: t('autoSurfaces.digitalScreens.label'),
            active: hasScreen,
            desc: hasScreen ? t('autoSurfaces.digitalScreens.ready') : t('autoSurfaces.digitalScreens.pending'),
            icon: <LuMonitor size={16} />,
        },
        {
            id: 'feedbackQr',
            label: t('autoSurfaces.feedbackQr.label'),
            active: hasFeedbackEnabled,
            desc: hasFeedbackEnabled ? t('autoSurfaces.feedbackQr.ready') : t('autoSurfaces.feedbackQr.pending'),
            icon: <LuMessageCircle size={16} />,
        },
    ];

    const manualActiveCount = MANUAL_SURFACES.filter((surface) => isActive(surface.id)).length;
    const autoActiveCount = autoSurfaces.filter((surface) => surface.active).length;
    const totalActive = manualActiveCount + autoActiveCount;
    const totalSurfaces = MANUAL_SURFACES.length + autoSurfaces.length;
    const allDone = totalActive === totalSurfaces;
    const nextSurface = MANUAL_SURFACES.find((surface) => !isActive(surface.id));

    const handleCopyAndExpand = async (surface: ManualSurfaceConfig) => {
        try {
            await navigator.clipboard.writeText(menuLink);
            Toast.show({ content: t('menuLinkCopied'), duration: 1000 });
        } catch {
            Toast.show({ content: t('menuLinkCopyFailed'), duration: 1000 });
        }
        setExpandedGuide(surface.id);
    };

    const handleConfirm = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            await updateMenuPresence(storeDetails.storeId, surface.dalKey, true);
            setLocalPresence((previous) => ({ ...previous, [surface.id]: new Date().toISOString() }));
            Toast.show({ content: t('surfaceUpdated', { surface: t(surface.labelKey) }), duration: 1500 });
            setExpandedGuide(null);
        } catch {
            Toast.show({ content: t('updateFailed'), duration: 1500 });
        } finally {
            setUpdating(null);
        }
    };

    const handleRemove = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            await updateMenuPresence(storeDetails.storeId, surface.dalKey, false);
            setLocalPresence((previous) => {
                const next = { ...previous };
                delete next[surface.id];
                return next;
            });
            Toast.show({ content: t('surfaceRemoved', { surface: t(surface.labelKey) }), duration: 1500 });
        } catch {
            Toast.show({ content: t('updateFailed'), duration: 1500 });
        } finally {
            setUpdating(null);
        }
    };

    return (
        <Card>
            <Flex gap={16} vertical>
                <Flex align="center" justify="space-between">
                    <Flex gap={2} vertical>
                        <Title level={5} style={{ margin: 0 }}>
                            {t('title')}
                        </Title>
                        <Text type="secondary">{t('subtitle')}</Text>
                    </Flex>
                    <Tag color={allDone ? 'success' : 'default'}>
                        {allDone ? t('allSet') : t('placesActive', { count: totalActive })}
                    </Tag>
                </Flex>

                <Card size="small" style={{ backgroundColor: token.colorFillAlter }}>
                    <Flex gap={4} vertical>
                        <Text strong>{t('onlineDiscovery')}</Text>
                        <Text type="secondary">{t('onlineDiscoveryDesc')}</Text>
                    </Flex>
                </Card>

                <List>
                    {MANUAL_SURFACES.map((surface) => {
                        const active = isActive(surface.id);
                        const isNext = !active && surface.id === nextSurface?.id;
                        const guideOpen = expandedGuide === surface.id;

                        return (
                            <List.Item
                                key={surface.id}
                                description={
                                    <Flex gap={8} vertical>
                                        <Flex gap={8} wrap="wrap">
                                            <Text type="secondary">
                                                {active ? t('menuLinkAdded') : t(surface.explanationKey)}
                                            </Text>
                                            {isNext ? <Tag color="processing">{manualActiveCount === 0 ? t('startHere') : t('next')}</Tag> : null}
                                        </Flex>
                                        {guideOpen && !active ? (
                                            <Card size="small" style={{ backgroundColor: token.colorFillAlter }}>
                                                <Flex gap={12} vertical>
                                                    <Flex gap={4} vertical>
                                                        <Text strong>{t('howToAdd')}</Text>
                                                        <List>
                                                            {surface.guideStepKeys.map((stepKey, index) => (
                                                                <List.Item key={`${surface.id}-${index}`}>
                                                                    <Text>{`${index + 1}. ${t(stepKey)}`}</Text>
                                                                </List.Item>
                                                            ))}
                                                        </List>
                                                    </Flex>
                                                    <Flex gap={8} wrap="wrap">
                                                        {surface.openUrl ? (
                                                            <Button
                                                                fill="outline"
                                                                onClick={() => window.open(surface.openUrl, '_blank')}
                                                                size="small"
                                                            >
                                                                <Flex align="center" gap={6}>
                                                                    <LuExternalLink size={14} />
                                                                    <Text>{t('open')}</Text>
                                                                </Flex>
                                                            </Button>
                                                        ) : null}
                                                        <Button
                                                            color="primary"
                                                            loading={updating === surface.id}
                                                            onClick={() => handleConfirm(surface)}
                                                            size="small"
                                                        >
                                                            {t('markAsAdded')}
                                                        </Button>
                                                    </Flex>
                                                </Flex>
                                            </Card>
                                        ) : null}
                                    </Flex>
                                }
                                extra={
                                    active ? (
                                        <Button
                                            fill="outline"
                                            loading={updating === surface.id}
                                            onClick={() => handleRemove(surface)}
                                            size="small"
                                        >
                                            {t('remove')}
                                        </Button>
                                    ) : (
                                        <Button
                                            color={isNext ? 'primary' : 'default'}
                                            fill={isNext ? 'solid' : 'outline'}
                                            loading={updating === surface.id}
                                            onClick={() => handleCopyAndExpand(surface)}
                                            size="small"
                                        >
                                            <Flex align="center" gap={6}>
                                                <LuClipboard size={14} />
                                                <Text>{t('add')}</Text>
                                            </Flex>
                                        </Button>
                                    )
                                }
                                prefix={
                                    <Flex align="center" gap={8}>
                                        {active ? <LuCheck color={token.colorSuccess} size={16} /> : <LuAlertTriangle color={token.colorWarning} size={16} />}
                                        {surface.icon}
                                    </Flex>
                                }
                                title={
                                    <Flex gap={8} wrap="wrap">
                                        <Text strong>{t(surface.labelKey)}</Text>
                                        {active ? <Tag color="success">{t('added')}</Tag> : null}
                                    </Flex>
                                }
                            />
                        );
                    })}
                </List>

                <Card size="small" style={{ backgroundColor: token.colorFillAlter }}>
                    <Flex gap={4} vertical>
                        <Text strong>{t('insideStore')}</Text>
                        <Text type="secondary">{t('insideStoreDesc')}</Text>
                    </Flex>
                </Card>

                <List>
                    {autoSurfaces.map((surface) => (
                        <List.Item
                            key={surface.id}
                            description={<Text type="secondary">{surface.desc}</Text>}
                            extra={surface.active ? <Tag color="processing">{t('auto')}</Tag> : null}
                            prefix={
                                <Flex align="center" gap={8}>
                                    {surface.active ? <LuCheck color={token.colorSuccess} size={16} /> : <LuAlertTriangle color={token.colorWarning} size={16} />}
                                    {surface.icon}
                                </Flex>
                            }
                            title={<Text strong>{surface.label}</Text>}
                        />
                    ))}
                </List>

                {allDone ? (
                    <Card size="small" style={{ backgroundColor: token.colorSuccessBg, borderColor: token.colorSuccessBorder }}>
                        <Flex align="center" gap={8}>
                            <LuCheck color={token.colorSuccess} size={16} />
                            <Text>{t('allDoneMessage')}</Text>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Card>
    );
}
