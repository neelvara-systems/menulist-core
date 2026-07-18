'use client'

import IconPicker from '@atoms/IconPicker';
import { FEATURE_FLAGS } from '@config/features';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { normalizeCategoryIconValue } from '@lib/categoryIcons';
import { getBusinessAttributeGroupsForType, normalizeBusinessAttributes, normalizeCustomBusinessAttributes } from '@lib/obp/businessAttributes';
import { getStoreDeepDifference } from '@lib/store/storeNestedUpdateProjection';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, Switch, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileBusinessAttributesScreenProps {
    onBack: () => void;
}

export default function MobileBusinessAttributesScreen({ onBack }: MobileBusinessAttributesScreenProps) {
    const t = useTranslations('BusinessSettings');
    const tMobile = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [attributes, setAttributes] = useState<Record<string, boolean>>(() => normalizeBusinessAttributes(storeDetails?.businessAttributes));
    const [customAttributes, setCustomAttributes] = useState(() => normalizeCustomBusinessAttributes(storeDetails?.publicPresence?.customAttributes));
    const [originalAttributes, setOriginalAttributes] = useState<Record<string, boolean>>(() => normalizeBusinessAttributes(storeDetails?.businessAttributes));
    const [originalCustomAttributes, setOriginalCustomAttributes] = useState(() => normalizeCustomBusinessAttributes(storeDetails?.publicPresence?.customAttributes));
    const attributeGroups = useMemo(
        () => getBusinessAttributeGroupsForType(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessCategory, storeDetails?.businessType],
    );
    const isDirty =
        JSON.stringify(attributes) !== JSON.stringify(originalAttributes)
        || JSON.stringify(customAttributes) !== JSON.stringify(originalCustomAttributes);

    const saveAttributes = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);
        const normalizedCustomAttributes = normalizeCustomBusinessAttributes(customAttributes);
        const payload = {
            storeId: storeDetails.storeId,
            tenantId: storeDetails.tenantId,
            businessAttributes: getStoreDeepDifference(attributes, originalAttributes, {
                detectRemovedRootKeys: true,
            }),
            publicPresence: {
                customAttributes: normalizedCustomAttributes,
            },
        };

        setStoreDetails((previous: any) => ({
            ...previous,
            businessAttributes: attributes,
            publicPresence: {
                ...(previous?.publicPresence || {}),
                customAttributes: normalizedCustomAttributes,
            },
        }));

        try {
            const writeResult = await updateStore(payload as any);
            assertStoreUpdateSucceeded(
                writeResult,
                storeDetails.storeId,
                'mobile_business_attributes_store_update_rejected',
            );
            setOriginalAttributes(attributes);
            setCustomAttributes(normalizedCustomAttributes);
            setOriginalCustomAttributes(normalizedCustomAttributes);
            Toast.show({ content: tMobile('saved'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_business_attributes_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails.storeId, storeDetails.tenantId),
                ...getBoundedMobileOwnerStringContext('businessType', storeDetails.businessType),
                attributeCount: Object.keys(attributes).length,
                enabledAttributeCount: Object.values(attributes).filter(Boolean).length,
                customAttributeCount: normalizedCustomAttributes.length,
                hadPreviousCustomAttributes: originalCustomAttributes.length > 0,
            });
            setStoreDetails((previous: any) => ({
                ...previous,
                businessAttributes: originalAttributes,
                publicPresence: storeDetails.publicPresence,
            }));
            Toast.show({ content: tMobile('failedToSave'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    }, [attributes, customAttributes, originalAttributes, originalCustomAttributes.length, setStoreDetails, storeDetails, tMobile]);

    const resetAttributes = useCallback(() => {
        setAttributes(originalAttributes);
        setCustomAttributes(originalCustomAttributes);
    }, [originalAttributes, originalCustomAttributes]);

    if (!FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES) {
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
            <MobileSettingsScreenHeader
                description={t('businessAttributesDesc')}
                onBack={onBack}
                title={t('businessAttributes')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                {attributeGroups.map((group) => (
                    <Card key={group.group}>
                        <Flex gap={12} vertical>
                            <Text strong>{t(group.labelKey)}</Text>
                            {group.fields.map((field) => (
                                <Flex align="center" justify="space-between" key={field.key}>
                                    <Flex align="center" gap={8}>
                                        <Text type="secondary">{field.icon}</Text>
                                        <Text>{t(field.labelKey as any)}</Text>
                                    </Flex>
                                    <Switch
                                        checked={Boolean(attributes[field.key])}
                                        onChange={(value) => setAttributes((previous) => ({ ...previous, [field.key]: value }))}
                                    />
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                ))}

                <Card>
                    <Flex gap={12} vertical>
                        <Text strong>{t('customBusinessAttributes')}</Text>
                        <Text type="secondary">{t('customBusinessAttributesHelp')}</Text>
                        {customAttributes.map((attribute, index) => (
                            <Flex align="center" gap={8} key={attribute.id || index}>
                                <IconPicker
                                    allowClear
                                    buttonSize="large"
                                    buttonStyle={{ height: 48, minWidth: 48 }}
                                    iconSize={22}
                                    onChange={(value) => {
                                        const icon = normalizeCategoryIconValue(value) || undefined;
                                        setCustomAttributes((previous) => previous.map((entry, entryIndex) => (
                                            entryIndex === index ? { ...entry, icon } : entry
                                        )));
                                    }}
                                    value={attribute.icon || ''}
                                />
                                <Input
                                    maxLength={32}
                                    onChange={(value) => setCustomAttributes((previous) => previous.map((entry, entryIndex) => (
                                        entryIndex === index ? { ...entry, label: value } : entry
                                    )))}
                                    placeholder={t('customBusinessAttributePlaceholder')}
                                    value={attribute.label}
                                />
                                <Button color="danger" fill="none" onClick={() => setCustomAttributes((previous) => previous.filter((_, entryIndex) => entryIndex !== index))}>
                                    <LuTrash2 size={16} />
                                </Button>
                            </Flex>
                        ))}
                        {customAttributes.length < 6 ? (
                            <Button fill="outline" onClick={() => setCustomAttributes((previous) => [...previous, { id: `custom-${Date.now()}`, label: '', active: true }])}>
                                <Flex align="center" gap={6}>
                                    <LuPlus size={16} />
                                    <Text>{t('addCustomBusinessAttribute')}</Text>
                                </Flex>
                            </Button>
                        ) : null}
                    </Flex>
                </Card>

                <Flex gap={8}>
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={resetAttributes} size="large">
                        {tMobile('reset')}
                    </Button>
                    <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={() => void saveAttributes()} size="large">
                        {tMobile('saveChanges')}
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}
