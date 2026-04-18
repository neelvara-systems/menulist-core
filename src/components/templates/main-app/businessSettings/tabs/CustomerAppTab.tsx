'use client';

/**
 * Customer App — Business Settings tab
 *
 * Self-contained (manages its own state + save). Reads initial values from
 * storeDetails and calls updatePWASettings() DAL on save. Icon override UI is
 * NOT included here on day one — if owners want a custom PWA icon they can do
 * so via Public Presence / logo; the generated letter-icon fallback covers the
 * rest. Adding override upload is a Phase 7B enhancement.
 */

import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Card, Flex, Input, Space, Switch, Typography, message } from 'antd';
import { LuSmartphone } from 'react-icons/lu';
import { FEATURE_FLAGS } from '@config/features';
import { updatePWASettings, resolvePWASettings } from '@database/pwa';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';

const { Title, Text, Paragraph } = Typography;

interface CustomerAppTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

export default function CustomerAppTab({ scrollRef }: CustomerAppTabProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);

    const initial = useMemo(() => resolvePWASettings(storeDetails), [storeDetails]);
    const [enableInstallableApp, setEnableInstallableApp] = useState(initial.enableInstallableApp);
    const [promoteInstallation, setPromoteInstallation] = useState(initial.promoteInstallation);
    const [pwaShortName, setPwaShortName] = useState(initial.pwaShortName);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Re-sync when storeDetails changes (e.g., store switch)
    useEffect(() => {
        setEnableInstallableApp(initial.enableInstallableApp);
        setPromoteInstallation(initial.promoteInstallation);
        setPwaShortName(initial.pwaShortName);
        setDirty(false);
    }, [initial.enableInstallableApp, initial.promoteInstallation, initial.pwaShortName]);

    const markDirty = () => setDirty(true);

    const handleSave = async () => {
        if (!storeDetails?.storeId) return;
        setSaving(true);
        try {
            await updatePWASettings(storeDetails.storeId, {
                enableInstallableApp,
                promoteInstallation,
                pwaShortName: pwaShortName.trim(),
            });
            message.success('Customer App settings saved');
            setDirty(false);
        } catch (err) {
            console.error('[CustomerAppTab] save failed:', err);
            message.error('Could not save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) {
        return (
            <div ref={scrollRef}>
                <Card>
                    <Alert
                        type="info"
                        showIcon
                        message="Customer App is not available yet"
                        description="This feature is currently disabled on the platform."
                    />
                </Card>
            </div>
        );
    }

    return (
        <div ref={scrollRef}>
            <Card
                title={
                    <Flex align="center" gap={10}>
                        <LuSmartphone size={20} />
                        <span>Customer App</span>
                    </Flex>
                }
                extra={
                    <button
                        type="button"
                        disabled={!dirty || saving}
                        onClick={handleSave}
                        style={{
                            padding: '8px 18px',
                            background: dirty ? '#0f172a' : '#cbd5e1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: dirty && !saving ? 'pointer' : 'not-allowed',
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                }
            >
                <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                    Let customers install your menu as an app on their phone home screen.
                    One tap to reopen. No app store required.
                </Paragraph>

                {/* Master enable */}
                <Flex justify="space-between" align="flex-start" style={{ marginBottom: 20 }}>
                    <div style={{ maxWidth: 560 }}>
                        <Text strong>Enable Customer App</Text>
                        <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                            When ON, your menu is installable as a PWA. Customers see an
                            &ldquo;Install&rdquo; prompt after visiting your menu a few times.
                            Turn OFF to hide the app entirely.
                        </Paragraph>
                    </div>
                    <Switch
                        checked={enableInstallableApp}
                        onChange={(v) => {
                            setEnableInstallableApp(v);
                            markDirty();
                        }}
                    />
                </Flex>

                {/* Promote install */}
                <Flex justify="space-between" align="flex-start" style={{ marginBottom: 20, opacity: enableInstallableApp ? 1 : 0.5 }}>
                    <div style={{ maxWidth: 560 }}>
                        <Text strong>Show install prompt</Text>
                        <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                            Show the bottom banner that invites customers to install after their
                            3rd visit. Turn OFF to keep the app installable but never auto-prompt.
                        </Paragraph>
                    </div>
                    <Switch
                        checked={promoteInstallation}
                        disabled={!enableInstallableApp}
                        onChange={(v) => {
                            setPromoteInstallation(v);
                            markDirty();
                        }}
                    />
                </Flex>

                {/* Short name override */}
                <div style={{ opacity: enableInstallableApp ? 1 : 0.5 }}>
                    <Text strong>Home screen name</Text>
                    <Paragraph type="secondary" style={{ margin: '4px 0 8px' }}>
                        Short name shown under the icon. Keep it short — 12 characters max.
                        Leave blank to auto-use the first word of your business name.
                    </Paragraph>
                    <Input
                        value={pwaShortName}
                        maxLength={12}
                        placeholder="e.g. Joe's"
                        disabled={!enableInstallableApp}
                        onChange={(e) => {
                            setPwaShortName(e.target.value);
                            markDirty();
                        }}
                        style={{ maxWidth: 280 }}
                        showCount
                    />
                </div>

                <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 28 }}
                    message="How it looks to customers"
                    description={
                        <Space direction="vertical" size={4}>
                            <Text>
                                • Android / Chrome: native install popup with your icon and name
                            </Text>
                            <Text>
                                • iPhone Safari: step-by-step guide to &ldquo;Add to Home Screen&rdquo;
                            </Text>
                            <Text>
                                • Once installed, the app opens full-screen from the home screen
                            </Text>
                        </Space>
                    }
                />
            </Card>
        </div>
    );
}
