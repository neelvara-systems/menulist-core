"use client";

/**
 * Digital Screen Settings Component
 * Per spec: Settings > Digital Screen section
 * 
 * Features:
 * - View current slides (read-only)
 * - Upload custom images (max 3)
 * - Copy screen link
 * - Toggle owner override mode
 * 
 * Follows existing pattern: Uses DAL functions directly, not API routes
 */

import { CheckCircleOutlined } from "@ant-design/icons";
import { FEATURE_FLAGS } from "@config/features";
import { getScreenState, initializeScreenState, updateScreenSettings } from "@database/campaigns";
import { trackOwnerControlUsage } from "@database/ownerControlUsage";
import { buildScreenUrl } from "@lib/screen/utils";
import { ScreenSlide } from "@type/campaigns";
import { Card, Divider, Empty, message, Space, Spin, Switch, theme, Typography } from "antd";
import { useEffect, useState } from "react";
import CurrentSlides from "./CurrentSlides";
import OwnerUploads from "./OwnerUploads";
import ScreenLink from "./ScreenLink";

const { Text } = Typography;

interface ScreenSettingsData {
    enabled: boolean;
    screenToken: string;
    screenUrl: string;
    ownerOverrideEnabled: boolean;
    pinnedSlides: ScreenSlide[];
    maxUploads: number;
    uploadExpiryDays: number;
    screenLastSeenAt?: any;
}

export default function DigitalScreenSettings() {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<ScreenSettingsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);

            // Use DAL directly (follows existing pattern from projects/tickets)
            let screenState = await getScreenState();

            if (!screenState) {
                screenState = await initializeScreenState();
            }

            setSettings({
                enabled: screenState.enabled,
                screenToken: screenState.screenToken,
                screenUrl: buildScreenUrl(screenState.screenToken),
                ownerOverrideEnabled: screenState.ownerOverrideEnabled,
                pinnedSlides: screenState.pinnedSlides || [],
                maxUploads: FEATURE_FLAGS.DIGITAL_SCREENS_MAX_UPLOADS,
                uploadExpiryDays: FEATURE_FLAGS.DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS,
                screenLastSeenAt: screenState.screenLastSeenAt || null,
            });
            setError(null);
        } catch (err) {
            setError('Unable to load screen settings');
            console.error('[DigitalScreenSettings] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOverrideToggle = async (enabled: boolean) => {
        try {
            // Track screen override toggle (Authority Maturation Doctrine)
            trackOwnerControlUsage('screenOverride', {
                previousValue: settings?.ownerOverrideEnabled || false,
                newValue: enabled,
            });

            // Use DAL directly (follows existing pattern)
            await updateScreenSettings({ ownerOverrideEnabled: enabled });

            setSettings(prev => prev ? { ...prev, ownerOverrideEnabled: enabled } : null);
            message.success(enabled ? 'Your uploads will be prioritized' : 'System content restored');
        } catch (err) {
            message.error('Failed to update setting');
        }
    };

    const handleSlideDeleted = (slideId: string) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                pinnedSlides: prev.pinnedSlides.filter(s => s.id !== slideId)
            };
        });
    };

    const handleSlideUploaded = () => {
        fetchSettings(); // Refresh to get new slide
    };

    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED) {
        return null;
    }

    if (loading) {
        return (
            <Card title="Digital Screen" className="digital-screen-settings">
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                </div>
            </Card>
        );
    }

    if (error || !settings) {
        return (
            <Card title="Digital Screen" className="digital-screen-settings">
                <Empty description={error || 'Unable to load settings'} />
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space>
                    <span>Digital Screen</span>
                    <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                    <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
                        Running
                    </Text>
                </Space>
            }
            className="digital-screen-settings"
        >
            {/* Screen Activity Status — Per ChatGPT review v3 */}
            {settings.screenLastSeenAt && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                    padding: '8px 12px',
                    background: token.colorSuccessBg,
                    borderRadius: 8,
                    border: `1px solid ${token.colorSuccessBorder}`,
                }}>
                    <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: token.colorSuccess,
                        display: 'inline-block',
                    }} />
                    <Text style={{ fontSize: 13 }}>
                        Screen active — last seen{' '}
                        {(() => {
                            try {
                                const ts = settings.screenLastSeenAt?.toDate?.() ||
                                    new Date(settings.screenLastSeenAt?.seconds * 1000 || settings.screenLastSeenAt);
                                const diff = Date.now() - ts.getTime();
                                const hours = Math.floor(diff / 3600000);
                                if (hours < 1) return 'less than an hour ago';
                                if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                                const days = Math.floor(hours / 24);
                                return `${days} day${days > 1 ? 's' : ''} ago`;
                            } catch {
                                return 'recently';
                            }
                        })()}
                    </Text>
                </div>
            )}

            {/* Screen Link Section */}
            <ScreenLink
                screenUrl={settings.screenUrl}
                screenToken={settings.screenToken}
            />

            <Divider />

            {/* Current Slides Section */}
            <CurrentSlides
                pinnedSlides={settings.pinnedSlides}
                onSlideDeleted={handleSlideDeleted}
            />

            <Divider />

            {/* Owner Uploads Section */}
            <OwnerUploads
                pinnedSlides={settings.pinnedSlides}
                maxUploads={settings.maxUploads}
                uploadExpiryDays={settings.uploadExpiryDays}
                onSlideUploaded={handleSlideUploaded}
                onSlideDeleted={handleSlideDeleted}
            />

            <Divider />

            {/* Owner Override Toggle */}
            <div className="override-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Text strong>Use my designs only</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            When enabled, only your uploaded images will appear
                        </Text>
                    </div>
                    <Switch
                        checked={settings.ownerOverrideEnabled}
                        onChange={handleOverrideToggle}
                    />
                </div>
            </div>

            <style jsx global>{`
                .digital-screen-settings {
                    margin-bottom: 24px;
                }
                .override-section {
                    padding: 16px;
                    background: ${token.colorFillAlter};
                    border: 1px solid ${token.colorBorderSecondary};
                    border-radius: 8px;
                }
            `}</style>
        </Card>
    );
}
