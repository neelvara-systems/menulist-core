'use client'

import { BUSINESS_TYPES, resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { assertTenantUpdateSucceeded, updateTenant } from '@database/tenants';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { UserUploadedFileType } from '@type/common';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, toPreparedUploadName, type MediaImageCropIntent } from '@lib/media/prepareMediaImage';
import { DEFAULT_PHONE_COUNTRY_CODE, getDialCodeForCountry, getUniquePhoneCountries, normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuBriefcase, LuBuilding2, LuMail, LuMapPin, LuPhoneCall, LuUser } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, NavBar, Select, Text, TextArea, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileBasicSettingsScreenProps {
    onBack: () => void;
}

type AdjustableUploadedFile = UserUploadedFileType & {
    crop?: MediaImageCropIntent;
    sourceDataUrl?: string;
    sourceName?: string;
};

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
        countryCode: storeDetails?.countryCode || DEFAULT_PHONE_COUNTRY_CODE,
        dialCode: storeDetails?.dialCode || '',
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
    const logoAltName = storeDetails?.tenantName || tenantDetails?.name || storeDetails?.name || 'logo';
    const [selectedLogo, setSelectedLogo] = useState<AdjustableUploadedFile | null>(
        storeDetails?.logo
            ? {
                name: logoAltName,
                size: 0,
                type: '',
                url: storeDetails.logo,
            }
            : null
    );
    const [isLogoAdjustOpen, setIsLogoAdjustOpen] = useState(false);
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
        if (!formData.tenantName.trim()) {
            Toast.show({ content: 'Brand name is required', duration: 1500 });
            return;
        }
        if (!formData.name.trim()) {
            Toast.show({ content: t('businessNameRequired'), duration: 1500 });
            return;
        }

        const latitude = formData.latitude.trim() ? Number(formData.latitude) : undefined;
        const longitude = formData.longitude.trim() ? Number(formData.longitude) : undefined;
        const businessCategory = resolveStoreBusinessCategory(formData.businessType, storeDetails.businessCategory);
        const normalizedPhone = normalizePhoneNumberForStorage({
            countryCode: formData.countryCode,
            dialCode: formData.dialCode,
            phoneNumber: formData.phoneNumber,
        });
        const updates: Record<string, any> = {
            addressLine: formData.addressLine,
            area: formData.area,
            businessCategory,
            businessType: formData.businessType,
            city: formData.city,
            contactPersonEmail: formData.contactPersonEmail,
            contactPersonName: formData.contactPersonName,
            contactPersonNumber: formData.contactPersonNumber,
            country: formData.country,
            countryCode: normalizedPhone.phone ? normalizedPhone.countryCode : formData.countryCode,
            dialCode: normalizedPhone.phone ? normalizedPhone.dialCode : formData.dialCode,
            district: formData.district,
            email: formData.email,
            gstn: formData.gstn,
            name: formData.name.trim(),
            tenantName: formData.tenantName.trim(),
            phone: normalizedPhone.phone,
            phoneNumber: normalizedPhone.phoneNumber,
            postalCode: formData.postalCode,
            state: formData.state,
            tenantId: storeDetails.tenantId, // Required for the atomic canonical-store/summary scope check
        };
        if (latitude !== undefined && longitude !== undefined) {
            updates.geo = { latitude, longitude };
        }
        if (selectedLogo?.url && selectedLogo.url !== storeDetails.logo) {
            updates.imageToUpdate = selectedLogo.url;
            updates.imageType = selectedLogo.type || 'image/png';
            updates.preparedMedia = selectedLogo.preparedMedia;
        }

        setIsSaving(true);
        const optimisticUpdates = { ...updates };
        delete optimisticUpdates.imageToUpdate;
        delete optimisticUpdates.imageType;
        delete optimisticUpdates.preparedMedia;
        setStoreDetails((previous: any) => ({ ...previous, ...optimisticUpdates }));

        try {
            const savedStore = await updateStore({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                ...updates,
            } as any);
            assertStoreUpdateSucceeded(
                savedStore,
                storeDetails.storeId,
                'mobile_basic_settings_store_update_rejected',
            );
            if (formData.tenantName.trim() && formData.tenantName.trim() !== tenantDetails?.name && storeDetails?.tenantId) {
                const tenantResult = await updateTenant({
                    name: formData.tenantName.trim(),
                    tenantId: storeDetails.tenantId,
                });
                assertTenantUpdateSucceeded(
                    tenantResult,
                    storeDetails.tenantId,
                    'mobile_basic_settings_tenant_update_rejected',
                );
                setTenantDetails((previous: any) => ({ ...(previous || {}), name: formData.tenantName.trim() }));
            }
            setStoreDetails((previous: any) => ({
                ...previous,
                ...optimisticUpdates,
                businessCategory: savedStore?.businessCategory ?? optimisticUpdates.businessCategory ?? previous.businessCategory,
                logo: savedStore?.logo || previous.logo,
            }));
            if (savedStore?.logo) {
                setSelectedLogo({
                    name: logoAltName,
                    size: 0,
                    type: selectedLogo?.type || 'image/png',
                    url: savedStore.logo,
                });
            }
            setOriginalFormData(formData);
            setOriginalLogoUrl(savedStore?.logo || selectedLogo?.url || storeDetails.logo || '');
            Toast.show({ content: t('saved'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_basic_settings_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails.storeId, storeDetails.tenantId),
                ...getBoundedMobileOwnerStringContext('businessName', formData.name),
                ...getBoundedMobileOwnerStringContext('tenantName', formData.tenantName),
                ...getBoundedMobileOwnerStringContext('businessType', formData.businessType),
                hasGeoUpdate: Boolean(updates.geo),
                hasLogoUpdate: Boolean(updates.imageToUpdate),
                hasPhoneUpdate: Boolean(normalizedPhone.phone),
                tenantNameChanged: formData.tenantName.trim() !== tenantDetails?.name,
            });
            setStoreDetails((previous: any) => ({
                ...previous,
                addressLine: storeDetails.addressLine,
                area: storeDetails.area,
                businessCategory: storeDetails.businessCategory,
                city: storeDetails.city,
                businessType: storeDetails.businessType,
                contactPersonEmail: storeDetails.contactPersonEmail,
                contactPersonName: storeDetails.contactPersonName,
                contactPersonNumber: storeDetails.contactPersonNumber,
                country: storeDetails.country,
                email: storeDetails.email,
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
    }, [formData, logoAltName, selectedLogo, setStoreDetails, setTenantDetails, storeDetails, t, tenantDetails?.name]);

    const handleLogoSelect = useCallback(async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'businessLogo');
            setSelectedLogo({
                blob: prepared.blob,
                crop: prepared.crop,
                mediaChecksum: prepared.checksum,
                mediaId: prepared.mediaId,
                mediaProfile: 'businessLogo',
                mediaVariant: prepared.primaryVariant,
                mediaVersion: prepared.version,
                name: toPreparedUploadName(file.name, prepared.mimeType, file.name),
                preparedMedia: prepared,
                size: prepared.sizeBytes,
                sourceDataUrl: prepared.sourceDataUrl,
                sourceName: prepared.sourceName,
                type: prepared.mimeType,
                url: prepared.dataUrl,
            });
        } catch (error) {
            logMobileOwnerFailure('mobile_basic_settings_logo_prepare_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('fileName', file.name),
            });
            Toast.show({ content: 'Could not prepare logo.', duration: 1800 });
        }
    }, [storeDetails?.storeId, storeDetails?.tenantId]);

    const handleReset = useCallback(() => {
        setFormData(originalFormData);
        setSelectedLogo(
            originalLogoUrl
                ? {
                    name: logoAltName,
                    size: 0,
                    type: '',
                    url: originalLogoUrl,
                }
            : null
        );
    }, [logoAltName, originalFormData, originalLogoUrl]);

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Manage your brand profile, business identity, contact details, and address."
                onBack={onBack}
                title="Brand Settings"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={4} vertical>
                        <Text type="secondary">Brand name</Text>
                        <Text strong>{formData.tenantName || tenantDetails?.name || 'Not set'}</Text>
                        <Text type="secondary">This is your brand or chain name across locations.</Text>
                    </Flex>
                </Card>
                <Card>
                    <MediaImageCard
                        accept={getMediaProfileAcceptAttribute('businessLogo')}
                        alt={logoAltName}
                        aspectRatio="1 / 1"
                        canAdjust={Boolean(selectedLogo?.sourceDataUrl)}
                        helperText="Best results: square PNG or JPG, at least 512 x 512 px. Keep the logo clear with some spacing around the edges."
                        imageType="businessLogo"
                        imageFit="contain"
                        imageUrl={selectedLogo?.url || storeDetails.logo}
                        onAdjust={() => setIsLogoAdjustOpen(true)}
                        onReset={selectedLogo?.sourceDataUrl ? () => setSelectedLogo(
                            storeDetails?.logo
                                ? {
                                    name: logoAltName,
                                    size: 0,
                                    type: '',
                                    url: storeDetails.logo,
                                }
                                : null
                        ) : undefined}
                        onSelectFile={handleLogoSelect}
                        placeholderDescription="Drop, paste, or choose a square logo."
                        placeholderTitle="Upload logo"
                        size="compact"
                    />
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
                        <Select
                            onChange={(value) => setFormData((previous) => ({
                                ...previous,
                                countryCode: value,
                                dialCode: getDialCodeForCountry(value),
                            }))}
                            options={getUniquePhoneCountries()
                                .map((country) => ({
                                    label: `${country.flag} ${country.code} (${country.dialCode})`,
                                    value: country.code,
                                }))}
                            placeholder="Country code"
                            value={formData.countryCode || DEFAULT_PHONE_COUNTRY_CODE}
                        />
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
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
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
            <MediaImageAdjustModal
                fileName={selectedLogo?.sourceName || selectedLogo?.name}
                imageType="businessLogo"
                initialCrop={selectedLogo?.crop}
                onApply={(prepared) => {
                    setSelectedLogo((current) => ({
                        blob: prepared.blob,
                        crop: prepared.crop,
                        mediaChecksum: prepared.checksum,
                        mediaId: prepared.mediaId,
                        mediaProfile: 'businessLogo',
                        mediaVariant: prepared.primaryVariant,
                        mediaVersion: prepared.version,
                        name: prepared.sourceName || current?.name || logoAltName,
                        preparedMedia: prepared,
                        size: prepared.sizeBytes,
                        sourceDataUrl: prepared.sourceDataUrl || current?.sourceDataUrl,
                        sourceName: prepared.sourceName || current?.sourceName,
                        type: prepared.mimeType,
                        url: prepared.dataUrl,
                    }));
                }}
                onClose={() => setIsLogoAdjustOpen(false)}
                open={isLogoAdjustOpen}
                sourceDataUrl={selectedLogo?.sourceDataUrl}
            />
        </Flex>
    );
}
