'use client';

/**
 * Customer App — Business Settings tab
 *
 * Self-contained (manages its own state + save). Reads initial values from
 * storeDetails and calls:
 *   - updatePWASettings() DAL on Save (toggles + short name)
 *   - updatePWAIconOverride() DAL on icon save/clear (icon override URL)
 *
 * Owners can paste a Firebase Storage URL for a custom PWA icon. Full upload
 * widget is a Day-Three polish; the URL field already covers the common case
 * (owner uploads elsewhere, pastes the link).
 */

import { FEATURE_FLAGS } from '@config/features';
import { getMenuUrl, normalizeBaseUrl } from '@constant/urls';
import { resolvePWASettings, updatePWAIconOverride, updatePWASettings } from '@database/pwa';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Button, Card, Flex, Input, Space, Switch, Typography, message } from 'antd';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuCopy, LuImage, LuSmartphone } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

interface CustomerAppTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

export default function CustomerAppTab({ scrollRef }: CustomerAppTabProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);

    const initial = useMemo(() => resolvePWASettings(storeDetails), [storeDetails]);
    const initialIconUrl = (storeDetails as any)?.publicPresence?.pwaIconOverrideUrl || '';
    const [enableInstallableApp, setEnableInstallableApp] = useState(initial.enableInstallableApp);
    const [promoteInstallation, setPromoteInstallation] = useState(initial.promoteInstallation);
    const [pwaShortName, setPwaShortName] = useState(initial.pwaShortName);
    const [iconOverrideUrl, setIconOverrideUrl] = useState<string>(initialIconUrl);
    const [savingIcon, setSavingIcon] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Re-sync when storeDetails changes (e.g., store switch)
    useEffect(() => {
        setEnableInstallableApp(initial.enableInstallableApp);
        setPromoteInstallation(initial.promoteInstallation);
        setPwaShortName(initial.pwaShortName);
        setIconOverrideUrl(initialIconUrl);
        setDirty(false);
    }, [initial.enableInstallableApp, initial.promoteInstallation, initial.pwaShortName, initialIconUrl]);

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

    // Direct-install link — bypasses the 3-visit threshold so owners can
    // share a "tap to install" URL via WhatsApp, QR, Google Business, etc.
    // Built from the tenant's own origin (custom domain takes precedence over subdomain).
    const installLink = useMemo(() => {
        const customDomain: string | undefined = (storeDetails as any)?.customDomain;
        const subdomain: string | undefined = storeDetails?.subdomain;
        const base = customDomain
            ? normalizeBaseUrl(customDomain)
            : subdomain
                ? getMenuUrl(subdomain)
                : null;
        if (!base) return null;
        const clean = base.replace(/\/$/, '');
        return `${clean}/?pwa=install`;
    }, [storeDetails]);

    const handleCopyInstallLink = async () => {
        if (!installLink) return;
        try {
            await navigator.clipboard.writeText(installLink);
            message.success('Install link copied');
        } catch {
            message.error('Could not copy — please select and copy manually.');
        }
    };

    const handleSaveIcon = async () => {
        if (!storeDetails?.storeId) return;
        const url = iconOverrideUrl.trim();
        // Basic validation — accept Firebase Storage / https URLs ending in image extensions.
        if (url && !/^https:\/\/.+\.(png|jpg|jpeg|webp)(\?|$)/i.test(url)) {
            message.error('Icon URL must be https and end with .png / .jpg / .webp');
            return;
        }
        setSavingIcon(true);
        try {
            await updatePWAIconOverride(storeDetails.storeId, {
                pwaIconOverrideUrl: url || null,
                pwaIconMode: url ? 'override' : 'generated',
            });
            message.success(url ? 'Custom icon saved' : 'Reverted to auto-generated icon');
        } catch (err) {
            console.error('[CustomerAppTab] icon save failed:', err);
            message.error('Could not save icon. Please try again.');
        } finally {
            setSavingIcon(false);
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

                {/* Custom icon override (Day-Two) */}
                <div style={{ marginTop: 24, opacity: enableInstallableApp ? 1 : 0.5 }}>
                    <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
                        <LuImage size={18} />
                        <Text strong>Custom app icon (optional)</Text>
                    </Flex>
                    <Paragraph type="secondary" style={{ margin: '4px 0 12px' }}>
                        Paste a public HTTPS URL for a square PNG/JPG/WEBP (recommended 512×512). Leave
                        blank to use your logo — or an auto-generated letter icon if no logo is set.
                    </Paragraph>
                    <Flex gap={8} align="center" wrap="wrap">
                        <Input
                            value={iconOverrideUrl}
                            placeholder="https://firebasestorage.googleapis.com/.../icon.png"
                            disabled={!enableInstallableApp}
                            onChange={(e) => setIconOverrideUrl(e.target.value)}
                            style={{ flex: 1, minWidth: 280, maxWidth: 560 }}
                        />
                        <Button
                            onClick={handleSaveIcon}
                            loading={savingIcon}
                            disabled={!enableInstallableApp || iconOverrideUrl === initialIconUrl}
                            type="primary"
                        >
                            Save icon
                        </Button>
                        {initialIconUrl ? (
                            <Button
                                onClick={() => {
                                    setIconOverrideUrl('');
                                    // Persist clear immediately (no separate confirm).
                                    void handleSaveIcon();
                                }}
                                disabled={!enableInstallableApp || savingIcon}
                            >
                                Clear
                            </Button>
                        ) : null}
                    </Flex>
                    {initialIconUrl ? (
                        <div style={{ marginTop: 12 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Preview:</Text>
                            <img
                                src={initialIconUrl}
                                alt="Custom PWA icon preview"
                                style={{ display: 'block', width: 72, height: 72, borderRadius: 16, marginTop: 6, objectFit: 'cover', background: '#f1f5f9' }}
                            />
                        </div>
                    ) : null}
                </div>

                {/* Direct install link — bypasses the 3-visit threshold when an
                    owner shares it directly (WhatsApp, QR, GBP, etc.) */}
                {installLink ? (
                    <div style={{ marginTop: 28, opacity: enableInstallableApp ? 1 : 0.5 }}>
                        <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
                            <LuCopy size={18} />
                            <Text strong>Share install link</Text>
                        </Flex>
                        <Paragraph type="secondary" style={{ margin: '4px 0 12px' }}>
                            Share this link on WhatsApp, QR codes, or Google Business. Anyone who
                            opens it sees the &ldquo;Install app&rdquo; prompt immediately — no need to
                            visit your menu a few times first.
                        </Paragraph>
                        <Flex gap={8} align="center" wrap="wrap">
                            <Input
                                value={installLink}
                                readOnly
                                disabled={!enableInstallableApp}
                                onFocus={(e) => e.currentTarget.select()}
                                style={{ flex: 1, minWidth: 280, maxWidth: 560 }}
                            />
                            <Button
                                icon={<LuCopy />}
                                onClick={handleCopyInstallLink}
                                disabled={!enableInstallableApp}
                                type="primary"
                            >
                                Copy link
                            </Button>
                        </Flex>
                    </div>
                ) : null}

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
