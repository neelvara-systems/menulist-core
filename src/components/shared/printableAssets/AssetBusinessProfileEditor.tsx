'use client';

import PhoneNumberInput from '@atoms/phoneNumberInput';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { assertTenantUpdateSucceeded, updateTenant } from '@database/tenants';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, toPreparedUploadName, type MediaImageCropIntent, type PreparedMediaImage } from '@lib/media/prepareMediaImage';
import { getPrimaryLocalizedLanguage, updateLocalizedText } from '@lib/localization/text';
import { DEFAULT_PHONE_COUNTRY_CODE, getDialCodeForCountry, normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import {
    buildAssetBusinessProfileDraft,
    getAssetBusinessProfileFieldIds,
    getAssetBusinessProfileReadiness,
    type AssetBusinessProfileDraft,
} from '@lib/printable-asset-templates/businessProfile';
import type { PrintableAssetTypeId } from '@lib/printable-asset-templates/types';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { isValidOptionalContactEmail, normalizeOptionalContactEmail } from '@lib/validation/optionalContactEmail';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import { App as AntApp, Button, Flex, Input, Progress, Tag, Typography, theme } from 'antd';
import { type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuBuilding2, LuMail, LuMapPin, LuSparkles, LuUser } from 'react-icons/lu';

const { Text, Title } = Typography;

type PreparedLogoDraft = {
    crop?: MediaImageCropIntent;
    name: string;
    preparedMedia?: PreparedMediaImage;
    sourceDataUrl?: string;
    sourceName?: string;
    type: string;
    url: string;
};

type AssetBusinessProfileEditorProps = {
    assetTitle?: string;
    assetTypeId?: PrintableAssetTypeId | null;
    compact?: boolean;
    onCancel: () => void;
    onSaved: (nextStoreDetails: Record<string, unknown>) => void | Promise<void>;
    onStateChange?: (state: { busy: boolean; dirty: boolean }) => void;
};

function readText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function sameDraft(first: AssetBusinessProfileDraft, second: AssetBusinessProfileDraft): boolean {
    return JSON.stringify(first) === JSON.stringify(second);
}

export default function AssetBusinessProfileEditor({
    assetTitle,
    assetTypeId,
    compact,
    onCancel,
    onSaved,
    onStateChange,
}: AssetBusinessProfileEditorProps) {
    const { message } = AntApp.useApp();
    const { token } = theme.useToken();
    const {
        setStoreDetails,
        setTenantDetails,
        storeDetails,
        tenantDetails,
    } = useContext(PlatformGlobalDataContext);
    const initialDraft = useMemo(
        () => buildAssetBusinessProfileDraft(storeDetails, tenantDetails),
        [storeDetails, tenantDetails],
    );
    const [draft, setDraft] = useState(initialDraft);
    const [baseline, setBaseline] = useState(initialDraft);
    const [countryCode, setCountryCode] = useState(storeDetails?.countryCode || DEFAULT_PHONE_COUNTRY_CODE);
    const [dialCode, setDialCode] = useState(
        storeDetails?.dialCode || getDialCodeForCountry(storeDetails?.countryCode || DEFAULT_PHONE_COUNTRY_CODE),
    );
    const [baselinePhonePolicy, setBaselinePhonePolicy] = useState({ countryCode, dialCode });
    const [logoDraft, setLogoDraft] = useState<PreparedLogoDraft | null>(null);
    const [isLogoAdjustOpen, setIsLogoAdjustOpen] = useState(false);
    const [isPreparingLogo, setIsPreparingLogo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const saveInFlightRef = useRef(false);
    const componentActiveRef = useRef(true);
    const fieldIds = useMemo(() => new Set(getAssetBusinessProfileFieldIds(assetTypeId)), [assetTypeId]);
    const showContactFields = fieldIds.has('contactName')
        || fieldIds.has('email')
        || fieldIds.has('phone')
        || fieldIds.has('address');
    const readiness = useMemo(
        () => getAssetBusinessProfileReadiness({
            ...(storeDetails || {}),
            addressLine: draft.addressLine,
            city: draft.city,
            contactPersonName: draft.contactName,
            country: draft.country,
            email: draft.email,
            logo: logoDraft?.url || storeDetails?.logo,
            name: draft.locationName,
            phoneNumber: draft.phoneNumber,
            state: draft.state,
            tagline: draft.tagline,
            tenantName: draft.brandName,
        }, { ...(tenantDetails || {}), name: draft.brandName }, assetTypeId),
        [assetTypeId, draft, logoDraft?.url, storeDetails, tenantDetails],
    );
    const phonePolicyDirty = countryCode !== baselinePhonePolicy.countryCode || dialCode !== baselinePhonePolicy.dialCode;
    const dirty = !sameDraft(draft, baseline) || phonePolicyDirty || Boolean(logoDraft?.sourceDataUrl);
    const busy = isSaving || isPreparingLogo;

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    useEffect(() => {
        onStateChange?.({ busy, dirty });
    }, [busy, dirty, onStateChange]);

    const setField = <Key extends keyof AssetBusinessProfileDraft>(key: Key, value: AssetBusinessProfileDraft[Key]) => {
        setDraft((current) => ({ ...current, [key]: value }));
    };

    const handleLogoSelect = useCallback(async (file: File) => {
        setIsPreparingLogo(true);
        try {
            const prepared = await prepareMediaImage(file, 'businessLogo');
            if (!componentActiveRef.current) return;
            setLogoDraft({
                crop: prepared.crop,
                name: toPreparedUploadName(file.name, prepared.mimeType, file.name),
                preparedMedia: prepared,
                sourceDataUrl: prepared.sourceDataUrl,
                sourceName: prepared.sourceName,
                type: prepared.mimeType,
                url: prepared.dataUrl,
            });
        } catch (error) {
            logRuntimeFailure('asset_business_profile_logo_prepare_failed', error, {
                ...getBoundedRuntimeStringContext('fileName', file.name),
                storeId: String(storeDetails?.storeId || '').slice(0, 120),
                tenantId: String(storeDetails?.tenantId || '').slice(0, 120),
            });
            if (componentActiveRef.current) message.error('Could not prepare the logo. Please choose another image.');
        } finally {
            if (componentActiveRef.current) setIsPreparingLogo(false);
        }
    }, [message, storeDetails?.storeId, storeDetails?.tenantId]);

    const resetDraft = () => {
        setDraft(baseline);
        setCountryCode(baselinePhonePolicy.countryCode);
        setDialCode(baselinePhonePolicy.dialCode);
        setLogoDraft(null);
    };

    const handleSave = useCallback(async () => {
        if (saveInFlightRef.current || !storeDetails?.storeId || !storeDetails?.tenantId) return;
        const brandName = draft.brandName.trim();
        const locationName = draft.locationName.trim();
        if (!brandName || !locationName) {
            message.warning('Add both the brand name and location name.');
            return;
        }
        const normalizedEmail = showContactFields ? normalizeOptionalContactEmail(draft.email) : '';
        if (showContactFields && !isValidOptionalContactEmail(normalizedEmail)) {
            message.warning('Enter a valid business email address.');
            return;
        }
        const normalizedPhone = showContactFields
            ? normalizePhoneNumberForStorage({
                countryCode,
                dialCode,
                phoneNumber: draft.phoneNumber,
            })
            : null;
        const taglineLanguage = getAssetTaglineLanguage(storeDetails);
        const nextTagline = updateLocalizedText(
            storeDetails.tagline,
            draft.tagline,
            taglineLanguage,
            'en',
        );
        const expectedStoreId = storeDetails.storeId;
        const expectedTenantId = storeDetails.tenantId;
        const tenantNameChanged = brandName !== readText(tenantDetails?.name || storeDetails.tenantName);
        const updates: Record<string, unknown> = {
            name: locationName,
            storeId: expectedStoreId,
            tagline: nextTagline ?? null,
            tenantId: expectedTenantId,
            tenantName: brandName,
        };
        if (showContactFields && normalizedPhone) {
            Object.assign(updates, {
                addressLine: draft.addressLine.trim(),
                city: draft.city.trim(),
                contactPersonName: draft.contactName.trim(),
                country: draft.country.trim(),
                countryCode: normalizedPhone.phone ? normalizedPhone.countryCode : countryCode,
                dialCode: normalizedPhone.phone ? normalizedPhone.dialCode : dialCode,
                email: normalizedEmail,
                phone: normalizedPhone.phone,
                phoneNumber: normalizedPhone.phoneNumber,
                state: draft.state.trim(),
            });
        }
        if (logoDraft?.sourceDataUrl && logoDraft.preparedMedia) {
            updates.imageToUpdate = logoDraft.url;
            updates.imageType = logoDraft.type || 'image/png';
            updates.preparedMedia = logoDraft.preparedMedia;
        }

        saveInFlightRef.current = true;
        setIsSaving(true);
        try {
            const savedStore = await updateStore(updates as any);
            assertStoreUpdateSucceeded(savedStore, expectedStoreId, 'asset_business_profile_store_update_rejected');

            let tenantNameSynced = true;
            if (tenantNameChanged) {
                try {
                    const savedTenant = await updateTenant({ name: brandName, tenantId: expectedTenantId });
                    assertTenantUpdateSucceeded(savedTenant, expectedTenantId, 'asset_business_profile_tenant_update_rejected');
                } catch (error) {
                    tenantNameSynced = false;
                    logRuntimeFailure('asset_business_profile_tenant_name_sync_failed', error, {
                        ...getBoundedRuntimeStringContext('brandName', brandName),
                        storeId: String(expectedStoreId),
                        tenantId: String(expectedTenantId),
                    });
                }
            }

            const savedLogo = Object.prototype.hasOwnProperty.call(savedStore || {}, 'logo')
                ? readText(savedStore.logo)
                : readText(storeDetails.logo);
            const nextStoreValues = {
                logo: savedLogo,
                name: locationName,
                tagline: nextTagline ?? null,
                tenantName: brandName,
                ...(showContactFields && normalizedPhone ? {
                    addressLine: draft.addressLine.trim(),
                    city: draft.city.trim(),
                    contactPersonName: draft.contactName.trim(),
                    country: draft.country.trim(),
                    countryCode: normalizedPhone.phone ? normalizedPhone.countryCode : countryCode,
                    dialCode: normalizedPhone.phone ? normalizedPhone.dialCode : dialCode,
                    email: normalizedEmail,
                    phone: normalizedPhone.phone,
                    phoneNumber: normalizedPhone.phoneNumber,
                    state: draft.state.trim(),
                } : {}),
            };
            setStoreDetails((current: any) => (
                current?.storeId === expectedStoreId && current?.tenantId === expectedTenantId
                    ? { ...current, ...nextStoreValues }
                    : current
            ));
            if (tenantNameSynced) {
                setTenantDetails((current: any) => (
                    String(current?.tenantId ?? current?.id ?? '') === String(expectedTenantId)
                        ? { ...current, name: brandName }
                        : current
                ));
            }

            const nextDraft = {
                ...draft,
                brandName,
                locationName,
                ...(showContactFields && normalizedPhone ? {
                    email: normalizedEmail,
                    phoneNumber: normalizedPhone.phoneNumber,
                } : {}),
            };
            if (componentActiveRef.current) {
                setDraft(nextDraft);
                setBaseline(nextDraft);
                if (showContactFields && normalizedPhone) {
                    const nextCountryCode = normalizedPhone.phone ? normalizedPhone.countryCode : countryCode;
                    const nextDialCode = normalizedPhone.phone ? normalizedPhone.dialCode : dialCode;
                    setCountryCode(nextCountryCode);
                    setDialCode(nextDialCode);
                    setBaselinePhonePolicy({
                        countryCode: nextCountryCode,
                        dialCode: nextDialCode,
                    });
                }
                setLogoDraft(null);
                if (tenantNameSynced) {
                    message.success('Business details saved. Your asset preview now uses them.');
                } else {
                    message.warning('Location details saved, but the shared brand name still needs to be retried.');
                }
                await onSaved({ ...storeDetails, ...nextStoreValues });
            }
        } catch (error) {
            logRuntimeFailure('asset_business_profile_save_failed', error, {
                ...getBoundedRuntimeStringContext('assetTypeId', assetTypeId || 'dashboard'),
                storeId: String(expectedStoreId),
                tenantId: String(expectedTenantId),
            });
            if (componentActiveRef.current) message.error('Business details could not be saved. Please try again.');
        } finally {
            saveInFlightRef.current = false;
            if (componentActiveRef.current) setIsSaving(false);
        }
    }, [assetTypeId, countryCode, dialCode, draft, logoDraft, message, onSaved, setStoreDetails, setTenantDetails, showContactFields, storeDetails, tenantDetails?.name]);

    if (!storeDetails) return null;

    const gridColumns = compact ? '1fr' : 'repeat(2, minmax(0, 1fr))';
    const fieldStyle = { minHeight: compact ? 44 : undefined };

    return (
        <Flex gap={compact ? 14 : 18} vertical>
            <div
                style={{
                    background: token.colorPrimaryBg,
                    border: `1px solid ${token.colorPrimaryBorder}`,
                    borderRadius: 16,
                    padding: compact ? 12 : 16,
                }}
            >
                <Flex align="center" gap={12} justify="space-between">
                    <Flex gap={3} style={{ minWidth: 0 }} vertical>
                        <Title level={5} style={{ margin: 0 }}>
                            {assetTitle ? `Improve ${assetTitle}` : 'Complete your asset profile'}
                        </Title>
                        <Text type="secondary">
                            Saved details are reused across Assets, your public menu, and future designs.
                        </Text>
                    </Flex>
                    <Tag color={readiness.percent === 100 ? 'success' : 'processing'} style={{ flexShrink: 0, margin: 0 }}>
                        {readiness.completedCount}/{readiness.totalCount} ready
                    </Tag>
                </Flex>
                <Progress percent={readiness.percent} showInfo={false} size="small" style={{ marginTop: 10 }} />
                {readiness.missingFields.length ? (
                    <Text style={{ display: 'block', fontSize: 12, marginTop: 6 }} type="secondary">
                        Add next: {readiness.missingFields.map((field) => field.label).join(', ')}
                    </Text>
                ) : (
                    <Text style={{ display: 'block', fontSize: 12, marginTop: 6 }} type="secondary">
                        This profile has every recommended detail for {assetTitle || 'your assets'}.
                    </Text>
                )}
            </div>

            <section aria-labelledby="asset-profile-brand-heading">
                <Flex gap={4} style={{ marginBottom: 10 }} vertical>
                    <Text id="asset-profile-brand-heading" strong>Brand identity</Text>
                    <Text type="secondary">Brand name applies across locations. Location details update only this business location.</Text>
                </Flex>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: gridColumns }}>
                    <Field label="Brand name" required>
                        <Input
                            aria-label="Brand name"
                            disabled={busy}
                            maxLength={120}
                            onChange={(event) => setField('brandName', event.target.value)}
                            placeholder="Your brand or chain name"
                            prefix={<LuBuilding2 aria-hidden />}
                            required
                            style={fieldStyle}
                            value={draft.brandName}
                        />
                    </Field>
                    <Field label="Location name" required>
                        <Input
                            aria-label="Location name"
                            disabled={busy}
                            maxLength={120}
                            onChange={(event) => setField('locationName', event.target.value)}
                            placeholder="Main Store or branch name"
                            prefix={<LuMapPin aria-hidden />}
                            required
                            style={fieldStyle}
                            value={draft.locationName}
                        />
                    </Field>
                    <Field label="Tagline" wide>
                        <Input
                            aria-label="Business tagline"
                            disabled={busy}
                            maxLength={120}
                            onChange={(event) => setField('tagline', event.target.value)}
                            placeholder="A short line that describes your business"
                            prefix={<LuSparkles aria-hidden />}
                            showCount
                            style={fieldStyle}
                            value={draft.tagline}
                        />
                    </Field>
                </div>
            </section>

            <section aria-labelledby="asset-profile-logo-heading">
                <Flex gap={4} style={{ marginBottom: 10 }} vertical>
                    <Text id="asset-profile-logo-heading" strong>Business logo</Text>
                    <Text type="secondary">A square PNG or JPG with clear spacing works best across print sizes.</Text>
                </Flex>
                <MediaImageCard
                    accept={getMediaProfileAcceptAttribute('businessLogo')}
                    alt={`${draft.brandName || draft.locationName || 'Business'} logo`}
                    aspectRatio="1 / 1"
                    canAdjust={Boolean(logoDraft?.sourceDataUrl)}
                    disabled={isSaving}
                    imageFit="contain"
                    imageType="businessLogo"
                    imageUrl={logoDraft?.url || storeDetails.logo}
                    isBusy={isPreparingLogo}
                    onAdjust={() => setIsLogoAdjustOpen(true)}
                    onReset={logoDraft ? () => setLogoDraft(null) : undefined}
                    onSelectFile={handleLogoSelect}
                    placeholderDescription="Drop, paste, or choose your square logo."
                    placeholderTitle="Upload business logo"
                    showDropHint={!compact}
                    size="compact"
                    style={{ maxWidth: compact ? '100%' : 320 }}
                />
            </section>

            {showContactFields ? (
                <section aria-labelledby="asset-profile-contact-heading">
                    <Flex gap={4} style={{ marginBottom: 10 }} vertical>
                        <Text id="asset-profile-contact-heading" strong>Public contact details</Text>
                        <Text type="secondary">Use information customers can safely see on printed assets.</Text>
                    </Flex>
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: gridColumns }}>
                        <Field label="Contact name">
                            <Input
                                aria-label="Contact name"
                                disabled={busy}
                                maxLength={120}
                                onChange={(event) => setField('contactName', event.target.value)}
                                placeholder="Owner or public contact"
                                prefix={<LuUser aria-hidden />}
                                style={fieldStyle}
                                value={draft.contactName}
                            />
                        </Field>
                        <Field label="Business email">
                            <Input
                                aria-label="Business email"
                                autoComplete="email"
                                disabled={busy}
                                maxLength={254}
                                onChange={(event) => setField('email', event.target.value)}
                                placeholder="hello@example.com"
                                prefix={<LuMail aria-hidden />}
                                style={fieldStyle}
                                type="email"
                                value={draft.email}
                            />
                        </Field>
                        <Field label="Business phone" wide>
                            <PhoneNumberInput
                                countryCode={countryCode}
                                countryCodeAriaLabel="Business phone country code"
                                dialCode={dialCode}
                                disabled={busy}
                                onChange={(value) => {
                                    setCountryCode(value.countryCode);
                                    setDialCode(value.dialCode);
                                    setField('phoneNumber', value.phoneNumber);
                                }}
                                phoneNumber={draft.phoneNumber}
                                phoneNumberAriaLabel="Business phone number"
                            />
                        </Field>
                        <Field label="Street address" wide>
                            <Input.TextArea
                                aria-label="Business street address"
                                autoSize={{ minRows: 2, maxRows: 4 }}
                                disabled={busy}
                                maxLength={300}
                                onChange={(event) => setField('addressLine', event.target.value)}
                                placeholder="Customer-facing street address"
                                value={draft.addressLine}
                            />
                        </Field>
                        <Field label="City">
                            <Input aria-label="Business city" disabled={busy} maxLength={120} onChange={(event) => setField('city', event.target.value)} style={fieldStyle} value={draft.city} />
                        </Field>
                        <Field label="State">
                            <Input aria-label="Business state" disabled={busy} maxLength={120} onChange={(event) => setField('state', event.target.value)} style={fieldStyle} value={draft.state} />
                        </Field>
                        <Field label="Country" wide>
                            <Input aria-label="Business country" disabled={busy} maxLength={120} onChange={(event) => setField('country', event.target.value)} style={fieldStyle} value={draft.country} />
                        </Field>
                    </div>
                </section>
            ) : null}

            <Flex gap={8} justify="flex-end" wrap="wrap">
                <Button disabled={busy} onClick={dirty ? resetDraft : onCancel} size="large">
                    {dirty ? 'Reset changes' : 'Cancel'}
                </Button>
                <Button
                    disabled={!dirty || busy}
                    loading={isSaving}
                    onClick={() => void handleSave()}
                    size="large"
                    type="primary"
                >
                    Save and update assets
                </Button>
            </Flex>

            <MediaImageAdjustModal
                fileName={logoDraft?.sourceName || logoDraft?.name}
                imageType="businessLogo"
                initialCrop={logoDraft?.crop}
                onApply={(prepared) => {
                    setLogoDraft((current) => ({
                        crop: prepared.crop,
                        name: prepared.sourceName || current?.name || 'business-logo',
                        preparedMedia: prepared,
                        sourceDataUrl: prepared.sourceDataUrl || current?.sourceDataUrl,
                        sourceName: prepared.sourceName || current?.sourceName,
                        type: prepared.mimeType,
                        url: prepared.dataUrl,
                    }));
                }}
                onClose={() => setIsLogoAdjustOpen(false)}
                open={isLogoAdjustOpen}
                sourceDataUrl={logoDraft?.sourceDataUrl}
            />
        </Flex>
    );
}

function Field({
    children,
    label,
    required,
    wide,
}: {
    children: ReactNode;
    label: string;
    required?: boolean;
    wide?: boolean;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: wide ? '1 / -1' : undefined }}>
            <Text strong style={{ fontSize: 13 }}>
                {label}{required ? <span aria-hidden style={{ color: '#d4380d' }}> *</span> : null}
            </Text>
            {children}
        </div>
    );
}

function getAssetTaglineLanguage(storeDetails: { defaultLanguage?: string; language?: string; tagline?: unknown }): string {
    return getPrimaryLocalizedLanguage(
        storeDetails.tagline,
        storeDetails.defaultLanguage || storeDetails.language || 'en',
    );
}
