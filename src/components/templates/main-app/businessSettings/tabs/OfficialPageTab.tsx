'use client';

import { FEATURE_FLAGS } from '@config/features';
import { uploadOBPPhoto } from '@database/stores/uploadOBPPhoto';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage, getLocalizedStoreValue } from '@lib/localization/storeContent';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { Button, Card, Col, ColorPicker, Divider, Form, Input, InputNumber, Row, Select, Switch, Typography, Upload, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React, { forwardRef, useEffect, useState } from 'react';
import ShareLinkCard from '../../ShareLinkCard';
import { LuCalendar, LuExternalLink, LuMapPin, LuMessageSquare, LuPhone, LuShoppingBag, LuStar, LuTrash2, LuUpload } from 'react-icons/lu';
import CompliancePagesSection from './CompliancePagesSection';
import GoogleListingGuide from './GoogleListingGuide';

const { Title, Text } = Typography;

interface OfficialPageTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    publicPresence?: {
        displayName?: string | Record<string, string>;
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
        showPrivacyLink?: boolean;
        showTermsLink?: boolean;
        showRefundLink?: boolean;
        reservationUrl?: string;
        orderUrl?: string;
        establishedYear?: number;
        googleReviewUrl?: string;
        googleRating?: number;
        googleReviewCount?: number;
        photos?: string[];
        googleLinkUpdated?: boolean;
        googleLinkUpdatedAt?: string;
    };
    onPublicPresenceChange?: (field: string, value: any) => void;
    subdomain?: string;
    customDomain?: string;
    onGoogleLinkDone?: () => void;
    onGoogleLinkDismiss?: () => void;
}

const OfficialPageTab = forwardRef<HTMLDivElement, OfficialPageTabProps>(
    ({ scrollRef, publicPresence = {}, onPublicPresenceChange, subdomain, customDomain, onGoogleLinkDone, onGoogleLinkDismiss }, ref) => {
        const t = useTranslations('BusinessSettings');
        const form = Form.useFormInstance();
        const session = useClientAuthSession();
        const [photoUploading, setPhotoUploading] = useState<number | null>(null);
        const [photos, setPhotos] = useState<string[]>(publicPresence?.photos || []);
        const officialPageUrl = generateOBPUrl(subdomain, customDomain);
        const localizedPresenceDrafts = Form.useWatch('__localizedPublicPresenceDrafts') || {};
        const storeContentLanguage = Form.useWatch('__storeContentLanguage');
        const activeLanguages = Form.useWatch('activeLanguages') || [];
        const defaultLanguage = Form.useWatch('defaultLanguage');
        const watchedDescriptor = Form.useWatch(['publicPresence', 'descriptor']);
        const watchedDisplayName = Form.useWatch(['publicPresence', 'displayName']);
        const watchedKnownFor = Form.useWatch(['publicPresence', 'knownFor']);
        const watchedSpecialNote = Form.useWatch(['publicPresence', 'specialNote']);
        const managedLanguages = Array.from(new Set([defaultLanguage, ...(activeLanguages || []), 'en'].filter(Boolean)));
        const currentLanguage = storeContentLanguage || getStorePreferredLanguage({ activeLanguages: managedLanguages, defaultLanguage });
        const referenceLanguage = getStorePreferredLanguage({ activeLanguages: managedLanguages, defaultLanguage });

        const handleToggle = (field: string) => (checked: boolean) => {
            onPublicPresenceChange?.(field, checked);
        };

        const handlePhotoUpload = async (file: File, index: number) => {
            if (!session?.tId || !session?.sId) {
                message.error(t('sessionUnavailable'));
                return;
            }
            setPhotoUploading(index);
            try {
                const url = await uploadOBPPhoto(file, { tId: session.tId, sId: session.sId }, index);
                const updated = [...photos];
                updated[index] = url;
                setPhotos(updated);
                onPublicPresenceChange?.('photos', updated.filter(Boolean));
                message.success(t('photoUploaded'));
            } catch {
                message.error(t('photoUploadFailed'));
            } finally {
                setPhotoUploading(null);
            }
        };

        const handlePhotoRemove = (index: number) => {
            const updated = [...photos];
            updated[index] = '';
            setPhotos(updated);
            onPublicPresenceChange?.('photos', updated.filter(Boolean));
        };

        useEffect(() => {
            const nextDrafts = Object.keys(localizedPresenceDrafts || {}).length > 0
                ? localizedPresenceDrafts
                : Object.fromEntries(
                    managedLanguages.map((languageCode) => [
                        languageCode,
                        {
                            descriptor: getLocalizedStoreValue(publicPresence?.descriptor, languageCode, ''),
                            displayName: getLocalizedStoreValue(publicPresence?.displayName, languageCode, ''),
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
                    displayName: nextDrafts[currentLanguage]?.displayName || '',
                    knownFor: nextDrafts[currentLanguage]?.knownFor || '',
                    specialNote: nextDrafts[currentLanguage]?.specialNote || '',
                },
            });
        }, [publicPresence]); // eslint-disable-line react-hooks/exhaustive-deps

        useEffect(() => {
            const visiblePresence = form.getFieldValue('publicPresence') || {};
            form.setFieldsValue({
                __localizedPublicPresenceDrafts: {
                    ...localizedPresenceDrafts,
                    [currentLanguage]: {
                        descriptor: visiblePresence.descriptor || '',
                        displayName: visiblePresence.displayName || '',
                        knownFor: visiblePresence.knownFor || '',
                        specialNote: visiblePresence.specialNote || '',
                    },
                },
            });
        }, [currentLanguage, watchedDescriptor, watchedDisplayName, watchedKnownFor, watchedSpecialNote]); // eslint-disable-line react-hooks/exhaustive-deps

        if (!FEATURE_FLAGS.ENABLE_OBP) return null;

        return (
            <>
                {officialPageUrl ? (
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
                <GoogleListingGuide
                    subdomain={subdomain}
                    customDomain={customDomain}
                    googleLinkUpdated={publicPresence?.googleLinkUpdated}
                    onMarkDone={onGoogleLinkDone || (() => { })}
                    onDismiss={onGoogleLinkDismiss || (() => { })}
                />
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
                            <Input.Group compact>
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
                                                displayName: visiblePresence.displayName || '',
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
                                                displayName: nextDrafts[nextLanguage]?.displayName || '',
                                                knownFor: nextDrafts[nextLanguage]?.knownFor || '',
                                                specialNote: nextDrafts[nextLanguage]?.specialNote || '',
                                            },
                                        });
                                    }}
                                />
                            </Input.Group>
                        </Form.Item>
                    ) : null}

                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name={['publicPresence', 'displayName']}
                                label="Public display name"
                                extra="Optional. Shown on the public page instead of your internal store name for this language."
                                rules={[{ max: 60, message: 'Public display name must be 60 characters or less' }]}
                            >
                                <Input
                                    placeholder="e.g. Joe's Pizza"
                                    maxLength={60}
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
                                                displayName: referenceValue(localizedPresenceDrafts[referenceLanguage]?.displayName),
                                                knownFor: visiblePresence.knownFor || '',
                                            },
                                        };

                                        form.setFieldsValue({
                                            __localizedPublicPresenceDrafts: nextDrafts,
                                            publicPresence: {
                                                ...visiblePresence,
                                                displayName: referenceValue(localizedPresenceDrafts[referenceLanguage]?.displayName),
                                            },
                                        });
                                    }}
                                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                    referenceValue={localizedPresenceDrafts[referenceLanguage]?.displayName || ''}
                                />
                            ) : null}
                        </Col>
                        <Col xs={24} md={12}>
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
                                                displayName: visiblePresence.displayName || '',
                                                knownFor: visiblePresence.knownFor || '',
                                            },
                                        };

                                        form.setFieldsValue({
                                            __localizedPublicPresenceDrafts: nextDrafts,
                                            publicPresence: {
                                                ...visiblePresence,
                                                descriptor: referenceValue(localizedPresenceDrafts[referenceLanguage]?.descriptor),
                                            },
                                        });
                                    }}
                                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                    referenceValue={localizedPresenceDrafts[referenceLanguage]?.descriptor || ''}
                                />
                            ) : null}
                        </Col>
                        <Col xs={24} md={12}>
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
                                                displayName: visiblePresence.displayName || '',
                                                knownFor: referenceValue(localizedPresenceDrafts[referenceLanguage]?.knownFor),
                                            },
                                        };

                                        form.setFieldsValue({
                                            __localizedPublicPresenceDrafts: nextDrafts,
                                            publicPresence: {
                                                ...visiblePresence,
                                                knownFor: referenceValue(localizedPresenceDrafts[referenceLanguage]?.knownFor),
                                            },
                                        });
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
                                                displayName: visiblePresence.displayName || '',
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
                                    }}
                                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                                    referenceValue={localizedPresenceDrafts[referenceLanguage]?.specialNote || ''}
                                />
                            ) : null}
                        </Col>
                    </Row>

                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={12}>
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
                        <Col xs={24} md={12}>
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
                        <Col xs={24} md={6}>
                            <Form.Item
                                name={['publicPresence', 'accentColor']}
                                label={t('accentColor')}
                                extra={t('accentColorHelp')}
                            >
                                <ColorPicker
                                    showText
                                    format="hex"
                                    presets={[
                                        {
                                            label: 'Recommended',
                                            colors: ['#111111', '#1677ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2'],
                                        },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
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
                        <Col xs={24} md={12}>
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
                        <Col xs={24} md={12}>
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
                        <Col xs={24} md={10}>
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
                        <Col xs={24} md={7}>
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
                        <Col xs={24} md={7}>
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
                        {[0, 1, 2].map((idx) => {
                            const photo = photos[idx];
                            const isUploading = photoUploading === idx;
                            return (
                                <Col key={idx} xs={8}>
                                    {photo ? (
                                        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3' }}>
                                            <img
                                                src={photo}
                                                alt={t('photoLabel', { index: idx + 1 })}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <Button
                                                size="small"
                                                danger
                                                icon={<LuTrash2 size={12} />}
                                                onClick={() => handlePhotoRemove(idx)}
                                                style={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    opacity: 0.85,
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <Upload
                                            accept="image/*"
                                            showUploadList={false}
                                            beforeUpload={(file) => {
                                                handlePhotoUpload(file, idx);
                                                return false;
                                            }}
                                        >
                                            <div
                                                style={{
                                                    border: '1px dashed #d9d9d9',
                                                    borderRadius: 8,
                                                    aspectRatio: '4/3',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                    gap: 4,
                                                    color: '#bfbfbf',
                                                    fontSize: 12,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {isUploading ? (
                                                    <span>{t('photoUploading')}</span>
                                                ) : (
                                                    <>
                                                        <LuUpload size={20} />
                                                        {t('photoLabel', { index: idx + 1 })}
                                                    </>
                                                )}
                                            </div>
                                        </Upload>
                                    )}
                                </Col>
                            );
                        })}
                    </Row>

                    <Divider orientation="left" orientationMargin={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('quickActionButtons')}
                        </Text>
                    </Divider>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name={['publicPresence', 'showCall']}
                                label={t('showCallButton')}
                                valuePropName="checked"
                                initialValue={publicPresence?.showCall !== false}
                            >
                                <Switch
                                    checkedChildren={<LuPhone size={12} />}
                                    onChange={handleToggle('showCall')}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name={['publicPresence', 'showWhatsApp']}
                                label={t('showWhatsAppButton')}
                                valuePropName="checked"
                                initialValue={publicPresence?.showWhatsApp !== false}
                            >
                                <Switch
                                    checkedChildren={<LuMessageSquare size={12} />}
                                    onChange={handleToggle('showWhatsApp')}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name={['publicPresence', 'showDirections']}
                                label={t('showDirectionsButton')}
                                valuePropName="checked"
                                initialValue={publicPresence?.showDirections !== false}
                            >
                                <Switch
                                    checkedChildren={<LuMapPin size={12} />}
                                    onChange={handleToggle('showDirections')}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name={['publicPresence', 'showReservation']}
                                label={t('showReservationButton')}
                                valuePropName="checked"
                                initialValue={publicPresence?.showReservation !== false}
                            >
                                <Switch
                                    checkedChildren={<LuCalendar size={12} />}
                                    onChange={handleToggle('showReservation')}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name={['publicPresence', 'showOrder']}
                                label={t('showOrderButton')}
                                valuePropName="checked"
                                initialValue={publicPresence?.showOrder !== false}
                            >
                                <Switch
                                    checkedChildren={<LuShoppingBag size={12} />}
                                    onChange={handleToggle('showOrder')}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES ? (
                        <>
                            <Divider orientation="left" orientationMargin={0}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('publicPolicyLinks')}
                                </Text>
                            </Divider>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} md={8}>
                                    <Form.Item
                                        name={['publicPresence', 'showPrivacyLink']}
                                        label={t('showPrivacyLink')}
                                        valuePropName="checked"
                                        initialValue={publicPresence?.showPrivacyLink !== false}
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item
                                        name={['publicPresence', 'showTermsLink']}
                                        label={t('showTermsLink')}
                                        valuePropName="checked"
                                        initialValue={publicPresence?.showTermsLink !== false}
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item
                                        name={['publicPresence', 'showRefundLink']}
                                        label={t('showRefundLink')}
                                        valuePropName="checked"
                                        initialValue={publicPresence?.showRefundLink !== false}
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <CompliancePagesSection domain={customDomain || (subdomain ? `${subdomain}.menulist.ai` : undefined)} />
                        </>
                    ) : null}
                </Card>
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
