'use client'

import ImageUploadInput from '@atoms/imageUploadInput';
import { BUSINESS_TYPES } from '@constant/common';
import { updateStore } from '@database/stores';
import { updateTenant } from '@database/tenants';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { UserUploadedFileType } from '@type/common';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LuBriefcase, LuBuilding2, LuMail, LuMapPin, LuPhoneCall, LuUpload, LuUser } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Image, Input, NavBar, Select, Text, TextArea, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileBasicSettingsScreenProps {
    onBack: () => void;
}

const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map((businessType) => ({
    label: businessType.label,
    value: businessType.value,
}));

function getInitialFormData(storeDetails: any, tenantDetails?: any) {
    return {
        addressLine: storeDetails?.addressLine || '',
        area: storeDetails?.area || '',
        businessType: storeDetails?.businessType || '',
        city: storeDetails?.city || '',
        contactPersonEmail: storeDetails?.contactPersonEmail || '',
        contactPersonName: storeDetails?.contactPersonName || '',
        contactPersonNumber: storeDetails?.contactPersonNumber || '',
        country: storeDetails?.country || '',
        description: storeDetails?.description || '',
        district: storeDetails?.district || '',
        email: storeDetails?.email || '',
        gstn: storeDetails?.gstn || '',
        latitude: storeDetails?.geo?.latitude ? String(storeDetails.geo.latitude) : '',
        longitude: storeDetails?.geo?.longitude ? String(storeDetails.geo.longitude) : '',
        name: storeDetails?.name || '',
        tenantName: storeDetails?.tenantName || tenantDetails?.name || '',
        phoneNumber: storeDetails?.phoneNumber || '',
        postalCode: storeDetails?.postalCode || '',
        state: storeDetails?.state || '',
    };
}

export default function MobileBasicSettingsScreen({ onBack }: MobileBasicSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const tBusiness = useTranslations('BusinessSettings');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails, tenantDetails, setTenantDetails } = useContext(PlatformGlobalDataContext);
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
    const [formData, setFormData] = useState(getInitialFormData(storeDetails, tenantDetails));
    const [originalFormData, setOriginalFormData] = useState(() => getInitialFormData(storeDetails, tenantDetails));
    const [originalLogoUrl, setOriginalLogoUrl] = useState(storeDetails?.logo || '');
    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalFormData) || (selectedLogo?.url || '') !== originalLogoUrl;

    useEffect(() => {
        const nextFormData = getInitialFormData(storeDetails, tenantDetails);
        setFormData((previous) => JSON.stringify(previous) === JSON.stringify(originalFormData) ? nextFormData : previous);
        setOriginalFormData(nextFormData);
        setOriginalLogoUrl(storeDetails?.logo || '');
    }, [storeDetails, tenantDetails]);

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
            tenantName: formData.tenantName,
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
        const optimisticUpdates = { ...updates };
        delete optimisticUpdates.imageToUpdate;
        delete optimisticUpdates.imageType;
        setStoreDetails((previous: any) => ({ ...previous, ...optimisticUpdates }));

        try {
            const savedStore = await updateStore({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                ...updates,
            } as any);
            if (formData.tenantName && formData.tenantName !== tenantDetails?.name && storeDetails?.tenantId) {
                await updateTenant({
                    name: formData.tenantName,
                    tenantId: storeDetails.tenantId,
                });
                setTenantDetails((previous: any) => ({ ...(previous || {}), name: formData.tenantName }));
            }
            setStoreDetails((previous: any) => ({
                ...previous,
                ...optimisticUpdates,
                logo: savedStore?.logo || previous.logo,
            }));
            if (savedStore?.logo) {
                setSelectedLogo({
                    name: storeDetails.name || 'logo',
                    size: 0,
                    type: selectedLogo?.type || 'image/png',
                    url: savedStore.logo,
                });
            }
            setOriginalFormData(formData);
            setOriginalLogoUrl(savedStore?.logo || selectedLogo?.url || storeDetails.logo || '');
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
                tenantName: storeDetails.tenantName,
                postalCode: storeDetails.postalCode,
                phoneNumber: storeDetails.phoneNumber,
                state: storeDetails.state,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [formData, selectedLogo, setStoreDetails, setTenantDetails, storeDetails, t, tenantDetails?.name]);

    const handleReset = useCallback(() => {
        setFormData(originalFormData);
        setSelectedLogo(
            originalLogoUrl
                ? {
                    name: storeDetails?.name || 'logo',
                    size: 0,
                    type: '',
                    url: originalLogoUrl,
                }
                : null
        );
    }, [originalFormData, originalLogoUrl, storeDetails?.name]);

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
                    subtitle="Manage your brand profile, business identity, contact details, and address."
                    title="Brand Settings"
                />
                <Card>
                    <Flex gap={4} vertical>
                        <Text type="secondary">Brand name</Text>
                        <Text strong>{formData.tenantName || tenantDetails?.name || 'Not set'}</Text>
                        <Text type="secondary">This is your brand or chain name across locations.</Text>
                    </Flex>
                </Card>
                <Card>
                    <Flex align="center" gap={10} justify="center" style={{ minHeight: 120 }} vertical>
                        {(selectedLogo?.url || storeDetails.logo) ? (
                            <>
                                <Image
                                    alt={storeDetails.name}
                                    height={72}
                                    preview={false}
                                    src={selectedLogo?.url || storeDetails.logo}
                                    style={{ borderRadius: 12, objectFit: 'cover' }}
                                    width={72}
                                />
                                <Text strong>{tBusiness('uploadLogo')}</Text>
                                <Text type="secondary">Tap to replace</Text>
                                <Button fill="outline" onClick={() => fileInputRef.current?.click()} size="small">
                                    {tBusiness('uploadLogo')}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Flex
                                    align="center"
                                    justify="center"
                                    style={{
                                        background: token.colorFillAlter,
                                        borderRadius: 14,
                                        color: token.colorPrimary,
                                        height: 44,
                                        width: 44,
                                    }}
                                >
                                    <LuUpload size={20} />
                                </Flex>
                                <Text strong>{tBusiness('uploadLogo')}</Text>
                                <Button onClick={() => fileInputRef.current?.click()} size="small">
                                    {tBusiness('uploadLogo')}
                                </Button>
                            </>
                        )}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuBuilding2 size={14} />
                            <Text type="secondary">Brand Name</Text>
                        </Flex>
                        <Input autoCapitalize="words" onChange={(value) => setFormData((previous) => ({ ...previous, tenantName: value }))} placeholder="Brand / chain name" value={formData.tenantName} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuBuilding2 size={14} />
                            <Text type="secondary">{tBusiness('businessName')}</Text>
                        </Flex>
                        <Input autoCapitalize="words" onChange={(value) => setFormData((previous) => ({ ...previous, name: value }))} placeholder={tBusiness('businessNamePlaceholder')} value={formData.name} />
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
                        <Input autoComplete="email" inputMode="email" name="businessEmail" onChange={(value) => setFormData((previous) => ({ ...previous, email: value }))} placeholder={tBusiness('emailPlaceholder')} type="email" value={formData.email} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuPhoneCall size={14} />
                            <Text type="secondary">{tBusiness('phoneNumber')}</Text>
                        </Flex>
                        <Input autoComplete="tel" inputMode="tel" name="businessPhone" onChange={(value) => setFormData((previous) => ({ ...previous, phoneNumber: value }))} placeholder={tBusiness('phonePlaceholder')} type="tel" value={formData.phoneNumber} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuUser size={14} />
                            <Text type="secondary">{tBusiness('contactPerson')}</Text>
                        </Flex>
                        <Input
                            autoCapitalize="words"
                            autoComplete="name"
                            inputMode="text"
                            name="contactPersonName"
                            onChange={(value) => setFormData((previous) => ({ ...previous, contactPersonName: value }))}
                            placeholder={tBusiness('fullName')}
                            value={formData.contactPersonName}
                        />
                        <Input
                            autoComplete="email"
                            inputMode="email"
                            name="contactPersonEmail"
                            onChange={(value) => setFormData((previous) => ({ ...previous, contactPersonEmail: value }))}
                            placeholder={tBusiness('emailPlaceholder')}
                            type="email"
                            value={formData.contactPersonEmail}
                        />
                        <Input
                            autoComplete="tel"
                            inputMode="tel"
                            name="contactPersonNumber"
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
                        <Text type="secondary">Add the real customer-facing business address. This is the location people should visit, not internal notes or delivery instructions.</Text>
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
                        <Text type="secondary">Use exact map coordinates for this outlet only. Add latitude and longitude from Google Maps so directions and local SEO point to the correct place.</Text>
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
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large" style={{ minHeight: 44 }}>
                        {t('reset')}
                    </Button>
                    <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                        {t('saveChanges')}
                    </Button>
                </Flex>
            </Flex>
            <ImageUploadInput
                fileInputRef={fileInputRef}
                onUploadFile={(file: UserUploadedFileType) => setSelectedLogo(file)}
            />
        </Flex>
    );
}
