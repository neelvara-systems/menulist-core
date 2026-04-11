'use client'

import { BUSINESS_TYPES } from '@constant/common';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { UserUploadedFileType } from '@type/common';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useRef, useState } from 'react';
import { LuBriefcase, LuBuilding2, LuImage, LuMail, LuPhoneCall, LuUpload } from 'react-icons/lu';
import ImageUploadInput from '@atoms/imageUploadInput';
import { Button, Card, DotLoading, Flex, Image, Input, NavBar, Select, Text, TextArea, Title, Toast } from '../antd';
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
        email: storeDetails?.email || '',
        businessType: storeDetails?.businessType || '',
        description: storeDetails?.description || '',
        gstn: storeDetails?.gstn || '',
        name: storeDetails?.name || '',
        phoneNumber: storeDetails?.phoneNumber || '',
    });

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        if (!formData.name.trim()) {
            Toast.show({ content: t('businessNameRequired'), duration: 1500 });
            return;
        }

        const updates: Record<string, any> = { ...formData };
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
                businessType: storeDetails.businessType,
                email: storeDetails.email,
                description: storeDetails.description,
                gstn: storeDetails.gstn,
                name: storeDetails.name,
                phoneNumber: storeDetails.phoneNumber,
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
                                <Text>Update logo</Text>
                            </Flex>
                        </Button>
                        <Text type="secondary">Your logo is part of the business profile and can be updated here.</Text>
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
                    <Flex align="center" justify="space-between">
                        <Text type="secondary">{t('storeId')}</Text>
                        <Title level={5} style={{ margin: 0 }}>{storeDetails.storeId}</Title>
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
