'use client'

import { FEATURE_FLAGS } from '@config/features';
import useViewportInfo from '@hook/useViewportInfo';
import { updateStore } from '@database/stores';
import { uploadOBPPhoto } from '@database/stores/uploadOBPPhoto';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getLocalizedText, getPrimaryLocalizedLanguage, updateLocalizedText } from '@lib/localization/text';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ColorPicker, InputNumber, Upload, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    LuCalendar,
    LuExternalLink,
    LuMapPin,
    LuMessageSquare,
    LuShoppingBag,
    LuPhone,
    LuTrash2,
    LuUpload
} from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, Input, NavBar, Switch, Text, Toast } from '../antd';
import MobileLocalizedLanguageSelector from '../components/MobileLocalizedLanguageSelector';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileScreenIntro from '../components/MobileScreenIntro';
import { getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage } from '../utils/localizedStoreContent';

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
        orderUrl: initialPresence.orderUrl || '',
        photos: initialPresence.photos || [],
        reservationUrl: initialPresence.reservationUrl || '',
        showCall: initialPresence.showCall !== false,
        showDirections: initialPresence.showDirections !== false,
        showOrder: initialPresence.showOrder !== false,
        showReservation: initialPresence.showReservation !== false,
        showWhatsApp: initialPresence.showWhatsApp !== false,
        whatsappNumber: initialPresence.whatsappNumber || '',
    };
}

function buildLocalizedPresenceDrafts(storeDetails: any, languages: string[]) {
    const initialPresence = storeDetails?.publicPresence || {};
    return Object.fromEntries(
        languages.map((languageCode) => [
            languageCode,
            {
                descriptor: getLocalizedText(initialPresence.descriptor, languageCode, getPrimaryLocalizedLanguage(initialPresence.descriptor, languageCode), ''),
                displayName: getLocalizedText(initialPresence.displayName, languageCode, getPrimaryLocalizedLanguage(initialPresence.displayName, languageCode), ''),
                knownFor: getLocalizedText(initialPresence.knownFor, languageCode, getPrimaryLocalizedLanguage(initialPresence.knownFor, languageCode), ''),
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
    const currentLocalizedDraft = localizedDrafts[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '' };
    const referenceLanguage = getStorePreferredLanguage(storeDetails);
    const isDirty =
        JSON.stringify(formData) !== JSON.stringify(originalFormData)
        || JSON.stringify(localizedDrafts) !== JSON.stringify(originalLocalizedDrafts);

    const photoSlots = useMemo(() => {
        const slots = Array.from({ length: 3 }, (_, index) => formData.photos[index] || '');
        return slots;
    }, [formData.photos]);

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
        }), {
            displayName: storeDetails.publicPresence?.displayName,
            descriptor: storeDetails.publicPresence?.descriptor,
            knownFor: storeDetails.publicPresence?.knownFor,
        } as any);
        const payload = {
            storeId: storeDetails.storeId,
            publicPresence: {
                ...(storeDetails.publicPresence || {}),
                ...nextPresence,
                displayName: nextLocalizedPresence.displayName,
                descriptor: nextLocalizedPresence.descriptor,
                knownFor: nextLocalizedPresence.knownFor,
                photos: nextPresence.photos.filter(Boolean),
            },
        };

        setStoreDetails((previous: any) => ({
            ...previous,
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
        const nextPhotos = [...photoSlots];
        nextPhotos[index] = '';
        setFormData((previous) => ({ ...previous, photos: nextPhotos.filter(Boolean) }));
    };

    const handleReset = useCallback(() => {
        setFormData(originalFormData);
    }, [originalFormData]);

    const withSource = useCallback((url: string, src: 'copy' | 'direct' | 'qr' | 'share') => (
        url ? `${url}${url.includes('?') ? '&' : '?'}src=${src}` : url
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

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('officialPageSubtitle')}
                    title={t('officialPage')}
                />

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
                        <Input
                            maxLength={60}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '' }),
                                    displayName: value,
                                },
                            }))}
                            placeholder="e.g. Joe's Pizza"
                            value={currentLocalizedDraft.displayName}
                        />
                        <Text type="secondary">{`Optional. Shown publicly instead of your internal store name for ${getStoreLanguageLabel(selectedLanguage)}.`}</Text>
                        {selectedLanguage !== referenceLanguage ? (
                            <LocalizedReferenceHint
                                onUseReference={() => setLocalizedDrafts((previous) => ({
                                    ...previous,
                                    [selectedLanguage]: {
                                        ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '' }),
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
                                    ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '' }),
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
                                        ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '' }),
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
                                    ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '' }),
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
                                        ...(previous[selectedLanguage] || { descriptor: '', displayName: '', knownFor: '' }),
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
                        <Text strong>{t('whatsappNumber')}</Text>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, whatsappNumber: value }))} placeholder="+91 98765 43210" value={formData.whatsappNumber} />
                        <Text type="secondary">{t('whatsappNumberHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleMapsLink')}</Text>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, googleMapsUrl: value }))} placeholder="https://maps.google.com/..." value={formData.googleMapsUrl} />
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
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, reservationUrl: value }))} placeholder="https://..." value={formData.reservationUrl} />
                        <Text type="secondary">{t('reservationUrlHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('orderUrl')}</Text>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, orderUrl: value }))} placeholder="https://..." value={formData.orderUrl} />
                        <Text type="secondary">{t('orderUrlHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('googleReviewUrl')}</Text>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, googleReviewUrl: value }))} placeholder={t('googleReviewUrlPlaceholder')} value={formData.googleReviewUrl} />
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
                        <Text strong>{t('quickActionButtons')}</Text>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuPhone size={16} />
                                <Text>{t('showCallButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showCall} onChange={(value) => setFormData((previous) => ({ ...previous, showCall: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuMessageSquare size={16} />
                                <Text>{t('showWhatsAppButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showWhatsApp} onChange={(value) => setFormData((previous) => ({ ...previous, showWhatsApp: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuMapPin size={16} />
                                <Text>{t('showDirectionsButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showDirections} onChange={(value) => setFormData((previous) => ({ ...previous, showDirections: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuCalendar size={16} />
                                <Text>{t('showReservationButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showReservation} onChange={(value) => setFormData((previous) => ({ ...previous, showReservation: value }))} />
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuShoppingBag size={16} />
                                <Text>{t('showOrderButton')}</Text>
                            </Flex>
                            <Switch checked={formData.showOrder} onChange={(value) => setFormData((previous) => ({ ...previous, showOrder: value }))} />
                        </Flex>
                    </Flex>
                </Card>

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
