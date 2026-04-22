'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuMapPin } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, NavBar, Text, Toast } from '../antd';
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
        area: storeDetails?.area || '',
        city: storeDetails?.city || '',
        country: storeDetails?.country || '',
        district: storeDetails?.district || '',
        latitude: storeDetails?.geo?.latitude ? String(storeDetails.geo.latitude) : '',
        postalCode: storeDetails?.postalCode || '',
        longitude: storeDetails?.geo?.longitude ? String(storeDetails.geo.longitude) : '',
        state: storeDetails?.state || '',
    });
    const [originalFormData, setOriginalFormData] = useState(() => ({
        addressLine: storeDetails?.addressLine || '',
        area: storeDetails?.area || '',
        city: storeDetails?.city || '',
        country: storeDetails?.country || '',
        district: storeDetails?.district || '',
        latitude: storeDetails?.geo?.latitude ? String(storeDetails.geo.latitude) : '',
        postalCode: storeDetails?.postalCode || '',
        longitude: storeDetails?.geo?.longitude ? String(storeDetails.geo.longitude) : '',
        state: storeDetails?.state || '',
    }));
    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalFormData);

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        const latitude = formData.latitude.trim() ? Number(formData.latitude) : undefined;
        const longitude = formData.longitude.trim() ? Number(formData.longitude) : undefined;
        const locationUpdates = {
            addressLine: formData.addressLine,
            area: formData.area,
            city: formData.city,
            country: formData.country,
            district: formData.district,
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

        try {
            await updateStore(nextStore as any);
            setOriginalFormData(formData);
            Toast.show({ content: t('saved'), duration: 1000 });
        } catch {
            setStoreDetails((previous: any) => ({
                ...previous,
                addressLine: storeDetails.addressLine,
                area: storeDetails.area,
                city: storeDetails.city,
                country: storeDetails.country,
                district: storeDetails.district,
                geo: storeDetails.geo,
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
                    subtitle="Keep the business address and map coordinates accurate everywhere your menu is shown."
                    title={t('publicInfo')}
                />
                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuMapPin size={14} />
                            <Text type="secondary">{t('address')}</Text>
                        </Flex>
                        <Text type="secondary">Enter the full customer-facing address for this business location. Avoid internal notes, directions for staff, or temporary text.</Text>
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, addressLine: value }))}
                            placeholder={t('streetAddress')}
                            value={formData.addressLine}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, area: value }))}
                            placeholder="Area / locality"
                            value={formData.area}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, district: value }))}
                            placeholder="District"
                            value={formData.district}
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
                        <Text type="secondary">Paste the exact map coordinates from Google Maps for this outlet. This helps maps, directions, and local search show the right location.</Text>
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

                <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                    {t('saveChanges')}
                </Button>
            </Flex>
        </Flex>
    );
}
