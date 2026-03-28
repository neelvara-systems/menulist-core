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
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} className="border-b border-gray-200 dark:border-gray-700">
                {t('publicInfo')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
                {/* Business Name (read-only on mobile) */}
                <Card className="rounded-xl">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <LuBuilding2 size={12} />
                            {t('businessName')}
                        </label>
                        <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">
                            {storeDetails.name}
                        </p>
                        <p className="text-xs text-gray-400">{t('changeOnDesktop')}</p>
                    </div>
                </Card>

                {/* Phone */}
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                    style={{ minHeight: '44px' }}
                >
                    {t('saveChanges')}
                </Button>
            </div>
        </div>
    );
}
