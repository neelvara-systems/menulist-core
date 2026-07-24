'use client';

import { FEATURE_FLAGS } from '@config/features';
import { deleteOBPPhotos, uploadOBPCover, uploadOBPPhoto } from '@database/stores/uploadOBPPhoto';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { generateBusinessCoverCandidate } from '@lib/image/projectImageGeneration';
import { getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage, getLocalizedStoreValue } from '@lib/localization/storeContent';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, type MediaImageCropIntent, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import { buildVisualProfileCompletion } from '@lib/visualProfile/visualProfileCompletion';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import MediaPublicContextPreview from '@/components/shared/media/MediaPublicContextPreview';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { Button, Card, Col, ColorPicker, Divider, Flex, Form, Input, InputNumber, Row, Select, Switch, Tag, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import ShareLinkCard from '../../ShareLinkCard';
import { LuAlertCircle, LuArrowLeft, LuArrowRight, LuCalendar, LuCheckCircle, LuExternalLink, LuMapPin, LuMessageSquare, LuMessageSquarePlus, LuPhone, LuShoppingBag, LuSmile, LuSparkles, LuStar } from 'react-icons/lu';
import CompliancePagesSection from './CompliancePagesSection';
import GoogleListingGuide from './GoogleListingGuide';

const { Title, Text } = Typography;

function normalizePhotoList(photos: unknown): string[] {
    return Array.isArray(photos)
        ? photos.filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0)
        : [];
}

interface OfficialPageTabProps {
    actionsScrollRef?: React.RefObject<HTMLDivElement>;
    businessCategory?: string | null;
    businessType?: string | null;
    photosScrollRef?: React.RefObject<HTMLDivElement>;
    scrollRef?: React.RefObject<HTMLDivElement>;
    compact?: boolean;
    showDistributionTools?: boolean;
    publicPresence?: {
        descriptor?: string | Record<string, string>;
        knownFor?: string | Record<string, string>;
        specialNote?: string | Record<string, string>;
        accentColor?: string;
        whatsappNumber?: string;
        googleMapsUrl?: string;
        showCall?: boolean;
        showWhatsApp?: boolean;
        showDirections?: boolean;
        showReservation?: boolean;
        showOrder?: boolean;
        showGoogleReview?: boolean;
        showFeedback?: boolean;
        showPrivacyLink?: boolean;
        showTermsLink?: boolean;
        showRefundLink?: boolean;
        iconVariant?: 'icons' | 'emoji';
        reservationUrl?: string;
        orderUrl?: string;
        establishedYear?: number;
        googleReviewUrl?: string;
        googleRating?: number;
        googleReviewCount?: number;
        businessCover?: string;
        photos?: string[];
        googleLinkUpdated?: boolean;
        googleLinkUpdatedAt?: string;
    };
    onPublicPresenceChange?: (field: string, value: any) => void;
    onPhotoDeleteQueued?: (photoUrl: string) => void;
    onContentLanguageChange?: (language: string) => void;
    subdomain?: string;
    customDomain?: string;
    onGoogleLinkDone?: () => void;
    onGoogleLinkDismiss?: () => void;
}

type ObpMediaDraft = {
    crop?: MediaImageCropIntent;
    fileName?: string;
    prepared?: PreparedMediaImage;
    previewDataUrl?: string;
    sourceDataUrl?: string;
    uploadFailed?: boolean;
};

const OfficialPageTab = forwardRef<HTMLDivElement, OfficialPageTabProps>(
    ({
        actionsScrollRef,
        scrollRef,
        businessCategory,
        businessType,
        photosScrollRef,
        compact = false,
        showDistributionTools = true,
        publicPresence = {},
        onPublicPresenceChange,
        onPhotoDeleteQueued,
        onContentLanguageChange,
        subdomain,
        customDomain,
        onGoogleLinkDone,
        onGoogleLinkDismiss
    }, ref) => {
        const t = useTranslations('BusinessSettings');
        const form = Form.useFormInstance();
        const session = useClientAuthSession();
        const { token } = theme.useToken();
        const [photoUploading, setPhotoUploading] = useState<number | null>(null);
        const [coverUploading, setCoverUploading] = useState(false);
        const [coverGenerating, setCoverGenerating] = useState(false);
        const [photos, setPhotos] = useState<string[]>(publicPresence?.photos || []);
        const lastAppliedPhotosKeyRef = useRef(JSON.stringify(normalizePhotoList(publicPresence?.photos)));
        const [coverDraft, setCoverDraft] = useState<ObpMediaDraft | null>(null);
        const [photoDrafts, setPhotoDrafts] = useState<Record<number, ObpMediaDraft>>({});
        const [isCoverAdjustOpen, setIsCoverAdjustOpen] = useState(false);
        const [adjustingPhotoIndex, setAdjustingPhotoIndex] = useState<number | null>(null);
        const componentActiveRef = useRef(true);
        const photoSlots = [...photos.filter(Boolean), ''];
        const officialPageUrl = generateOBPUrl(subdomain, customDomain);
        const localizedPresenceDrafts = Form.useWatch('__localizedPublicPresenceDrafts') || {};
        const storeContentLanguage = Form.useWatch('__storeContentLanguage');
        const activeLanguages = Form.useWatch('activeLanguages') || [];
        const defaultLanguage = Form.useWatch('defaultLanguage');
        const watchedDescriptor = Form.useWatch(['publicPresence', 'descriptor']);
        const watchedKnownFor = Form.useWatch(['publicPresence', 'knownFor']);
        const watchedSpecialNote = Form.useWatch(['publicPresence', 'specialNote']);
        const watchedPhotos = Form.useWatch(['publicPresence', 'photos']);
        const watchedBusinessCoverValue = Form.useWatch(['publicPresence', 'businessCover']);
        const watchedAccentColor = Form.useWatch(['publicPresence', 'accentColor']) || publicPresence?.accentColor;
        const watchedTenantName = Form.useWatch('tenantName');
        const watchedStoreName = Form.useWatch('name');
        const watchedBusinessCover = watchedBusinessCoverValue !== undefined
            ? watchedBusinessCoverValue
            : publicPresence?.businessCover || '';
        const visualProfileCompletion = useMemo(() => buildVisualProfileCompletion({
            businessCategory,
            businessCover: watchedBusinessCover,
            businessType,
            photos,
        }), [businessCategory, businessType, photos, watchedBusinessCover]);
        const watchedIconVariant = Form.useWatch(['publicPresence', 'iconVariant']) || publicPresence?.iconVariant || 'icons';
        const managedLanguages = Array.from(new Set([defaultLanguage, ...(activeLanguages || []), 'en'].filter(Boolean)));
        const currentLanguage = storeContentLanguage || getStorePreferredLanguage({ activeLanguages: managedLanguages, defaultLanguage });
        const referenceLanguage = getStorePreferredLanguage({ activeLanguages: managedLanguages, defaultLanguage });
        const halfCol = compact ? { xs: 24 } : { xs: 24, md: 12 };
        const accentCol = compact ? { xs: 24 } : { xs: 24, md: 6 };
        const reviewUrlCol = compact ? { xs: 24 } : { xs: 24, md: 10 };
        const reviewStatCol = compact ? { xs: 24 } : { xs: 24, md: 7 };
        const actionCol = compact ? { xs: 24 } : { xs: 24, md: 8 };
        const businessPreviewName = watchedTenantName || watchedStoreName || t('officialPage');

        useEffect(() => {
            componentActiveRef.current = true;
            return () => {
                componentActiveRef.current = false;
            };
        }, []);

        const queuePhotoDelete = (photoUrl?: string) => {
            if (!photoUrl || photoUrl.startsWith('data:')) return;
            onPhotoDeleteQueued?.(photoUrl);
        };

        const applyPhotos = (updated: string[]) => {
            const cleanedPhotos = normalizePhotoList(updated);
            lastAppliedPhotosKeyRef.current = JSON.stringify(cleanedPhotos);
            setPhotos(updated);
            form.setFieldValue(['publicPresence', 'photos'], cleanedPhotos);
            onPublicPresenceChange?.('photos', cleanedPhotos);
        };

        const handleToggle = (field: string) => (checked: boolean) => {
            onPublicPresenceChange?.(field, checked);
        };

        const applyBusinessCover = (url: string) => {
            form.setFieldValue(['publicPresence', 'businessCover'], url);
            onPublicPresenceChange?.('businessCover', url);
        };

        const savePreparedCover = async (
            prepared: PreparedMediaImage,
            fallbackDraft?: {
                fileName?: string;
                sourceDataUrl?: string;
            },
            successMessage = t('businessCoverUploaded'),
        ) => {
            if (!componentActiveRef.current) return;
            if (!session?.tId || !session?.sId) {
                message.error(t('sessionUnavailable'));
                return;
            }

            setCoverDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || fallbackDraft?.fileName,
                prepared,
                previewDataUrl: prepared.dataUrl,
                sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                uploadFailed: false,
            });
            setCoverUploading(true);
            try {
                const url = await uploadOBPCover(prepared.blob, { tId: session.tId, sId: session.sId }, prepared);
                if (!componentActiveRef.current) {
                    await deleteOBPPhotos([url]);
                    return;
                }
                // Treat the immediate upload as a cleanup candidate until the
                // parent store save confirms it is still referenced.
                queuePhotoDelete(url);
                if (watchedBusinessCover && watchedBusinessCover !== url) {
                    queuePhotoDelete(watchedBusinessCover);
                }
                applyBusinessCover(url);
                setCoverDraft({
                    crop: prepared.crop,
                    fileName: prepared.sourceName || fallbackDraft?.fileName,
                    prepared,
                    previewDataUrl: prepared.dataUrl,
                    sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                    uploadFailed: false,
                });
                message.success(successMessage);
            } catch {
                if (componentActiveRef.current) {
                    setCoverDraft((previous) => previous ? {
                        ...previous,
                        prepared,
                        previewDataUrl: prepared.dataUrl,
                        uploadFailed: true,
                    } : previous);
                    message.error(t('businessCoverUploadFailed'));
                }
            } finally {
                if (componentActiveRef.current) setCoverUploading(false);
            }
        };

        const handleCoverUpload = async (file: File) => {
            try {
                const prepared = await prepareMediaImage(file, 'businessCover');
                await savePreparedCover(prepared, {
                    fileName: file.name,
                    sourceDataUrl: prepared.sourceDataUrl,
                });
            } catch {
                if (componentActiveRef.current) message.error(t('businessCoverUploadFailed'));
            }
        };

        const handleGenerateBusinessCover = async () => {
            setCoverGenerating(true);
            try {
                const formValues = form.getFieldsValue(true) || {};
                const candidate = await generateBusinessCoverCandidate({
                    businessCategory: formValues.businessCategory,
                    businessType: formValues.businessType,
                    projects: [],
                    store: {
                        ...formValues,
                        publicPresence: {
                            ...(publicPresence || {}),
                            ...(formValues.publicPresence || {}),
                        },
                    },
                    storeName: formValues.tenantName || formValues.name,
                });

                if (!candidate?.dataUrl) {
                    if (componentActiveRef.current) message.error(t('businessCoverGenerateFailed'));
                    return;
                }

                const prepared = await prepareMediaImage(candidate.dataUrl, 'businessCover', {
                    fileName: candidate.name,
                });
                await savePreparedCover(prepared, {
                    fileName: candidate.name,
                    sourceDataUrl: prepared.sourceDataUrl,
                }, t('businessCoverGenerated'));
            } catch {
                if (componentActiveRef.current) message.error(t('businessCoverGenerateFailed'));
            } finally {
                if (componentActiveRef.current) setCoverGenerating(false);
            }
        };

        const handleCoverRemove = () => {
            queuePhotoDelete(watchedBusinessCover);
            applyBusinessCover('');
            setCoverDraft(null);
        };

        const handleCoverCardRemove = () => {
            if (coverDraft?.uploadFailed) {
                setCoverDraft(null);
                return;
            }
            handleCoverRemove();
        };

        const handleRetryCoverUpload = () => {
            if (!coverDraft?.prepared) return;
            void savePreparedCover(coverDraft.prepared, coverDraft);
        };

        const savePreparedPhoto = async (
            prepared: PreparedMediaImage,
            index: number,
            fallbackDraft?: {
                fileName?: string;
                sourceDataUrl?: string;
            },
        ) => {
            if (!componentActiveRef.current) return;
            if (!session?.tId || !session?.sId) {
                message.error(t('sessionUnavailable'));
                return;
            }
            setPhotoDrafts((previous) => ({
                ...previous,
                [index]: {
                    crop: prepared.crop,
                    fileName: prepared.sourceName || fallbackDraft?.fileName,
                    prepared,
                    previewDataUrl: prepared.dataUrl,
                    sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                    uploadFailed: false,
                },
            }));
            setPhotoUploading(index);
            try {
                const url = await uploadOBPPhoto(prepared.blob, { tId: session.tId, sId: session.sId }, index, prepared);
                if (!componentActiveRef.current) {
                    await deleteOBPPhotos([url]);
                    return;
                }
                queuePhotoDelete(url);
                const updated = [...photos];
                if (updated[index] && updated[index] !== url) {
                    queuePhotoDelete(updated[index]);
                }
                updated[index] = url;
                applyPhotos(updated);
                setPhotoDrafts((previous) => ({
                    ...previous,
                    [index]: {
                        crop: prepared.crop,
                        fileName: prepared.sourceName || fallbackDraft?.fileName,
                        prepared,
                        previewDataUrl: prepared.dataUrl,
                        sourceDataUrl: prepared.sourceDataUrl || fallbackDraft?.sourceDataUrl,
                        uploadFailed: false,
                    },
                }));
                message.success(t('photoUploaded'));
            } catch {
                if (componentActiveRef.current) {
                    setPhotoDrafts((previous) => ({
                        ...previous,
                        [index]: {
                            ...previous[index],
                            prepared,
                            previewDataUrl: prepared.dataUrl,
                            uploadFailed: true,
                        },
                    }));
                    message.error(t('photoUploadFailed'));
                }
            } finally {
                if (componentActiveRef.current) setPhotoUploading(null);
            }
        };

        const handlePhotoUpload = async (file: File, index: number) => {
            try {
                const prepared = await prepareMediaImage(file, 'galleryImage');
                await savePreparedPhoto(prepared, index, {
                    fileName: file.name,
                    sourceDataUrl: prepared.sourceDataUrl,
                });
            } catch {
                if (componentActiveRef.current) message.error(t('photoUploadFailed'));
            }
        };

        const handlePhotoRemove = (index: number) => {
            const updated = [...photos];
            queuePhotoDelete(updated[index]);
            updated[index] = '';
            applyPhotos(updated);
            setPhotoDrafts((previous) => {
                const next = { ...previous };
                delete next[index];
                return next;
            });
        };

        const handlePhotoCardRemove = (index: number) => {
            if (photoDrafts[index]?.uploadFailed) {
                setPhotoDrafts((previous) => {
                    const next = { ...previous };
                    delete next[index];
                    return next;
                });
                return;
            }
            handlePhotoRemove(index);
        };

        const handleRetryPhotoUpload = (index: number) => {
            const draft = photoDrafts[index];
            if (!draft?.prepared) return;
            void savePreparedPhoto(draft.prepared, index, draft);
        };

        const handlePhotoMove = (index: number, direction: -1 | 1) => {
            const updated = photos.filter(Boolean);
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= updated.length) return;

            [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
            applyPhotos(updated);
            setPhotoDrafts((previous) => {
                const next = { ...previous };
                [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
                return next;
            });
        };

        useEffect(() => {
            const nextDrafts = Object.keys(localizedPresenceDrafts || {}).length > 0
                ? localizedPresenceDrafts
                : Object.fromEntries(
                    managedLanguages.map((languageCode) => [
                        languageCode,
                        {
                            descriptor: getLocalizedStoreValue(publicPresence?.descriptor, languageCode, ''),
                            knownFor: getLocalizedStoreValue(publicPresence?.knownFor, languageCode, ''),
                            specialNote: getLocalizedStoreValue(publicPresence?.specialNote, languageCode, ''),
                        },
                    ]),
                );

            form.setFieldsValue({
                __localizedPublicPresenceDrafts: nextDrafts,
                __storeContentLanguage: currentLanguage,
                publicPresence: {
                    ...form.getFieldValue('publicPresence'),
                    descriptor: nextDrafts[currentLanguage]?.descriptor || '',
                    knownFor: nextDrafts[currentLanguage]?.knownFor || '',
                    specialNote: nextDrafts[currentLanguage]?.specialNote || '',
                },
            });
        }, [publicPresence]); // eslint-disable-line react-hooks/exhaustive-deps

        useEffect(() => {
            if (watchedPhotos === undefined) return;
            const nextPhotos = normalizePhotoList(watchedPhotos);
            const nextKey = JSON.stringify(nextPhotos);
            if (nextKey === lastAppliedPhotosKeyRef.current) return;
            lastAppliedPhotosKeyRef.current = nextKey;
            setPhotos(nextPhotos);
            setPhotoDrafts({});
            setAdjustingPhotoIndex(null);
        }, [watchedPhotos]);

        useEffect(() => {
            const visiblePresence = form.getFieldValue('publicPresence') || {};
            form.setFieldsValue({
                __localizedPublicPresenceDrafts: {
                    ...localizedPresenceDrafts,
                    [currentLanguage]: {
                        descriptor: visiblePresence.descriptor || '',
                        knownFor: visiblePresence.knownFor || '',
                        specialNote: visiblePresence.specialNote || '',
                    },
                },
            });
        }, [currentLanguage, watchedDescriptor, watchedKnownFor, watchedSpecialNote]); // eslint-disable-line react-hooks/exhaustive-deps

        if (!FEATURE_FLAGS.ENABLE_OBP) return null;

        return (
            <>
                {showDistributionTools && officialPageUrl ? (
                    <div style={{ marginTop: 16 }}>
                        <ShareLinkCard
                            title="Official Business Page Link"
                            description="Share this with customers — it always shows your latest public page"
                            url={officialPageUrl}
                            shortUrl={officialPageUrl.replace(/^https?:\/\//, '')}
                            sharePrefix="Here is our official business page:"
                            copySuccessLabel="Official business page link"
                        />
                    </div>
                ) : null}
                {showDistributionTools ? (
                    <GoogleListingGuide
                        businessName={getLocalizedStoreValue(watchedStoreName || watchedTenantName, currentLanguage, '')}
                        subdomain={subdomain}
                        customDomain={customDomain}
                        descriptor={getLocalizedStoreValue(watchedDescriptor, currentLanguage, '')}
                        googleLinkUpdated={publicPresence?.googleLinkUpdated}
                        knownFor={getLocalizedStoreValue(watchedKnownFor, currentLanguage, '')}
                        onMarkDone={onGoogleLinkDone || (() => { })}
                        onDismiss={onGoogleLinkDismiss || (() => { })}
                    />
                ) : null}
                <Card size="small" ref={ref || scrollRef} style={{ marginTop: 16 }}>
                    <Title level={5} style={{ margin: 'unset' }}>
                        {t('officialPageSettings')}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('officialPageDesc')}
                    </Text>
                    <Divider />
                    {managedLanguages.length > 1 ? (
                        <Form.Item label="Official page content language">
                            <Select
                                value={currentLanguage}
                                style={{ width: '100%' }}
                                options={managedLanguages.map((languageCode) => ({
                                    label: getStoreLanguageLabel(languageCode),
                                    value: languageCode,
                                }))}
                                onChange={(nextLanguage) => {
                                    const visiblePresence = form.getFieldValue('publicPresence') || {};
                                    const nextDrafts = {
                                        ...localizedPresenceDrafts,
                                        [currentLanguage]: {
                                            descriptor: visiblePresence.descriptor || '',
                                            knownFor: visiblePresence.knownFor || '',
                                            specialNote: visiblePresence.specialNote || '',
                                        },
                                    };

                                    form.setFieldsValue({
                                        __localizedPublicPresenceDrafts: nextDrafts,
                                        __storeContentLanguage: nextLanguage,
                                        publicPresence: {
                                            ...visiblePresence,
                                            descriptor: nextDrafts[nextLanguage]?.descriptor || '',
                                            knownFor: nextDrafts[nextLanguage]?.knownFor || '',
                                            specialNote: nextDrafts[nextLanguage]?.specialNote || '',
                                        },
                                    });
                                    onContentLanguageChange?.(nextLanguage);
                                }}
                            />
                        </Form.Item>
                    ) : null}

                    <div ref={photosScrollRef}>
                        <Form.Item hidden name={['publicPresence', 'businessCover']}>
                            <Input />
                        </Form.Item>
                        {FEATURE_FLAGS.ENABLE_VISUAL_PROFILE_COMPLETION ? (
                            <Card
                                size="small"
                                style={{
                                    background: token.colorFillQuaternary,
                                    borderColor: visualProfileCompletion.status === 'complete'
                                        ? token.colorSuccessBorder
                                        : token.colorWarningBorder,
                                    marginBottom: 16,
                                }}
                            >
                                <Flex gap={12} vertical>
                                    <Flex align="flex-start" justify="space-between" gap={12}>
                                        <Flex gap={4} style={{ minWidth: 0 }} vertical>
                                            <Text strong>Visual profile</Text>
                                            <Text>{visualProfileCompletion.headline}</Text>
                                            <Text type="secondary">{visualProfileCompletion.helperText}</Text>
                                        </Flex>
                                        <Tag color={visualProfileCompletion.status === 'complete' ? 'success' : 'warning'}>
                                            {visualProfileCompletion.statusLabel}
                                        </Tag>
                                    </Flex>
                                    <Flex gap={8} vertical>
                                        {visualProfileCompletion.tasks.map((task) => {
                                            const isComplete = task.status === 'complete';
                                            return (
                                                <Flex align="flex-start" gap={8} key={task.id}>
                                                    {isComplete ? (
                                                        <LuCheckCircle color={token.colorSuccess} size={16} style={{ flex: '0 0 auto', marginTop: 2 }} />
                                                    ) : (
                                                        <LuAlertCircle color={token.colorWarning} size={16} style={{ flex: '0 0 auto', marginTop: 2 }} />
                                                    )}
                                                    <Flex gap={1} style={{ minWidth: 0 }} vertical>
                                                        <Text>{task.label}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>{task.detail}</Text>
                                                    </Flex>
                                                </Flex>
                                            );
                                        })}
                                    </Flex>
                                </Flex>
                            </Card>
                        ) : null}
                        <Divider orientation="left" orientationMargin={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('businessCover')}
                            </Text>
                        </Divider>
                        <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                            {t('businessCoverHelp')}
                        </Text>
                        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                            <Col xs={24} md={FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? 12 : 24}>
                                <MediaImageCard
                                    accept={getMediaProfileAcceptAttribute('businessCover')}
                                    alt={t('businessCover')}
                                    canAdjust={Boolean(coverDraft?.sourceDataUrl)}
                                    imageType="businessCover"
                                    imageUrl={coverDraft?.previewDataUrl || watchedBusinessCover}
                                    isBusy={coverUploading}
                                    onAdjust={() => setIsCoverAdjustOpen(true)}
                                    onRemove={watchedBusinessCover || coverDraft?.previewDataUrl ? handleCoverCardRemove : undefined}
                                    onSelectFile={(file) => { void handleCoverUpload(file); }}
                                    placeholderDescription={t('businessCoverPlaceholder')}
                                    placeholderTitle={t('businessCover')}
                                    showDropHint={false}
                                />
                                {coverDraft?.uploadFailed && coverDraft.prepared ? (
                                    <Flex align="center" gap={8} justify="space-between" style={{ marginTop: 8 }}>
                                        <Text type="danger" style={{ fontSize: 12 }}>{t('businessCoverUploadFailed')}</Text>
                                        <Button
                                            disabled={coverUploading}
                                            loading={coverUploading}
                                            onClick={handleRetryCoverUpload}
                                            size="small"
                                        >
                                            Retry
                                        </Button>
                                    </Flex>
                                ) : null}
                                <div style={{ marginTop: 12 }}>
                                    <MediaPublicContextPreview
                                        accentColor={watchedAccentColor}
                                        imageType="businessCover"
                                        imageUrl={coverDraft?.previewDataUrl || watchedBusinessCover}
                                        subtitle={t('officialPage')}
                                        title={businessPreviewName}
                                    />
                                </div>
                            </Col>
                            {FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? (
                                <Col xs={24} md={12}>
                                    <Button
                                        block
                                        disabled={coverUploading}
                                        loading={coverGenerating}
                                        onClick={() => { void handleGenerateBusinessCover(); }}
                                        size="large"
                                        style={{ minHeight: 48 }}
                                    >
                                        <Flex align="center" gap={8} justify="center">
                                            <LuSparkles size={18} />
                                            <span>{watchedBusinessCover ? t('regenerateBusinessCover') : t('generateBusinessCover')}</span>
                                        </Flex>
                                    </Button>
                                </Col>
                            ) : null}
                        </Row>
                    </div>

                    <Row gutter={[16, 0]}>
                        <Col {...halfCol}>
                            <Form.Item
                                name={['publicPresence', 'descriptor']}
                                label={t('shortDescriptor')}
                                extra={t('shortDescriptorHelp')}
                                rules={[{ max: 40, message: t('shortDescriptorMax') }]}
                            >
                                <Input
                                    placeholder={t('shortDescriptorPlaceholder')}
                                    maxLength={40}
                                    showCount
                                />
                            </Form.Item>
                            {currentLanguage !== referenceLanguage ? (
                                <DesktopLocalizedReferenceHint
                                    onUseReference={() => {
                                        const visiblePresence = form.getFieldValue('publicPresence') || {};
                                        const nextDrafts = {
                                            ...localizedPresenceDrafts,
                                            [currentLanguage]: {
                                                descriptor: referenceValue(localizedPresenceDrafts[referenceLanguage]?.descriptor),
                                                knownFor: visiblePresence.knownFor || '',
                                                specialNote: visiblePresence.specialNote || '',
                                            },
                                        };

                                        form.setFieldsValue({
                                            __localizedPublicPresenceDrafts: nextDrafts,
                                            publicPresence: {
                                                ...visiblePresence,
                                                descriptor: referenceValue(localizedPresenceDrafts[referenceLanguage]?.descriptor),
                                            },
                                        });
                                        onPublicPresenceChange?.('descriptor', referenceValue(localizedPresenceDrafts[referenceLanguage]?.descriptor));
                                    }}
                                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                    referenceValue={localizedPresenceDrafts[referenceLanguage]?.descriptor || ''}
                                />
                            ) : null}
                        </Col>
                        <Col {...halfCol}>
                            <Form.Item
                                name={['publicPresence', 'knownFor']}
                                label={t('knownFor')}
                                extra={t('knownForHelp')}
                                rules={[{ max: 40, message: t('knownForMax') }]}
                            >
                                <Input
                                    placeholder={t('knownForPlaceholder')}
                                    maxLength={40}
                                    showCount
                                />
                            </Form.Item>
                            {currentLanguage !== referenceLanguage ? (
                                <DesktopLocalizedReferenceHint
                                    onUseReference={() => {
                                        const visiblePresence = form.getFieldValue('publicPresence') || {};
                                        const nextDrafts = {
                                            ...localizedPresenceDrafts,
                                            [currentLanguage]: {
                                                descriptor: visiblePresence.descriptor || '',
                                                knownFor: referenceValue(localizedPresenceDrafts[referenceLanguage]?.knownFor),
                                                specialNote: visiblePresence.specialNote || '',
                                            },
                                        };

                                        form.setFieldsValue({
                                            __localizedPublicPresenceDrafts: nextDrafts,
                                            publicPresence: {
                                                ...visiblePresence,
                                                knownFor: referenceValue(localizedPresenceDrafts[referenceLanguage]?.knownFor),
                                            },
                                        });
                                        onPublicPresenceChange?.('knownFor', referenceValue(localizedPresenceDrafts[referenceLanguage]?.knownFor));
                                    }}
                                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                    referenceValue={localizedPresenceDrafts[referenceLanguage]?.knownFor || ''}
                                />
                            ) : null}
                        </Col>
                        <Col xs={24}>
                            <Form.Item
                                name={['publicPresence', 'specialNote']}
                                label={t('officialPageSpecialNote')}
                                extra={t('officialPageSpecialNoteHelp')}
                                rules={[{ max: 140, message: t('officialPageSpecialNoteMax') }]}
                            >
                                <Input.TextArea
                                    autoSize={{ minRows: 2, maxRows: 3 }}
                                    maxLength={140}
                                    placeholder={t('officialPageSpecialNotePlaceholder')}
                                    showCount
                                />
                            </Form.Item>
                            {currentLanguage !== referenceLanguage ? (
                                <DesktopLocalizedReferenceHint
                                    onUseReference={() => {
                                        const visiblePresence = form.getFieldValue('publicPresence') || {};
                                        const nextDrafts = {
                                            ...localizedPresenceDrafts,
                                            [currentLanguage]: {
                                                descriptor: visiblePresence.descriptor || '',
                                                knownFor: visiblePresence.knownFor || '',
                                                specialNote: referenceValue(localizedPresenceDrafts[referenceLanguage]?.specialNote),
                                            },
                                        };

                                        form.setFieldsValue({
                                            __localizedPublicPresenceDrafts: nextDrafts,
                                            publicPresence: {
                                                ...visiblePresence,
                                                specialNote: referenceValue(localizedPresenceDrafts[referenceLanguage]?.specialNote),
                                            },
                                        });
                                        onPublicPresenceChange?.('specialNote', referenceValue(localizedPresenceDrafts[referenceLanguage]?.specialNote));
                                    }}
                                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                    referenceValue={localizedPresenceDrafts[referenceLanguage]?.specialNote || ''}
                                />
                            ) : null}
                        </Col>
                    </Row>

                    <Row gutter={[16, 0]}>
                        <Col {...halfCol}>
                            <Form.Item
                                name={['publicPresence', 'whatsappNumber']}
                                label={t('whatsappNumber')}
                                extra={t('whatsappNumberHelp')}
                            >
                                <Input
                                    prefix={<LuMessageSquare size={14} />}
                                    placeholder="+91 98765 43210"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 0]}>
                        <Col {...halfCol}>
                            <Form.Item
                                name={['publicPresence', 'googleMapsUrl']}
                                label={t('googleMapsLink')}
                                extra={t('googleMapsLinkHelp')}
                                rules={[{ type: 'url', message: t('validUrlRequired') }]}
                            >
                                <Input
                                    prefix={<LuMapPin size={14} />}
                                    placeholder="https://maps.google.com/..."
                                />
                            </Form.Item>
                        </Col>
                        <Col {...accentCol}>
                            <Form.Item
                                name={['publicPresence', 'accentColor']}
                                label={t('accentColor')}
                                extra={t('accentColorHelp')}
                            >
                                <ColorPicker
                                    showText
                                    format="hex"
                                    onChange={(color) => {
                                        const hex = color.toHexString();
                                        form.setFieldValue(['publicPresence', 'accentColor'], hex);
                                        onPublicPresenceChange?.('accentColor', hex);
                                    }}
                                    presets={[
                                        {
                                            label: 'Recommended',
                                            colors: ['#111111', '#1677ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2'],
                                        },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col {...accentCol}>
                            <Form.Item
                                name={['publicPresence', 'establishedYear']}
                                label={t('establishedYear')}
                                extra={t('establishedYearHelp')}
                                rules={[{
                                    type: 'number',
                                    min: 1900,
                                    max: new Date().getFullYear(),
                                    message: t('establishedYearInvalid'),
                                }]}
                            >
                                <InputNumber
                                    placeholder="2015"
                                    style={{ width: '100%' }}
                                    min={1900}
                                    max={new Date().getFullYear()}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 0]}>
                        <Col {...halfCol}>
                            <Form.Item
                                name={['publicPresence', 'reservationUrl']}
                                label={t('reservationUrl')}
                                extra={t('reservationUrlHelp')}
                                rules={[{ type: 'url', message: t('validUrlRequired') }]}
                            >
                                <Input
                                    prefix={<LuCalendar size={14} />}
                                    placeholder="https://..."
                                />
                            </Form.Item>
                        </Col>
                        <Col {...halfCol}>
                            <Form.Item
                                name={['publicPresence', 'orderUrl']}
                                label={t('orderUrl')}
                                extra={t('orderUrlHelp')}
                                rules={[{ type: 'url', message: t('validUrlRequired') }]}
                            >
                                <Input
                                    prefix={<LuExternalLink size={14} />}
                                    placeholder="https://..."
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" orientationMargin={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('googleReviews')}
                        </Text>
                    </Divider>

                    <Row gutter={[16, 0]}>
                        <Col {...reviewUrlCol}>
                            <Form.Item
                                name={['publicPresence', 'googleReviewUrl']}
                                label={t('googleReviewUrl')}
                                extra={t('googleReviewLinkHelp')}
                                rules={[{ type: 'url', message: t('validUrlRequired') }]}
                            >
                                <Input
                                    prefix={<LuStar size={14} />}
                                    placeholder="https://g.page/r/.../review"
                                />
                            </Form.Item>
                        </Col>
                        <Col {...reviewStatCol}>
                            <Form.Item
                                name={['publicPresence', 'googleRating']}
                                label={t('googleRating')}
                                extra={t('googleRatingHelp')}
                                rules={[{
                                    type: 'number',
                                    min: 1,
                                    max: 5,
                                    message: t('googleRatingInvalid'),
                                }]}
                            >
                                <InputNumber
                                    placeholder="4.5"
                                    style={{ width: '100%' }}
                                    min={1}
                                    max={5}
                                    step={0.1}
                                    precision={1}
                                />
                            </Form.Item>
                        </Col>
                        <Col {...reviewStatCol}>
                            <Form.Item
                                name={['publicPresence', 'googleReviewCount']}
                                label={t('googleReviewCount')}
                                extra={t('googleReviewCountHelp')}
                                rules={[{
                                    type: 'number',
                                    min: 0,
                                    message: t('googleReviewCountInvalid'),
                                }]}
                            >
                                <InputNumber
                                    placeholder="320"
                                    style={{ width: '100%' }}
                                    min={0}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" orientationMargin={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('businessPhotos')}
                        </Text>
                    </Divider>

                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                        {t('businessPhotosHelp')}
                    </Text>
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {photoSlots.map((photo, idx) => {
                            const isUploading = photoUploading === idx;
                            const photoCount = photos.filter(Boolean).length;
                            const draft = photoDrafts[idx];
                            return (
                                <Col key={idx} xs={8}>
                                    <Flex gap={8} vertical>
                                        <MediaImageCard
                                            accept={getMediaProfileAcceptAttribute('galleryImage')}
                                            alt={t('photoLabel', { index: idx + 1 })}
                                            aspectRatio="4 / 3"
                                            canAdjust={Boolean(photoDrafts[idx]?.sourceDataUrl)}
                                            imageType="galleryImage"
                                            imageUrl={draft?.previewDataUrl || photo}
                                            isBusy={isUploading}
                                            onAdjust={() => setAdjustingPhotoIndex(idx)}
                                            onRemove={photo || draft?.previewDataUrl ? () => handlePhotoCardRemove(idx) : undefined}
                                            onSelectFile={(file) => { void handlePhotoUpload(file, idx); }}
                                            placeholderDescription={isUploading ? t('photoUploading') : undefined}
                                            placeholderTitle={t('photoLabel', { index: idx + 1 })}
                                            showDropHint={false}
                                            size="compact"
                                        />
                                        {draft?.uploadFailed && draft.prepared ? (
                                            <Flex align="center" gap={6} justify="space-between">
                                                <Text type="danger" style={{ fontSize: 11 }}>{t('photoUploadFailed')}</Text>
                                                <Button
                                                    disabled={photoUploading != null}
                                                    loading={isUploading}
                                                    onClick={() => handleRetryPhotoUpload(idx)}
                                                    size="small"
                                                >
                                                    Retry
                                                </Button>
                                            </Flex>
                                        ) : null}
                                        {photo && photoCount > 1 ? (
                                            <Flex gap={6}>
                                                <Button block disabled={idx === 0 || photoUploading != null} icon={<LuArrowLeft size={14} />} onClick={() => handlePhotoMove(idx, -1)} size="small" />
                                                <Button block disabled={idx >= photoCount - 1 || photoUploading != null} icon={<LuArrowRight size={14} />} onClick={() => handlePhotoMove(idx, 1)} size="small" />
                                            </Flex>
                                        ) : null}
                                    </Flex>
                                </Col>
                            );
                        })}
                    </Row>

                    <Divider orientation="left" orientationMargin={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('obpIconVariant')}
                        </Text>
                    </Divider>

                    <Form.Item
                        extra={t('obpIconVariantHelp')}
                        style={{ marginBottom: 16 }}
                    >
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuSmile size={16} />
                                <Text>{t('obpUseEmojiIcons')}</Text>
                            </Flex>
                            <Switch
                                checked={watchedIconVariant === 'emoji'}
                                onChange={(checked) => {
                                    const nextVariant = checked ? 'emoji' : 'icons';
                                    form.setFieldValue(['publicPresence', 'iconVariant'], nextVariant);
                                    onPublicPresenceChange?.('iconVariant', nextVariant);
                                }}
                            />
                        </Flex>
                    </Form.Item>

                    <div ref={actionsScrollRef}>
                        <Divider orientation="left" orientationMargin={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('quickActionButtons')}
                            </Text>
                        </Divider>

                        <Row gutter={[16, 16]}>
                            <Col {...actionCol}>
                                <Form.Item
                                    name={['publicPresence', 'showCall']}
                                    label={t('showCallButton')}
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<LuPhone size={12} />}
                                        onChange={handleToggle('showCall')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col {...actionCol}>
                                <Form.Item
                                    name={['publicPresence', 'showWhatsApp']}
                                    label={t('showWhatsAppButton')}
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<LuMessageSquare size={12} />}
                                        onChange={handleToggle('showWhatsApp')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col {...actionCol}>
                                <Form.Item
                                    name={['publicPresence', 'showDirections']}
                                    label={t('showDirectionsButton')}
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<LuMapPin size={12} />}
                                        onChange={handleToggle('showDirections')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col {...actionCol}>
                                <Form.Item
                                    name={['publicPresence', 'showReservation']}
                                    label={t('showReservationButton')}
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<LuCalendar size={12} />}
                                        onChange={handleToggle('showReservation')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col {...actionCol}>
                                <Form.Item
                                    name={['publicPresence', 'showOrder']}
                                    label={t('showOrderButton')}
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<LuShoppingBag size={12} />}
                                        onChange={handleToggle('showOrder')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col {...actionCol}>
                                <Form.Item
                                    name={['publicPresence', 'showGoogleReview']}
                                    label={t('showGoogleReviewButton')}
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<LuStar size={12} />}
                                        onChange={handleToggle('showGoogleReview')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col {...actionCol}>
                                <Form.Item
                                    name={['publicPresence', 'showFeedback']}
                                    label={t('showFeedbackButton')}
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<LuMessageSquarePlus size={12} />}
                                        onChange={handleToggle('showFeedback')}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES ? (
                        <>
                            <Divider orientation="left" orientationMargin={0}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('publicPolicyLinks')}
                                </Text>
                            </Divider>
                            <Row gutter={[16, 16]}>
                                <Col {...actionCol}>
                                    <Form.Item
                                        name={['publicPresence', 'showPrivacyLink']}
                                        label={t('showPrivacyLink')}
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col {...actionCol}>
                                    <Form.Item
                                        name={['publicPresence', 'showTermsLink']}
                                        label={t('showTermsLink')}
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col {...actionCol}>
                                    <Form.Item
                                        name={['publicPresence', 'showRefundLink']}
                                        label={t('showRefundLink')}
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <CompliancePagesSection domain={customDomain || (subdomain ? `${subdomain}.menulist.ai` : undefined)} />
                        </>
                    ) : null}
                </Card>
                <MediaImageAdjustModal
                    fileName={coverDraft?.fileName}
                    imageType="businessCover"
                    initialCrop={coverDraft?.crop}
                    onApply={async (prepared) => {
                        await savePreparedCover(prepared, coverDraft || undefined);
                    }}
                    onClose={() => setIsCoverAdjustOpen(false)}
                    open={isCoverAdjustOpen}
                    sourceDataUrl={coverDraft?.sourceDataUrl}
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
            </>
        );
    },
);

OfficialPageTab.displayName = 'OfficialPageTab';

export default OfficialPageTab;

function DesktopLocalizedReferenceHint({
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
        <div style={{ margin: '-12px 0 16px' }}>
            <Card
                size="small"
                style={{
                    background: token.colorFillAlter,
                    borderColor: token.colorBorderSecondary,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                        <Text type="secondary">{`${referenceLabel} reference`}</Text>
                        <div style={{ marginTop: 4 }}>
                            <Text>{referenceValue || 'No reference content available yet.'}</Text>
                        </div>
                    </div>
                    {referenceValue ? (
                        <Button size="small" type="link" onClick={onUseReference}>
                            Use reference
                        </Button>
                    ) : null}
                </div>
            </Card>
        </div>
    );
}

function referenceValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
}
