'use client';

/**
 * Menu Presence Monitor — Desktop Component (v2)
 *
 * Guided deployment checklist: "Make your business easy to find."
 * Groups: Online Discovery (manual) + Inside Your Store (auto-detected).
 * Timestamp-only schema: exists = confirmed, missing = not confirmed.
 * Max 6 surfaces forever — do NOT expand.
 *
 * @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
 */

import { type MenuPresenceSurface, updateMenuPresence } from '@database/stores';
import { StoreDataType } from '@type/platform/store';
import { Button, Card, Flex, message, Tag, Typography } from 'antd';
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
    LuX
} from 'react-icons/lu';
import type { ManualSurfaceId } from './presenceTypes';
import type { UseMenuListData } from './types';

const { Text } = Typography;

interface PresenceMonitorProps {
    data: UseMenuListData;
    storeDetails: StoreDataType;
    onCopyLink: (url: string, label: string) => void;
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
        id: 'instagramBio',
        dalKey: 'instagramBio',
        label: 'Instagram Bio',
        explanation: 'Add your official business link to your bio so followers can open it',
        icon: <FaInstagram size={16} />,
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
            description: data.hasScreen ? 'Screen connected' : 'Not set up yet',
            icon: <LuMonitor size={16} />,
        },
        {
            id: 'feedbackQr',
            label: 'Feedback QR',
            active: data.hasFeedbackEnabled,
            description: data.hasFeedbackEnabled ? 'Feedback available' : 'Not enabled',
            icon: <LuMessageCircle size={16} />,
        },
    ];
}

// ── Component ────────────────────────────────────────────────

export default function PresenceMonitor({ data, storeDetails, onCopyLink }: PresenceMonitorProps) {
    const [updating, setUpdating] = useState<string | null>(null);
    const [localPresence, setLocalPresence] = useState<Record<string, string | undefined>>(
        storeDetails.menuPresence || {}
    );
    const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

    const autoSurfaces = buildAutoSurfaces(data);
    const isManualActive = (id: string) => !!localPresence[id];

    const manualActiveCount = MANUAL_SURFACES.filter(s => isManualActive(s.id)).length;
    const autoActiveCount = autoSurfaces.filter(s => s.active).length;
    const totalActive = manualActiveCount + autoActiveCount;
    const totalSurfaces = MANUAL_SURFACES.length + autoSurfaces.length;
    const allActive = totalActive === totalSurfaces;

    // Find first incomplete manual surface for "Start here" / "Next" highlighting
    const nextManualSurface = MANUAL_SURFACES.find(s => !isManualActive(s.id));

    const handleCopyAndExpand = async (surface: ManualSurfaceConfig) => {
        try {
            await navigator.clipboard.writeText(data.obpLink);
            message.success('Official business link copied');
        } catch {
            // Fallback: use onCopyLink which handles failure
            onCopyLink(data.obpLink, 'Official business link');
        }
        setExpandedGuide(surface.id);
    };

    const handleConfirm = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            await updateMenuPresence(storeDetails.storeId, surface.dalKey, true);
            setLocalPresence(prev => ({ ...prev, [surface.id]: new Date().toISOString() }));
            message.success(`${surface.label} — official link added`);
            setExpandedGuide(null);
        } catch {
            message.error('Failed to update');
        } finally {
            setUpdating(null);
        }
    };

    const handleRemove = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            await updateMenuPresence(storeDetails.storeId, surface.dalKey, false);
            setLocalPresence(prev => {
                const next = { ...prev };
                delete next[surface.id];
                return next;
            });
        } catch {
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
                <Flex justify="space-between" align="center">
                    <Flex vertical gap={2}>
                        <Text strong style={{ fontSize: 14 }}>Make your business easy to find</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Add your official page to the places customers already use
                        </Text>
                    </Flex>
                    <Tag color={allActive ? 'green' : 'default'} style={{ margin: 0 }}>
                        {allActive
                            ? 'All set'
                            : `Visible in ${totalActive} place${totalActive !== 1 ? 's' : ''}`
                        }
                    </Tag>
                </Flex>

                {/* All-complete celebration */}
                {allActive && (
                    <Flex
                        gap={6} align="center"
                        style={{ background: '#f6ffed', borderRadius: 6, padding: '6px 10px', border: '1px solid #b7eb8f' }}
                    >
                        <LuCheck size={14} style={{ color: '#52c41a' }} />
                        <Text style={{ fontSize: 12, color: '#52c41a' }}>
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
                                gap={10} align="center"
                                style={{
                                    padding: '8px 0',
                                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                                }}
                            >
                                {/* Status icon */}
                                <div style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>
                                    {active
                                        ? <LuCheck size={16} style={{ color: '#52c41a' }} />
                                        : <LuAlertTriangle size={16} style={{ color: '#faad14' }} />
                                    }
                                </div>

                                {/* Surface icon */}
                                <div style={{ width: 20, textAlign: 'center', flexShrink: 0, color: '#8c8c8c' }}>
                                    {surface.icon}
                                </div>

                                {/* Label + explanation */}
                                <Flex vertical gap={0} style={{ flex: 1, minWidth: 0 }}>
                                    <Flex gap={6} align="center">
                                        <Text style={{ fontSize: 13 }}>{surface.label}</Text>
                                        {isNext && manualActiveCount === 0 && (
                                            <Tag color="blue" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>Start here</Tag>
                                        )}
                                        {isNext && manualActiveCount > 0 && (
                                            <Tag color="blue" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>Next</Tag>
                                        )}
                                    </Flex>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {active ? 'Official link added' : surface.explanation}
                                    </Text>
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
                                        style={{ fontSize: 11 }}
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
                                        style={{ fontSize: 11, color: '#8c8c8c' }}
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
                                        background: 'rgba(0,0,0,0.02)',
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
                                    <Flex gap={8}>
                                        {surface.openUrl && (
                                            <Button
                                                size="small" type="text"
                                                icon={<LuExternalLink size={12} />}
                                                onClick={() => window.open(surface.openUrl, '_blank')}
                                                style={{ fontSize: 11 }}
                                            >
                                                Open {surface.label.split(' ')[0]}
                                            </Button>
                                        )}
                                        <Button
                                            size="small" type="primary"
                                            loading={updating === surface.id}
                                            onClick={() => handleConfirm(surface)}
                                            style={{ fontSize: 11 }}
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
                        style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    >
                        <div style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>
                            {surface.active
                                ? <LuCheck size={16} style={{ color: '#52c41a' }} />
                                : <LuAlertTriangle size={16} style={{ color: '#faad14' }} />
                            }
                        </div>
                        <div style={{ width: 20, textAlign: 'center', flexShrink: 0, color: '#8c8c8c' }}>
                            {surface.icon}
                        </div>
                        <Flex vertical gap={0} style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 13 }}>{surface.label}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{surface.description}</Text>
                        </Flex>
                        {surface.active && (
                            <Tag style={{ fontSize: 10, margin: 0 }} color="blue">Auto</Tag>
                        )}
                    </Flex>
                ))}
            </Flex>
        </Card>
    );
}
