'use client'

import { FEATURE_FLAGS } from '@config/features';
import type { ObpMenuInfo } from '@/app/client/obp/OBPResolvedSurface';
import useViewportInfo from '@hook/useViewportInfo';
import { updateStore } from '@database/stores';
import { deleteOBPPhotos, uploadOBPPhoto } from '@database/stores/uploadOBPPhoto';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getBrandName } from '@lib/businessIdentity/names';
import { updateLocalizedText } from '@lib/localization/text';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, type MediaImageCropIntent, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import { buildBusinessCopyManualOverrideMeta } from '@services/ai/businessCopy/metadata';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ColorPicker, InputNumber, theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuCalendar,
    LuCrop,
    LuExternalLink,
    LuEye,
    LuImagePlus,
    LuMapPin,
    LuMessageSquare,
    LuMessageSquarePlus,
    LuShoppingBag,
    LuSmile,
    LuPhone,
    LuStar,
    LuTrash2,
} from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, NavBar, Popup, Switch, Text, TextArea, Toast } from '../antd';
import MobileLocalizedLanguageSelector from '../components/MobileLocalizedLanguageSelector';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import { getLocalizedStoreValue, getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage } from '../utils/localizedStoreContent';

const MobileOfficialPagePreviewSheet = dynamic(() => import('../sheets/MobileOfficialPagePreviewSheet'), { ssr: false });

interface MobileOfficialPageScreenProps {
    onBack: () => void;
}

type PresenceFormData = ReturnType<typeof getInitialPresenceForm>;
type LocalizedPresenceDrafts = ReturnType<typeof buildLocalizedPresenceDrafts>;

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
                knownFor: getLocalizedStoreValue(initialPresence.knownFor, languageCode, ''),
                specialNote: getLocalizedStoreValue(initialPresence.specialNote, languageCode, ''),
            },
        ]),
    );
}

function buildLocalizedPresence(storeDetails: any, localizedDrafts: LocalizedPresenceDrafts) {
    return Object.entries(localizedDrafts).reduce((presence, [languageCode, draft]) => ({
        ...presence,
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
        descriptor: storeDetails?.publicPresence?.descriptor,
        knownFor: storeDetails?.publicPresence?.knownFor,
        specialNote: storeDetails?.publicPresence?.specialNote,
    } as any);
}

function buildPublicPresenceDraft(storeDetails: any, nextPresence: PresenceFormData, localizedDrafts: LocalizedPresenceDrafts) {
    const nextLocalizedPresence = buildLocalizedPresence(storeDetails, localizedDrafts);

    return {
        ...(storeDetails?.publicPresence || {}),
        ...nextPresence,
        descriptor: nextLocalizedPresence.descriptor,
        knownFor: nextLocalizedPresence.knownFor,
        specialNote: nextLocalizedPresence.specialNote,
        photos: nextPresence.photos.filter(Boolean),
    };
}

export default function MobileOfficialPageScreen({ onBack }: MobileOfficialPageScreenProps) {
    const t = useTranslations('BusinessSettings');
    const tMobile = useTranslations('MobileSettings');
    const tShare = useTranslations('MobileShare');
    const tDesign = useTranslations('MobileDesignEditor');
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const session = useClientAuthSession();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const { projectsList, selectedProjectId } = useMobileProjects();
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const [selectedLanguage, setSelectedLanguage] = useState(getStorePreferredLanguage(storeDetails));
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
    const [photoDrafts, setPhotoDrafts] = useState<Record<number, {
        crop?: MediaImageCropIntent;
        fileName?: string;
        sourceDataUrl?: string;
    }>>({});
    const [adjustingPhotoIndex, setAdjustingPhotoIndex] = useState<number | null>(null);
    const [photoDeleteQueue, setPhotoDeleteQueue] = useState<string[]>([]);
    const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const [isPreviewSheetOpen, setIsPreviewSheetOpen] = useState(false);
    const replacePhotoInputRef = useRef<HTMLInputElement | null>(null);
    const officialPageUrl = useMemo(
        () => generateOBPUrl(storeDetails?.subdomain || '', storeDetails?.customDomain),
        [storeDetails?.customDomain, storeDetails?.subdomain]
    );

    const [formData, setFormData] = useState(getInitialPresenceForm(storeDetails));
    const [originalFormData, setOriginalFormData] = useState(() => getInitialPresenceForm(storeDetails));
    const [localizedDrafts, setLocalizedDrafts] = useState(() => buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails)));
    const [originalLocalizedDrafts, setOriginalLocalizedDrafts] = useState(() => buildLocalizedPresenceDrafts(storeDetails, getStoreManagedLanguages(storeDetails)));
    const currentLocalizedDraft = localizedDrafts[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' };
    const referenceLanguage = getStorePreferredLanguage(storeDetails);
    const isDirty =
        JSON.stringify(formData) !== JSON.stringify(originalFormData)
        || JSON.stringify(localizedDrafts) !== JSON.stringify(originalLocalizedDrafts)
        || photoDeleteQueue.length > 0;

    const photoSlots = useMemo(() => {
        return [...formData.photos.filter(Boolean), ''];
    }, [formData.photos]);
    const previewStoreDetails = useMemo(() => {
        if (!storeDetails) return null;

        return {
            ...storeDetails,
            publicPresence: buildPublicPresenceDraft(storeDetails, formData, localizedDrafts),
        };
    }, [formData, localizedDrafts, storeDetails]);
    const previewMenuInfo = useMemo<ObpMenuInfo>(() => {
        const empty: ObpMenuInfo = { hasMenu: false, defaultSlug: undefined, projects: [] };
        const entries = (projectsList || []).filter((project: any) => project?.active !== false && project?.deleted !== true);
        const regularProjects = entries.filter((project: any) => project?.isSpecialMenu !== true);
        if (regularProjects.length === 0) return empty;

        const defaultProject = regularProjects.find((project: any) => project?.isDefault === true)
            || regularProjects.find((project: any) => project?.projectId === selectedProjectId)
            || regularProjects[0];
        const activeSpecialProject = entries.find((project: any) => (
            project?.projectId === storeDetails?.activeSpecialMenuId
            && project?.isSpecialMenu === true
            && project?.specialMenuStatus === 'active'
        ));
        const orderedProjects = [
            ...(activeSpecialProject ? [activeSpecialProject] : []),
            defaultProject,
            ...regularProjects.filter((project: any) => project !== defaultProject),
        ];

        return {
            hasMenu: true,
            defaultSlug: defaultProject?.slug || 'menu',
            projects: orderedProjects
                .map((project: any) => ({
                    isDefault: project === defaultProject && project?.isSpecialMenu !== true,
                    isSpecialMenu: project?.isSpecialMenu === true,
                    name: project?.isSpecialMenu ? (project?.specialMenuDisplayName || project?.name) : project?.name,
                    projectId: project?.projectId || 'preview',
                    projectImage: project?.projectImage || null,
                    slug: project?.slug || defaultProject?.slug || 'menu',
                    specialMenuBaseProjectId: project?.specialMenuBaseProjectId,
                    specialMenuDisplayName: project?.specialMenuDisplayName,
                }))
                .filter((project) => project.slug && project.name),
        };
    }, [projectsList, selectedProjectId, storeDetails?.activeSpecialMenuId]);
    const officialPageInfoContent = useMemo(() => (
        <Flex gap={8} style={{ maxWidth: 280 }} vertical>
            <Flex gap={2} vertical>
                <Text strong>{t('officialPage')}</Text>
                <Text type="secondary">{t('officialPageSubtitle')}</Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>What you manage here</Text>
                <Text type="secondary">
                    Short descriptor, known for, customer action links, accent color, ratings, and page photos.
                </Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>Language rule</Text>
                <Text type="secondary">
                    Short descriptor, known for, and the special note can be edited per language. Links, toggles, ratings, and photos stay shared across languages.
                </Text>
            </Flex>
        </Flex>
    ), [t]);

    const queuePhotoDelete = useCallback((photoUrl?: string) => {
        if (!photoUrl || photoUrl.startsWith('data:')) return;
        setPhotoDeleteQueue((previous) => previous.includes(photoUrl) ? previous : [...previous, photoUrl]);
    }, []);

    const updatePresence = useCallback(async (nextPresence: typeof formData) => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);
        const nextPublicPresence = buildPublicPresenceDraft(storeDetails, nextPresence, localizedDrafts);
        const payload = {
            businessCopyMeta: buildBusinessCopyManualOverrideMeta({
                existingMeta: storeDetails?.businessCopyMeta,
                fieldKeys: ['descriptor', 'knownFor', 'specialNote'],
            }),
            storeId: storeDetails.storeId,
            publicPresence: nextPublicPresence,
        };

        setStoreDetails((previous: any) => ({
            ...previous,
            businessCopyMeta: payload.businessCopyMeta,
            publicPresence: payload.publicPresence,
        }));

        try {
            await updateStore(payload as any);
            await deleteOBPPhotos(photoDeleteQueue);
            setPhotoDeleteQueue([]);
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
    }, [localizedDrafts, photoDeleteQueue, setStoreDetails, storeDetails, tMobile]);

    const handleSave = useCallback(() => {
        void updatePresence(formData);
    }, [formData, updatePresence]);

    const savePreparedPhoto = async (
        prepared: PreparedMediaImage,
        index: number,
        fallbackDraft?: {
            fileName?: string;
            sourceDataUrl?: string;
        },
    ) => {
        if (!session?.tId || !session?.sId) {
            Toast.show({ content: t('sessionUnavailable'), duration: 1500 });
            return false;
        }

        setUploadingIndex(index);
        try {
            const url = await uploadOBPPhoto(prepared.blob, { tId: session.tId, sId: session.sId }, index, prepared);
            const nextPhotos = [...formData.photos];
            if (nextPhotos[index] && nextPhotos[index] !== url) {
                queuePhotoDelete(nextPhotos[index]);
            }
            nextPhotos[index] = url;
            setPhotoDrafts((previous) => ({
                ...previous,
                [index]: {
                    crop: prepared.crop,
                    fileName: prepared.sourceName || fallbackDraft?.fileName,
                    sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                },
            }));
            setFormData((previous) => ({ ...previous, photos: nextPhotos.filter(Boolean) }));
        } catch {
            Toast.show({ content: t('photoUploadFailed'), duration: 1500 });
        } finally {
            setUploadingIndex(null);
        }

        return false;
    };

    const handlePhotoUpload = async (file: File, index: number) => {
        try {
            const prepared = await prepareMediaImage(file, 'galleryImage');
            await savePreparedPhoto(prepared, index, {
                fileName: file.name,
                sourceDataUrl: prepared.sourceDataUrl,
            });
        } catch {
            Toast.show({ content: t('photoUploadFailed'), duration: 1500 });
        }

        return false;
    };

    const handlePhotoRemove = (index: number) => {
        const nextPhotos = [...formData.photos];
        queuePhotoDelete(nextPhotos[index]);
        nextPhotos[index] = '';
        setPhotoDrafts((previous) => {
            const next = { ...previous };
            delete next[index];
            return next;
        });
        setFormData((previous) => ({ ...previous, photos: nextPhotos.filter(Boolean) }));
    };
    const activePhoto = activePhotoIndex != null ? photoSlots[activePhotoIndex] : '';
    const canAdjustActivePhoto = activePhotoIndex != null && Boolean(photoDrafts[activePhotoIndex]?.sourceDataUrl);

    const handleReset = useCallback(() => {
        setFormData(originalFormData);
        setLocalizedDrafts(originalLocalizedDrafts);
        setPhotoDeleteQueue([]);
        setActivePhotoIndex(null);
    }, [originalFormData, originalLocalizedDrafts]);

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
        setPhotoDeleteQueue([]);
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
                        <Text strong>{t('shortDescriptor')}</Text>
                        <Input
                            maxLength={40}
                            onChange={(value) => setLocalizedDrafts((previous) => ({
                                ...previous,
                                [selectedLanguage]: {
                                    ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
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
                                        ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
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
                                    ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
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
                                        ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
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
                                    ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
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
                                        ...(previous[selectedLanguage] || { descriptor: '', knownFor: '', specialNote: '' }),
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
                        <div
                            style={{
                                display: 'grid',
                                gap: 10,
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            }}
                        >
                            {photoSlots.map((photo, index) => {
                                const label = t('photoLabel', { index: index + 1 });
                                const isUploading = uploadingIndex === index;

                                if (!photo) {
                                    return (
                                        <MediaImageCard
                                            key={index}
                                            accept={getMediaProfileAcceptAttribute('galleryImage')}
                                            alt={label}
                                            aspectRatio="4 / 3"
                                            imageType="galleryImage"
                                            isBusy={isUploading}
                                            onSelectFile={(file) => { void handlePhotoUpload(file, index); }}
                                            placeholderDescription="Tap to add"
                                            placeholderTitle={label}
                                            showDropHint={false}
                                            size="compact"
                                        />
                                    );
                                }

                                return (
                                    <button
                                        aria-label={`${label} actions`}
                                        key={index}
                                        onClick={() => setActivePhotoIndex(index)}
                                        style={{
                                            appearance: 'none',
                                            background: token.colorFillAlter,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 12,
                                            color: 'inherit',
                                            cursor: 'pointer',
                                            display: 'block',
                                            overflow: 'hidden',
                                            padding: 0,
                                            position: 'relative',
                                            textAlign: 'left',
                                            width: '100%',
                                        }}
                                        type="button"
                                    >
                                        <div style={{ aspectRatio: '4 / 3', overflow: 'hidden', position: 'relative', width: '100%' }}>
                                            <img
                                                alt={label}
                                                src={photo}
                                                style={{
                                                    display: 'block',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    width: '100%',
                                                }}
                                            />
                                            {isUploading ? (
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        background: 'rgba(0,0,0,0.42)',
                                                        color: '#fff',
                                                        inset: 0,
                                                        position: 'absolute',
                                                    }}
                                                >
                                                    <DotLoading />
                                                </Flex>
                                            ) : null}
                                            <div
                                                style={{
                                                    background: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.58))',
                                                    inset: 'auto 0 0 0',
                                                    padding: '22px 10px 8px',
                                                    position: 'absolute',
                                                }}
                                            >
                                                <Text strong style={{ color: '#fff', fontSize: 13 }}>{label}</Text>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
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
                        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        position: 'sticky',
                        zIndex: 20,
                    }}
                    vertical
                >
                    <Button
                        block
                        color="primary"
                        disabled={isSaving}
                        fill="outline"
                        icon={<LuEye size={18} />}
                        onClick={() => setIsPreviewSheetOpen(true)}
                        size="large"
                    >
                        {isDirty ? tDesign('previewChanges') : tDesign('previewOfficialPage')}
                    </Button>
                    {isDirty ? (
                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35, textAlign: 'center' }}>
                            {tDesign('previewUnsavedHint')}
                        </Text>
                    ) : null}
                    <Flex gap={12}>
                        <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large">
                            {tMobile('reset')}
                        </Button>
                        <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={handleSave} size="large">
                            {tMobile('saveChanges')}
                        </Button>
                    </Flex>
                </Flex>
            </Flex>
            {previewStoreDetails ? (
                <MobileOfficialPagePreviewSheet
                    activeLanguage={selectedLanguage}
                    menuInfo={previewMenuInfo}
                    onClose={() => setIsPreviewSheetOpen(false)}
                    storeDetails={previewStoreDetails as any}
                    visible={isPreviewSheetOpen}
                />
            ) : null}
            <input
                accept={getMediaProfileAcceptAttribute('galleryImage')}
                onChange={(event) => {
                    const file = Array.from(event.currentTarget.files || []).find((item) => item.type.startsWith('image/'));
                    const index = activePhotoIndex;
                    event.currentTarget.value = '';
                    if (!file || index == null) return;
                    setActivePhotoIndex(null);
                    void handlePhotoUpload(file, index);
                }}
                ref={replacePhotoInputRef}
                style={{ display: 'none' }}
                type="file"
            />
            <Popup
                bodyStyle={{ maxHeight: '82vh', padding: 0 }}
                destroyOnClose
                onMaskClick={() => setActivePhotoIndex(null)}
                visible={activePhotoIndex != null && Boolean(activePhoto)}
            >
                <Flex style={{ maxHeight: '82vh' }} vertical>
                    <NavBar onBack={() => setActivePhotoIndex(null)}>
                        {activePhotoIndex != null ? t('photoLabel', { index: activePhotoIndex + 1 }) : t('businessPhotos')}
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 16 }} vertical>
                        {activePhoto ? (
                            <img
                                alt={activePhotoIndex != null ? t('photoLabel', { index: activePhotoIndex + 1 }) : t('businessPhotos')}
                                src={activePhoto}
                                style={{
                                    aspectRatio: '4 / 3',
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 12,
                                    display: 'block',
                                    objectFit: 'cover',
                                    width: '100%',
                                }}
                            />
                        ) : null}
                        <Flex gap={8}>
                            <Button
                                block
                                disabled={uploadingIndex != null}
                                fill="outline"
                                onClick={() => replacePhotoInputRef.current?.click()}
                                size="large"
                                style={{ flex: 1, minWidth: 0, paddingInline: 8 }}
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuImagePlus size={18} />
                                    <Text>Replace</Text>
                                </Flex>
                            </Button>
                            {canAdjustActivePhoto ? (
                                <Button
                                    block
                                    disabled={uploadingIndex != null}
                                    fill="outline"
                                    onClick={() => {
                                        const index = activePhotoIndex;
                                        setActivePhotoIndex(null);
                                        if (index != null) setAdjustingPhotoIndex(index);
                                    }}
                                    size="large"
                                    style={{ flex: 1, minWidth: 0, paddingInline: 8 }}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuCrop size={18} />
                                        <Text>Adjust</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                            <Button
                                block
                                color="danger"
                                disabled={uploadingIndex != null}
                                fill="outline"
                                onClick={() => {
                                    const index = activePhotoIndex;
                                    setActivePhotoIndex(null);
                                    if (index != null) handlePhotoRemove(index);
                                }}
                                size="large"
                                style={{ flex: 1, minWidth: 0, paddingInline: 8 }}
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuTrash2 size={18} />
                                    <Text>Remove</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
            <MobileQrCodeSheet
                copyErrorMessage={tShare('couldNotCopy')}
                copySuccessMessage={tShare('linkCopied')}
                downloadSuccessMessage={tShare('qrDownloaded')}
                filename={buildQrCodeFilename(`${getBrandName(storeDetails as any, 'business')}-official-page`, 'qr')}
                generatingLabel={tShare('generatingQr')}
                helperText={tShare('obpShareHint')}
                imageAlt={tShare('officialBusinessLink')}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={tShare('qrFailed')}
                title={tShare('officialBusinessLink')}
                url={withSource(officialPageUrl, 'qr')}
                visible={isQrSheetOpen}
            />
            <MediaImageAdjustModal
                fileName={adjustingPhotoIndex != null ? photoDrafts[adjustingPhotoIndex]?.fileName : undefined}
                imageType="galleryImage"
                initialCrop={adjustingPhotoIndex != null ? photoDrafts[adjustingPhotoIndex]?.crop : undefined}
                onApply={async (prepared) => {
                    if (adjustingPhotoIndex == null) return;
                    await savePreparedPhoto(prepared, adjustingPhotoIndex, photoDrafts[adjustingPhotoIndex]);
                }}
                onClose={() => setAdjustingPhotoIndex(null)}
                open={adjustingPhotoIndex != null}
                sourceDataUrl={adjustingPhotoIndex != null ? photoDrafts[adjustingPhotoIndex]?.sourceDataUrl : undefined}
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
