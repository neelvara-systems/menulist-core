'use client'

import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import {
    normalizeOwnerSocialMediaLink,
    normalizeOwnerSocialMediaLinks,
} from '@lib/obp/ownerSocialMediaBoundary';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getStoreDeepDifference } from '@lib/store/storeNestedUpdateProjection';
import type { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuExternalLink, LuMessageCircle, LuMessageSquare, LuPencil, LuPlus, LuShare2, LuTrash, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileAdvancedSettingsScreenProps {
    onBack: () => void;
    mode?: 'all' | 'social' | 'feedback';
}

type FeedbackDraft = {
    collectComment: boolean;
    collectCommentRequired: boolean;
    collectEmail: boolean;
    collectEmailRequired: boolean;
    collectName: boolean;
    collectNameRequired: boolean;
    collectPhone: boolean;
    collectPhoneRequired: boolean;
    feedbackEnabled: boolean;
};

type AdvancedSettingsStoreUpdate = Partial<Pick<
    StoreDataType,
    'feedbackDefaults' | 'feedbackEnabled' | 'socialMedia'
>>;

const ADVANCED_SETTINGS_STORE_UPDATE_KEYS = [
    'feedbackDefaults',
    'feedbackEnabled',
    'socialMedia',
] as const satisfies readonly (keyof AdvancedSettingsStoreUpdate)[];

function getInitialFeedbackDraft(storeDetails: StoreDataType | null): FeedbackDraft {
    return {
        collectComment: storeDetails?.feedbackDefaults?.collectComment ?? true,
        collectCommentRequired: storeDetails?.feedbackDefaults?.collectCommentRequired ?? false,
        collectEmail: storeDetails?.feedbackDefaults?.collectEmail ?? true,
        collectEmailRequired: storeDetails?.feedbackDefaults?.collectEmailRequired ?? false,
        collectName: storeDetails?.feedbackDefaults?.collectName ?? false,
        collectNameRequired: storeDetails?.feedbackDefaults?.collectNameRequired ?? false,
        collectPhone: storeDetails?.feedbackDefaults?.collectPhone ?? true,
        collectPhoneRequired: storeDetails?.feedbackDefaults?.collectPhoneRequired ?? false,
        feedbackEnabled: storeDetails?.feedbackEnabled !== false,
    };
}

function sanitizeSocialMediaMap(source: Record<string, string> | null | undefined): Record<string, string> {
    const cleaned: Record<string, string> = {};

    Object.entries(source || {}).forEach(([key, value]) => {
        const normalizedKey = key.trim().toLowerCase();
        const normalizedValue = value?.trim();

        if (!normalizedKey || normalizedKey === 'whatsapp' || !normalizedValue) return;
        cleaned[normalizedKey] = normalizedValue;
    });

    return cleaned;
}

function areSocialMapsEqual(left: Record<string, string>, right: Record<string, string>) {
    const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

function MobileAdvancedSettingsScreenContent({ onBack, mode = 'all' }: MobileAdvancedSettingsScreenProps) {
    const t = useTranslations('MobileAdvancedSettings');
    const tMobile = useTranslations('MobileSettings');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const isMountedRef = useRef(true);
    const saveInFlightRef = useRef(false);

    const [socialMedia, setSocialMedia] = useState<Record<string, string>>(sanitizeSocialMediaMap(storeDetails?.socialMedia));
    const [feedbackEnabled, setFeedbackEnabled] = useState(storeDetails?.feedbackEnabled !== false);
    const [collectComment, setCollectComment] = useState(storeDetails?.feedbackDefaults?.collectComment ?? true);
    const [collectCommentRequired, setCollectCommentRequired] = useState(storeDetails?.feedbackDefaults?.collectCommentRequired ?? false);
    const [collectName, setCollectName] = useState(storeDetails?.feedbackDefaults?.collectName ?? false);
    const [collectNameRequired, setCollectNameRequired] = useState(storeDetails?.feedbackDefaults?.collectNameRequired ?? false);
    const [collectPhone, setCollectPhone] = useState(storeDetails?.feedbackDefaults?.collectPhone ?? true);
    const [collectPhoneRequired, setCollectPhoneRequired] = useState(storeDetails?.feedbackDefaults?.collectPhoneRequired ?? false);
    const [collectEmail, setCollectEmail] = useState(storeDetails?.feedbackDefaults?.collectEmail ?? true);
    const [collectEmailRequired, setCollectEmailRequired] = useState(storeDetails?.feedbackDefaults?.collectEmailRequired ?? false);
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
    const infoContent = useMemo(() => {
        if (mode === 'social') {
            return (
                <Flex gap={8} style={{ maxWidth: 280 }} vertical>
                    <Flex gap={2} vertical>
                        <Text strong>{pageTitle}</Text>
                        <Text type="secondary">{pageSubtitle}</Text>
                    </Flex>
                    <Text type="secondary">
                        WhatsApp is managed from your official page phone number, so only public social profile links appear here.
                    </Text>
                    <Text type="secondary">
                        Add the links customers should use to find and trust your business.
                    </Text>
                </Flex>
            );
        }

        return undefined;
    }, [mode, pageSubtitle, pageTitle]);

    const SOCIAL_PLATFORMS = [
        { key: 'facebook', label: 'Facebook', placeholder: 'Facebook profile URL', icon: LuMessageCircle },
        { key: 'instagram', label: 'Instagram', placeholder: 'Instagram profile URL', icon: LuMessageCircle },
        { key: 'twitter', label: 'X (Twitter)', placeholder: 'Twitter profile URL', icon: LuMessageCircle },
        { key: 'youtube', label: 'YouTube', placeholder: 'YouTube channel URL', icon: LuMessageCircle },
        { key: 'linkedin', label: 'LinkedIn', placeholder: 'LinkedIn profile URL', icon: LuMessageCircle },
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
    const socialMediaBaseline = useMemo(
        () => sanitizeSocialMediaMap(storeDetails?.socialMedia),
        [storeDetails?.socialMedia]
    );
    const feedbackDraftBaseline = useMemo(
        () => getInitialFeedbackDraft(storeDetails),
        [storeDetails]
    );

    const saveField = async (updates: AdvancedSettingsStoreUpdate): Promise<boolean> => {
        if (!storeDetails?.storeId || saveInFlightRef.current) return false;
        const sourceStoreDetails = storeDetails;
        const expectedStoreId = sourceStoreDetails.storeId;
        const expectedTenantId = sourceStoreDetails.tenantId;
        saveInFlightRef.current = true;
        setIsSaving(true);
        try {
            const writeResult = await updateStore({
                ...getStoreDeepDifference(updates, sourceStoreDetails),
                storeId: expectedStoreId,
            });
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_advanced_settings_store_update_rejected',
            );
            if (!isMountedRef.current) return true;
            setStoreDetails((currentStoreDetails) => {
                if (
                    currentStoreDetails?.storeId !== expectedStoreId
                    || currentStoreDetails?.tenantId !== expectedTenantId
                ) {
                    return currentStoreDetails;
                }

                const settledUpdates = ADVANCED_SETTINGS_STORE_UPDATE_KEYS.reduce<AdvancedSettingsStoreUpdate>(
                    (settled, key) => {
                        if (
                            Object.prototype.hasOwnProperty.call(updates, key)
                            && currentStoreDetails[key] === sourceStoreDetails[key]
                        ) {
                            return { ...settled, [key]: updates[key] };
                        }
                        return settled;
                    },
                    {},
                );

                return Object.keys(settledUpdates).length > 0
                    ? { ...currentStoreDetails, ...settledUpdates }
                    : currentStoreDetails;
            });
            Toast.show({ content: t('saved'), duration: 1000 });
            return true;
        } catch (error) {
            logMobileOwnerFailure('mobile_advanced_settings_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('mode', mode),
                updateKeyCount: Object.keys(updates).length,
                hasSocialMediaUpdate: Boolean(updates.socialMedia),
                hasFeedbackEnabledUpdate: Object.prototype.hasOwnProperty.call(updates, 'feedbackEnabled'),
                hasFeedbackDefaultsUpdate: Boolean(updates.feedbackDefaults),
            });
            if (isMountedRef.current) {
                Toast.show({ content: t('failedToSave'), duration: 2000 });
            }
            return false;
        } finally {
            saveInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    };

    const persistSocialMedia = (nextSocialMedia: Record<string, string>) => {
        setSocialMedia(sanitizeSocialMediaMap(nextSocialMedia));
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
        const rawValue = editingPlatformValue.trim();
        const isKnownPlatform = knownPlatformMap.has(editingPlatformKey);

        if (!isKnownPlatform && !normalizedLabel) {
            Toast.show({ content: 'Add a platform name before saving.', duration: 2500 });
            return;
        }

        const normalizedValue = normalizeOwnerSocialMediaLink(
            isKnownPlatform ? editingPlatformKey : normalizedLabel,
            rawValue,
        );
        if (rawValue && !normalizedValue) {
            Toast.show({ content: 'Please enter a valid public profile link.', duration: 2500 });
            return;
        }

        const nextSocialMedia = { ...socialMedia };

        if (isKnownPlatform) {
            if (normalizedValue) {
                nextSocialMedia[editingPlatformKey] = normalizedValue;
            } else {
                delete nextSocialMedia[editingPlatformKey];
            }
        } else {
            delete nextSocialMedia[editingPlatformKey];
            if (normalizedLabel) {
                if (normalizedValue) nextSocialMedia[normalizedLabel.toLowerCase()] = normalizedValue;
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

    const openSocialLink = (url: string, platformKey: string) => {
        const trimmed = url.trim();
        if (!trimmed) return;
        const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        try {
            openIsolatedBrowserUrl(normalized);
        } catch (error) {
            logMobileOwnerFailure('mobile_advanced_settings_external_link_open_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('mode', mode),
                ...getBoundedMobileOwnerStringContext('platformKey', platformKey),
                ...getBoundedMobileOwnerStringContext('socialUrl', normalized),
            });
            Toast.show({ content: 'Unable to open link', duration: 1500 });
        }
    };

    const handleToggleFeedback = (enabled: boolean) => {
        setFeedbackEnabled(enabled);
    };

    const handleToggleCollectField = (field: string, value: boolean) => {
        if (field === 'collectComment') setCollectComment(value);
        if (field === 'collectComment' && !value) setCollectCommentRequired(false);
        if (field === 'collectName') setCollectName(value);
        if (field === 'collectName' && !value) setCollectNameRequired(false);
        if (field === 'collectPhone') setCollectPhone(value);
        if (field === 'collectPhone' && !value) setCollectPhoneRequired(false);
        if (field === 'collectEmail') setCollectEmail(value);
        if (field === 'collectEmail' && !value) setCollectEmailRequired(false);
    };

    const handleToggleRequiredField = (field: string, value: boolean) => {
        if (field === 'collectCommentRequired') setCollectCommentRequired(value);
        if (field === 'collectNameRequired') setCollectNameRequired(value);
        if (field === 'collectPhoneRequired') setCollectPhoneRequired(value);
        if (field === 'collectEmailRequired') setCollectEmailRequired(value);
    };
    const feedbackFieldCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
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
        toggleField: 'collectComment' | 'collectName' | 'collectPhone' | 'collectEmail';
        toggleRequiredField: 'collectCommentRequired' | 'collectNameRequired' | 'collectPhoneRequired' | 'collectEmailRequired';
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
                <Switch aria-label={label} checked={value} onChange={(nextValue) => {
                    if (!isEnabled) return;
                    handleToggleCollectField(toggleField, nextValue);
                }} />
            </Flex>
            {value ? (
                <Flex align="center" justify="space-between" gap={12}>
                    <Text color="weak" style={{ fontSize: 13 }}>
                        {mandatoryLabel}
                    </Text>
                    <Switch aria-label={mandatoryLabel} checked={requiredValue} onChange={(nextValue) => {
                        if (!isEnabled) return;
                        handleToggleRequiredField(toggleRequiredField, nextValue);
                    }} />
                </Flex>
            ) : null}
        </Flex>
    );

    const feedbackDraft: FeedbackDraft = {
        collectComment,
        collectCommentRequired,
        collectEmail,
        collectEmailRequired,
        collectName,
        collectNameRequired,
        collectPhone,
        collectPhoneRequired,
        feedbackEnabled,
    };
    const isSocialDirty = showSocial && !areSocialMapsEqual(socialMedia, socialMediaBaseline);
    const isFeedbackDirty = showFeedback && JSON.stringify(feedbackDraft) !== JSON.stringify(feedbackDraftBaseline);
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

    useEffect(() => {
        if (saveInFlightRef.current) return;
        const nextSocialMedia = sanitizeSocialMediaMap(storeDetails?.socialMedia);
        const nextFeedbackDraft = getInitialFeedbackDraft(storeDetails);

        setSocialMedia(nextSocialMedia);
        setFeedbackEnabled(nextFeedbackDraft.feedbackEnabled);
        setCollectComment(nextFeedbackDraft.collectComment);
        setCollectCommentRequired(nextFeedbackDraft.collectCommentRequired);
        setCollectName(nextFeedbackDraft.collectName);
        setCollectNameRequired(nextFeedbackDraft.collectNameRequired);
        setCollectPhone(nextFeedbackDraft.collectPhone);
        setCollectPhoneRequired(nextFeedbackDraft.collectPhoneRequired);
        setCollectEmail(nextFeedbackDraft.collectEmail);
        setCollectEmailRequired(nextFeedbackDraft.collectEmailRequired);
    }, [storeDetails]);

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const handleReset = () => {
        if (showSocial) {
            setSocialMedia(socialMediaBaseline);
        }
        if (showFeedback) {
            setFeedbackEnabled(feedbackDraftBaseline.feedbackEnabled);
            setCollectComment(feedbackDraftBaseline.collectComment);
            setCollectCommentRequired(feedbackDraftBaseline.collectCommentRequired);
            setCollectName(feedbackDraftBaseline.collectName);
            setCollectNameRequired(feedbackDraftBaseline.collectNameRequired);
            setCollectPhone(feedbackDraftBaseline.collectPhone);
            setCollectPhoneRequired(feedbackDraftBaseline.collectPhoneRequired);
            setCollectEmail(feedbackDraftBaseline.collectEmail);
            setCollectEmailRequired(feedbackDraftBaseline.collectEmailRequired);
        }
    };

    const handleSave = async () => {
        const updates: AdvancedSettingsStoreUpdate = {};

        if (showSocial && isSocialDirty) {
            const normalizedSocialMedia = normalizeOwnerSocialMediaLinks(socialMedia);
            if (normalizedSocialMedia.invalidKeys.length > 0) {
                Toast.show({ content: 'Fix invalid public profile links before saving.', duration: 2500 });
                return;
            }
            updates.socialMedia = normalizedSocialMedia.socialMedia;
        }

        if (showFeedback && isFeedbackDirty) {
            updates.feedbackEnabled = feedbackEnabled;
            updates.feedbackDefaults = {
                collectComment,
                collectCommentRequired,
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
    };

    return (
        <Flex style={{ height: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={pageSubtitle}
                infoContent={infoContent}
                onBack={onBack}
                right={isSaving ? <Tag color="processing">Saving</Tag> : null}
                title={pageTitle}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                {showSocial ? (
                    <Flex gap={12} vertical>
                        {linkedSocialPlatforms.length > 0 ? (
                            <Flex gap={12} vertical>
                                {linkedSocialPlatforms.map((platform) => (
                                    <Card key={platform.key} size="small" style={{ borderRadius: 14 }}>
                                        <Flex gap={12} vertical>
                                            <Flex align="center" justify="space-between" gap={12}>
                                                <Flex gap={2} style={{ minWidth: 0, flex: 1 }} vertical>
                                                    <Flex align="center" gap={8}>
                                                        <platform.icon color={token.colorTextTertiary} size={16} />
                                                        <Text strong>{platform.label}</Text>
                                                    </Flex>
                                                </Flex>
                                                <Flex gap={8}>
                                                    <Button
                                                        aria-label={`Open ${platform.label}`}
                                                        fill="outline"
                                                        onClick={() => openSocialLink(platform.value, platform.key)}
                                                        size="small"
                                                        style={{ borderRadius: 10, minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                                        icon={<LuExternalLink size={12} />}
                                                    />
                                                    <Button
                                                        aria-label={`Edit ${platform.label}`}
                                                        color="primary"
                                                        fill="outline"
                                                        onClick={() => handleOpenEditSheet(platform.key)}
                                                        size="small"
                                                        style={{ borderRadius: 10, minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                                        icon={<LuPencil size={12} />}
                                                    />
                                                    <Button
                                                        aria-label={`Remove ${platform.label}`}
                                                        color="danger"
                                                        fill="outline"
                                                        onClick={() => {
                                                            const nextSocialMedia = { ...socialMedia };
                                                            delete nextSocialMedia[platform.key];
                                                            persistSocialMedia(nextSocialMedia);
                                                        }}
                                                        size="small"
                                                        style={{ borderRadius: 10, minHeight: 44, minWidth: 44, paddingInline: 0 }}
                                                        icon={<LuTrash size={12} />}
                                                    />
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
                                    </Card>
                                ))}
                            </Flex>
                        ) : (
                            <Flex align="center" gap={10}>
                                <LuShare2 color={token.colorTextTertiary} size={20} />
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
                            style={{ minHeight: 44 }}
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
                        <Text type="secondary">Turn this on to collect guest feedback from your public menu and feedback links.</Text>
                        <List>
                            <List.Item
                                prefix={<LuMessageSquare color={token.colorSuccess} size={18} />}
                                extra={<Switch aria-label={t('enableFeedback')} checked={feedbackEnabled} onChange={handleToggleFeedback} />}
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
                                    label: t('askForComment'),
                                    mandatoryLabel: t('makeCommentRequired'),
                                    requiredValue: collectCommentRequired,
                                    toggleField: 'collectComment',
                                    toggleRequiredField: 'collectCommentRequired',
                                    value: collectComment,
                                })}
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

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        bottom: 0,
                        marginInline: -16,
                        padding: '12px 16px',
                        position: 'sticky',
                        zIndex: 20,
                    }}
                    wrap="nowrap"
                >
                    <Button
                        disabled={(!isSocialDirty && !isFeedbackDirty) || isSaving}
                        fill="outline"
                        onClick={handleReset}
                        size="large"
                        style={{ flex: 1, minWidth: 0 }}
                    >
                        {tMobile('reset')}
                    </Button>
                    <Button
                        disabled={(!isSocialDirty && !isFeedbackDirty) || isSaving}
                        loading={isSaving}
                        onClick={() => void handleSave()}
                        size="large"
                        style={{ flex: 1, minWidth: 0 }}
                    >
                        {tMobile('saveChanges')}
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
                                aria-label="Close social link editor"
                                fill="none"
                                onClick={() => setIsSocialPickerOpen(false)}
                                style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
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
                                        prefix={<platform.icon color={token.colorTextTertiary} size={18} />}
                                        title={<Text strong>{platform.label}</Text>}
                                    />
                                ))}
                                <List.Item
                                    arrow
                                    onClick={handleAddCustomPlatform}
                                    prefix={<LuPlus color={token.colorTextTertiary} size={18} />}
                                    title={<Text strong>Other Platform</Text>}
                                />
                            </List>
                        ) : (
                            <List>
                                <List.Item
                                    arrow
                                    onClick={handleAddCustomPlatform}
                                    prefix={<LuPlus color={token.colorTextTertiary} size={18} />}
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
                                style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
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
                                <Flex gap={10} vertical>
                                    {editingPlatform.isCustom ? (
                                        <Flex gap={6} vertical>
                                            <Text strong>Platform name</Text>
                                            <Text type="secondary">Use the customer-facing platform name, for example Zomato, Instagram, or Tripadvisor.</Text>
                                            <Input
                                                aria-label="Platform name"
                                                onChange={setEditingPlatformLabel}
                                                placeholder="Platform name"
                                                value={editingPlatformLabel}
                                            />
                                        </Flex>
                                    ) : null}
                                    <Flex gap={6} vertical>
                                        <Text strong>Public link</Text>
                                        <Text type="secondary">
                                            Add the public link customers should open.
                                        </Text>
                                        <TextArea
                                            aria-label={`${editingPlatform.label} public link`}
                                            autoSize={{ minRows: 3, maxRows: 5 }}
                                            onChange={setEditingPlatformValue}
                                            placeholder={editingPlatform.placeholder}
                                            value={editingPlatformValue}
                                        />
                                    </Flex>
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

export default function MobileAdvancedSettingsScreen(props: MobileAdvancedSettingsScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}::${props.mode || 'all'}`;

    return <MobileAdvancedSettingsScreenContent key={scopeKey} {...props} />;
}
