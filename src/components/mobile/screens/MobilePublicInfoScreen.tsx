'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, DotLoading, Input, NavBar, TextArea, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuBuilding2, LuFileText, LuMapPin, LuPhone } from 'react-icons/lu';

interface MobilePublicInfoScreenProps {
    onBack: () => void;
}

export default function MobilePublicInfoScreen({ onBack }: MobilePublicInfoScreenProps) {
    const t = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        phoneNumber: storeDetails?.phoneNumber || '',
        addressLine: storeDetails?.addressLine || '',
        city: storeDetails?.city || '',
        description: storeDetails?.description || '',
    });

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        // Optimistic update (Law 8)
        setStoreDetails((prev: any) => ({ ...prev, ...formData }));
        Toast.show({ content: t('saved'), duration: 1000 });

        try {
            await updateStore({ ...storeDetails, ...formData } as any);
        } catch {
            // Revert on failure
            setStoreDetails((prev: any) => ({
                ...prev,
                phoneNumber: storeDetails.phoneNumber,
                addressLine: storeDetails.addressLine,
                city: storeDetails.city,
                description: storeDetails.description,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [storeDetails, formData, setStoreDetails]);

    if (!storeDetails) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--adm-color-background, #f5f5f5)' }}>
            <NavBar onBack={onBack} style={{ borderBottom: '1px solid var(--adm-color-border, #eee)' }}>
                {t('publicInfo')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {/* Business Name (read-only on mobile) */}
                <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LuBuilding2 size={12} />
                            {t('businessName')}
                        </label>
                        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--adm-color-text, #333)', margin: 0 }}>
                            {storeDetails.name}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>{t('changeOnDesktop')}</p>
                    </div>
                </Card>

                {/* Phone */}
                <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LuPhone size={12} />
                            {t('phoneNumber')}
                        </label>
                        <Input
                            value={formData.phoneNumber}
                            onChange={(val) => setFormData(prev => ({ ...prev, phoneNumber: val }))}
                            placeholder={t('enterPhoneNumber')}
                            type="tel"
                            style={{ '--font-size': '15px' } as React.CSSProperties}
                        />
                    </div>
                </Card>

                {/* Address */}
                <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LuMapPin size={12} />
                            {t('address')}
                        </label>
                        <Input
                            value={formData.addressLine}
                            onChange={(val) => setFormData(prev => ({ ...prev, addressLine: val }))}
                            placeholder={t('streetAddress')}
                            style={{ '--font-size': '15px' } as React.CSSProperties}
                        />
                        <Input
                            value={formData.city}
                            onChange={(val) => setFormData(prev => ({ ...prev, city: val }))}
                            placeholder={t('city')}
                            style={{ '--font-size': '15px' } as React.CSSProperties}
                        />
                    </div>
                </Card>

                {/* Description */}
                <Card style={{ borderRadius: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LuFileText size={12} />
                            {t('description')}
                        </label>
                        <TextArea
                            value={formData.description}
                            onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                            placeholder={t('describeYourBusiness')}
                            rows={3}
                            maxLength={300}
                            showCount
                        />
                    </div>
                </Card>

                {/* Save Button */}
                <Button
                    block
                    color="primary"
                    fill="solid"
                    size="large"
                    loading={isSaving}
                    onClick={handleSave}
                    style={{ minHeight: '44px', borderRadius: '8px' }}
                >
                    {t('saveChanges')}
                </Button>
            </div>
        </div>
    );
}
