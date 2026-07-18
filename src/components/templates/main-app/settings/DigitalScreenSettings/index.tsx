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

import { FEATURE_FLAGS } from "@config/features";
import { PERMISSIONS } from "@constant/permissions";
import { assertDigitalScreenMutationSucceeded, getScreenState, initializeScreenState, updateScreenSettings } from "@database/campaigns";
import { trackOwnerControlUsage } from "@database/ownerControlUsage";
import { generateOBPUrl } from "@lib/obp/generateOBPUrl";
import { hasAnyPermission } from "@lib/permissions/permissionRequirements";
import { getBoundedScreenStringContext, logScreenSettingsFailure } from "@lib/screen/screenDiagnostics";
import { buildScreenUrl } from "@lib/screen/utils";
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider";
import { ScreenSlide } from "@type/campaigns";
import { Card, Divider, Empty, message, Space, Spin, Switch, theme, Typography } from "antd";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { LuCheckCircle } from "react-icons/lu";
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
    const { storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const canAccessDigitalScreens = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_DIGITAL_SCREENS]);
    const publicBaseUrl = useMemo(
        () => generateOBPUrl(storeDetails?.subdomain || '', storeDetails?.customDomain),
        [storeDetails?.customDomain, storeDetails?.subdomain]
    );
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<ScreenSettingsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const loadRequestRef = useRef(0);

    // Fetch settings on mount
    useEffect(() => {
        if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !canAccessDigitalScreens) {
            loadRequestRef.current += 1;
            setSettings(null);
            setError(null);
            setLoading(false);
            return;
        }
        void fetchSettings();
    }, [canAccessDigitalScreens, publicBaseUrl]);

    const fetchSettings = async () => {
        const requestId = ++loadRequestRef.current;
        try {
            setLoading(true);

            // Use DAL directly (follows existing pattern from projects/tickets)
            let screenState = await getScreenState();

            if (!screenState) {
                screenState = await initializeScreenState();
            }
            if (requestId !== loadRequestRef.current) return;

            setSettings({
                enabled: screenState.enabled,
                screenToken: screenState.screenToken,
                screenUrl: buildScreenUrl(screenState.screenToken, publicBaseUrl),
                ownerOverrideEnabled: screenState.ownerOverrideEnabled,
                pinnedSlides: screenState.pinnedSlides || [],
                maxUploads: FEATURE_FLAGS.DIGITAL_SCREENS_MAX_UPLOADS,
                uploadExpiryDays: FEATURE_FLAGS.DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS,
                screenLastSeenAt: screenState.screenLastSeenAt || null,
            });
            setError(null);
        } catch (err) {
            if (requestId !== loadRequestRef.current) return;
            setError('Unable to load screen settings');
            logScreenSettingsFailure('digital_screen_settings_load_failed', err, {
                ...getBoundedScreenStringContext('publicBaseUrl', publicBaseUrl),
                ...getBoundedScreenStringContext('subdomain', storeDetails?.subdomain),
                hasCustomDomain: Boolean(storeDetails?.customDomain),
            });
        } finally {
            if (requestId === loadRequestRef.current) setLoading(false);
        }
    };

    const handleOverrideToggle = async (enabled: boolean) => {
        try {
            // Track screen override toggle (Authority Maturation Doctrine)
            void trackOwnerControlUsage('screenOverride', {
                previousValue: settings?.ownerOverrideEnabled || false,
                newValue: enabled,
            });

            // Use DAL directly (follows existing pattern)
            const updateResult = await updateScreenSettings({ ownerOverrideEnabled: enabled });
            assertDigitalScreenMutationSucceeded(
                updateResult,
                'desktop_digital_screen_override_update_rejected',
            );

            setSettings(prev => prev ? { ...prev, ownerOverrideEnabled: enabled } : null);
            message.success(enabled ? 'Only custom slides is on' : 'Menu highlights restored');
        } catch (err) {
            logScreenSettingsFailure('digital_screen_settings_override_toggle_failed', err, {
                desiredEnabled: enabled,
                currentEnabled: settings?.ownerOverrideEnabled,
                hasSettings: Boolean(settings),
                pinnedSlideCount: settings?.pinnedSlides.length ?? 0,
            });
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
        void fetchSettings(); // Refresh to get new slide
    };

    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !canAccessDigitalScreens) {
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
                    <LuCheckCircle style={{ color: token.colorSuccess }} />
                    <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
                        Running
                    </Text>
                </Space>
            }
            className="digital-screen-settings"
        >
            <div style={{
                marginBottom: 16,
                padding: '12px 14px',
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 8,
            }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>How to manage content</Text>
                <Text type="secondary">
                    Menu Board follows your active store menu automatically. Highlights follows the same menu and can also show the custom slides you upload here.
                </Text>
            </div>

            {/* Screen Link Section */}
            <ScreenLink
                screenUrl={settings.screenUrl}
                screenLastSeenAt={settings.screenLastSeenAt}
            />

            <Divider />

            {/* Current Slides Section */}
            <CurrentSlides
                ownerOverrideEnabled={settings.ownerOverrideEnabled}
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
                        <Text strong>Only custom slides</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Highlights will show uploaded slides only. Menu Board keeps showing the menu.
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
