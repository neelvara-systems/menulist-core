'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useContext, useMemo, useState } from 'react';
import { LuExternalLink, LuMessageSquare, LuPencil, LuPlus, LuShare2, LuX } from 'react-icons/lu';
import { TbBrandFacebook, TbBrandInstagram, TbBrandLinkedin, TbBrandTwitter, TbBrandWhatsapp, TbBrandYoutube } from 'react-icons/tb';
import { Button, Card, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileAdvancedSettingsScreenProps {
    onBack: () => void;
    mode?: 'all' | 'social' | 'feedback';
}

type FeedbackDraft = {
    collectEmail: boolean;
    collectEmailRequired: boolean;
    collectName: boolean;
    collectNameRequired: boolean;
    collectPhone: boolean;
    collectPhoneRequired: boolean;
    feedbackEnabled: boolean;
};

function getInitialFeedbackDraft(storeDetails: any): FeedbackDraft {
    return {
        collectEmail: storeDetails?.feedbackDefaults?.collectEmail ?? true,
        collectEmailRequired: storeDetails?.feedbackDefaults?.collectEmailRequired ?? false,
        collectName: storeDetails?.feedbackDefaults?.collectName ?? false,
        collectNameRequired: storeDetails?.feedbackDefaults?.collectNameRequired ?? false,
        collectPhone: storeDetails?.feedbackDefaults?.collectPhone ?? true,
        collectPhoneRequired: storeDetails?.feedbackDefaults?.collectPhoneRequired ?? false,
        feedbackEnabled: storeDetails?.feedbackEnabled !== false,
    };
}

export default function MobileAdvancedSettingsScreen({ onBack, mode = 'all' }: MobileAdvancedSettingsScreenProps) {
    const t = useTranslations('MobileAdvancedSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);

    const [socialMedia, setSocialMedia] = useState<Record<string, string>>(storeDetails?.socialMedia || {});
    const [originalSocialMedia, setOriginalSocialMedia] = useState<Record<string, string>>(storeDetails?.socialMedia || {});
    const [feedbackEnabled, setFeedbackEnabled] = useState(storeDetails?.feedbackEnabled !== false);
    const [collectName, setCollectName] = useState(storeDetails?.feedbackDefaults?.collectName ?? false);
    const [collectNameRequired, setCollectNameRequired] = useState(storeDetails?.feedbackDefaults?.collectNameRequired ?? false);
    const [collectPhone, setCollectPhone] = useState(storeDetails?.feedbackDefaults?.collectPhone ?? true);
    const [collectPhoneRequired, setCollectPhoneRequired] = useState(storeDetails?.feedbackDefaults?.collectPhoneRequired ?? false);
    const [collectEmail, setCollectEmail] = useState(storeDetails?.feedbackDefaults?.collectEmail ?? true);
    const [collectEmailRequired, setCollectEmailRequired] = useState(storeDetails?.feedbackDefaults?.collectEmailRequired ?? false);
    const [originalFeedbackDraft, setOriginalFeedbackDraft] = useState<FeedbackDraft>(() => getInitialFeedbackDraft(storeDetails));
    const [isSocialPickerOpen, setIsSocialPickerOpen] = useState(false);
    const [editingPlatformKey, setEditingPlatformKey] = useState<string | null>(null);
    const [editingPlatformLabel, setEditingPlatformLabel] = useState('');
    const [editingPlatformValue, setEditingPlatformValue] = useState('');

    const showSocial = mode === 'social';
    const showFeedback = mode === 'all' || mode === 'feedback';

    const pageTitle = mode === 'social'
        ? 'Social Media'
        : mode === 'feedback'
            ? 'Feedback Settings'
            : 'Feedback Settings';
    const pageSubtitle = mode === 'social'
        ? 'Keep your public social links accurate across your business presence.'
        : mode === 'feedback'
            ? 'Control guest feedback collection for this store.'
            : 'Manage store-level guest feedback defaults and collection rules.';

    const SOCIAL_PLATFORMS = [
        { key: 'facebook', label: 'Facebook', placeholder: 'Facebook profile URL', icon: TbBrandFacebook },
        { key: 'instagram', label: 'Instagram', placeholder: 'Instagram profile URL', icon: TbBrandInstagram },
        { key: 'twitter', label: 'X (Twitter)', placeholder: 'Twitter profile URL', icon: TbBrandTwitter },
        { key: 'whatsapp', label: 'WhatsApp', placeholder: 'WhatsApp number with country code', icon: TbBrandWhatsapp },
        { key: 'youtube', label: 'YouTube', placeholder: 'YouTube channel URL', icon: TbBrandYoutube },
        { key: 'linkedin', label: 'LinkedIn', placeholder: 'LinkedIn profile URL', icon: TbBrandLinkedin },
    ];

    const knownPlatformMap = useMemo(
        () => new Map(SOCIAL_PLATFORMS.map((platform) => [platform.key, platform])),
        []
    );

    const linkedSocialPlatforms = useMemo(() => (
        Object.entries(socialMedia)
            .filter(([_, value]) => value?.trim())
            .map(([key, value]) => {
                const knownPlatform = knownPlatformMap.get(key);
                return {
                    key,
                    label: knownPlatform?.label || key,
                    placeholder: knownPlatform?.placeholder || 'Profile URL',
                    icon: knownPlatform?.icon || LuShare2,
                    value,
                    isCustom: !knownPlatform,
                };
            })
            .sort((left, right) => left.label.localeCompare(right.label))
    ), [knownPlatformMap, socialMedia]);

    const availableSocialPlatforms = useMemo(
        () => SOCIAL_PLATFORMS.filter((platform) => !socialMedia[platform.key]?.trim()),
        [socialMedia]
    );

    const saveField = async (updates: Record<string, any>) => {
        setIsSaving(true);
        try {
            await updateStore({ storeId: storeDetails?.storeId, ...updates });
            setStoreDetails({ ...storeDetails, ...updates });
            Toast.show({ content: t('saved'), duration: 1000 });
            return true;
        } catch {
            Toast.show({ content: t('failedToSave'), duration: 2000 });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const persistSocialMedia = (nextSocialMedia: Record<string, string>) => {
        const cleaned: Record<string, string> = {};
        Object.entries(nextSocialMedia).forEach(([key, value]) => {
            if (value.trim()) cleaned[key] = value.trim();
        });
        setSocialMedia(cleaned);
    };

    const handleOpenEditSheet = (platformKey: string) => {
        const platform = knownPlatformMap.get(platformKey);
        setEditingPlatformKey(platformKey);
        setEditingPlatformLabel(platform?.label || platformKey);
        setEditingPlatformValue(socialMedia[platformKey] || '');
    };

    const handleAddCustomPlatform = () => {
        setIsSocialPickerOpen(false);
        setEditingPlatformKey(`custom_${Date.now()}`);
        setEditingPlatformLabel('');
        setEditingPlatformValue('');
    };

    const handleSaveEditedPlatform = () => {
        if (!editingPlatformKey) return;
        const normalizedLabel = editingPlatformLabel.trim();
        const normalizedValue = editingPlatformValue.trim();
        const isKnownPlatform = knownPlatformMap.has(editingPlatformKey);
        const nextSocialMedia = { ...socialMedia };

        if (isKnownPlatform) {
            nextSocialMedia[editingPlatformKey] = normalizedValue;
        } else {
            delete nextSocialMedia[editingPlatformKey];
            if (normalizedLabel) {
                nextSocialMedia[normalizedLabel.toLowerCase()] = normalizedValue;
            }
        }

        persistSocialMedia(nextSocialMedia);
        setEditingPlatformKey(null);
        setEditingPlatformLabel('');
        setEditingPlatformValue('');
    };

    const handleRemoveEditedPlatform = () => {
        if (!editingPlatformKey) return;
        const nextSocialMedia = { ...socialMedia };
        delete nextSocialMedia[editingPlatformKey];
        persistSocialMedia(nextSocialMedia);
        setEditingPlatformKey(null);
        setEditingPlatformLabel('');
        setEditingPlatformValue('');
    };

    const openSocialLink = (url: string) => {
        const trimmed = url.trim();
        if (!trimmed) return;
        const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        window.open(normalized, '_blank', 'noopener,noreferrer');
    };

    const handleToggleFeedback = (enabled: boolean) => {
        setFeedbackEnabled(enabled);
    };

    const handleToggleCollectField = (field: string, value: boolean) => {
        if (field === 'collectName') setCollectName(value);
        if (field === 'collectName' && !value) setCollectNameRequired(false);
        if (field === 'collectPhone') setCollectPhone(value);
        if (field === 'collectPhone' && !value) setCollectPhoneRequired(false);
        if (field === 'collectEmail') setCollectEmail(value);
        if (field === 'collectEmail' && !value) setCollectEmailRequired(false);
    };

    const handleToggleRequiredField = (field: string, value: boolean) => {
        if (field === 'collectNameRequired') setCollectNameRequired(value);
        if (field === 'collectPhoneRequired') setCollectPhoneRequired(value);
        if (field === 'collectEmailRequired') setCollectEmailRequired(value);
    };
    const feedbackFieldCardStyle = {
        border: '1px solid var(--adm-color-border)',
        borderRadius: 12,
        padding: 12,
    } as const;

    const renderFeedbackField = ({
        description,
        isEnabled,
        label,
        mandatoryLabel,
        requiredValue,
        showDescription = false,
        toggleField,
        toggleRequiredField,
        value,
    }: {
        description?: string;
        isEnabled: boolean;
        label: string;
        mandatoryLabel: string;
        requiredValue: boolean;
        showDescription?: boolean;
        toggleField: 'collectName' | 'collectPhone' | 'collectEmail';
        toggleRequiredField: 'collectNameRequired' | 'collectPhoneRequired' | 'collectEmailRequired';
        value: boolean;
    }) => (
        <Flex gap={10} style={{ ...feedbackFieldCardStyle, opacity: isEnabled ? 1 : 0.55 }} vertical>
            <Flex align="center" justify="space-between" gap={12}>
                <Flex style={{ minWidth: 0, flex: 1 }} vertical>
                    <Text style={{ fontWeight: 600 }}>{label}</Text>
                    {showDescription && description ? (
                        <Text color="weak" style={{ fontSize: 12 }}>
                            {description}
                        </Text>
                    ) : null}
                </Flex>
                <Switch checked={value} onChange={(nextValue) => {
                    if (!isEnabled) return;
                    handleToggleCollectField(toggleField, nextValue);
                }} />
            </Flex>
            {value ? (
                <Flex align="center" justify="space-between" gap={12}>
                    <Text color="weak" style={{ fontSize: 13 }}>
                        {mandatoryLabel}
                    </Text>
                    <Switch checked={requiredValue} onChange={(nextValue) => {
                        if (!isEnabled) return;
                        handleToggleRequiredField(toggleRequiredField, nextValue);
                    }} />
                </Flex>
            ) : null}
        </Flex>
    );

    const filledSocialCount = linkedSocialPlatforms.length;
    const feedbackDraft: FeedbackDraft = {
        collectEmail,
        collectEmailRequired,
        collectName,
        collectNameRequired,
        collectPhone,
        collectPhoneRequired,
        feedbackEnabled,
    };
    const isSocialDirty = showSocial && JSON.stringify(socialMedia) !== JSON.stringify(originalSocialMedia);
    const isFeedbackDirty = showFeedback && JSON.stringify(feedbackDraft) !== JSON.stringify(originalFeedbackDraft);
    const editingPlatform = editingPlatformKey ? linkedSocialPlatforms.find((platform) => platform.key === editingPlatformKey) || (
        knownPlatformMap.get(editingPlatformKey)
            ? {
                ...knownPlatformMap.get(editingPlatformKey)!,
                value: socialMedia[editingPlatformKey] || '',
                isCustom: false,
            }
            : {
                key: editingPlatformKey,
                label: editingPlatformLabel || 'Custom Platform',
                placeholder: 'Profile URL',
                icon: LuShare2,
                value: editingPlatformValue,
                isCustom: true,
            }
    ) : null;

    const handleReset = () => {
        if (showSocial) {
            setSocialMedia(originalSocialMedia);
        }
        if (showFeedback) {
            setFeedbackEnabled(originalFeedbackDraft.feedbackEnabled);
            setCollectName(originalFeedbackDraft.collectName);
            setCollectNameRequired(originalFeedbackDraft.collectNameRequired);
            setCollectPhone(originalFeedbackDraft.collectPhone);
            setCollectPhoneRequired(originalFeedbackDraft.collectPhoneRequired);
            setCollectEmail(originalFeedbackDraft.collectEmail);
            setCollectEmailRequired(originalFeedbackDraft.collectEmailRequired);
        }
    };

    const handleSave = async () => {
        const updates: Record<string, any> = {};

        if (showSocial && isSocialDirty) {
            updates.socialMedia = socialMedia;
        }

        if (showFeedback && isFeedbackDirty) {
            updates.feedbackEnabled = feedbackEnabled;
            updates.feedbackDefaults = {
                collectEmail,
                collectEmailRequired,
                collectName,
                collectNameRequired,
                collectPhone,
                collectPhoneRequired,
            };
        }

        if (Object.keys(updates).length === 0) return;

        const didSave = await saveField(updates);
        if (!didSave) return;
        if (showSocial) {
            setOriginalSocialMedia(socialMedia);
        }
        if (showFeedback) {
            setOriginalFeedbackDraft(feedbackDraft);
        }
    };

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar
                onBack={onBack}
                right={isSaving ? <Tag color="processing">Saving</Tag> : null}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={pageSubtitle}
                    title={pageTitle}
                />

                {showSocial ? (
                    <Flex gap={12} vertical>
                        {linkedSocialPlatforms.length > 0 ? (
                            <Flex gap={12} vertical>
                                {linkedSocialPlatforms.map((platform) => (
                                    <Flex
                                        key={platform.key}
                                        gap={12}
                                        style={{
                                            border: '1px solid var(--adm-color-border)',
                                            borderRadius: 8,
                                            padding: '12px 14px',
                                            width: '100%',
                                        }}
                                        vertical
                                    >
                                        <Flex align="center" justify="space-between" gap={12}>
                                            <Flex gap={2} style={{ minWidth: 0, flex: 1 }} vertical>
                                                <Flex align="center" gap={8}>
                                                    <platform.icon color="var(--adm-color-weak)" size={16} />
                                                    <Text strong>{platform.label}</Text>
                                                </Flex>
                                            </Flex>
                                            <Flex gap={8}>
                                                <Button
                                                    fill="outline"
                                                    onClick={() => openSocialLink(platform.value)}
                                                    size="small"
                                                >
                                                    <Flex align="center" gap={6}>
                                                        <LuExternalLink size={14} />
                                                        <Text>Open</Text>
                                                    </Flex>
                                                </Button>
                                                <Button
                                                    color="primary"
                                                    fill="outline"
                                                    onClick={() => handleOpenEditSheet(platform.key)}
                                                    size="small"
                                                >
                                                    Change
                                                </Button>
                                            </Flex>
                                        </Flex>

                                        <Text
                                            style={{
                                                lineHeight: 1.45,
                                                overflowWrap: 'anywhere',
                                            }}
                                        >
                                            {platform.value}
                                        </Text>
                                    </Flex>
                                ))}
                            </Flex>
                        ) : (
                            <Flex align="center" gap={10}>
                                <LuShare2 color="#94a3b8" size={20} />
                                <Flex gap={2} vertical>
                                    <Text strong>No social profiles added</Text>
                                    <Text type="secondary">Add the links customers should use to find and trust your business.</Text>
                                </Flex>
                            </Flex>
                        )}

                        <Button
                            block
                            color="primary"
                            onClick={() => setIsSocialPickerOpen(true)}
                            size="large"
                        >
                            <Flex align="center" gap={6}>
                                <LuPlus size={16} />
                                <Text>Add Social Link</Text>
                            </Flex>
                        </Button>
                    </Flex>
                ) : null}

                {showFeedback ? (
                    <Card size="small" title={<Text strong>{t('guestFeedback')}</Text>}>
                    <List>
                        <List.Item
                            prefix={<LuMessageSquare color="#16a34a" size={18} />}
                            extra={<Switch checked={feedbackEnabled} onChange={handleToggleFeedback} />}
                            title={<Text>{t('enableFeedback')}</Text>}
                        />
                    </List>
                    </Card>
                ) : null}

                {showFeedback && feedbackEnabled ? (
                    <>
                        <Card
                            size="small"
                            title={<Text strong>{t('feedbackFormFields')}</Text>}
                        >
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('feedbackFormFieldsDesc')}</Text>
                                {renderFeedbackField({
                                    isEnabled: feedbackEnabled,
                                    label: t('askForName'),
                                    mandatoryLabel: t('makeNameRequired'),
                                    requiredValue: collectNameRequired,
                                    toggleField: 'collectName',
                                    toggleRequiredField: 'collectNameRequired',
                                    value: collectName,
                                })}
                                {renderFeedbackField({
                                    description: t('forWhatsAppFollowUp'),
                                    isEnabled: feedbackEnabled,
                                    label: t('askForPhone'),
                                    mandatoryLabel: t('makePhoneRequired'),
                                    requiredValue: collectPhoneRequired,
                                    showDescription: true,
                                    toggleField: 'collectPhone',
                                    toggleRequiredField: 'collectPhoneRequired',
                                    value: collectPhone,
                                })}
                                {renderFeedbackField({
                                    isEnabled: feedbackEnabled,
                                    label: t('askForEmail'),
                                    mandatoryLabel: t('makeEmailRequired'),
                                    requiredValue: collectEmailRequired,
                                    toggleField: 'collectEmail',
                                    toggleRequiredField: 'collectEmailRequired',
                                    value: collectEmail,
                                })}
                            </Flex>
                        </Card>
                    </>
                ) : null}

                <Flex gap={8}>
                    <Button block disabled={(!isSocialDirty && !isFeedbackDirty) || isSaving} fill="outline" onClick={handleReset} size="large">
                        Reset
                    </Button>
                    <Button block disabled={!isSocialDirty && !isFeedbackDirty} loading={isSaving} onClick={() => void handleSave()} size="large">
                        Save
                    </Button>
                </Flex>
            </Flex>

            <Popup
                bodyStyle={{ maxHeight: '80vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setIsSocialPickerOpen(false)}
                position="bottom"
                visible={isSocialPickerOpen}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar
                        onBack={() => setIsSocialPickerOpen(false)}
                        right={(
                            <Button
                                fill="none"
                                onClick={() => setIsSocialPickerOpen(false)}
                                style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                            >
                                <LuX size={18} />
                            </Button>
                        )}
                    >
                        Choose Platform
                    </NavBar>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        {availableSocialPlatforms.length > 0 ? (
                            <List>
                                {availableSocialPlatforms.map((platform) => (
                                    <List.Item
                                        arrow
                                        key={platform.key}
                                        onClick={() => {
                                            setIsSocialPickerOpen(false);
                                            handleOpenEditSheet(platform.key);
                                        }}
                                        prefix={<platform.icon color="#94a3b8" size={18} />}
                                        title={<Text strong>{platform.label}</Text>}
                                    />
                                ))}
                                <List.Item
                                    arrow
                                    onClick={handleAddCustomPlatform}
                                    prefix={<LuPlus color="#94a3b8" size={18} />}
                                    title={<Text strong>Other Platform</Text>}
                                />
                            </List>
                        ) : (
                            <List>
                                <List.Item
                                    arrow
                                    onClick={handleAddCustomPlatform}
                                    prefix={<LuPlus color="#94a3b8" size={18} />}
                                    title={<Text strong>Other Platform</Text>}
                                />
                            </List>
                        )}
                    </Flex>
                </Flex>
            </Popup>

            <Popup
                bodyStyle={{ maxHeight: '80vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => {
                    setEditingPlatformKey(null);
                    setEditingPlatformValue('');
                }}
                position="bottom"
                visible={Boolean(editingPlatform)}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar
                        onBack={() => {
                            setEditingPlatformKey(null);
                            setEditingPlatformValue('');
                            setEditingPlatformLabel('');
                        }}
                        right={(
                            <Button
                                fill="none"
                                onClick={() => {
                                    setEditingPlatformKey(null);
                                    setEditingPlatformValue('');
                                    setEditingPlatformLabel('');
                                }}
                                style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                            >
                                <LuX size={18} />
                            </Button>
                        )}
                    >
                        {editingPlatform ? `Edit ${editingPlatform.label}` : 'Edit Link'}
                    </NavBar>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        {editingPlatform ? (
                            <Card size="small">
                                <Flex gap={6} vertical>
                                    {editingPlatform.isCustom ? (
                                        <Input
                                            onChange={setEditingPlatformLabel}
                                            placeholder="Platform name"
                                            value={editingPlatformLabel}
                                        />
                                    ) : null}
                                    <Text type="secondary">
                                        Add the public link customers should open.
                                    </Text>
                                    <Input
                                        onChange={setEditingPlatformValue}
                                        placeholder={editingPlatform.placeholder}
                                        value={editingPlatformValue}
                                    />
                                </Flex>
                            </Card>
                        ) : null}

                        <Flex gap={12}>
                            <Button
                                block
                                color="danger"
                                disabled={!editingPlatformKey || !socialMedia[editingPlatformKey]}
                                fill="outline"
                                onClick={handleRemoveEditedPlatform}
                                size="large"
                            >
                                Remove
                            </Button>
                            <Button
                                block
                                color="primary"
                                loading={isSaving}
                                onClick={handleSaveEditedPlatform}
                                size="large"
                            >
                                Save
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
