'use client'

import ImageUploadInput from '@atoms/imageUploadInput';
import { BUSINESS_TYPES } from '@constant/common';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { UserUploadedFileType } from '@type/common';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useRef, useState } from 'react';
import { LuBriefcase, LuBuilding2, LuImage, LuMail, LuMapPin, LuPhoneCall, LuUpload, LuUser } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, Input, NavBar, Select, Text, TextArea, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileBasicSettingsScreenProps {
    onBack: () => void;
}

const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map((businessType) => ({
    label: businessType.label,
    value: businessType.value,
}));

export default function MobileBasicSettingsScreen({ onBack }: MobileBasicSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const tBusiness = useTranslations('BusinessSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedLogo, setSelectedLogo] = useState<UserUploadedFileType | null>(
        storeDetails?.logo
            ? {
                name: storeDetails.name || 'logo',
                size: 0,
                type: '',
                url: storeDetails.logo,
            }
            : null
    );
    const [formData, setFormData] = useState({
        addressLine: storeDetails?.addressLine || '',
        area: storeDetails?.area || '',
        city: storeDetails?.city || '',
        contactPersonEmail: storeDetails?.contactPersonEmail || '',
        contactPersonName: storeDetails?.contactPersonName || '',
        contactPersonNumber: storeDetails?.contactPersonNumber || '',
        country: storeDetails?.country || '',
        district: storeDetails?.district || '',
        email: storeDetails?.email || '',
        businessType: storeDetails?.businessType || '',
        description: storeDetails?.description || '',
        gstn: storeDetails?.gstn || '',
        latitude: storeDetails?.geo?.latitude ? String(storeDetails.geo.latitude) : '',
        longitude: storeDetails?.geo?.longitude ? String(storeDetails.geo.longitude) : '',
        name: storeDetails?.name || '',
        postalCode: storeDetails?.postalCode || '',
        phoneNumber: storeDetails?.phoneNumber || '',
        state: storeDetails?.state || '',
    });

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        if (!formData.name.trim()) {
            Toast.show({ content: t('businessNameRequired'), duration: 1500 });
            return;
        }

        const latitude = formData.latitude.trim() ? Number(formData.latitude) : undefined;
        const longitude = formData.longitude.trim() ? Number(formData.longitude) : undefined;
        const updates: Record<string, any> = {
            addressLine: formData.addressLine,
            area: formData.area,
            businessType: formData.businessType,
            city: formData.city,
            contactPersonEmail: formData.contactPersonEmail,
            contactPersonName: formData.contactPersonName,
            contactPersonNumber: formData.contactPersonNumber,
            country: formData.country,
            description: formData.description,
            district: formData.district,
            email: formData.email,
            gstn: formData.gstn,
            name: formData.name,
            phoneNumber: formData.phoneNumber,
            postalCode: formData.postalCode,
            state: formData.state,
            tenantId: storeDetails.tenantId, // Ensure tenantId is included for syncStoreToSummary
        };
        if (latitude !== undefined && longitude !== undefined) {
            updates.geo = { latitude, longitude };
        }
        if (selectedLogo?.url && selectedLogo.url !== storeDetails.logo) {
            updates.imageToUpdate = selectedLogo.url;
            updates.imageType = selectedLogo.type || 'image/png';
        }

        setIsSaving(true);
        setStoreDetails((previous: any) => ({ ...previous, ...updates }));

        try {
            await updateStore({ ...storeDetails, ...updates } as any);
            Toast.show({ content: t('saved'), duration: 1000 });
        } catch {
            setStoreDetails((previous: any) => ({
                ...previous,
                addressLine: storeDetails.addressLine,
                area: storeDetails.area,
                city: storeDetails.city,
                businessType: storeDetails.businessType,
                contactPersonEmail: storeDetails.contactPersonEmail,
                contactPersonName: storeDetails.contactPersonName,
                contactPersonNumber: storeDetails.contactPersonNumber,
                country: storeDetails.country,
                email: storeDetails.email,
                description: storeDetails.description,
                district: storeDetails.district,
                geo: storeDetails.geo,
                gstn: storeDetails.gstn,
                name: storeDetails.name,
                postalCode: storeDetails.postalCode,
                phoneNumber: storeDetails.phoneNumber,
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
                    subtitle={t('basicSettingsSubtitle')}
                    title={t('basicSettings')}
                />
                <Card>
                    <Flex align="center" gap={12} vertical>
                        <LuImage color="#64748b" size={20} />
                        <Text type="secondary">{t('businessLogo')}</Text>
                        {(selectedLogo?.url || storeDetails.logo) ? (
                            <Image
                                alt={storeDetails.name}
                                height={80}
                                preview={false}
                                src={selectedLogo?.url || storeDetails.logo}
                                style={{ borderRadius: 12, objectFit: 'cover' }}
                                width={80}
                            />
                        ) : (
                            <Card style={{ alignItems: 'center', display: 'flex', height: 80, justifyContent: 'center', width: 80 }}>
                                <LuBuilding2 color="#64748b" size={28} />
                            </Card>
                        )}
                        <Button
                            fill="outline"
                            onClick={() => fileInputRef.current?.click()}
                            size="small"
                        >
                            <Flex align="center" gap={6}>
                                <LuUpload size={16} />
                                <Text>{tBusiness('uploadLogo')}</Text>
                            </Flex>
                        </Button>
                        <Text type="secondary">{tBusiness('uploadLogoDesc')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuBuilding2 size={14} />
                            <Text type="secondary">{tBusiness('businessName')}</Text>
                        </Flex>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, name: value }))} placeholder={tBusiness('businessNamePlaceholder')} value={formData.name} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuBriefcase size={14} />
                            <Text type="secondary">{tBusiness('businessType')}</Text>
                        </Flex>
                        <Select
                            onChange={(value) => setFormData((previous) => ({ ...previous, businessType: value }))}
                            options={BUSINESS_TYPE_OPTIONS}
                            placeholder={tBusiness('selectBusinessType')}
                            value={formData.businessType || undefined}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuMail size={14} />
                            <Text type="secondary">{tBusiness('businessEmail')}</Text>
                        </Flex>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, email: value }))} placeholder={tBusiness('emailPlaceholder')} type="email" value={formData.email} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuPhoneCall size={14} />
                            <Text type="secondary">{tBusiness('phoneNumber')}</Text>
                        </Flex>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, phoneNumber: value }))} placeholder={tBusiness('phonePlaceholder')} type="tel" value={formData.phoneNumber} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuUser size={14} />
                            <Text type="secondary">{tBusiness('contactPerson')}</Text>
                        </Flex>
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, contactPersonName: value }))}
                            placeholder={tBusiness('fullName')}
                            value={formData.contactPersonName}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, contactPersonEmail: value }))}
                            placeholder={tBusiness('emailPlaceholder')}
                            type="email"
                            value={formData.contactPersonEmail}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, contactPersonNumber: value }))}
                            placeholder={tBusiness('phonePlaceholder')}
                            type="tel"
                            value={formData.contactPersonNumber}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('businessDescription')}</Text>
                        <TextArea
                            maxLength={300}
                            onChange={(value) => setFormData((previous) => ({ ...previous, description: value }))}
                            placeholder={tBusiness('businessDescPlaceholder')}
                            rows={4}
                            showCount
                            value={formData.description}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('gstin')}</Text>
                        <Input onChange={(value) => setFormData((previous) => ({ ...previous, gstn: value }))} placeholder={tBusiness('gstPlaceholder')} value={formData.gstn} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuMapPin size={14} />
                            <Text type="secondary">{tBusiness('locationInformation')}</Text>
                        </Flex>
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, addressLine: value }))}
                            placeholder={tBusiness('streetAddressPlaceholder')}
                            value={formData.addressLine}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, area: value }))}
                            placeholder={tBusiness('area')}
                            value={formData.area}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, district: value }))}
                            placeholder={tBusiness('district')}
                            value={formData.district}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, city: value }))}
                            placeholder={tBusiness('city')}
                            value={formData.city}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, state: value }))}
                            placeholder={tBusiness('state')}
                            value={formData.state}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, country: value }))}
                            placeholder={tBusiness('country')}
                            value={formData.country}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, postalCode: value }))}
                            placeholder={tBusiness('postalCode')}
                            value={formData.postalCode}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuMapPin size={14} />
                            <Text type="secondary">{tBusiness('addressCoordinates')}</Text>
                        </Flex>
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, latitude: value }))}
                            placeholder={tBusiness('latitude')}
                            value={formData.latitude}
                        />
                        <Input
                            onChange={(value) => setFormData((previous) => ({ ...previous, longitude: value }))}
                            placeholder={tBusiness('longitude')}
                            value={formData.longitude}
                        />
                    </Flex>
                </Card>

                <Button block loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                    {t('saveChanges')}
                </Button>
            </Flex>
            <ImageUploadInput
                fileInputRef={fileInputRef}
                onUploadFile={(file: UserUploadedFileType) => setSelectedLogo(file)}
            />
        </Flex>
    );
}
