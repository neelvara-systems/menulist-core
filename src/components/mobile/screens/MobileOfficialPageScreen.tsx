'use client'

import { FEATURE_FLAGS } from '@config/features';
import { uploadOBPPhoto } from '@database/stores/uploadOBPPhoto';
import { updateStore } from '@database/stores';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ColorPicker, InputNumber, Upload } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import {
    LuCalendar,
    LuExternalLink,
    LuMapPin,
    LuMessageSquare,
    LuPhone,
    LuStar,
    LuTrash2,
    LuUpload,
} from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, Input, NavBar, Switch, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileOfficialPageScreenProps {
    onBack: () => void;
}

export default function MobileOfficialPageScreen({ onBack }: MobileOfficialPageScreenProps) {
    const t = useTranslations('BusinessSettings');
    const tMobile = useTranslations('MobileSettings');
    const session = useClientAuthSession();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    const initialPresence = storeDetails?.publicPresence || {};
    const [formData, setFormData] = useState({
        accentColor: initialPresence.accentColor || '#1677ff',
        descriptor: initialPresence.descriptor || '',
        establishedYear: initialPresence.establishedYear,
        googleMapsUrl: initialPresence.googleMapsUrl || '',
        googleRating: initialPresence.googleRating,
        googleReviewCount: initialPresence.googleReviewCount,
        googleReviewUrl: initialPresence.googleReviewUrl || '',
        knownFor: initialPresence.knownFor || '',
        orderUrl: initialPresence.orderUrl || '',
        photos: initialPresence.photos || [],
        reservationUrl: initialPresence.reservationUrl || '',
        showCall: initialPresence.showCall !== false,
        showDirections: initialPresence.showDirections !== false,
        showWhatsApp: initialPresence.showWhatsApp !== false,
        whatsappNumber: initialPresence.whatsappNumber || '',
    });

    const photoSlots = useMemo(() => {
        const slots = Array.from({ length: 3 }, (_, index) => formData.photos[index] || '');
        return slots;
    }, [formData.photos]);

    const updatePresence = useCallback(async (nextPresence: typeof formData) => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);
        const payload = {
            storeId: storeDetails.storeId,
            publicPresence: {
                ...(storeDetails.publicPresence || {}),
                ...nextPresence,
                photos: nextPresence.photos.filter(Boolean),
            },
        };

        setStoreDetails((previous: any) => ({
            ...previous,
            publicPresence: payload.publicPresence,
        }));

        try {
            await updateStore(payload as any);
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
    }, [setStoreDetails, storeDetails, tMobile]);

    const handleSave = useCallback(() => {
        void updatePresence(formData);
    }, [formData, updatePresence]);

    const handlePhotoUpload = async (file: File, index: number) => {
        if (!session?.tId || !session?.sId) {
            Toast.show({ content: tMobile('failedToSave'), duration: 1500 });
            return false;
        }

        setUploadingIndex(index);
        try {
            const url = await uploadOBPPhoto(file, { tId: session.tId, sId: session.sId }, index);
            const nextPhotos = [...formData.photos];
            nextPhotos[index] = url;
            const nextState = { ...formData, photos: nextPhotos.filter(Boolean) };
            setFormData(nextState);
            await updatePresence(nextState);
        } catch {
            Toast.show({ content: tMobile('failedToSave'), duration: 1500 });
        } finally {
            setUploadingIndex(null);
        }

        return false;
    };

    const handlePhotoRemove = (index: number) => {
        const nextPhotos = [...photoSlots];
        nextPhotos[index] = '';
        const nextState = { ...formData, photos: nextPhotos.filter(Boolean) };
        setFormData(nextState);
        void updatePresence(nextState);
    };

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
            <NavBar onBack={onBack}>{t('officialPage')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle="Control the public business page details customers see across your official presence."
                    title={t('officialPage')}
                />

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('shortDescriptor')}</Text>
                        <Input maxLength={40} onChange={(value) => setFormData((previous) => ({ ...previous, descriptor: value }))} placeholder={t('shortDescriptorPlaceholder')} value={formData.descriptor} />
                        <Text type="secondary">{t('shortDescriptorHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>Known For</Text>
                        <Input maxLength={40} onChange={(value) => setFormData((previous) => ({ ...previous, knownFor: value }))} placeholder="Wood-fired pizza" value={formData.knownFor} />
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
                        <Text strong>Accent Color</Text>
                        <ColorPicker
                            format="hex"
                            onChange={(color) => setFormData((previous) => ({ ...previous, accentColor: color.toHexString() }))}
                            showText
                            value={formData.accentColor}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>Established Year</Text>
                        <InputNumber
                            max={new Date().getFullYear()}
                            min={1900}
                            onChange={(value) => setFormData((previous) => ({ ...previous, establishedYear: typeof value === 'number' ? value : undefined }))}
                            placeholder="2015"
                            style={{ width: '100%' }}
                            value={formData.establishedYear}
                        />
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
                        <Text strong>Google Rating</Text>
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
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>Review Count</Text>
                        <InputNumber
                            min={0}
                            onChange={(value) => setFormData((previous) => ({ ...previous, googleReviewCount: typeof value === 'number' ? value : undefined }))}
                            placeholder="320"
                            style={{ width: '100%' }}
                            value={formData.googleReviewCount}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>Business Photos</Text>
                        <Text type="secondary">Add up to 3 photos of your business.</Text>
                        <Flex gap={10} wrap>
                            {photoSlots.map((photo, index) => (
                                <Card key={index} style={{ flex: '1 1 30%', minWidth: 92 }}>
                                    <Flex align="center" gap={8} vertical>
                                        {photo ? (
                                            <>
                                                <Image alt={`Business photo ${index + 1}`} height={88} preview={false} src={photo} style={{ borderRadius: 8, objectFit: 'cover' }} width={88} />
                                                <Button color="danger" fill="none" onClick={() => handlePhotoRemove(index)} size="small">
                                                    <LuTrash2 size={16} />
                                                </Button>
                                            </>
                                        ) : (
                                            <Upload accept="image/*" beforeUpload={(file) => handlePhotoUpload(file, index)} showUploadList={false}>
                                                <Button fill="outline" loading={uploadingIndex === index} size="small">
                                                    <Flex align="center" gap={6}>
                                                        <LuUpload size={16} />
                                                        <Text>Photo {index + 1}</Text>
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
                    </Flex>
                </Card>

                <Button block loading={isSaving} onClick={handleSave} size="large">
                    {tMobile('saveChanges')}
                </Button>
            </Flex>
        </Flex>
    );
}
