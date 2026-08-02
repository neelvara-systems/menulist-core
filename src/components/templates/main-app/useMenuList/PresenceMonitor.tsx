'use client';

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

/**
 * Menu Presence Monitor — Desktop Component (v2)
 *
 * Guided deployment checklist: "Make your business easy to find."
 * Groups: Online Discovery (manual) + Inside Your Store (auto-detected).
 * Timestamp-only schema: exists = confirmed, missing = not confirmed.
 * Eight bounded surfaces; external platforms remain owner-confirmed.
 *
 * @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
 */

import { assertMenuPresenceUpdateSucceeded, type MenuPresenceSurface, updateMenuPresence } from '@database/stores';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { isMenuPresenceConfirmed } from '@lib/menuPresence/presenceReadiness';
import {
    STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE,
    applyStarterPresenceUpdateToStoreDetails,
    buildStarterActivationSummary,
    shouldRecordStarterActivationSignal,
} from '@lib/onboarding/starterActivation';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { StoreDataType } from '@type/platform/store';
import { Button, Card, Flex, message, Tag, Typography, theme } from 'antd';
import { useContext, useEffect, useRef, useState } from 'react';
import {
    LuAlertTriangle,
    LuCheck,
    LuClipboard,
    LuExternalLink,
    LuGlobe,
    LuInstagram,
    LuInfo,
    LuMessageCircle,
    LuMap,
    LuMonitor,
    LuQrCode,
    LuSearch,
    LuX
} from 'react-icons/lu';
import type { ManualSurfaceId } from './presenceTypes';
import type { UseMenuListData } from './types';
import { getBoundedUseMenuListStringContext, logUseMenuListFailure } from './useMenuListDiagnostics';

const { Text } = Typography;

const USE_MENULIST_PRESENCE_COPY_UNAVAILABLE = 'use_menulist_presence_copy_unavailable';
const USE_MENULIST_PRESENCE_COPY_FALLBACK_FAILED = 'use_menulist_presence_copy_fallback_failed';

const hasUseMenuListPresenceClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasUseMenuListPresenceCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyUseMenuListPresenceLink = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasUseMenuListPresenceClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasUseMenuListPresenceCopyFallback()) {
        throw clipboardWriteError || new Error(USE_MENULIST_PRESENCE_COPY_UNAVAILABLE);
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
            throw new Error(USE_MENULIST_PRESENCE_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

interface PresenceMonitorProps {
    data: UseMenuListData;
    storeDetails: StoreDataType;
}

// ── Manual surface configuration ─────────────────────────────
// Surface IDs are IMMUTABLE — never rename.

interface ManualSurfaceConfig {
    id: ManualSurfaceId;
    dalKey: MenuPresenceSurface;
    label: string;
    explanation: string;
    socialProof?: string;
    icon: React.ReactNode;
    guideSteps: string[];
    openUrl?: string;
}

const MANUAL_SURFACES: ManualSurfaceConfig[] = [
    {
        id: 'googleBusiness',
        dalKey: 'googleBusiness',
        label: 'Google Business',
        explanation: 'Customers searching on Google can open your official business page instantly',
        socialProof: 'Most businesses add their official page to Google',
        icon: <LuGlobe size={16} />,
        guideSteps: [
            'Open your Google Business profile',
            'Click "Edit profile"',
            'Paste your official business link in the Website field',
        ],
        openUrl: 'https://business.google.com',
    },
    {
        id: 'appleBusiness',
        dalKey: 'appleBusiness',
        label: 'Apple Business Connect',
        explanation: 'Customers using Apple Maps can open your official business page',
        icon: <LuMap size={16} />,
        guideSteps: [
            'Open Apple Business Connect and choose your location',
            'Open the location details or an approved action',
            'Add your official business link and submit the change',
        ],
        openUrl: 'https://businessconnect.apple.com',
    },
    {
        id: 'bingPlaces',
        dalKey: 'bingPlaces',
        label: 'Bing Places',
        explanation: 'Customers searching on Bing can open your official business page',
        icon: <LuSearch size={16} />,
        guideSteps: [
            'Open Bing Places and choose your business',
            'Edit the business profile information',
            'Add your official business link as the website or menu link and publish',
        ],
        openUrl: 'https://www.bingplaces.com',
    },
    {
        id: 'instagramBio',
        dalKey: 'instagramBio',
        label: 'Instagram Bio',
        explanation: 'Add your official business link to your bio so followers can open it',
        icon: <LuInstagram size={16} />,
        guideSteps: [
            'Open Instagram and go to your profile',
            'Tap "Edit Profile"',
            'Paste your official business link in the Website field',
        ],
        openUrl: 'https://instagram.com',
    },
    {
        id: 'whatsappProfile',
        dalKey: 'whatsappProfile',
        label: 'WhatsApp Profile',
        explanation: 'Customers messaging you can quickly view your official business page',
        icon: <LuMessageCircle size={16} />,
        guideSteps: [
            'Open WhatsApp Business → Settings',
            'Tap "Business Profile"',
            'Paste your official business link in the website or description field',
        ],
    },
];

// ── Auto-detected surface helpers ────────────────────────────

interface AutoSurface {
    id: string;
    label: string;
    active: boolean;
    description: string;
    icon: React.ReactNode;
}

function buildAutoSurfaces(data: UseMenuListData): AutoSurface[] {
    return [
        {
            id: 'tableQr',
            label: 'Table QR',
            active: data.hasPublishedMenu,
            description: data.hasPublishedMenu ? 'QR ready to print' : 'Publish your menu first',
            icon: <LuQrCode size={16} />,
        },
        {
            id: 'digitalScreens',
            label: 'Digital Screens',
            active: data.hasScreen,
            description: data.hasScreen ? 'Screen set up' : 'Not set up yet',
            icon: <LuMonitor size={16} />,
        },
        {
            id: 'feedbackQr',
            label: 'Feedback QR',
            active: data.hasFeedbackEnabled && data.hasPublishedMenu,
            description: data.hasFeedbackEnabled && data.hasPublishedMenu ? 'Feedback available' : 'Not ready yet',
            icon: <LuMessageCircle size={16} />,
        },
    ];
}

// ── Component ────────────────────────────────────────────────

export default function PresenceMonitor({ data, storeDetails }: PresenceMonitorProps) {
    const { setStoreDetails } = useContext(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const [updating, setUpdating] = useState<string | null>(null);
    const [localPresence, setLocalPresence] = useState<Record<string, string | undefined>>(
        storeDetails.menuPresence || {}
    );
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
    const currentStoreIdRef = useRef(storeDetails.storeId);

    useEffect(() => {
        currentStoreIdRef.current = storeDetails.storeId;
        setLocalPresence(storeDetails.menuPresence || {});
        setUpdating(null);
        setExpandedGuide(null);
    }, [storeDetails.storeId, storeDetails.menuPresence]);

    const autoSurfaces = buildAutoSurfaces(data);
    const isManualActive = (id: string) => isMenuPresenceConfirmed(localPresence[id]);

    const manualActiveCount = MANUAL_SURFACES.filter(s => isManualActive(s.id)).length;
    const autoActiveCount = autoSurfaces.filter(s => s.active).length;
    const totalActive = manualActiveCount + autoActiveCount;
    const totalSurfaces = MANUAL_SURFACES.length + autoSurfaces.length;
    const allActive = totalActive === totalSurfaces;
    const activationSummary = buildStarterActivationSummary(storeDetails);
    const showActivationSummary = activationSummary.appliesToStarterActivation
        || activationSummary.recordedSignals.length > 0;
    const primaryTagStyle = {
        backgroundColor: token.colorPrimaryBg,
        borderColor: token.colorPrimaryBorder,
        color: token.colorPrimaryText,
    };
    const successTagStyle = {
        backgroundColor: token.colorSuccessBg,
        borderColor: token.colorSuccessBorder,
        color: token.colorSuccessText,
    };

    // Find first incomplete manual surface for "Start here" / "Next" highlighting
    const nextManualSurface = MANUAL_SURFACES.find(s => !isManualActive(s.id));

    const buildPresenceLogContext = (action: 'confirm' | 'copy' | 'open' | 'remove', surface?: ManualSurfaceConfig) => ({
        ...getBoundedUseMenuListStringContext('storeId', storeDetails.storeId),
        ...getBoundedUseMenuListStringContext('tenantId', (storeDetails as any).tenantId),
        ...getBoundedUseMenuListStringContext('projectId', data.projectId),
        ...getBoundedUseMenuListStringContext('menuLink', data.menuLink),
        ...getBoundedUseMenuListStringContext('obpLink', data.obpLink),
        ...getBoundedUseMenuListStringContext('openUrl', surface?.openUrl),
        ...getBoundedUseMenuListStringContext('surfaceId', surface?.id),
        ...getBoundedUseMenuListStringContext('surfaceKey', surface?.dalKey),
        action,
        autoActiveCount,
        hasFeedbackEnabled: data.hasFeedbackEnabled,
        hasPublishedMenu: data.hasPublishedMenu,
        hasScreen: data.hasScreen,
        hasStarterActivationSignal: Boolean(surface && STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE[surface.dalKey]),
        manualActiveCount,
        recordsStarterActivationSignal: Boolean(surface && shouldRecordStarterActivationSignal(storeDetails)),
        totalActive,
        totalSurfaces,
    });

    const handleOpenExternalSurface = (surface: ManualSurfaceConfig) => {
        if (!surface.openUrl) return;
        try {
            openIsolatedBrowserUrl(surface.openUrl);
        } catch (error) {
            logUseMenuListFailure('use_menulist_presence_external_open_failed', error, buildPresenceLogContext('open', surface));
            message.error('Failed to open link');
        }
    };

    const handleCopyAndExpand = async (surface: ManualSurfaceConfig) => {
        const sourcedObpLink = withAnalyticsSource(data.obpLink, 'copy_link');
        try {
            await copyUseMenuListPresenceLink(sourcedObpLink);
            message.success('Official business link copied');
        } catch (error) {
            logUseMenuListFailure('use_menulist_presence_official_link_copy_failed', error, {
                ...buildPresenceLogContext('copy', surface),
                hasClipboardWrite: hasUseMenuListPresenceClipboardWrite(),
                hasCopyFallback: hasUseMenuListPresenceCopyFallback(),
            });
            message.error('Failed to copy');
        }
        setExpandedGuide(surface.id);
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
                'use_menulist_presence_confirm_update_rejected',
            );
            setStoreDetails((current: any) => applyStarterPresenceUpdateToStoreDetails(
                current,
                result.surface,
                result.confirmed,
                result.recordedAt,
                result.starterSignal,
                result.storeId,
            ));
            if (String(currentStoreIdRef.current) === String(result.storeId)) {
                setLocalPresence(prev => ({ ...prev, [surface.id]: result.recordedAt }));
                message.success(`${surface.label} — official link added`);
                setExpandedGuide(null);
            }
        } catch (error) {
            logUseMenuListFailure('use_menulist_presence_confirm_failed', error, buildPresenceLogContext('confirm', surface));
            message.error('Failed to update');
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
                'use_menulist_presence_remove_update_rejected',
            );
            setStoreDetails((current: any) => applyStarterPresenceUpdateToStoreDetails(
                current,
                result.surface,
                result.confirmed,
                result.recordedAt,
                result.starterSignal,
                result.storeId,
            ));
            if (String(currentStoreIdRef.current) === String(result.storeId)) {
                setLocalPresence(prev => {
                    const next = { ...prev };
                    delete next[surface.id];
                    return next;
                });
            }
        } catch (error) {
            logUseMenuListFailure('use_menulist_presence_remove_failed', error, buildPresenceLogContext('remove', surface));
            message.error('Failed to update');
        } finally {
            setUpdating(null);
        }
    };

    // ── Render ───────────────────────────────────────────────

    return (
        <Card
            size="small"
            style={{ marginBottom: 24 }}
            styles={{ body: { padding: 16 } }}
        >
            <Flex vertical gap={14}>
                {/* Header */}
                <Flex justify="space-between" align="center" gap={12} wrap="wrap">
                    <Flex vertical gap={2}>
                        <Text strong style={{ fontSize: 14 }}>Make your business easy to find</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Add your official page to the places customers already use
                        </Text>
                    </Flex>
                    <Tag style={{ ...(allActive ? successTagStyle : {}), margin: 0 }}>
                        {allActive
                            ? 'All set'
                            : `${totalActive} ready/confirmed`
                        }
                    </Tag>
                </Flex>

                <Text type="secondary" style={{ fontSize: 12 }}>
                    Some steps are recorded by MenuList. External platforms are owner-confirmed.
                </Text>

                {showActivationSummary && (
                    <Flex
                        vertical
                        gap={8}
                        style={{
                            background: token.colorInfoBg,
                            border: `1px solid ${token.colorInfoBorder}`,
                            borderRadius: 6,
                            padding: '10px 12px',
                        }}
                    >
                        <Flex align="center" gap={8} justify="space-between" wrap="wrap">
                            <Flex align="center" gap={6}>
                                <LuInfo size={14} style={{ color: token.colorInfo }} />
                                <Text strong style={{ fontSize: 12 }}>Activation proof</Text>
                            </Flex>
                            <Tag style={{ margin: 0 }} color={activationSummary.activated ? 'success' : 'processing'}>
                                {activationSummary.activated
                                    ? `${activationSummary.target} steps done`
                                    : `${Math.min(activationSummary.signalCount, activationSummary.target)} of ${activationSummary.target} done`
                                }
                            </Tag>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {activationSummary.signalCount > 0
                                ? `How we know: MenuList recorded ${activationSummary.systemRecordedCount}, owner confirmed ${activationSummary.ownerConfirmedCount}.`
                                : 'No activation action recorded yet. Start with QR, WhatsApp, or one discovery placement.'
                            }
                        </Text>
                        {activationSummary.recordedSignals.length > 0 && (
                            <Flex gap={6} wrap="wrap">
                                {activationSummary.recordedSignals.slice(0, 4).map((signal) => (
                                    <Tag
                                        key={signal.signal}
                                        style={{ margin: 0 }}
                                        color={signal.evidenceType === 'menulist_recorded' ? 'blue' : 'gold'}
                                    >
                                        {signal.label}
                                    </Tag>
                                ))}
                            </Flex>
                        )}
                    </Flex>
                )}

                {/* All-complete celebration */}
                {allActive && (
                    <Flex
                        gap={6} align="center"
                        style={{ background: token.colorSuccessBg, borderRadius: 6, padding: '6px 10px', border: `1px solid ${token.colorSuccessBorder}` }}
                    >
                        <LuCheck size={14} style={{ color: token.colorSuccess }} />
                        <Text style={{ fontSize: 12, color: token.colorSuccess }}>
                            Your business is easy to find everywhere customers look
                        </Text>
                    </Flex>
                )}

                {/* ── Online Discovery (manual surfaces) ──────── */}
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Online discovery
                </Text>

                {MANUAL_SURFACES.map(surface => {
                    const active = isManualActive(surface.id);
                    const isNext = !active && surface.id === nextManualSurface?.id;
                    const guideOpen = expandedGuide === surface.id;

                    return (
                        <div key={surface.id}>
                            <Flex
                                gap={10} align="center" wrap="wrap"
                                style={{
                                    padding: '8px 0',
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                }}
                            >
                                {/* Status icon */}
                                <div style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>
                                    {active
                                        ? <LuCheck size={16} style={{ color: token.colorSuccess }} />
                                        : <LuAlertTriangle size={16} style={{ color: token.colorWarning }} />
                                    }
                                </div>

                                {/* Surface icon */}
                                <div style={{ width: 20, textAlign: 'center', flexShrink: 0, color: token.colorTextTertiary }}>
                                    {surface.icon}
                                </div>

                                {/* Label + explanation */}
                                <Flex vertical gap={0} style={{ flex: 1, minWidth: 0 }}>
                                    <Flex gap={6} align="center">
                                        <Text style={{ fontSize: 13 }}>{surface.label}</Text>
                                        {isNext && manualActiveCount === 0 && (
                                            <Tag style={{ ...primaryTagStyle, fontSize: 10, lineHeight: '16px', margin: 0 }}>Start here</Tag>
                                        )}
                                        {isNext && manualActiveCount > 0 && (
                                            <Tag style={{ ...primaryTagStyle, fontSize: 10, lineHeight: '16px', margin: 0 }}>Next</Tag>
                                        )}
                                    </Flex>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {active ? 'Official link added' : surface.explanation}
                                    </Text>
                                    {active && (
                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                            Owner confirmed this external placement.
                                        </Text>
                                    )}
                                    {!active && surface.socialProof && (
                                        <Text type="secondary" style={{ fontSize: 10, fontStyle: 'italic' }}>
                                            {surface.socialProof}
                                        </Text>
                                    )}
                                </Flex>

                                {/* Actions */}
                                {!active && (
                                    <Button
                                        size="small"
                                        type={isNext ? 'primary' : 'default'}
                                        icon={<LuClipboard size={12} />}
                                        onClick={() => handleCopyAndExpand(surface)}
                                        style={{ flex: '0 1 150px', fontSize: 11, minHeight: 32, whiteSpace: 'normal' }}
                                    >
                                        Add to {surface.label.split(' ')[0]}
                                    </Button>
                                )}

                                {active && (
                                    <Button
                                        size="small" type="text"
                                        icon={<LuX size={12} />}
                                        loading={updating === surface.id}
                                        onClick={() => handleRemove(surface)}
                                        style={{ color: token.colorTextTertiary, flexShrink: 0, fontSize: 11, minHeight: 32 }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </Flex>

                            {/* Inline micro-guide (expandable) */}
                            {guideOpen && !active && (
                                <Flex
                                    vertical gap={8}
                                    style={{
                                        background: token.colorFillAlter,
                                        borderRadius: 6,
                                        padding: '10px 12px',
                                        marginTop: 4,
                                        marginLeft: 50,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 500 }}>How to add:</Text>
                                    <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.8 }}>
                                        {surface.guideSteps.map((step, i) => (
                                            <li key={i}>{step}</li>
                                        ))}
                                    </ol>
                                    <Flex gap={8} wrap="wrap">
                                        {surface.openUrl && (
                                            <Button
                                                size="small" type="text"
                                                icon={<LuExternalLink size={12} />}
                                                onClick={() => handleOpenExternalSurface(surface)}
                                                style={{ fontSize: 11, minHeight: 32 }}
                                            >
                                                Open {surface.label.split(' ')[0]}
                                            </Button>
                                        )}
                                        <Button
                                            size="small" type="primary"
                                            loading={updating === surface.id}
                                            onClick={() => handleConfirm(surface)}
                                            style={{ fontSize: 11, minHeight: 32 }}
                                        >
                                            Mark as Added
                                        </Button>
                                    </Flex>
                                </Flex>
                            )}
                        </div>
                    );
                })}

                {/* ── Inside Your Store (auto-detected) ────────── */}
                <Text
                    type="secondary"
                    style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}
                >
                    Inside your store
                </Text>

                {autoSurfaces.map(surface => (
                    <Flex
                        key={surface.id}
                        gap={10} align="center"
                        style={{ padding: '6px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
                    >
                        <div style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>
                            {surface.active
                                ? <LuCheck size={16} style={{ color: token.colorSuccess }} />
                                : <LuAlertTriangle size={16} style={{ color: token.colorWarning }} />
                            }
                        </div>
                        <div style={{ width: 20, textAlign: 'center', flexShrink: 0, color: token.colorTextTertiary }}>
                            {surface.icon}
                        </div>
                        <Flex vertical gap={0} style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 13 }}>{surface.label}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{surface.description}</Text>
                        </Flex>
                        {surface.active && (
                            <Tag style={{ ...primaryTagStyle, fontSize: 10, margin: 0 }}>MenuList</Tag>
                        )}
                    </Flex>
                ))}
            </Flex>
        </Card>
    );
}
