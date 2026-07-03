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
import { assertMenuPresenceUpdateSucceeded, type MenuPresenceSurface, updateMenuPresence } from '@database/stores';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import {
    STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE,
    buildStarterActivationSummary,
    shouldRecordStarterActivationSignal,
} from '@lib/onboarding/starterActivation';
import { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
    LuCheck,
    LuClipboard,
    LuExternalLink,
    LuGlobe,
    LuInstagram,
    LuMessageCircle,
    LuPlus,
    LuQrCode,
    LuX,
} from 'react-icons/lu';
import { Button, Card, Flex, List, NavBar, Popup, Tag, Text, Title, Toast } from '../antd';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

type ManualSurfaceId = 'googleBusiness' | 'instagramBio' | 'whatsappProfile';

const MOBILE_PRESENCE_COPY_UNAVAILABLE = 'mobile_presence_copy_unavailable';
const MOBILE_PRESENCE_COPY_FALLBACK_FAILED = 'mobile_presence_copy_fallback_failed';

const hasMobilePresenceClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobilePresenceCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobilePresenceLink = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobilePresenceClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobilePresenceCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_PRESENCE_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(MOBILE_PRESENCE_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

interface MobilePresenceMonitorProps {
    hasPublishedMenu: boolean;
    hasFeedbackEnabled: boolean;
    hidePageSummary?: boolean;
    storeDetails: StoreDataType;
    obpLink: string;
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
        icon: <LuInstagram size={16} />,
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
    hasFeedbackEnabled,
    hidePageSummary = false,
    storeDetails,
    obpLink,
}: MobilePresenceMonitorProps) {
    const { token } = theme.useToken();
    const t = useTranslations('MobilePresenceMonitor');
    const common = useTranslations('Common');
    const [updating, setUpdating] = useState<string | null>(null);
    const [localPresence, setLocalPresence] = useState<Record<string, string | undefined>>(
        storeDetails.menuPresence || {}
    );
    const [selectedSurfaceId, setSelectedSurfaceId] = useState<ManualSurfaceId | null>(null);

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
    const activationSummary = buildStarterActivationSummary(storeDetails);
    const showActivationSummary = activationSummary.appliesToStarterActivation
        || activationSummary.recordedSignals.length > 0;
    const selectedSurface = selectedSurfaceId
        ? MANUAL_SURFACES.find((surface) => surface.id === selectedSurfaceId) || null
        : null;

    const buildMobilePresenceLogContext = (action: 'confirm' | 'copy' | 'open' | 'remove', surface?: ManualSurfaceConfig) => ({
        ...getMobileOwnerStoreLogContext(storeDetails.storeId, (storeDetails as any).tenantId),
        ...getBoundedMobileOwnerStringContext('obpLink', obpLink),
        ...getBoundedMobileOwnerStringContext('openUrl', surface?.openUrl),
        ...getBoundedMobileOwnerStringContext('surfaceId', surface?.id),
        ...getBoundedMobileOwnerStringContext('surfaceKey', surface?.dalKey),
        ...getBoundedMobileOwnerStringContext('surfaceLabelKey', surface?.labelKey),
        action,
        autoActiveCount,
        hasFeedbackEnabled,
        hasPublishedMenu,
        hasStarterActivationSignal: Boolean(surface && STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE[surface.dalKey]),
        manualActiveCount,
        recordsStarterActivationSignal: Boolean(surface && shouldRecordStarterActivationSignal(storeDetails)),
        totalActive,
        totalSurfaces,
    });

    const handleOpenExternalSurface = (surface: ManualSurfaceConfig) => {
        if (!surface.openUrl) return;
        try {
            const opened = window.open(surface.openUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('mobile_presence_external_open_blocked');
            }
        } catch (error) {
            logMobileOwnerFailure('mobile_presence_external_open_failed', error, buildMobilePresenceLogContext('open', surface));
            Toast.show({ content: t('updateFailed'), duration: 1500 });
        }
    };

    const handleOpenSurface = (surface: ManualSurfaceConfig) => {
        setSelectedSurfaceId(surface.id);
    };

    const handleCloseSurface = () => {
        setSelectedSurfaceId(null);
    };

    const handleCopyOfficialLink = async () => {
        const sourcedObpLink = withAnalyticsSource(obpLink, 'copy_link');
        try {
            await copyMobilePresenceLink(sourcedObpLink);
            Toast.show({ content: t('menuLinkCopied'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_presence_official_link_copy_failed', error, {
                ...buildMobilePresenceLogContext('copy'),
                hasClipboardWrite: hasMobilePresenceClipboardWrite(),
                hasCopyFallback: hasMobilePresenceCopyFallback(),
            });
            Toast.show({ content: t('menuLinkCopyFailed'), duration: 1000 });
        }
    };

    const handleConfirm = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            const result = await updateMenuPresence(storeDetails.storeId, surface.dalKey, true, {
                starterSignal: shouldRecordStarterActivationSignal(storeDetails)
                    ? STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE[surface.dalKey]
                    : undefined,
            });
            assertMenuPresenceUpdateSucceeded(
                result,
                storeDetails.storeId,
                surface.dalKey,
                true,
                'mobile_presence_confirm_update_rejected',
            );
            setLocalPresence((previous) => ({ ...previous, [surface.id]: new Date().toISOString() }));
            Toast.show({ content: t('surfaceUpdated', { surface: t(surface.labelKey) }), duration: 1500 });
            setSelectedSurfaceId(null);
        } catch (error) {
            logMobileOwnerFailure('mobile_presence_confirm_failed', error, buildMobilePresenceLogContext('confirm', surface));
            Toast.show({ content: t('updateFailed'), duration: 1500 });
        } finally {
            setUpdating(null);
        }
    };

    const handleRemove = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            const result = await updateMenuPresence(storeDetails.storeId, surface.dalKey, false);
            assertMenuPresenceUpdateSucceeded(
                result,
                storeDetails.storeId,
                surface.dalKey,
                false,
                'mobile_presence_remove_update_rejected',
            );
            setLocalPresence((previous) => {
                const next = { ...previous };
                delete next[surface.id];
                return next;
            });
            Toast.show({ content: t('surfaceRemoved', { surface: t(surface.labelKey) }), duration: 1500 });
            setSelectedSurfaceId(null);
        } catch (error) {
            logMobileOwnerFailure('mobile_presence_remove_failed', error, buildMobilePresenceLogContext('remove', surface));
            Toast.show({ content: t('updateFailed'), duration: 1500 });
        } finally {
            setUpdating(null);
        }
    };

    return (
        <Card>
            <Flex gap={16} vertical>
                {hidePageSummary ? (
                    <Flex justify="flex-end">
                        <Tag color={allDone ? 'success' : 'default'}>
                            {allDone ? t('allSet') : t('placesActive', { count: totalActive })}
                        </Tag>
                    </Flex>
                ) : (
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
                )}

                <Text type="secondary">{t('trackingNote')}</Text>

                {showActivationSummary ? (
                    <Flex
                        gap={8}
                        style={{
                            backgroundColor: token.colorInfoBg,
                            border: `1px solid ${token.colorInfoBorder}`,
                            borderRadius: 12,
                            padding: 12,
                        }}
                        vertical
                    >
                        <Flex align="center" justify="space-between">
                            <Text strong>{t('activationTitle')}</Text>
                            <Tag color={activationSummary.activated ? 'success' : 'processing'}>
                                {activationSummary.activated
                                    ? t('activationDone', { target: activationSummary.target })
                                    : t('activationProgress', {
                                        count: Math.min(activationSummary.signalCount, activationSummary.target),
                                        target: activationSummary.target,
                                    })
                                }
                            </Tag>
                        </Flex>
                        <Text type="secondary">
                            {activationSummary.signalCount > 0
                                ? t('activationHowKnown', {
                                    ownerCount: activationSummary.ownerConfirmedCount,
                                    systemCount: activationSummary.systemRecordedCount,
                                })
                                : t('activationPending')
                            }
                        </Text>
                    </Flex>
                ) : null}

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

                        return (
                            <List.Item
                                key={surface.id}
                                arrow
                                description={
                                    <Flex gap={8} vertical>
                                        <Flex gap={8} wrap="wrap">
                                            <Text type="secondary">
                                                {active ? t('menuLinkAdded') : t(surface.explanationKey)}
                                            </Text>
                                            {active ? (
                                                <Tag color="warning">{t('ownerConfirmed')}</Tag>
                                            ) : null}
                                            {isNext ? <Tag color="processing">{manualActiveCount === 0 ? t('startHere') : t('next')}</Tag> : null}
                                        </Flex>
                                    </Flex>
                                }
                                extra={
                                    <Button
                                        color={active ? 'success' : isNext ? 'primary' : 'default'}
                                        fill={active ? 'outline' : isNext ? 'solid' : 'outline'}
                                        loading={updating === surface.id}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleOpenSurface(surface);
                                        }}
                                        size="small"
                                        style={{
                                            borderRadius: 999,
                                            minHeight: 44,
                                            minWidth: 44,
                                            paddingInline: 0,
                                        }}
                                    >
                                        {active ? (
                                            <LuCheck size={16} />
                                        ) : (
                                            <LuPlus size={16} />
                                        )}
                                    </Button>
                                }
                                onClick={() => handleOpenSurface(surface)}
                                prefix={<Flex align="center" gap={8}>{surface.icon}</Flex>}
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
                            extra={surface.active ? <Tag color="processing">{t('menuListRecorded')}</Tag> : null}
                            prefix={
                                <Flex align="center" gap={8}>
                                    {surface.icon}
                                </Flex>
                            }
                            title={
                                <Flex gap={8} wrap="wrap">
                                    <Text strong>{surface.label}</Text>
                                    {surface.active ? <Tag color="success">{t('added')}</Tag> : null}
                                </Flex>
                            }
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

            <Popup
                bodyStyle={{ maxHeight: '82vh', minHeight: '50vh', overflow: 'hidden', padding: 0 }}
                destroyOnClose
                onMaskClick={handleCloseSurface}
                visible={!!selectedSurface}
            >
                {selectedSurface ? (
                    <Flex style={{ height: '100%' }} vertical>
                        <NavBar
                            right={(
                                <Button fill="none" onClick={handleCloseSurface} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}>
                                    <LuX size={18} />
                                </Button>
                            )}
                        >
                            {t(selectedSurface.labelKey)}
                        </NavBar>

                        <Flex gap={16} style={{ overflowY: 'auto', padding: 12 }} vertical>
                            <Card
                                size="small"
                                style={{
                                    backgroundColor: isActive(selectedSurface.id) ? token.colorSuccessBg : token.colorFillAlter,
                                    borderColor: isActive(selectedSurface.id) ? token.colorSuccessBorder : token.colorBorderSecondary,
                                }}
                            >
                                <Flex gap={8} vertical>
                                    <Flex align="center" gap={8}>
                                        <Button
                                            color={isActive(selectedSurface.id) ? 'success' : 'primary'}
                                            fill="none"
                                            style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                        >
                                            {isActive(selectedSurface.id) ? <LuCheck size={16} /> : <LuPlus size={16} />}
                                        </Button>
                                        <Text strong>{isActive(selectedSurface.id) ? t('menuLinkAdded') : t(selectedSurface.explanationKey)}</Text>
                                    </Flex>
                                    <Text type="secondary">
                                        {isActive(selectedSurface.id) ? t('surfaceUpdated', { surface: t(selectedSurface.labelKey) }) : t('subtitle')}
                                    </Text>
                                </Flex>
                            </Card>

                            <Card size="small">
                                <Flex gap={12} vertical>
                                    <Text strong>{common('copy')}</Text>
                                    <Card
                                        size="small"
                                        style={{
                                            backgroundColor: token.colorFillAlter,
                                            borderColor: token.colorBorderSecondary,
                                        }}
                                    >
                                        <Text style={{ wordBreak: 'break-all' }}>{obpLink}</Text>
                                    </Card>
                                    <Button
                                        block
                                        fill="outline"
                                        onClick={() => void handleCopyOfficialLink()}
                                        size="small"
                                    >
                                        <Flex align="center" gap={6}>
                                            <LuClipboard size={14} />
                                            <Text>{common('copy')}</Text>
                                        </Flex>
                                    </Button>
                                </Flex>
                            </Card>

                            <Card size="small">
                                <Flex gap={12} vertical>
                                    <Text strong>{t('howToAdd')}</Text>
                                    <Flex gap={8} vertical>
                                        {selectedSurface.guideStepKeys.map((stepKey, index) => (
                                            <Flex align="flex-start" gap={8} key={`${selectedSurface.id}-${index}`}>
                                                <Tag color="default">{index + 1}</Tag>
                                                <Text>{t(stepKey)}</Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                    {selectedSurface.openUrl ? (
                                        <Button
                                            block
                                            fill="outline"
                                            onClick={() => handleOpenExternalSurface(selectedSurface)}
                                            size="small"
                                        >
                                            <Flex align="center" gap={6}>
                                                <LuExternalLink size={14} />
                                                <Text>{t('open')}</Text>
                                            </Flex>
                                        </Button>
                                    ) : null}
                                </Flex>
                            </Card>

                            {isActive(selectedSurface.id) ? (
                                <Button
                                    block
                                    fill="outline"
                                    loading={updating === selectedSurface.id}
                                    onClick={() => void handleRemove(selectedSurface)}
                                    size="small"
                                >
                                    {t('remove')}
                                </Button>
                            ) : (
                                <Button
                                    block
                                    color="primary"
                                    loading={updating === selectedSurface.id}
                                    onClick={() => void handleConfirm(selectedSurface)}
                                    size="small"
                                >
                                    {t('markAsAdded')}
                                </Button>
                            )}
                        </Flex>
                    </Flex>
                ) : null}
            </Popup>
        </Card>
    );
}
