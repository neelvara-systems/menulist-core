'use client';

/**
 * Customer App — Business Settings tab
 *
 * Self-contained (manages its own state + save). Reads initial values from
 * storeDetails and calls:
 *   - updatePWASettings() DAL on Save (toggles + short name)
 *   - updatePWAIconOverride() DAL on Save (icon upload/clear)
 *
 * Owners select an icon, preview it, and then save all changes in one action.
 */

import { FEATURE_FLAGS } from '@config/features';
import ImageUploadInput from '@atoms/imageUploadInput';
import { getMenuUrl, normalizeBaseUrl } from '@constant/urls';
import { resolvePWASettings, updatePWAIconOverride, updatePWASettings, uploadPWAIconOverride } from '@database/pwa';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { applyLocalizedDraftMap, getLocalizedStoreValue, getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage } from '@lib/localization/storeContent';
import { preparePWAIconFile } from '@lib/pwa/iconUploadUtils';
import type { UserUploadedFileType } from '@type/common';
import { Alert, Button, Card, Flex, Input, Select, Space, Switch, Typography, message } from 'antd';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCopy, LuImage, LuRefreshCw, LuShare2, LuSmartphone, LuSquare, LuTrash2, LuUpload } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

interface CustomerAppTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

export default function CustomerAppTab({ scrollRef }: CustomerAppTabProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);

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

    // Re-sync when storeDetails changes (e.g., store switch)
    useEffect(() => {
        setEnableInstallableApp(initial.enableInstallableApp);
        setPromoteInstallation(initial.promoteInstallation);
        const nextDrafts = Object.fromEntries(
            managedLanguages.map((languageCode) => [languageCode, getLocalizedStoreValue(storeDetails?.pwaSettings?.pwaShortName, languageCode, '')]),
        );
        setSelectedLanguage(getStorePreferredLanguage(storeDetails));
        setLocalizedShortNameDrafts(nextDrafts);
        setOriginalLocalizedShortNameDrafts(nextDrafts);
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
    }, [initial.enableInstallableApp, initial.promoteInstallation, initial.pwaShortName, initialIconUrl]);

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
            message.success('Customer App settings saved');
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

    const handleIconSelected = async (file: UserUploadedFileType) => {
        if (!file?.url) return;
        setSelectedIcon(file);
        setRemoveIconOnSave(false);
        message.success('Icon selected. Click Save to apply.');
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
                    <Flex align="center" gap={8}>
                        <Button
                            onClick={handleReset}
                            disabled={!hasUnsavedChanges || saving}
                            style={{
                                background: hasUnsavedChanges && !saving ? '#ffffff' : '#f1f5f9',
                                borderColor: hasUnsavedChanges && !saving ? '#cbd5e1' : '#e2e8f0',
                                color: hasUnsavedChanges && !saving ? '#0f172a' : '#94a3b8',
                                cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Reset
                        </Button>
                        <button
                            type="button"
                            disabled={!hasUnsavedChanges || saving}
                            onClick={handleSave}
                            style={{
                                padding: '8px 18px',
                                background: hasUnsavedChanges ? '#0f172a' : '#cbd5e1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
                                fontSize: 14,
                                fontWeight: 600,
                            }}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </Flex>
                }
            >
                <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                    Let customers install your menu as an app on their phone home screen.
                    One tap to reopen. No app store required.
                </Paragraph>

                {managedLanguages.length > 1 ? (
                    <div style={{ marginBottom: 20, maxWidth: 360 }}>
                        <Text strong>Customer app language</Text>
                        <Select
                            value={selectedLanguage}
                            style={{ width: '100%', marginTop: 8 }}
                            options={managedLanguages.map((languageCode) => ({
                                label: getStoreLanguageLabel(languageCode),
                                value: languageCode,
                            }))}
                            onChange={setSelectedLanguage}
                        />
                    </div>
                ) : null}

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
                        onChange={(v) => setEnableInstallableApp(v)}
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
                        onChange={(v) => setPromoteInstallation(v)}
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
                        onChange={(e) => setLocalizedShortNameDrafts((previous) => ({
                            ...previous,
                            [selectedLanguage]: e.target.value,
                        }))}
                        style={{ maxWidth: 280 }}
                        showCount
                    />
                    {selectedLanguage !== referenceLanguage ? (
                        <div style={{ marginTop: 12, maxWidth: 560 }}>
                            <Card size="small" style={{ background: '#fafafa', borderColor: '#f0f0f0' }}>
                                <Flex align="flex-start" justify="space-between" gap={12}>
                                    <div style={{ minWidth: 0 }}>
                                        <Text type="secondary">{`${getStoreLanguageLabel(referenceLanguage)} reference`}</Text>
                                        <div style={{ marginTop: 4 }}>
                                            <Text>{localizedShortNameDrafts[referenceLanguage] || 'No reference content available yet.'}</Text>
                                        </div>
                                    </div>
                                    {localizedShortNameDrafts[referenceLanguage] ? (
                                        <Button
                                            size="small"
                                            type="link"
                                            onClick={() => setLocalizedShortNameDrafts((previous) => ({
                                                ...previous,
                                                [selectedLanguage]: previous[referenceLanguage] || '',
                                            }))}
                                        >
                                            Use reference
                                        </Button>
                                    ) : null}
                                </Flex>
                            </Card>
                        </div>
                    ) : null}
                </div>

                {/* Custom icon override (Day-Two) */}
                <div style={{ marginTop: 24, opacity: enableInstallableApp ? 1 : 0.5 }}>
                    <Flex align="center" gap={10} style={{ marginBottom: 4 }}>
                        <LuImage size={18} />
                        <Text strong>Custom app icon (optional)</Text>
                    </Flex>
                    <Paragraph type="secondary" style={{ margin: '4px 0 12px' }}>
                        Select an image from your device, then click Save.
                        We auto-adjust uploads into app icon format. Leave empty to use your logo —
                        or an auto-generated letter icon if no logo is set.
                    </Paragraph>
                    {currentIconUrl ? (
                        <div
                            style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: 14,
                                padding: '12px',
                                background: '#ffffff',
                                maxWidth: 560,
                            }}
                        >
                            <Flex align="center" gap={12}>
                                <img
                                    src={currentIconUrl}
                                    alt="Custom PWA icon preview"
                                    style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 16,
                                        objectFit: 'cover',
                                        background: '#f1f5f9',
                                        flexShrink: 0,
                                    }}
                                />
                                <div style={{ minWidth: 0 }}>
                                    <Text strong>Current icon</Text>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Replace or remove it, then save to apply.
                                        </Text>
                                    </div>
                                    <Flex gap={8} align="center" wrap="wrap" style={{ marginTop: 10 }}>
                                        <Button
                                            size="small"
                                            type="text"
                                            icon={<LuRefreshCw size={14} />}
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={!enableInstallableApp || saving}
                                            style={{ color: '#0f172a', paddingInline: 8 }}
                                        >
                                            Replace
                                        </Button>
                                        <Button
                                            size="small"
                                            type="text"
                                            icon={<LuTrash2 size={14} />}
                                            onClick={() => {
                                                setSelectedIcon(null);
                                                setRemoveIconOnSave(!!savedIconUrl.trim());
                                            }}
                                            disabled={!enableInstallableApp || saving}
                                            style={{ color: '#b91c1c', paddingInline: 8 }}
                                        >
                                            Remove
                                        </Button>
                                    </Flex>
                                </div>
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
                                border: '1px dashed #94a3b8',
                                borderRadius: 12,
                                padding: '12px 14px',
                                background: '#f8fafc',
                                cursor: !enableInstallableApp || saving ? 'not-allowed' : 'pointer',
                                opacity: !enableInstallableApp ? 0.6 : 1,
                                maxWidth: 560,
                            }}
                        >
                            <Flex align="center" gap={10}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: '#e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#334155',
                                    }}
                                >
                                    <LuUpload size={18} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <Text strong>
                                        {hasIconChanges ? 'Icon selected. Click Save to apply.' : 'Click to select app icon'}
                                    </Text>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            PNG/JPG/WEBP, same flow as Brand Settings
                                        </Text>
                                    </div>
                                </div>
                            </Flex>
                        </div>
                    )}
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

                <Card
                    size="small"
                    style={{
                        marginTop: 28,
                        borderRadius: 14,
                        borderColor: '#dbeafe',
                        background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
                    }}
                >
                    <Flex align="center" gap={10} style={{ marginBottom: 10 }}>
                        <LuSmartphone size={18} color="#1d4ed8" />
                        <Text strong>How customers install it</Text>
                    </Flex>
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 2 }}>Android / Chrome</Text>
                            <Text type="secondary">
                                Customer opens the menu, taps Install, then accepts the browser prompt.
                            </Text>
                        </div>
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 2 }}>iPhone / Safari</Text>
                            <Text type="secondary">
                                Customer opens the menu in Safari, taps Share, then taps Add to Home Screen.
                            </Text>
                        </div>
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 2 }}>What to tell customers</Text>
                            <Text type="secondary">
                                Share the install link above for the fastest path. Once installed, the menu opens full-screen from the home screen.
                            </Text>
                        </div>
                    </Space>
                    <Flex gap={18} wrap="wrap" style={{ marginTop: 14 }}>
                        <Flex align="center" gap={8}>
                            <LuShare2 size={15} color="#64748b" />
                            <Text type="secondary">Safari: Share</Text>
                        </Flex>
                        <Flex align="center" gap={8}>
                            <LuSquare size={15} color="#64748b" />
                            <Text type="secondary">Add to Home Screen</Text>
                        </Flex>
                    </Flex>
                </Card>
            </Card>
            <ImageUploadInput
                fileInputRef={fileInputRef}
                onUploadFile={handleIconSelected}
                compression={false}
                maxSizeMB={10}
            />
        </div>
    );
}
