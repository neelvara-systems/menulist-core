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
 *   - updatePWAIconOverride()   → publicPresence.pwaIcon* (on Save)
 */

import { FEATURE_FLAGS } from '@config/features';
import ImageUploadInput from '@atoms/imageUploadInput';
import { getMenuUrl, normalizeBaseUrl } from '@constant/urls';
import { resolvePWASettings, updatePWAIconOverride, updatePWASettings, uploadPWAIconOverride } from '@database/pwa';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { preparePWAIconFile } from '@lib/pwa/iconUploadUtils';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { UserUploadedFileType } from '@type/common';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCopy, LuDownload, LuImage, LuRefreshCw, LuShare2, LuSmartphone, LuSquare, LuTrash2, LuUpload, LuX } from 'react-icons/lu';
import {
    Button,
    Card,
    Flex,
    Input,
    NavBar,
    Popup,
    Switch,
    Text,
    Title,
    Toast,
} from '../antd';
import MobileLocalizedLanguageSelector from '../components/MobileLocalizedLanguageSelector';
import { applyLocalizedDraftMap, getLocalizedStoreValue, getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage } from '../utils/localizedStoreContent';

interface Props {
    onBack: () => void;
}

export default function MobileCustomerAppScreen({ onBack }: Props) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const tMobile = useTranslations('MobileSettings');

    // ── Settings state ──
    const initial = useMemo(() => resolvePWASettings(storeDetails), [storeDetails]);
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const initialIconUrl = (storeDetails as any)?.publicPresence?.pwaIconOverrideUrl || '';
    const [enableInstallableApp, setEnableInstallableApp] = useState(initial.enableInstallableApp);
    const [promoteInstallation, setPromoteInstallation] = useState(initial.promoteInstallation);
    const [selectedLanguage, setSelectedLanguage] = useState(getStorePreferredLanguage(storeDetails));
    const [localizedShortNameDrafts, setLocalizedShortNameDrafts] = useState<Record<string, string>>(
        Object.fromEntries(managedLanguages.map((languageCode) => [languageCode, getLocalizedStoreValue(storeDetails?.pwaSettings?.pwaShortName, languageCode, '')])),
    );
    const [originalLocalizedShortNameDrafts, setOriginalLocalizedShortNameDrafts] = useState<Record<string, string>>(
        Object.fromEntries(managedLanguages.map((languageCode) => [languageCode, getLocalizedStoreValue(storeDetails?.pwaSettings?.pwaShortName, languageCode, '')])),
    );
    const [originalDraft, setOriginalDraft] = useState({
        enableInstallableApp: initial.enableInstallableApp,
        promoteInstallation: initial.promoteInstallation,
        iconUrl: initialIconUrl,
    });
    const [savedIconUrl, setSavedIconUrl] = useState<string>(initialIconUrl);
    const [selectedIcon, setSelectedIcon] = useState<UserUploadedFileType | null>(
        initialIconUrl
            ? {
                name: 'customer-app-icon',
                size: 0,
                type: '',
                url: initialIconUrl,
            }
            : null,
    );
    const [removeIconOnSave, setRemoveIconOnSave] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const selectedIconUrl = (selectedIcon?.url || '').trim();
    const currentIconUrl = removeIconOnSave ? '' : selectedIconUrl;
    const pwaShortName = localizedShortNameDrafts[selectedLanguage] || '';
    const referenceLanguage = getStorePreferredLanguage(storeDetails);
    const hasSettingsChanges = (
        enableInstallableApp !== originalDraft.enableInstallableApp
        || promoteInstallation !== originalDraft.promoteInstallation
        || JSON.stringify(localizedShortNameDrafts) !== JSON.stringify(originalLocalizedShortNameDrafts)
    );
    const hasIconChanges = removeIconOnSave || selectedIconUrl !== originalDraft.iconUrl;
    const hasUnsavedChanges = hasSettingsChanges || hasIconChanges;

    useEffect(() => {
        setEnableInstallableApp(initial.enableInstallableApp);
        setPromoteInstallation(initial.promoteInstallation);
        const nextManagedLanguages = getStoreManagedLanguages(storeDetails);
        const nextLocalizedDrafts = Object.fromEntries(
            nextManagedLanguages.map((languageCode) => [languageCode, getLocalizedStoreValue(storeDetails?.pwaSettings?.pwaShortName, languageCode, '')]),
        );
        setSelectedLanguage(getStorePreferredLanguage(storeDetails));
        setLocalizedShortNameDrafts(nextLocalizedDrafts);
        setOriginalLocalizedShortNameDrafts(nextLocalizedDrafts);
        setOriginalDraft({
            enableInstallableApp: initial.enableInstallableApp,
            promoteInstallation: initial.promoteInstallation,
            iconUrl: initialIconUrl,
        });
        setSavedIconUrl(initialIconUrl);
        setSelectedIcon(
            initialIconUrl
                ? {
                    name: 'customer-app-icon',
                    size: 0,
                    type: '',
                    url: initialIconUrl,
                }
                : null,
        );
        setRemoveIconOnSave(false);
    }, [initial.enableInstallableApp, initial.promoteInstallation, initial.pwaShortName, initialIconUrl, storeDetails]);

    const handleSave = async () => {
        if (!storeDetails?.storeId || !storeDetails?.tenantId) return;
        setSaving(true);
        try {
            const settingsPatch: {
                enableInstallableApp?: boolean;
                promoteInstallation?: boolean;
                pwaShortName?: string | Record<string, string>;
            } = {};
            if (enableInstallableApp !== originalDraft.enableInstallableApp) {
                settingsPatch.enableInstallableApp = enableInstallableApp;
            }
            if (promoteInstallation !== originalDraft.promoteInstallation) {
                settingsPatch.promoteInstallation = promoteInstallation;
            }
            if (JSON.stringify(localizedShortNameDrafts) !== JSON.stringify(originalLocalizedShortNameDrafts)) {
                settingsPatch.pwaShortName = applyLocalizedDraftMap(
                    storeDetails?.pwaSettings?.pwaShortName,
                    localizedShortNameDrafts,
                );
            }
            if (Object.keys(settingsPatch).length > 0) {
                await updatePWASettings(storeDetails.storeId, settingsPatch);
            }

            let nextIconUrl = savedIconUrl.trim();
            if (!removeIconOnSave && selectedIconUrl && selectedIconUrl !== originalDraft.iconUrl) {
                if (!selectedIconUrl.startsWith('data:')) {
                    throw new Error('Selected icon format is invalid. Please reselect the icon.');
                }
                const rawFile = dataUrlToFile(
                    selectedIconUrl,
                    selectedIcon?.name || 'customer-app-icon.png',
                    selectedIcon?.type || undefined,
                );
                const prepared = await preparePWAIconFile(rawFile);
                const uploadedUrl = await uploadPWAIconOverride({
                    file: prepared.file,
                    tenantId: storeDetails.tenantId,
                    storeId: storeDetails.storeId,
                });
                await updatePWAIconOverride(storeDetails.storeId, {
                    pwaIconOverrideUrl: uploadedUrl,
                    pwaIconMode: 'override',
                });
                if (nextIconUrl && nextIconUrl !== uploadedUrl && nextIconUrl.includes('firebasestorage.googleapis.com')) {
                    void deleteFileByUrl(nextIconUrl);
                }
                nextIconUrl = uploadedUrl;
            } else if (removeIconOnSave && nextIconUrl) {
                await updatePWAIconOverride(storeDetails.storeId, {
                    pwaIconOverrideUrl: null,
                    pwaIconMode: 'generated',
                });
                if (nextIconUrl.includes('firebasestorage.googleapis.com')) {
                    void deleteFileByUrl(nextIconUrl);
                }
                nextIconUrl = '';
            }

            setSavedIconUrl(nextIconUrl);
            setSelectedIcon(
                nextIconUrl
                    ? {
                        name: 'customer-app-icon',
                        size: 0,
                        type: '',
                        url: nextIconUrl,
                    }
                    : null,
            );
            setRemoveIconOnSave(false);
            setOriginalDraft({
                enableInstallableApp,
                promoteInstallation,
                iconUrl: nextIconUrl,
            });
            setOriginalLocalizedShortNameDrafts(localizedShortNameDrafts);
            Toast.show({ content: 'Customer App settings saved', duration: 1500 });
        } catch (err) {
            console.error('[MobileCustomerAppScreen] save failed:', err);
            Toast.show({ content: 'Could not save. Please try again.', duration: 2000 });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (!hasUnsavedChanges || saving) return;
        setEnableInstallableApp(originalDraft.enableInstallableApp);
        setPromoteInstallation(originalDraft.promoteInstallation);
        setLocalizedShortNameDrafts(originalLocalizedShortNameDrafts);
        setSavedIconUrl(originalDraft.iconUrl);
        setSelectedIcon(
            originalDraft.iconUrl
                ? {
                    name: 'customer-app-icon',
                    size: 0,
                    type: '',
                    url: originalDraft.iconUrl,
                }
                : null,
        );
        setRemoveIconOnSave(false);
    };

    const dataUrlToFile = (dataUrl: string, fileName: string, fallbackMime?: string): File => {
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            throw new Error('Invalid icon data format');
        }
        const mimeFromData = parts[0].match(/data:(.*?);base64/)?.[1];
        const mime = fallbackMime || mimeFromData || 'image/png';
        const binary = atob(parts[1]);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new File([bytes], fileName, { type: mime });
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

    const handleIconSelected = async (file: UserUploadedFileType) => {
        if (!file?.url) return;
        setSelectedIcon(file);
        setRemoveIconOnSave(false);
        Toast.show({ content: 'Icon selected. Tap Save to apply.', duration: 1500 });
    };

    // ── Global kill-switch guard ──
    if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} />
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
            <NavBar onBack={onBack} />

            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileLocalizedLanguageSelector
                    helperText="Choose which language you want to edit for the home-screen app name. Install toggles, link, and icon stay shared for all languages."
                    languages={managedLanguages}
                    onChange={setSelectedLanguage}
                    selectedLanguage={selectedLanguage}
                    title="Customer app language"
                />

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
                            <Card
                                size="small"
                                style={{
                                    background: token.colorFillAlter,
                                    borderColor: token.colorBorderSecondary,
                                }}
                            >
                                <Text style={{ wordBreak: 'break-all', color: token.colorText }}>{installLink}</Text>
                            </Card>
                            <Flex gap={8} style={{ marginTop: 12 }}>
                                <Button
                                    block
                                    fill="outline"
                                    onClick={handleCopyInstallLink}
                                    size="small"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuCopy size={14} />
                                        <Text>Copy</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        </div>
                    </Card>
                ) : null}

                {/* Settings */}
                <Card>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>Settings</Title>

                    <ToggleRow
                        label="Enable Customer App"
                        description="Make your menu installable as an app. Turn off to hide completely."
                        checked={enableInstallableApp}
                        onChange={(v) => setEnableInstallableApp(v)}
                    />

                    <ToggleRow
                        label="Show install prompt"
                        description="Invite customers to install after the 3rd visit."
                        checked={promoteInstallation}
                        disabled={!enableInstallableApp}
                        onChange={(v) => setPromoteInstallation(v)}
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
                            onChange={(value) => setLocalizedShortNameDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: value,
                            }))}
                        />
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedShortNameDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: previous[referenceLanguage] || '',
                                }))}
                                referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                referenceValue={localizedShortNameDrafts[referenceLanguage] || ''}
                            />
                        ) : null}
                    </div>

                    <div
                        style={{
                            marginTop: 16,
                            opacity: enableInstallableApp ? 1 : 0.5,
                            pointerEvents: enableInstallableApp ? 'auto' : 'none',
                        }}
                    >
                        <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
                            <LuImage size={18} />
                            <Text strong>Custom app icon</Text>
                        </Flex>
                        <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 12 }}>
                            Select an image from your device, then tap Save.
                            We auto-adjust uploads into app icon format. Leave empty to use your logo,
                            or the auto-generated letter icon.
                        </Text>

                        {currentIconUrl ? (
                            <div
                                style={{
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 14,
                                    padding: '12px',
                                    background: token.colorBgContainer,
                                }}
                            >
                                <Flex align="center" gap={12}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={currentIconUrl}
                                        alt="Custom PWA icon"
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 16,
                                            objectFit: 'cover',
                                            background: token.colorFillAlter,
                                            flexShrink: 0,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                        }}
                                    />
                                    <Flex style={{ flex: 1 }} vertical>
                                        <Text strong>Current icon</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Replace or remove it, then tap Save to apply.
                                        </Text>
                                        <Flex gap={8} style={{ marginTop: 10 }}>
                                            <Button
                                                disabled={saving}
                                                fill="none"
                                                onClick={() => fileInputRef.current?.click()}
                                                size="small"
                                                style={{ color: token.colorText, minWidth: 0 }}
                                            >
                                                <Flex align="center" gap={6}>
                                                    <LuRefreshCw size={14} />
                                                    <span>Replace</span>
                                                </Flex>
                                            </Button>
                                            <Button
                                                disabled={saving}
                                                fill="none"
                                                onClick={() => {
                                                    setSelectedIcon(null);
                                                    setRemoveIconOnSave(!!savedIconUrl.trim());
                                                }}
                                                size="small"
                                                style={{ color: token.colorError, minWidth: 0 }}
                                            >
                                                <Flex align="center" gap={6}>
                                                    <LuTrash2 size={14} />
                                                    <span>Remove</span>
                                                </Flex>
                                            </Button>
                                        </Flex>
                                    </Flex>
                                </Flex>
                            </div>
                        ) : (
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    if (!enableInstallableApp || saving) return;
                                    fileInputRef.current?.click();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        if (!enableInstallableApp || saving) return;
                                        fileInputRef.current?.click();
                                    }
                                }}
                                style={{
                                    border: `1px dashed ${token.colorBorder}`,
                                    borderRadius: 12,
                                    padding: '12px',
                                    background: token.colorFillAlter,
                                    marginBottom: 12,
                                    cursor: !enableInstallableApp || saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <Flex align="center" gap={10}>
                                    <div
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 10,
                                            background: token.colorBgContainer,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: token.colorTextSecondary,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                        }}
                                    >
                                        <LuUpload size={17} />
                                    </div>
                                    <Flex style={{ flex: 1 }} vertical>
                                        <Text strong>
                                            {hasIconChanges ? 'Icon selected. Tap Save to apply.' : 'Tap to select app icon'}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            PNG/JPG/WEBP, same flow as Brand Settings
                                        </Text>
                                    </Flex>
                                </Flex>
                            </div>
                        )}
                    </div>

                    <Flex gap={8} style={{ marginTop: 16 }}>
                        <Button
                            block
                            disabled={!hasUnsavedChanges || saving}
                            fill={hasUnsavedChanges && !saving ? 'outline' : 'solid'}
                            onClick={handleReset}
                            style={{
                                minHeight: 44,
                                background: hasUnsavedChanges && !saving ? token.colorBgContainer : token.colorFillAlter,
                                borderColor: hasUnsavedChanges && !saving ? token.colorBorder : token.colorBorderSecondary,
                                color: hasUnsavedChanges && !saving ? token.colorText : token.colorTextDisabled,
                            }}
                        >
                            {tMobile('reset')}
                        </Button>
                        <Button
                            block
                            color="primary"
                            disabled={!hasUnsavedChanges || saving}
                            loading={saving}
                            onClick={handleSave}
                            style={{ minHeight: 44 }}
                        >
                            {saving ? 'Saving…' : tMobile('saveChanges')}
                        </Button>
                    </Flex>
                </Card>

                <Card onClick={() => setIsInstallGuideOpen(true)} style={{ cursor: 'pointer' }}>
                    <Flex align="center" gap={10}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                background: token.colorPrimaryBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: token.colorPrimary,
                                flexShrink: 0,
                            }}
                        >
                            <LuSmartphone size={18} />
                        </div>
                        <Flex style={{ flex: 1, minWidth: 0 }} vertical>
                            <Title level={5} style={{ margin: 0 }}>How customers install it</Title>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Android and iPhone steps. Tap to open guide.
                            </Text>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>
            <Popup
                bodyStyle={{ maxHeight: '88vh', overflow: 'hidden', padding: 0 }}
                destroyOnClose
                onMaskClick={() => setIsInstallGuideOpen(false)}
                visible={isInstallGuideOpen}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar
                        right={(
                            <Button
                                fill="none"
                                onClick={() => setIsInstallGuideOpen(false)}
                                style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                            >
                                <LuX size={18} />
                            </Button>
                        )}
                    >
                        How customers install it
                    </NavBar>

                    <Flex style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }} gap={12} vertical>
                        <Card
                            style={{
                                borderRadius: 16,
                                background: token.colorPrimaryBg,
                                borderColor: token.colorPrimaryBorder,
                            }}
                        >
                            <Flex align="center" gap={10} style={{ marginBottom: 8 }}>
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 12,
                                        background: token.colorBgContainer,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: token.colorPrimary,
                                    }}
                                >
                                    <LuDownload size={16} />
                                </div>
                                <Flex vertical>
                                    <Text strong>Android / Chrome</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Native browser install prompt
                                    </Text>
                                </Flex>
                            </Flex>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Open the menu, tap <Text style={{ fontSize: 13, color: token.colorText }}>Install</Text>, then accept the browser prompt.
                            </Text>
                        </Card>

                        <Card
                            style={{
                                borderRadius: 16,
                                background: token.colorWarningBg,
                                borderColor: token.colorWarningBorder,
                            }}
                        >
                            <Flex align="center" gap={10} style={{ marginBottom: 10 }}>
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 12,
                                        background: token.colorBgContainer,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: token.colorWarning,
                                    }}
                                >
                                    <LuShare2 size={16} />
                                </div>
                                <Flex vertical>
                                    <Text strong>iPhone / Safari</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Manual Add to Home Screen flow
                                    </Text>
                                </Flex>
                            </Flex>

                            <Flex gap={8} vertical>
                                <InstallGuideStep
                                    accentColor={token.colorWarning}
                                    icon={<LuShare2 size={14} />}
                                    step="Step 1"
                                    text="Tap the Share button in Safari"
                                    tokenBg={token.colorBgContainer}
                                    tokenBorder={token.colorWarningBorder}
                                />
                                <InstallGuideStep
                                    accentColor={token.colorWarning}
                                    icon={<LuSquare size={14} />}
                                    step="Step 2"
                                    text="Choose Add to Home Screen"
                                    tokenBg={token.colorBgContainer}
                                    tokenBorder={token.colorWarningBorder}
                                />
                                <InstallGuideStep
                                    accentColor={token.colorWarning}
                                    icon={<LuSmartphone size={14} />}
                                    step="Step 3"
                                    text="Tap Add, then open it from the home screen"
                                    tokenBg={token.colorBgContainer}
                                    tokenBorder={token.colorWarningBorder}
                                />
                            </Flex>
                        </Card>

                        <Card
                            style={{
                                borderRadius: 16,
                                background: token.colorFillAlter,
                                borderColor: token.colorBorderSecondary,
                            }}
                        >
                            <Text strong style={{ display: 'block', marginBottom: 4 }}>What to tell customers</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Use the share install link from this screen for the fastest path. Once installed, it opens full-screen from the phone home screen.
                            </Text>
                        </Card>
                    </Flex>
                </Flex>
            </Popup>
            <ImageUploadInput
                fileInputRef={fileInputRef}
                onUploadFile={handleIconSelected}
                compression={false}
                maxSizeMB={10}
            />
        </Flex>
    );
}

function LocalizedReferenceHint({
    onUseReference,
    referenceLabel,
    referenceValue,
}: {
    onUseReference: () => void;
    referenceLabel: string;
    referenceValue: string;
}) {
    const { token } = theme.useToken();

    return (
        <Flex
            align="center"
            justify="space-between"
            style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 12,
                marginTop: 8,
                padding: '8px 10px',
            }}
        >
            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                <Text type="secondary">{`${referenceLabel} reference`}</Text>
                <Text style={{ wordBreak: 'break-word' }}>
                    {referenceValue || 'No content yet in the primary language.'}
                </Text>
            </Flex>
            {referenceValue ? (
                <Button fill="outline" onClick={onUseReference} size="small">
                    Use
                </Button>
            ) : null}
        </Flex>
    );
}

function InstallGuideStep({
    accentColor,
    icon,
    step,
    text,
    tokenBg,
    tokenBorder,
}: {
    accentColor: string;
    icon: React.ReactNode;
    step: string;
    text: string;
    tokenBg: string;
    tokenBorder: string;
}) {
    return (
        <Flex
            align="center"
            gap={10}
            style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: tokenBg,
                border: `1px solid ${tokenBorder}`,
            }}
        >
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    background: `${accentColor}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accentColor,
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <Flex style={{ flex: 1, minWidth: 0 }} vertical>
                <Text strong style={{ fontSize: 13 }}>{step}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>
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
