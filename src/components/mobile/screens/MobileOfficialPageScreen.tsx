'use client'

import { FEATURE_FLAGS } from '@config/features';
import useViewportInfo from '@hook/useViewportInfo';
import { updateStore } from '@database/stores';
import { uploadOBPPhoto } from '@database/stores/uploadOBPPhoto';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { updateLocalizedText } from '@lib/localization/text';
import { buildBusinessCopyManualOverrideMeta } from '@services/ai/businessCopy/metadata';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ColorPicker, InputNumber, Upload, theme } from 'antd';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    LuCalendar,
    LuExternalLink,
    LuMapPin,
    LuMessageSquare,
    LuMessageSquarePlus,
    LuShoppingBag,
    LuSmile,
    LuPhone,
    LuStar,
    LuTrash2,
    LuUpload
} from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, Input, NavBar, Switch, Text, TextArea, Toast } from '../antd';
import MobileLocalizedLanguageSelector from '../components/MobileLocalizedLanguageSelector';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { getLocalizedStoreValue, getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage } from '../utils/localizedStoreContent';

interface MobileOfficialPageScreenProps {
    onBack: () => void;
}

function getInitialPresenceForm(storeDetails: any) {
    const initialPresence = storeDetails?.publicPresence || {};
    return {
        accentColor: initialPresence.accentColor || '#1677ff',
        establishedYear: initialPresence.establishedYear,
        googleMapsUrl: initialPresence.googleMapsUrl || '',
        googleRating: initialPresence.googleRating,
        googleReviewCount: initialPresence.googleReviewCount,
        googleReviewUrl: initialPresence.googleReviewUrl || '',
        iconVariant: initialPresence.iconVariant || 'icons',
        orderUrl: initialPresence.orderUrl || '',
        photos: initialPresence.photos || [],
        reservationUrl: initialPresence.reservationUrl || '',
        showCall: initialPresence.showCall !== false,
        showDirections: initialPresence.showDirections !== false,
        showFeedback: initialPresence.showFeedback !== false,
        showGoogleReview: initialPresence.showGoogleReview !== false,
        showOrder: initialPresence.showOrder !== false,
        showPrivacyLink: initialPresence.showPrivacyLink !== false,
        showRefundLink: initialPresence.showRefundLink !== false,
        showReservation: initialPresence.showReservation !== false,
        showTermsLink: initialPresence.showTermsLink !== false,
        showWhatsApp: initialPresence.showWhatsApp !== false,
        specialNote: '',
        whatsappNumber: initialPresence.whatsappNumber || '',
    };
}

function buildLocalizedPresenceDrafts(storeDetails: any, languages: string[]) {
    const initialPresence = storeDetails?.publicPresence || {};
    return Object.fromEntries(
        languages.map((languageCode) => [
            languageCode,
            {
                descriptor: getLocalizedStoreValue(initialPresence.descriptor, languageCode, ''),
                displayName: getLocalizedStoreValue(initialPresence.displayName, languageCode, ''),
                knownFor: getLocalizedStoreValue(initialPresence.knownFor, languageCode, ''),
                specialNote: getLocalizedStoreValue(initialPresence.specialNote, languageCode, ''),
            },
        ]),
    );
}

export default function MobileOfficialPageScreen({ onBack }: MobileOfficialPageScreenProps) {
    const t = useTranslations('BusinessSettings');
    const tMobile = useTranslations('MobileSettings');
    const tShare = useTranslations('MobileShare');
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const session = useClientAuthSession();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const [selectedLanguage, setSelectedLanguage] = useState(getStorePreferredLanguage(storeDetails));
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const officialPageUrl = useMemo(
        () => generateOBPUrl(storeDetails?.subdomain || '', storeDetails?.customDomain),
        [storeDetails?.customDomain, storeDetails?.subdomain]
    );

    const [formData, setFormData] = useState(getInitialPresenceForm(storeDetails));
    const [originalFormData, setOriginalFormData] = useState(() => getInitialPresenceForm(storeDetails));
    const [localizedDrafts, setLocalizedDrafts] = useState(() => buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails)));
    const [originalLocalizedDrafts, setOriginalLocalizedDrafts] = useState(() => buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails)));
    const currentLocalizedDraft = localizedDrafts[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' };
    const referenceLanguage = getStorePreferredLanguage(storeDetails);
    const isDirty =
        JSON.stringify(formData) !== JSON.stringify(originalFormData)
        || JSON.stringify(localizedDrafts) !== JSON.stringify(originalLocalizedDrafts);

    const photoSlots = useMemo(() => {
        return [...formData.photos.filter(Boolean), ''];
    }, [formData.photos]);
    const officialPageInfoContent = useMemo(() => (
        <Flex gap={8} style={{ maxWidth: 280 }} vertical>
            <Flex gap={2} vertical>
                <Text strong>{t('officialPage')}</Text>
                <Text type="secondary">{t('officialPageSubtitle')}</Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>What you manage here</Text>
                <Text type="secondary">
                    Public name, short descriptor, known for, customer action links, accent color, ratings, and page photos.
                </Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>Language rule</Text>
                <Text type="secondary">
                    Display name, short descriptor, known for, and the special note can be edited per language. Links, toggles, ratings, and photos stay shared across languages.
                </Text>
            </Flex>
        </Flex>
    ), [t]);

    const updatePresence = useCallback(async (nextPresence: typeof formData) => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);
        const nextLocalizedPresence = Object.entries(localizedDrafts).reduce((presence, [languageCode, draft]) => ({
            ...presence,
            displayName: updateLocalizedText(
                presence.displayName,
                draft.displayName,
                languageCode,
                'en',
            ),
            descriptor: updateLocalizedText(
                presence.descriptor,
                draft.descriptor,
                languageCode,
                'en',
            ),
            knownFor: updateLocalizedText(
                presence.knownFor,
                draft.knownFor,
                languageCode,
                'en',
            ),
            specialNote: updateLocalizedText(
                presence.specialNote,
                draft.specialNote,
                languageCode,
                'en',
            ),
        }), {
            displayName: storeDetails.publicPresence?.displayName,
            descriptor: storeDetails.publicPresence?.descriptor,
            knownFor: storeDetails.publicPresence?.knownFor,
            specialNote: storeDetails.publicPresence?.specialNote,
        } as any);
        const payload = {
            businessCopyMeta: buildBusinessCopyManualOverrideMeta({
                existingMeta: storeDetails?.businessCopyMeta,
                fieldKeys: ['displayName', 'descriptor', 'knownFor', 'specialNote'],
            }),
            storeId: storeDetails.storeId,
            publicPresence: {
                ...(storeDetails.publicPresence || {}),
                ...nextPresence,
                displayName: nextLocalizedPresence.displayName,
                descriptor: nextLocalizedPresence.descriptor,
                knownFor: nextLocalizedPresence.knownFor,
                specialNote: nextLocalizedPresence.specialNote,
                photos: nextPresence.photos.filter(Boolean),
            },
        };

        setStoreDetails((previous: any) => ({
            ...previous,
            businessCopyMeta: payload.businessCopyMeta,
            publicPresence: payload.publicPresence,
        }));

        try {
            await updateStore(payload as any);
            setOriginalFormData(nextPresence);
            setOriginalLocalizedDrafts(localizedDrafts);
            Toast.show({ content: tMobile('saved'), duration: 1000 });
        } catch {
            setStoreDetails((previous: any) => ({
                ...previous,
                publicPresence: storeDetails.publicPresence,
            }));
            Toast.show({ content: tMobile('failedToSave'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    }, [localizedDrafts, setStoreDetails, storeDetails, tMobile]);

    const handleSave = useCallback(() => {
        void updatePresence(formData);
    }, [formData, updatePresence]);

    const handlePhotoUpload = async (file: File, index: number) => {
        if (!session?.tId || !session?.sId) {
            Toast.show({ content: t('sessionUnavailable'), duration: 1500 });
            return false;
        }

        setUploadingIndex(index);
        try {
            const url = await uploadOBPPhoto(file, { tId: session.tId, sId: session.sId }, index);
            const nextPhotos = [...formData.photos];
            nextPhotos[index] = url;
            setFormData((previous) => ({ ...previous, photos: nextPhotos.filter(Boolean) }));
        } catch {
            Toast.show({ content: t('photoUploadFailed'), duration: 1500 });
        } finally {
            setUploadingIndex(null);
        }

        return false;
    };

    const handlePhotoRemove = (index: number) => {
        const nextPhotos = [...formData.photos];
        nextPhotos[index] = '';
        setFormData((previous) => ({ ...previous, photos: nextPhotos.filter(Boolean) }));
    };

    const handleReset = useCallback(() => {
        setFormData(originalFormData);
    }, [originalFormData]);

    const withSource = useCallback((url: string, src: 'copy' | 'direct' | 'qr' | 'share') => (
        withAnalyticsSource(
            url,
            src === 'copy' ? 'copy_link' : src === 'share' ? 'native_share' : src,
        )
    ), []);

    const handleCopyLink = useCallback(async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            Toast.show({ content: tShare('copiedLabel', { label }), duration: 1200 });
        } catch {
            Toast.show({ content: tShare('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    }, [tShare]);

    const handleNativeShare = useCallback(async ({ label, text, url }: { label: string; text?: string; url: string }) => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({ text, title: label, url });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            Toast.show({ content: tShare('couldNotCopy'), duration: 1500 });
        }
    }, [tShare]);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    useEffect(() => {
        if (!storeDetails) return;
        setSelectedLanguage(getStorePreferredLanguage(storeDetails));
        setFormData(getInitialPresenceForm(storeDetails));
        setOriginalFormData(getInitialPresenceForm(storeDetails));
        const nextLocalizedDrafts = buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails));
        setLocalizedDrafts(nextLocalizedDrafts);
        setOriginalLocalizedDrafts(nextLocalizedDrafts);
    }, [storeDetails]);

    if (!FEATURE_FLAGS.ENABLE_OBP) {
        return null;
    }

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    const renderQuickActionSettingIcon = (emoji: string, icon: ReactNode) => (
        formData.iconVariant === 'emoji'
            ? <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, textAlign: 'center', width: 16 }}>{emoji}</span>
            : icon
    );

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('officialPageSubtitle')}
                infoContent={officialPageInfoContent}
                onBack={onBack}
                title={t('officialPage')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileLocalizedLanguageSelector
                    helperText="Choose which public-content language you want to edit. Links, toggles, ratings, and photos stay shared for all languages."
                    languages={managedLanguages}
                    onChange={setSelectedLanguage}
                    selectedLanguage={selectedLanguage}
                    title="Official page content language"
                />

                {officialPageUrl ? (
                    <MobileLinkCard
                        compact={isCompactHandheld}
                        description={tShare('obpShareHint')}
                        icon={<LuExternalLink color={token.colorText} size={18} />}
                        isPrimary
                        label={tShare('officialBusinessLink')}
                        onCopy={() => void handleCopyLink(withSource(officialPageUrl, 'copy'), tShare('officialBusinessLink'))}
                        onOpen={() => window.location.assign(withSource(officialPageUrl, 'direct'))}
                        onShare={supportsNativeShare ? () => void handleNativeShare({
                            label: tShare('officialBusinessLink'),
                            text: tShare('obpShareHint'),
                            url: withSource(officialPageUrl, 'share'),
                        }) : undefined}
                        onShowQr={() => setIsQrSheetOpen(true)}
                        value={officialPageUrl}
                    />
                ) : null}

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>Public display name</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            maxLength={60}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                    displayName: value,
                                },
                            }))}
                            placeholder="e.g. Joe's Pizza"
                            showCount
                            value={currentLocalizedDraft.displayName}
                        />
                        <Text type="secondary">{`Optional. Shown publicly instead of your internal store name for ${getStoreLanguageLabel(selectedLanguage)}.`}</Text>
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                        displayName: previous[referenceLanguage]?.displayName || '',
                                    },
                                }))}
                                referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                referenceValue={localizedDrafts[referenceLanguage]?.displayName || ''}
                            />
                        ) : null}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('shortDescriptor')}</Text>
                        <Input
                            maxLength={40}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                    descriptor: value,
                                },
                            }))}
                            placeholder={t('shortDescriptorPlaceholder')}
                            value={currentLocalizedDraft.descriptor}
                        />
                        <Text type="secondary">{t('shortDescriptorHelp')}</Text>
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                        descriptor: previous[referenceLanguage]?.descriptor || '',
                                    },
                                }))}
                                referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                referenceValue={localizedDrafts[referenceLanguage]?.descriptor || ''}
                            />
                        ) : null}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('knownFor')}</Text>
                        <Input
                            maxLength={40}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                    knownFor: value,
                                },
                            }))}
                            placeholder={t('knownForPlaceholder')}
                            value={currentLocalizedDraft.knownFor}
                        />
                        <Text type="secondary">{t('knownForHelp')}</Text>
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                        knownFor: previous[referenceLanguage]?.knownFor || '',
                                    },
                                }))}
                                referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                referenceValue={localizedDrafts[referenceLanguage]?.knownFor || ''}
                            />
                        ) : null}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('officialPageSpecialNote')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            maxLength={140}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                    specialNote: value,
                                },
                            }))}
                            placeholder={t('officialPageSpecialNotePlaceholder')}
                            showCount
                            value={currentLocalizedDraft.specialNote}
                        />
                        <Text type="secondary">{t('officialPageSpecialNoteHelp')}</Text>
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '', specialNote: '' }),
                                        specialNote: previous[referenceLanguage]?.specialNote || '',
                                    },
                                }))}
                                referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                referenceValue={localizedDrafts[referenceLanguage]?.specialNote || ''}
                            />
                        ) : null}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('whatsappNumber')}</Text>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, whatsappNumber: value }))} placeholder="+91 98765 43210" value={formData.whatsappNumber} />
                        <Text type="secondary">{t('whatsappNumberHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleMapsLink')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleMapsUrl: value }))}
                            placeholder="https://maps.google.com/..."
                            value={formData.googleMapsUrl}
                        />
                        <Text type="secondary">{t('googleMapsLinkHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('accentColor')}</Text>
                        <ColorPicker
                            format="hex"
                            onChange={(color) => setFormData((previous) => ({ ...previous, accentColor: color.toHexString() }))}
                            showText
                            value={formData.accentColor}
                        />
                        <Text type="secondary">{t('accentColorHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('establishedYear')}</Text>
                        <InputNumber
                            max={new Date().getFullYear()}
                            min={1900}
                            onChange={(value) => setFormData((previous) => ({ ...previous, establishedYear: typeof value === 'number' ? value : undefined }))}
                            placeholder="2015"
                            style={{ width: '100%' }}
                            value={formData.establishedYear}
                        />
                        <Text type="secondary">{t('establishedYearHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('reservationUrl')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, reservationUrl: value }))}
                            placeholder="https://..."
                            value={formData.reservationUrl}
                        />
                        <Text type="secondary">{t('reservationUrlHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('orderUrl')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, orderUrl: value }))}
                            placeholder="https://..."
                            value={formData.orderUrl}
                        />
                        <Text type="secondary">{t('orderUrlHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleReviewUrl')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleReviewUrl: value }))}
                            placeholder={t('googleReviewUrlPlaceholder')}
                            value={formData.googleReviewUrl}
                        />
                        <Text type="secondary">{t('googleReviewUrlDesc')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleRating')}</Text>
                        <InputNumber
                            max={5}
                            min={1}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleRating: typeof value === 'number' ? value : undefined }))}
                            placeholder="4.5"
                            precision={1}
                            step={0.1}
                            style={{ width: '100%' }}
                            value={formData.googleRating}
                        />
                        <Text type="secondary">{t('googleRatingHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleReviewCount')}</Text>
                        <InputNumber
                            min={0}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleReviewCount: typeof value === 'number' ? value : undefined }))}
                            placeholder="320"
                            style={{ width: '100%' }}
                            value={formData.googleReviewCount}
                        />
                        <Text type="secondary">{t('googleReviewCountHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('businessPhotos')}</Text>
                        <Text type="secondary">{t('businessPhotosHelp')}</Text>
                        <Flex gap={10} wrap>
                            {photoSlots.map((photo, index) => (
                                <Card key={index} style={{ flex: '1 1 30%', minWidth: 92 }}>
                                    <Flex align="center" gap={8} vertical>
                                        {photo ? (
                                            <>
                                                <Image alt={t('photoLabel', { index: index + 1 })} height={88} preview={false} src={photo} style={{ borderRadius: 8, objectFit: 'cover' }} width={88} />
                                                <Button color="danger" fill="none" onClick={() => handlePhotoRemove(index)} size="small">
                                                    <LuTrash2 size={16} />
                                                </Button>
                                            </>
                                        ) : (
                                            <Upload accept="image/*" beforeUpload={(file) => handlePhotoUpload(file, index)} showUploadList={false}>
                                                <Button fill="outline" loading={uploadingIndex === index} size="small">
                                                    <Flex align="center" gap={6}>
                                                        <LuUpload size={16} />
                                                        <Text>{t('photoLabel', { index: index + 1 })}</Text>
                                                    </Flex>
                                                </Button>
                                            </Upload>
                                        )}
                                    </Flex>
                                </Card>
                            ))}
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Text strong>{t('obpIconVariant')}</Text>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuSmile size={16} />
                                <Text>{t('obpUseEmojiIcons')}</Text>
                            </Flex>
                            <Switch
                                checked={formData.iconVariant === 'emoji'}
                                onChange={(value) => setFormData((previous) => ({ ...previous, iconVariant: value ? 'emoji' : 'icons' }))}
                            />
                        </Flex>
                        <Text type="secondary">{t('obpIconVariantHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Text strong>{t('quickActionButtons')}</Text>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('☎️', <LuPhone size={16} />)}
                                <Text>{t('showCallButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showCall} onChange={(value) => setFormData((previous) => ({ ...previous, showCall: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('🟢', <LuMessageSquare size={16} />)}
                                <Text>{t('showWhatsAppButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showWhatsApp} onChange={(value) => setFormData((previous) => ({ ...previous, showWhatsApp: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('📍', <LuMapPin size={16} />)}
                                <Text>{t('showDirectionsButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showDirections} onChange={(value) => setFormData((previous) => ({ ...previous, showDirections: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('📅', <LuCalendar size={16} />)}
                                <Text>{t('showReservationButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showReservation} onChange={(value) => setFormData((previous) => ({ ...previous, showReservation: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('🛍️', <LuShoppingBag size={16} />)}
                                <Text>{t('showOrderButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showOrder} onChange={(value) => setFormData((previous) => ({ ...previous, showOrder: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('⭐', <LuStar size={16} />)}
                                <Text>{t('showGoogleReviewButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showGoogleReview} onChange={(value) => setFormData((previous) => ({ ...previous, showGoogleReview: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                {renderQuickActionSettingIcon('💬', <LuMessageSquarePlus size={16} />)}
                                <Text>{t('showFeedbackButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showFeedback} onChange={(value) => setFormData((previous) => ({ ...previous, showFeedback: value }))} />
                        </Flex>
                    </Flex>
                </Card>

                {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Text strong>{t('publicPolicyLinks')}</Text>
                            <Flex align="center" justify="space-between">
                                <Text>{t('showPrivacyLink')}</Text>
                                <Switch checked={formData.showPrivacyLink} onChange={(value) => setFormData((previous) => ({ ...previous, showPrivacyLink: value }))} />
                            </Flex>
                            <Flex align="center" justify="space-between">
                                <Text>{t('showTermsLink')}</Text>
                                <Switch checked={formData.showTermsLink} onChange={(value) => setFormData((previous) => ({ ...previous, showTermsLink: value }))} />
                            </Flex>
                            <Flex align="center" justify="space-between">
                                <Text>{t('showRefundLink')}</Text>
                                <Switch checked={formData.showRefundLink} onChange={(value) => setFormData((previous) => ({ ...previous, showRefundLink: value }))} />
                            </Flex>
                            <Text type="secondary">{t('policyContentDesktopHint')}</Text>
                        </Flex>
                    </Card>
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
                >
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large">
                        {tMobile('reset')}
                    </Button>
                    <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={handleSave} size="large">
                        {tMobile('saveChanges')}
                    </Button>
                </Flex>
            </Flex>
            <MobileQrCodeSheet
                copyErrorMessage={tShare('couldNotCopy')}
                copySuccessMessage={tShare('linkCopied')}
                downloadSuccessMessage={tShare('qrDownloaded')}
                filename={buildQrCodeFilename(`${storeDetails?.name || 'business'}-official-page`, 'qr')}
                generatingLabel={tShare('generatingQr')}
                helperText={tShare('obpShareHint')}
                imageAlt={tShare('officialBusinessLink')}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={tShare('qrFailed')}
                title={tShare('officialBusinessLink')}
                url={withSource(officialPageUrl, 'qr')}
                visible={isQrSheetOpen}
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
