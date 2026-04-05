'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuBuilding2, LuFileText, LuMapPin, LuPhone } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, NavBar, Text, TextArea, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobilePublicInfoScreenProps {
    onBack: () => void;
}

export default function MobilePublicInfoScreen({ onBack }: MobilePublicInfoScreenProps) {
    const t = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        addressLine: storeDetails?.addressLine || '',
        city: storeDetails?.city || '',
        country: storeDetails?.country || '',
        description: storeDetails?.description || '',
        latitude: storeDetails?.geo?.latitude ? String(storeDetails.geo.latitude) : '',
        phoneNumber: storeDetails?.phoneNumber || '',
        postalCode: storeDetails?.postalCode || '',
        longitude: storeDetails?.geo?.longitude ? String(storeDetails.geo.longitude) : '',
        state: storeDetails?.state || '',
    });

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        const latitude = formData.latitude.trim() ? Number(formData.latitude) : undefined;
        const longitude = formData.longitude.trim() ? Number(formData.longitude) : undefined;
        const locationUpdates = {
            addressLine: formData.addressLine,
            city: formData.city,
            country: formData.country,
            description: formData.description,
            phoneNumber: formData.phoneNumber,
            postalCode: formData.postalCode,
            state: formData.state,
        };
        const nextStore = {
            ...storeDetails,
            ...locationUpdates,
            geo: latitude !== undefined && longitude !== undefined
                ? { latitude, longitude }
                : storeDetails.geo,
        };

        setStoreDetails((previous: any) => ({
            ...previous,
            ...locationUpdates,
            geo: nextStore.geo,
        }));
        Toast.show({ content: t('saved'), duration: 1000 });

        try {
            await updateStore(nextStore as any);
        } catch {
            setStoreDetails((previous: any) => ({
                ...previous,
                addressLine: storeDetails.addressLine,
                city: storeDetails.city,
                country: storeDetails.country,
                description: storeDetails.description,
                geo: storeDetails.geo,
                phoneNumber: storeDetails.phoneNumber,
                postalCode: storeDetails.postalCode,
                state: storeDetails.state,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [formData, setStoreDetails, storeDetails, t]);

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
                    subtitle={t('publicInfoSubtitle')}
                    title={t('publicInfo')}
                />
                <Card>
                    <Flex gap={4} vertical>
                        <Flex align="center" gap={6}>
                            <LuBuilding2 size={14} />
                            <Text type="secondary">{t('businessName')}</Text>
                        </Flex>
                        <Text strong>{storeDetails.name}</Text>
                        <Text type="secondary">{t('changeOnDesktop')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuPhone size={14} />
                            <Text type="secondary">{t('phoneNumber')}</Text>
                        </Flex>
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, phoneNumber: value }))}
                            placeholder={t('enterPhoneNumber')}
                            type="tel"
                            value={formData.phoneNumber}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuMapPin size={14} />
                            <Text type="secondary">{t('address')}</Text>
                        </Flex>
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, addressLine: value }))}
                            placeholder={t('streetAddress')}
                            value={formData.addressLine}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, city: value }))}
                            placeholder={t('city')}
                            value={formData.city}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, state: value }))}
                            placeholder={t('state')}
                            value={formData.state}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, country: value }))}
                            placeholder={t('country')}
                            value={formData.country}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, postalCode: value }))}
                            placeholder={t('postalCode')}
                            value={formData.postalCode}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuMapPin size={14} />
                            <Text type="secondary">{`${t('latitude')} / ${t('longitude')}`}</Text>
                        </Flex>
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, latitude: value }))}
                            placeholder={t('latitude')}
                            value={formData.latitude}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, longitude: value }))}
                            placeholder={t('longitude')}
                            value={formData.longitude}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuFileText size={14} />
                            <Text type="secondary">{t('description')}</Text>
                        </Flex>
                        <TextArea
                            maxLength={300}
                            onChange={(value) => setFormData((previous) => ({ ...previous, description: value }))}
                            placeholder={t('describeYourBusiness')}
                            rows={3}
                            showCount
                            value={formData.description}
                        />
                    </Flex>
                </Card>

                <Button block loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                    {t('saveChanges')}
                </Button>
            </Flex>
        </Flex>
    );
}
