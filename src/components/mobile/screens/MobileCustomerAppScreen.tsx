'use client';

/**
 * Mobile Customer App Settings Screen
 *
 * Settings-only (toggles + short name + icon override URL). Matches the
 * separation used by feedback on mobile:
 *   - Settings → this screen (under More → Business Presence)
 *   - Analytics → MobileCustomerAppMetrics, rendered inside MobileDashboardScreen
 *     alongside menu analytics.
 *
 * Writes via:
 *   - updatePWASettings()       → pwaSettings.*
 *   - updatePWAIconOverride()   → publicPresence.pwaIcon*
 */

import { FEATURE_FLAGS } from '@config/features';
import { getMenuUrl, normalizeBaseUrl } from '@constant/urls';
import { resolvePWASettings, updatePWAIconOverride, updatePWASettings } from '@database/pwa';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuCopy, LuImage, LuSmartphone } from 'react-icons/lu';
import {
    Button,
    Card,
    Flex,
    Input,
    NavBar,
    Switch,
    Text,
    Title,
    Toast,
} from '../antd';

interface Props {
    onBack: () => void;
}

export default function MobileCustomerAppScreen({ onBack }: Props) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);

    // ── Settings state ──
    const initial = useMemo(() => resolvePWASettings(storeDetails), [storeDetails]);
    const initialIconUrl = (storeDetails as any)?.publicPresence?.pwaIconOverrideUrl || '';
    const [enableInstallableApp, setEnableInstallableApp] = useState(initial.enableInstallableApp);
    const [promoteInstallation, setPromoteInstallation] = useState(initial.promoteInstallation);
    const [pwaShortName, setPwaShortName] = useState(initial.pwaShortName);
    const [iconOverrideUrl, setIconOverrideUrl] = useState<string>(initialIconUrl);
    const [saving, setSaving] = useState(false);
    const [savingIcon, setSavingIcon] = useState(false);
    const [dirty, setDirty] = useState(false);

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
                pwaShortName: (pwaShortName || '').trim(),
            });
            Toast.show({ content: 'Customer App settings saved', duration: 1500 });
            setDirty(false);
        } catch {
            Toast.show({ content: 'Could not save. Please try again.', duration: 2000 });
        } finally {
            setSaving(false);
        }
    };

    // Direct-install link (?pwa=install) — bypasses 3-visit threshold for
    // intentional sharing (WhatsApp, QR, GBP). Mirrors desktop behavior.
    const installLink = useMemo(() => {
        const customDomain: string | undefined = (storeDetails as any)?.customDomain;
        const subdomain: string | undefined = storeDetails?.subdomain;
        const base = customDomain
            ? normalizeBaseUrl(customDomain)
            : subdomain
                ? getMenuUrl(subdomain)
                : null;
        if (!base) return null;
        return `${base.replace(/\/$/, '')}/?pwa=install`;
    }, [storeDetails]);

    const handleCopyInstallLink = async () => {
        if (!installLink) return;
        try {
            await navigator.clipboard.writeText(installLink);
            Toast.show({ content: 'Install link copied', duration: 1500 });
        } catch {
            Toast.show({ content: 'Could not copy — please select and copy manually.', duration: 2000 });
        }
    };

    const handleSaveIcon = async (explicitUrl?: string) => {
        if (!storeDetails?.storeId) return;
        const url = (explicitUrl ?? iconOverrideUrl).trim();
        if (url && !/^https:\/\/.+\.(png|jpg|jpeg|webp)(\?|$)/i.test(url)) {
            Toast.show({ content: 'Icon URL must be https and end with .png / .jpg / .webp', duration: 2000 });
            return;
        }
        setSavingIcon(true);
        try {
            await updatePWAIconOverride(storeDetails.storeId, {
                pwaIconOverrideUrl: url || null,
                pwaIconMode: url ? 'override' : 'generated',
            });
            Toast.show({
                content: url ? 'Custom icon saved' : 'Reverted to auto-generated icon',
                duration: 1500,
            });
        } catch {
            Toast.show({ content: 'Could not save icon. Please try again.', duration: 2000 });
        } finally {
            setSavingIcon(false);
        }
    };

    // ── Global kill-switch guard ──
    if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack}>Customer App</NavBar>
                <Flex align="center" justify="center" style={{ flex: 1, padding: 24 }} vertical>
                    <LuSmartphone color="#9ca3af" size={40} />
                    <Text style={{ marginTop: 12, textAlign: 'center' }}>
                        Customer App is not available yet on the platform.
                    </Text>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack}>Customer App</NavBar>

            <Flex gap={12} style={{ padding: 16 }} vertical>
                {/* Intro */}
                <Card>
                    <Flex align="center" gap={10} style={{ marginBottom: 8 }}>
                        <LuSmartphone color="#8b5cf6" size={20} />
                        <Title level={5} style={{ margin: 0 }}>Customer App</Title>
                    </Flex>
                    <Text type="secondary">
                        Let customers install your menu as an app on their phone home screen.
                        One tap to reopen. No app store required.
                    </Text>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                        Install stats live in the Dashboard screen.
                    </Text>
                </Card>

                {/* Settings */}
                <Card>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>Settings</Title>

                    <ToggleRow
                        label="Enable Customer App"
                        description="Make your menu installable as an app. Turn off to hide completely."
                        checked={enableInstallableApp}
                        onChange={(v) => { setEnableInstallableApp(v); markDirty(); }}
                    />

                    <ToggleRow
                        label="Show install prompt"
                        description="Invite customers to install after the 3rd visit."
                        checked={promoteInstallation}
                        disabled={!enableInstallableApp}
                        onChange={(v) => { setPromoteInstallation(v); markDirty(); }}
                    />

                    <div
                        style={{
                            marginTop: 12,
                            opacity: enableInstallableApp ? 1 : 0.5,
                            pointerEvents: enableInstallableApp ? 'auto' : 'none',
                        }}
                    >
                        <Text strong>Home screen name</Text>
                        <Text type="secondary" style={{ display: 'block', margin: '4px 0 8px', fontSize: 13 }}>
                            Short label under the icon. Max 12 characters. Blank = first word of your business name.
                        </Text>
                        <Input
                            value={pwaShortName}
                            maxLength={12}
                            placeholder="e.g. Joe's"
                            onChange={(v) => {
                                setPwaShortName(v);
                                markDirty();
                            }}
                        />
                    </div>

                    <Button
                        block
                        color="primary"
                        disabled={!dirty || saving}
                        loading={saving}
                        onClick={handleSave}
                        style={{ marginTop: 16, minHeight: 44 }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </Card>

                {/* Icon override */}
                <Card>
                    <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
                        <LuImage size={18} />
                        <Title level={5} style={{ margin: 0 }}>Custom app icon</Title>
                    </Flex>
                    <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 12 }}>
                        Paste a public HTTPS URL for a square PNG/JPG/WEBP (recommended 512×512). Leave
                        blank to use your logo, or the auto-generated letter icon.
                    </Text>

                    <div
                        style={{
                            opacity: enableInstallableApp ? 1 : 0.5,
                            pointerEvents: enableInstallableApp ? 'auto' : 'none',
                        }}
                    >
                        <Input
                            value={iconOverrideUrl}
                            placeholder="https://firebasestorage.googleapis.com/.../icon.png"
                            onChange={(v) => setIconOverrideUrl(v)}
                        />
                        <Flex gap={8} style={{ marginTop: 12 }}>
                            <Button
                                color="primary"
                                disabled={iconOverrideUrl === initialIconUrl}
                                loading={savingIcon}
                                onClick={() => handleSaveIcon()}
                                style={{ flex: 1, minHeight: 44 }}
                            >
                                Save icon
                            </Button>
                            {initialIconUrl ? (
                                <Button
                                    disabled={savingIcon}
                                    onClick={() => {
                                        setIconOverrideUrl('');
                                        void handleSaveIcon('');
                                    }}
                                    style={{ minHeight: 44 }}
                                >
                                    Clear
                                </Button>
                            ) : null}
                        </Flex>

                        {initialIconUrl ? (
                            <Flex align="center" gap={12} style={{ marginTop: 12 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Current:</Text>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={initialIconUrl}
                                    alt="Custom PWA icon"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 14,
                                        objectFit: 'cover',
                                        background: '#f1f5f9',
                                    }}
                                />
                            </Flex>
                        ) : null}
                    </div>
                </Card>

                {/* Direct install link — bypasses 3-visit threshold */}
                {installLink ? (
                    <Card>
                        <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
                            <LuCopy size={18} />
                            <Title level={5} style={{ margin: 0 }}>Share install link</Title>
                        </Flex>
                        <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 12 }}>
                            Share this link on WhatsApp, QR codes, or Google Business. Anyone who
                            opens it sees the &ldquo;Install app&rdquo; prompt right away.
                        </Text>
                        <div
                            style={{
                                opacity: enableInstallableApp ? 1 : 0.5,
                                pointerEvents: enableInstallableApp ? 'auto' : 'none',
                            }}
                        >
                            <div
                                style={{
                                    padding: '10px 12px',
                                    background: '#f1f5f9',
                                    borderRadius: 8,
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                    fontSize: 12,
                                    wordBreak: 'break-all',
                                    color: '#334155',
                                }}
                            >
                                {installLink}
                            </div>
                            <Button
                                block
                                color="primary"
                                onClick={handleCopyInstallLink}
                                style={{ marginTop: 12, minHeight: 44 }}
                            >
                                Copy link
                            </Button>
                        </div>
                    </Card>
                ) : null}

                {/* How it looks — mobile cheat-sheet */}
                <Card>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>How it looks to customers</Title>
                    <Text type="secondary">• Android / Chrome: native install popup with your icon</Text>
                    <br />
                    <Text type="secondary">• iPhone Safari: step-by-step &ldquo;Add to Home Screen&rdquo; guide</Text>
                    <br />
                    <Text type="secondary">• Once installed, opens full-screen from the home screen</Text>
                </Card>
            </Flex>
        </Flex>
    );
}

// ─────────────────────────────────────────────────────────────

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <Flex align="flex-start" gap={12} style={{ padding: '10px 0', opacity: disabled ? 0.5 : 1 }}>
            <Flex style={{ flex: 1 }} vertical>
                <Text strong>{label}</Text>
                <Text type="secondary" style={{ fontSize: 13, marginTop: 2 }}>{description}</Text>
            </Flex>
            <Switch checked={checked} onChange={disabled ? undefined : onChange} />
        </Flex>
    );
}
