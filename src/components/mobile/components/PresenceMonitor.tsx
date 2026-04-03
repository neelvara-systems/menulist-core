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
    label: string;
    explanation: string;
    icon: React.ReactNode;
    guideSteps: string[];
    openUrl?: string;
}

const MANUAL_SURFACES: ManualSurfaceConfig[] = [
    {
        id: 'googleBusiness',
        dalKey: 'googleBusiness',
        label: 'Google Business',
        explanation: 'Customers searching on Google can see your menu.',
        icon: <LuGlobe size={16} />,
        guideSteps: ['Open Google Business profile', 'Click "Edit profile"', 'Paste menu link in Website field'],
        openUrl: 'https://business.google.com',
    },
    {
        id: 'instagramBio',
        dalKey: 'instagramBio',
        label: 'Instagram Bio',
        explanation: 'Add the menu link to your bio for followers.',
        icon: <FaInstagram size={16} />,
        guideSteps: ['Open Instagram and go to your profile', 'Tap "Edit Profile"', 'Paste menu link in Website field'],
        openUrl: 'https://instagram.com',
    },
    {
        id: 'whatsappProfile',
        dalKey: 'whatsappProfile',
        label: 'WhatsApp Profile',
        explanation: 'Customers messaging you can open your menu.',
        icon: <LuMessageCircle size={16} />,
        guideSteps: ['Open WhatsApp Business settings', 'Tap "Business Profile"', 'Paste menu link in description'],
    },
];

export default function MobilePresenceMonitor({
    hasPublishedMenu,
    hasScreen,
    hasFeedbackEnabled,
    storeDetails,
    menuLink,
}: MobilePresenceMonitorProps) {
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
            label: 'Table QR',
            active: hasPublishedMenu,
            desc: hasPublishedMenu ? 'QR is ready to print.' : 'Publish the menu first.',
            icon: <LuQrCode size={16} />,
        },
        {
            id: 'digitalScreens',
            label: 'Screens',
            active: hasScreen,
            desc: hasScreen ? 'Digital screen is connected.' : 'Not set up yet.',
            icon: <LuMonitor size={16} />,
        },
        {
            id: 'feedbackQr',
            label: 'Feedback',
            active: hasFeedbackEnabled,
            desc: hasFeedbackEnabled ? 'Feedback is available.' : 'Not enabled yet.',
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
            Toast.show({ content: 'Menu link copied', duration: 1000 });
        } catch {
            Toast.show({ content: 'Could not copy the menu link', duration: 1000 });
        }
        setExpandedGuide(surface.id);
    };

    const handleConfirm = async (surface: ManualSurfaceConfig) => {
        setUpdating(surface.id);
        try {
            await updateMenuPresence(storeDetails.storeId, surface.dalKey, true);
            setLocalPresence((previous) => ({ ...previous, [surface.id]: new Date().toISOString() }));
            Toast.show({ content: `${surface.label} updated`, duration: 1500 });
            setExpandedGuide(null);
        } catch {
            Toast.show({ content: 'Failed to update', duration: 1500 });
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
            Toast.show({ content: `${surface.label} removed`, duration: 1500 });
        } catch {
            Toast.show({ content: 'Failed to update', duration: 1500 });
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
                            Make your menu easy to find
                        </Title>
                        <Text type="secondary">Add your menu to the places customers already use.</Text>
                    </Flex>
                    <Tag color={allDone ? 'success' : 'default'}>
                        {allDone ? 'All set' : `${totalActive} places active`}
                    </Tag>
                </Flex>

                <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                    <Flex gap={4} vertical>
                        <Text strong>Online discovery</Text>
                        <Text type="secondary">Manual places where your team pastes the live menu link once.</Text>
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
                                                {active ? 'Menu link added.' : surface.explanation}
                                            </Text>
                                            {isNext ? <Tag color="processing">{manualActiveCount === 0 ? 'Start here' : 'Next'}</Tag> : null}
                                        </Flex>
                                        {guideOpen && !active ? (
                                            <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                                                <Flex gap={12} vertical>
                                                    <Flex gap={4} vertical>
                                                        <Text strong>How to add it</Text>
                                                        <List>
                                                            {surface.guideSteps.map((step, index) => (
                                                                <List.Item key={`${surface.id}-${index}`}>
                                                                    <Text>{`${index + 1}. ${step}`}</Text>
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
                                                                    <Text>Open</Text>
                                                                </Flex>
                                                            </Button>
                                                        ) : null}
                                                        <Button
                                                            color="primary"
                                                            loading={updating === surface.id}
                                                            onClick={() => handleConfirm(surface)}
                                                            size="small"
                                                        >
                                                            Mark as Added
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
                                            Remove
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
                                                <Text>Add</Text>
                                            </Flex>
                                        </Button>
                                    )
                                }
                                prefix={
                                    <Flex align="center" gap={8}>
                                        {active ? <LuCheck color="#16a34a" size={16} /> : <LuAlertTriangle color="#d97706" size={16} />}
                                        {surface.icon}
                                    </Flex>
                                }
                                title={
                                    <Flex gap={8} wrap="wrap">
                                        <Text strong>{surface.label}</Text>
                                        {active ? <Tag color="success">Added</Tag> : null}
                                    </Flex>
                                }
                            />
                        );
                    })}
                </List>

                <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                    <Flex gap={4} vertical>
                        <Text strong>Inside your store</Text>
                        <Text type="secondary">These surfaces are detected automatically from your setup.</Text>
                    </Flex>
                </Card>

                <List>
                    {autoSurfaces.map((surface) => (
                        <List.Item
                            key={surface.id}
                            description={<Text type="secondary">{surface.desc}</Text>}
                            extra={surface.active ? <Tag color="processing">Auto</Tag> : null}
                            prefix={
                                <Flex align="center" gap={8}>
                                    {surface.active ? <LuCheck color="#16a34a" size={16} /> : <LuAlertTriangle color="#d97706" size={16} />}
                                    {surface.icon}
                                </Flex>
                            }
                            title={<Text strong>{surface.label}</Text>}
                        />
                    ))}
                </List>

                {allDone ? (
                    <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                        <Flex align="center" gap={8}>
                            <LuCheck color="#16a34a" size={16} />
                            <Text>Your menu is easy to find everywhere customers look.</Text>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Card>
    );
}
