'use client'

import { BUSINESS_TYPES, resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { assertTenantUpdateSucceeded, updateTenant } from '@database/tenants';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { UserUploadedFileType } from '@type/common';
import type { StoreDataType } from '@type/platform/store';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, toPreparedUploadName, type MediaImageCropIntent } from '@lib/media/prepareMediaImage';
import { DEFAULT_PHONE_COUNTRY_CODE, getDialCodeForCountry, getUniquePhoneCountries, normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { normalizeGeoCoordinateDraft } from '@lib/businessIdentity/geoCoordinates';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
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

const MOBILE_BASIC_STORE_UPDATE_KEYS = [
    'addressLine',
    'area',
    'businessCategory',
    'businessType',
    'city',
    'contactPersonEmail',
    'contactPersonName',
    'contactPersonNumber',
    'country',
    'countryCode',
    'dialCode',
    'district',
    'email',
    'geo',
    'gstn',
    'logo',
    'name',
    'phone',
    'phoneNumber',
    'postalCode',
    'state',
    'tenantId',
    'tenantName',
] as const satisfies readonly (keyof StoreDataType)[];

type MobileBasicStoreUpdate = Partial<Pick<
    StoreDataType,
    (typeof MOBILE_BASIC_STORE_UPDATE_KEYS)[number]
>>;

type MobileBasicStoreMutation = MobileBasicStoreUpdate & {
    imageToUpdate?: string;
    imageType?: string;
    preparedMedia?: AdjustableUploadedFile['preparedMedia'];
};

function ownsMobileBasicOptimisticValues(
    storeDetails: StoreDataType | null,
    updates: MobileBasicStoreUpdate,
): boolean {
    return MOBILE_BASIC_STORE_UPDATE_KEYS.every((key) => (
        !Object.prototype.hasOwnProperty.call(updates, key)
        || storeDetails?.[key] === updates[key]
    ));
}

function getInitialFormData(storeDetails: StoreDataType | null, tenantDetails?: { name?: string } | null) {
    return {
        addressLine: storeDetails?.addressLine || storeDetails?.address || '',
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
        latitude: storeDetails?.geo?.latitude !== undefined && storeDetails?.geo?.latitude !== null ? String(storeDetails.geo.latitude) : '',
        longitude: storeDetails?.geo?.longitude !== undefined && storeDetails?.geo?.longitude !== null ? String(storeDetails.geo.longitude) : '',
        name: storeDetails?.name || '',
        tenantName: storeDetails?.tenantName || tenantDetails?.name || '',
        phoneNumber: storeDetails?.phoneNumber || '',
        postalCode: storeDetails?.postalCode || storeDetails?.pincode || '',
        state: storeDetails?.state || '',
    };
}

function MobileBasicSettingsScreenContent({ onBack }: MobileBasicSettingsScreenProps) {
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
    const [isLogoRemovalRequested, setIsLogoRemovalRequested] = useState(false);
    const [isLogoAdjustOpen, setIsLogoAdjustOpen] = useState(false);
    const [formData, setFormData] = useState(getInitialFormData(storeDetails, tenantDetails));
    const [originalFormData, setOriginalFormData] = useState(() => getInitialFormData(storeDetails, tenantDetails));
    const [originalLogoUrl, setOriginalLogoUrl] = useState(storeDetails?.logo || '');
    const componentActiveRef = useRef(true);
    const basicSettingsSaveInFlightRef = useRef(false);
    const currentStoreDetailsRef = useRef(storeDetails);
    currentStoreDetailsRef.current = storeDetails;
    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalFormData)
        || isLogoRemovalRequested
        || (selectedLogo?.url || '') !== originalLogoUrl;

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (basicSettingsSaveInFlightRef.current) return;
        const nextFormData = getInitialFormData(storeDetails, tenantDetails);
        setFormData((previous) => JSON.stringify(previous) === JSON.stringify(originalFormData) ? nextFormData : previous);
        setOriginalFormData(nextFormData);
        setOriginalLogoUrl(storeDetails?.logo || '');
    }, [storeDetails, tenantDetails]);

    const handleSave = useCallback(async () => {
        if (
            !storeDetails?.storeId
            || !storeDetails?.tenantId
            || basicSettingsSaveInFlightRef.current
        ) return;
        if (!formData.tenantName.trim()) {
            Toast.show({ content: 'Brand name is required', duration: 1500 });
            return;
        }
        if (!formData.name.trim()) {
            Toast.show({ content: t('businessNameRequired'), duration: 1500 });
            return;
        }

        const normalizedGeo = normalizeGeoCoordinateDraft(formData.latitude, formData.longitude);
        if (!normalizedGeo.ok) {
            Toast.show({ content: 'Enter both latitude and longitude using valid map coordinates.', duration: 1800 });
            return;
        }
        const businessCategory = resolveStoreBusinessCategory(formData.businessType, storeDetails.businessCategory);
        const expectedStoreId = storeDetails.storeId;
        const expectedTenantId = storeDetails.tenantId;
        const normalizedPhone = normalizePhoneNumberForStorage({
            countryCode: formData.countryCode,
            dialCode: formData.dialCode,
            phoneNumber: formData.phoneNumber,
        });
        const updates: MobileBasicStoreMutation = {
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
            tenantId: expectedTenantId, // Required for the atomic canonical-store/summary scope check
        };
        if (normalizedGeo.geo || storeDetails.geo) updates.geo = normalizedGeo.geo;
        if (isLogoRemovalRequested) {
            updates.logo = '';
        } else if (selectedLogo?.url && selectedLogo.url !== storeDetails.logo) {
            updates.imageToUpdate = selectedLogo.url;
            updates.imageType = selectedLogo.type || 'image/png';
            updates.preparedMedia = selectedLogo.preparedMedia;
        }

        basicSettingsSaveInFlightRef.current = true;
        setIsSaving(true);
        const optimisticUpdates = { ...updates };
        delete optimisticUpdates.imageToUpdate;
        delete optimisticUpdates.imageType;
        delete optimisticUpdates.preparedMedia;
        const previousOptimisticValues = Object.fromEntries(
            MOBILE_BASIC_STORE_UPDATE_KEYS
                .filter((key) => Object.prototype.hasOwnProperty.call(optimisticUpdates, key))
                .map((key) => [key, storeDetails[key]]),
        );
        setStoreDetails((previous: any) => (
            previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId
                ? { ...previous, ...optimisticUpdates }
                : previous
        ));

        let savedStore: any;
        try {
            savedStore = await updateStore({
                storeId: expectedStoreId,
                tenantId: expectedTenantId,
                ...updates,
            } as any);
            assertStoreUpdateSucceeded(
                savedStore,
                expectedStoreId,
                'mobile_basic_settings_store_update_rejected',
            );
        } catch (error) {
            logMobileOwnerFailure('mobile_basic_settings_save_failed', error, {
                ...getMobileOwnerStoreLogContext(expectedStoreId, expectedTenantId),
                ...getBoundedMobileOwnerStringContext('businessName', formData.name),
                ...getBoundedMobileOwnerStringContext('tenantName', formData.tenantName),
                ...getBoundedMobileOwnerStringContext('businessType', formData.businessType),
                hasGeoUpdate: Boolean(updates.geo),
                hasLogoUpdate: Object.prototype.hasOwnProperty.call(updates, 'logo') || Boolean(updates.imageToUpdate),
                hasPhoneUpdate: Boolean(normalizedPhone.phone),
                tenantNameChanged: formData.tenantName.trim() !== tenantDetails?.name,
            });
            setStoreDetails((previous: any) => {
                const stillOwnsOptimisticState = (
                    previous?.storeId === expectedStoreId
                    && previous?.tenantId === expectedTenantId
                    && ownsMobileBasicOptimisticValues(previous, optimisticUpdates)
                );
                return stillOwnsOptimisticState
                    ? { ...previous, ...previousOptimisticValues }
                    : previous;
            });
            if (componentActiveRef.current) {
                Toast.show({ content: t('failedToSave'), duration: 2000 });
            }
            basicSettingsSaveInFlightRef.current = false;
            if (componentActiveRef.current) setIsSaving(false);
            return;
        }

        let tenantNameSynced = true;
        if (formData.tenantName.trim() && formData.tenantName.trim() !== tenantDetails?.name) {
            try {
                const tenantResult = await updateTenant({
                    name: formData.tenantName.trim(),
                    tenantId: expectedTenantId,
                });
                assertTenantUpdateSucceeded(
                    tenantResult,
                    expectedTenantId,
                    'mobile_basic_settings_tenant_update_rejected',
                );
                if (componentActiveRef.current) {
                    setTenantDetails((previous: any) => ({ ...(previous || {}), name: formData.tenantName.trim() }));
                }
            } catch (error) {
                tenantNameSynced = false;
                logMobileOwnerFailure('mobile_basic_settings_tenant_sync_failed', error, {
                    ...getMobileOwnerStoreLogContext(expectedStoreId, expectedTenantId),
                    ...getBoundedMobileOwnerStringContext('tenantName', formData.tenantName),
                });
            }
        }

        const currentStoreOwnsAttempt = (
            currentStoreDetailsRef.current?.storeId === expectedStoreId
            && currentStoreDetailsRef.current?.tenantId === expectedTenantId
            && ownsMobileBasicOptimisticValues(currentStoreDetailsRef.current, optimisticUpdates)
        );
        setStoreDetails((previous: any) => (
            previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId
            && ownsMobileBasicOptimisticValues(previous, optimisticUpdates)
                ? {
                    ...previous,
                    businessCategory: savedStore?.businessCategory ?? optimisticUpdates.businessCategory ?? previous.businessCategory,
                    logo: Object.prototype.hasOwnProperty.call(savedStore || {}, 'logo')
                        ? savedStore.logo || ''
                        : previous.logo,
                }
                : previous
        ));
        if (componentActiveRef.current) {
            if (currentStoreOwnsAttempt && Object.prototype.hasOwnProperty.call(savedStore || {}, 'logo')) {
                setSelectedLogo(savedStore.logo
                    ? {
                        name: logoAltName,
                        size: 0,
                        type: selectedLogo?.type || 'image/png',
                        url: savedStore.logo,
                    }
                    : null);
                setIsLogoRemovalRequested(false);
            }
            if (currentStoreOwnsAttempt) {
                setOriginalFormData(tenantNameSynced
                    ? formData
                    : { ...formData, tenantName: tenantDetails?.name || '' });
                setOriginalLogoUrl(Object.prototype.hasOwnProperty.call(savedStore || {}, 'logo')
                    ? savedStore.logo || ''
                    : selectedLogo?.url || storeDetails.logo || '');
            } else {
                const currentStore = currentStoreDetailsRef.current;
                const currentForm = getInitialFormData(currentStore, tenantDetails);
                setFormData(currentForm);
                setOriginalFormData(currentForm);
                setOriginalLogoUrl(currentStore?.logo || '');
                setSelectedLogo(currentStore?.logo
                    ? {
                        name: currentStore?.tenantName || tenantDetails?.name || currentStore?.name || 'logo',
                        size: 0,
                        type: '',
                        url: currentStore.logo,
                    }
                    : null);
            }
            Toast.show({
                content: tenantNameSynced
                    ? t('saved')
                    : 'Business details saved, but the brand name still needs to be retried.',
                duration: tenantNameSynced ? 1000 : 2500,
            });
        }
        basicSettingsSaveInFlightRef.current = false;
        if (componentActiveRef.current) setIsSaving(false);
    }, [formData, isLogoRemovalRequested, logoAltName, selectedLogo, setStoreDetails, setTenantDetails, storeDetails, t, tenantDetails?.name]);

    const handleLogoSelect = useCallback(async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'businessLogo');
            if (!componentActiveRef.current) return;
            setIsLogoRemovalRequested(false);
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
            if (componentActiveRef.current) {
                Toast.show({ content: 'Could not prepare logo.', duration: 1800 });
            }
        }
    }, [storeDetails?.storeId, storeDetails?.tenantId]);

    const handleReset = useCallback(() => {
        setFormData(originalFormData);
        setIsLogoRemovalRequested(false);
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
                        imageUrl={isLogoRemovalRequested ? undefined : selectedLogo?.url || storeDetails.logo}
                        onAdjust={() => setIsLogoAdjustOpen(true)}
                        onRemove={selectedLogo?.url || storeDetails.logo ? () => {
                            setIsLogoRemovalRequested(true);
                            setSelectedLogo(null);
                        } : undefined}
                        onReset={selectedLogo?.sourceDataUrl ? () => {
                            setIsLogoRemovalRequested(false);
                            setSelectedLogo(
                                storeDetails?.logo
                                    ? {
                                        name: logoAltName,
                                        size: 0,
                                        type: '',
                                        url: storeDetails.logo,
                                    }
                                    : null
                            );
                        } : undefined}
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
                        <Input aria-label="Brand name" autoCapitalize="words" onChange={(value) => setFormData((previous) => ({ ...previous, tenantName: value }))} placeholder="Brand / chain name" value={formData.tenantName} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuBuilding2 size={14} />
                            <Text type="secondary">{tBusiness('businessName')}</Text>
                        </Flex>
                        <Input aria-label="Location name" autoCapitalize="words" onChange={(value) => setFormData((previous) => ({ ...previous, name: value }))} placeholder={tBusiness('businessNamePlaceholder')} value={formData.name} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuBriefcase size={14} />
                            <Text type="secondary">{tBusiness('businessType')}</Text>
                        </Flex>
                        <Select
                            aria-label={tBusiness('businessType')}
                            onChange={(value: string) => setFormData((previous) => ({ ...previous, businessType: value }))}
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
                        <Input aria-label={tBusiness('businessEmail')} autoComplete="email" inputMode="email" name="businessEmail" onChange={(value) => setFormData((previous) => ({ ...previous, email: value }))} placeholder={tBusiness('emailPlaceholder')} type="email" value={formData.email} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuPhoneCall size={14} />
                            <Text type="secondary">{tBusiness('phoneNumber')}</Text>
                        </Flex>
                        <Select
                            aria-label="Business phone country code"
                            onChange={(value: string) => setFormData((previous) => ({
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
                        <Input aria-label="Business phone number" autoComplete="tel" inputMode="tel" name="businessPhone" onChange={(value) => setFormData((previous) => ({ ...previous, phoneNumber: value }))} placeholder={tBusiness('phonePlaceholder')} type="tel" value={formData.phoneNumber} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuUser size={14} />
                            <Text type="secondary">{tBusiness('contactPerson')}</Text>
                        </Flex>
                        <Input
                            aria-label={tBusiness('contactPersonName')}
                            autoCapitalize="words"
                            autoComplete="name"
                            inputMode="text"
                            name="contactPersonName"
                            onChange={(value) => setFormData((previous) => ({ ...previous, contactPersonName: value }))}
                            placeholder={tBusiness('fullName')}
                            value={formData.contactPersonName}
                        />
                        <Input
                            aria-label={tBusiness('contactPersonEmail')}
                            autoComplete="email"
                            inputMode="email"
                            name="contactPersonEmail"
                            onChange={(value) => setFormData((previous) => ({ ...previous, contactPersonEmail: value }))}
                            placeholder={tBusiness('emailPlaceholder')}
                            type="email"
                            value={formData.contactPersonEmail}
                        />
                        <Input
                            aria-label={tBusiness('contactPersonNumber')}
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

export default function MobileBasicSettingsScreen(props: MobileBasicSettingsScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}`;

    return <MobileBasicSettingsScreenContent key={scopeKey} {...props} />;
}
