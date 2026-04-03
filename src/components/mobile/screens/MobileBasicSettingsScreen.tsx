'use client'

import { BUSINESS_TYPES } from '@constant/common';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, DotLoading, Input, NavBar, Picker, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuBriefcase, LuBuilding2, LuImage } from 'react-icons/lu';

interface MobileBasicSettingsScreenProps {
    onBack: () => void;
}

const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map(bt => ({
    label: bt.label,
    value: bt.value,
}));

export default function MobileBasicSettingsScreen({ onBack }: MobileBasicSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: storeDetails?.name || '',
        businessType: storeDetails?.businessType || '',
    });

    const [showTypePicker, setShowTypePicker] = useState(false);

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        if (!formData.name.trim()) {
            Toast.show({ content: t('businessNameRequired'), duration: 1500 });
            return;
        }
        setIsSaving(true);

        // Optimistic update
        setStoreDetails((prev: any) => ({ ...prev, ...formData }));
        Toast.show({ content: t('saved'), duration: 1000 });

        try {
            await updateStore({ ...storeDetails, ...formData } as any);
        } catch {
            setStoreDetails((prev: any) => ({
                ...prev,
                name: storeDetails.name,
                businessType: storeDetails.businessType,
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
                {t('basicSettings')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {/* Logo */}
                <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <LuImage size={20} color="var(--adm-color-weak, #999)" />
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)' }}>
                            {t('businessLogo')}
                        </label>
                        {storeDetails.logo ? (
                            <img
                                src={storeDetails.logo}
                                alt={storeDetails.name}
                                style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: 'var(--adm-color-fill-content, #f5f5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LuBuilding2 size={32} color="var(--adm-color-weak, #999)" />
                            </div>
                        )}
                        <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>{t('changeLogoOnDesktop')}</p>
                    </div>
                </Card>

                {/* Business Name */}
                <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LuBuilding2 size={12} />
                            {t('businessName')}
                        </label>
                        <Input
                            value={formData.name}
                            onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                            placeholder={t('yourBusinessName')}
                            style={{ '--font-size': '15px' } as React.CSSProperties}
                        />
                    </div>
                </Card>

                {/* Business Type */}
                <Card style={{ borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LuBriefcase size={12} />
                            {t('businessType')}
                        </label>
                        <div
                            style={{ padding: '10px 12px', border: '1px solid var(--adm-color-border, #eee)', borderRadius: '8px', fontSize: '15px', color: 'var(--adm-color-text, #333)', minHeight: '44px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--adm-color-background, #fff)' }}
                            onClick={() => setShowTypePicker(true)}
                        >
                            {formData.businessType || t('selectBusinessType')}
                        </div>
                        <Picker
                            columns={[BUSINESS_TYPE_OPTIONS]}
                            visible={showTypePicker}
                            onClose={() => setShowTypePicker(false)}
                            onConfirm={(val) => {
                                if (val[0]) setFormData(prev => ({ ...prev, businessType: val[0] as string }));
                            }}
                            value={[formData.businessType]}
                        />
                    </div>
                </Card>

                {/* Store ID (read-only info) */}
                <Card style={{ borderRadius: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)' }}>{t('storeId')}</span>
                        <span style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)' }}>{storeDetails.storeId}</span>
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
