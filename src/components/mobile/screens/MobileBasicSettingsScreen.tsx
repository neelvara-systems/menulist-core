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
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} className="border-b border-gray-200 dark:border-gray-700">
                {t('basicSettings')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
                {/* Logo */}
                <Card className="rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                        <LuImage size={20} className="text-gray-500" />
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t('businessLogo')}
                        </label>
                        {storeDetails.logo ? (
                            <img
                                src={storeDetails.logo}
                                alt={storeDetails.name}
                                className="w-20 h-20 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <LuBuilding2 size={32} className="text-gray-400" />
                            </div>
                        )}
                        <p className="text-xs text-gray-400">{t('changeLogoOnDesktop')}</p>
                    </div>
                </Card>

                {/* Business Name */}
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <LuBriefcase size={12} />
                            {t('businessType')}
                        </label>
                        <div
                            className="py-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-[15px] text-gray-900 dark:text-gray-100 min-h-[44px] flex items-center"
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
                <Card className="rounded-xl">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('storeId')}</span>
                        <span className="text-sm text-gray-400">{storeDetails.storeId}</span>
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
                    style={{ minHeight: '44px' }}
                >
                    {t('saveChanges')}
                </Button>
            </div>
        </div>
    );
}
