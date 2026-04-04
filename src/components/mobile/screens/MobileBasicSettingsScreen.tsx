'use client'

import { BUSINESS_TYPES } from '@constant/common';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuBriefcase, LuBuilding2, LuImage, LuMail, LuPhoneCall } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, Input, NavBar, Picker, Text, TextArea, Title, Toast } from '../antd';

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
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [formData, setFormData] = useState({
        email: storeDetails?.email || '',
        businessType: storeDetails?.businessType || '',
        description: storeDetails?.description || '',
        domain: storeDetails?.customDomain || storeDetails?.subdomain || '',
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

        const { domain: _domain, ...updates } = formData;
        setIsSaving(true);
        setStoreDetails((previous: any) => ({ ...previous, ...updates }));
        Toast.show({ content: t('saved'), duration: 1000 });

        try {
            await updateStore({ ...storeDetails, ...updates } as any);
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
            <NavBar onBack={onBack}>{t('basicSettings')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex align="center" gap={12} vertical>
                        <LuImage color="#64748b" size={20} />
                        <Text type="secondary">{t('businessLogo')}</Text>
                        {storeDetails.logo ? (
                            <Image
                                alt={storeDetails.name}
                                height={80}
                                preview={false}
                                src={storeDetails.logo}
                                style={{ borderRadius: 12, objectFit: 'cover' }}
                                width={80}
                            />
                        ) : (
                            <Card style={{ alignItems: 'center', display: 'flex', height: 80, justifyContent: 'center', width: 80 }}>
                                <LuBuilding2 color="#64748b" size={28} />
                            </Card>
                        )}
                        <Text type="secondary">{t('changeLogoOnDesktop')}</Text>
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
                        <Button block fill="outline" onClick={() => setShowTypePicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                            {formData.businessType || tBusiness('selectBusinessType')}
                        </Button>
                        <Picker
                            columns={[BUSINESS_TYPE_OPTIONS]}
                            onClose={() => setShowTypePicker(false)}
                            onConfirm={(value) => {
                                if (value[0]) {
                                    setFormData((previous) => ({ ...previous, businessType: value[0] as string }));
                                }
                            }}
                            searchPlaceholder={tBusiness('selectBusinessType')}
                            title={tBusiness('businessType')}
                            value={[formData.businessType]}
                            visible={showTypePicker}
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
                    <Flex gap={4} vertical>
                        <Text type="secondary">{tBusiness('domain')}</Text>
                        <Text strong>{formData.domain || tBusiness('domainPlaceholder')}</Text>
                        <Text type="secondary">{t('changeOnDesktop')}</Text>
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
        </Flex>
    );
}
