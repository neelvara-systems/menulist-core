'use client'

import { FEATURE_FLAGS } from '@config/features';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { Button, Card, DotLoading, Flex, NavBar, Switch, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileBusinessAttributesScreenProps {
    onBack: () => void;
}

const ATTRIBUTE_GROUP_KEYS = [
    {
        labelKey: 'dietaryOptions',
        fields: ['vegetarian', 'vegan', 'halal', 'glutenFree'],
    },
    {
        labelKey: 'amenities',
        fields: ['wifi', 'outdoorSeating', 'parking', 'airConditioning', 'liveMusic', 'petFriendly'],
    },
    {
        labelKey: 'serviceModes',
        fields: ['dineIn', 'takeaway', 'delivery', 'driveThrough'],
    },
    {
        labelKey: 'paymentMethods',
        fields: ['acceptsCards', 'acceptsUPI', 'acceptsCash'],
    },
] as const;

export default function MobileBusinessAttributesScreen({ onBack }: MobileBusinessAttributesScreenProps) {
    const t = useTranslations('BusinessSettings');
    const tMobile = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [attributes, setAttributes] = useState<Record<string, boolean>>(storeDetails?.businessAttributes || {});
    const [originalAttributes, setOriginalAttributes] = useState<Record<string, boolean>>(storeDetails?.businessAttributes || {});
    const isDirty = JSON.stringify(attributes) !== JSON.stringify(originalAttributes);

    const saveAttributes = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);
        const payload = {
            storeId: storeDetails.storeId,
            businessAttributes: attributes,
        };

        setStoreDetails((previous: any) => ({ ...previous, businessAttributes: attributes }));

        try {
            await updateStore(payload as any);
            setOriginalAttributes(attributes);
            Toast.show({ content: tMobile('saved'), duration: 1000 });
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, businessAttributes: storeDetails.businessAttributes }));
            Toast.show({ content: tMobile('failedToSave'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    }, [attributes, setStoreDetails, storeDetails, tMobile]);

    const resetAttributes = useCallback(() => {
        setAttributes(originalAttributes);
    }, [originalAttributes]);

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
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('businessAttributesDesc')}
                    title={t('businessAttributes')}
                />

                {ATTRIBUTE_GROUP_KEYS.map((group) => (
                    <Card key={group.labelKey}>
                        <Flex gap={12} vertical>
                            <Text strong>{t(group.labelKey)}</Text>
                            {group.fields.map((field) => (
                                <Flex align="center" justify="space-between" key={field}>
                                    <Text>{t(`attr${field.charAt(0).toUpperCase()}${field.slice(1)}` as any)}</Text>
                                    <Switch
                                        checked={Boolean(attributes[field])}
                                        onChange={(value) => setAttributes((previous) => ({ ...previous, [field]: value }))}
                                    />
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                ))}

                <Flex gap={8}>
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={resetAttributes} size="large">
                        {tMobile('reset')}
                    </Button>
                    <Button block disabled={!isDirty} loading={isSaving} onClick={() => void saveAttributes()} size="large">
                        {tMobile('saveChanges')}
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}
