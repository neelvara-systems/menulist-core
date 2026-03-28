'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Input, List, NavBar, Popup, Switch, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuMessageSquare, LuShare2, LuUser } from 'react-icons/lu';

interface MobileAdvancedSettingsScreenProps {
    onBack: () => void;
}

/**
 * Mobile Advanced Settings — Apple Settings-style grouped metadata screen
 * 
 * Covers 3 desktop business settings tabs that had no mobile equivalent:
 * 1. Contact Person (name, email, phone)
 * 2. Social Media (Facebook, Instagram, WhatsApp, etc.)
 * 3. Feedback Settings (enable/disable, collect fields, Google Review URL)
 * 
 * All data saved via updateStore() — same DAL as desktop.
 * Time Slot Presets excluded (complex add/edit/delete with color picker — desktop-only setup).
 */
export default function MobileAdvancedSettingsScreen({ onBack }: MobileAdvancedSettingsScreenProps) {
    const t = useTranslations('MobileAdvancedSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);

    // Contact Person
    const [contactName, setContactName] = useState(storeDetails?.contactPersonName || '');
    const [contactEmail, setContactEmail] = useState(storeDetails?.contactPersonEmail || '');
    const [contactPhone, setContactPhone] = useState(storeDetails?.contactPersonNumber || '');

    // Social Media
    const [socialMedia, setSocialMedia] = useState<Record<string, string>>(storeDetails?.socialMedia || {});

    // Feedback Settings
    const [feedbackEnabled, setFeedbackEnabled] = useState(storeDetails?.feedbackEnabled !== false);
    const [collectName, setCollectName] = useState(storeDetails?.feedbackDefaults?.collectName ?? false);
    const [collectPhone, setCollectPhone] = useState(storeDetails?.feedbackDefaults?.collectPhone ?? true);
    const [collectEmail, setCollectEmail] = useState(storeDetails?.feedbackDefaults?.collectEmail ?? true);
    const [reviewUrl, setReviewUrl] = useState(storeDetails?.reviewUrl || '');

    // Social media edit sheet
    const [showSocialEdit, setShowSocialEdit] = useState(false);

    const SOCIAL_PLATFORMS = [
        { key: 'facebook', label: 'Facebook', placeholder: 'Facebook profile URL' },
        { key: 'instagram', label: 'Instagram', placeholder: 'Instagram profile URL' },
        { key: 'twitter', label: 'X (Twitter)', placeholder: 'Twitter profile URL' },
        { key: 'whatsapp', label: 'WhatsApp', placeholder: 'WhatsApp number with country code' },
        { key: 'youtube', label: 'YouTube', placeholder: 'YouTube channel URL' },
        { key: 'linkedin', label: 'LinkedIn', placeholder: 'LinkedIn profile URL' },
    ];

    const saveField = async (updates: Record<string, any>) => {
        setIsSaving(true);
        try {
            await updateStore({ storeId: storeDetails?.storeId, ...updates });
            setStoreDetails({ ...storeDetails, ...updates });
            Toast.show({ content: t('saved'), duration: 1000 });
        } catch {
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveContactPerson = () => {
        saveField({
            contactPersonName: contactName.trim(),
            contactPersonEmail: contactEmail.trim(),
            contactPersonNumber: contactPhone.trim(),
        });
    };

    const handleSaveSocialMedia = () => {
        const cleaned: Record<string, string> = {};
        Object.entries(socialMedia).forEach(([k, v]) => {
            if (v.trim()) cleaned[k] = v.trim();
        });
        saveField({ socialMedia: cleaned });
        setShowSocialEdit(false);
    };

    const handleToggleFeedback = (enabled: boolean) => {
        setFeedbackEnabled(enabled);
        saveField({ feedbackEnabled: enabled });
    };

    const handleToggleCollectField = (field: string, value: boolean) => {
        const updated = {
            collectName: field === 'collectName' ? value : collectName,
            collectPhone: field === 'collectPhone' ? value : collectPhone,
            collectEmail: field === 'collectEmail' ? value : collectEmail,
        };
        if (field === 'collectName') setCollectName(value);
        if (field === 'collectPhone') setCollectPhone(value);
        if (field === 'collectEmail') setCollectEmail(value);
        saveField({ feedbackDefaults: updated });
    };

    const handleSaveReviewUrl = () => {
        saveField({ reviewUrl: reviewUrl.trim() });
    };

    const filledSocialCount = Object.values(socialMedia).filter(v => v.trim()).length;

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto pb-8">
                {/* SECTION: Contact Person */}
                <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('contactPerson')}</p>
                </div>
                <div className="mx-4 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        <List.Item
                            prefix={<LuUser size={18} className="text-blue-500" />}
                            extra={
                                <Input
                                    value={contactName}
                                    onChange={setContactName}
                                    onBlur={handleSaveContactPerson}
                                    placeholder={t('fullName')}
                                    style={{ '--text-align': 'right', '--font-size': '15px' } as React.CSSProperties}
                                />
                            }
                        >
                            <span className="text-[15px]">{t('name')}</span>
                        </List.Item>
                        <List.Item
                            extra={
                                <Input
                                    value={contactEmail}
                                    onChange={setContactEmail}
                                    onBlur={handleSaveContactPerson}
                                    placeholder={t('email')}
                                    type="email"
                                    style={{ '--text-align': 'right', '--font-size': '15px' } as React.CSSProperties}
                                />
                            }
                        >
                            <span className="text-[15px]">{t('email')}</span>
                        </List.Item>
                        <List.Item
                            extra={
                                <Input
                                    value={contactPhone}
                                    onChange={setContactPhone}
                                    onBlur={handleSaveContactPerson}
                                    placeholder={t('phone')}
                                    type="tel"
                                    style={{ '--text-align': 'right', '--font-size': '15px' } as React.CSSProperties}
                                />
                            }
                        >
                            <span className="text-[15px]">{t('phone')}</span>
                        </List.Item>
                    </List>
                </div>

                {/* SECTION: Social Media */}
                <div className="px-4 pt-6 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('socialMedia')}</p>
                </div>
                <div className="mx-4 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        <List.Item
                            prefix={<LuShare2 size={18} className="text-purple-500" />}
                            onClick={() => setShowSocialEdit(true)}
                            arrow
                            description={filledSocialCount > 0 ? t('platformsLinked', { count: filledSocialCount }) : t('notSet')}
                        >
                            <span className="text-[15px]">{t('socialProfiles')}</span>
                        </List.Item>
                    </List>
                </div>

                {/* SECTION: Guest Feedback */}
                <div className="px-4 pt-6 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('guestFeedback')}</p>
                </div>
                <div className="mx-4 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        <List.Item
                            prefix={<LuMessageSquare size={18} className="text-green-500" />}
                            extra={
                                <Switch
                                    checked={feedbackEnabled}
                                    onChange={handleToggleFeedback}
                                    style={{ '--height': '22px', '--width': '38px' } as React.CSSProperties}
                                />
                            }
                        >
                            <span className="text-[15px]">{t('enableFeedback')}</span>
                        </List.Item>
                    </List>
                </div>

                {feedbackEnabled && (
                    <>
                        <div className="px-4 pt-4 pb-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('feedbackFormFields')}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t('feedbackFormFieldsDesc')}</p>
                        </div>
                        <div className="mx-4 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                <List.Item
                                    extra={
                                        <Switch
                                            checked={collectName}
                                            onChange={(v) => handleToggleCollectField('collectName', v)}
                                            style={{ '--height': '22px', '--width': '38px' } as React.CSSProperties}
                                        />
                                    }
                                >
                                    <span className="text-[15px]">{t('askForName')}</span>
                                </List.Item>
                                <List.Item
                                    extra={
                                        <Switch
                                            checked={collectPhone}
                                            onChange={(v) => handleToggleCollectField('collectPhone', v)}
                                            style={{ '--height': '22px', '--width': '38px' } as React.CSSProperties}
                                        />
                                    }
                                    description={t('forWhatsAppFollowUp')}
                                >
                                    <span className="text-[15px]">{t('askForPhone')}</span>
                                </List.Item>
                                <List.Item
                                    extra={
                                        <Switch
                                            checked={collectEmail}
                                            onChange={(v) => handleToggleCollectField('collectEmail', v)}
                                            style={{ '--height': '22px', '--width': '38px' } as React.CSSProperties}
                                        />
                                    }
                                >
                                    <span className="text-[15px]">{t('askForEmail')}</span>
                                </List.Item>
                            </List>
                        </div>

                        <div className="px-4 pt-4 pb-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('googleReview')}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t('googleReviewDesc')}</p>
                        </div>
                        <div className="mx-4 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                            <List>
                                <List.Item>
                                    <Input
                                        value={reviewUrl}
                                        onChange={setReviewUrl}
                                        onBlur={handleSaveReviewUrl}
                                        placeholder="https://g.page/r/your-id/review"
                                        style={{ '--font-size': '14px' } as React.CSSProperties}
                                    />
                                </List.Item>
                            </List>
                        </div>
                    </>
                )}

                <p className="text-xs text-center text-gray-400 px-4 pt-6">
                    {t('desktopOnlyNote')}
                </p>
            </div>

            {/* Social Media Edit Sheet */}
            <Popup
                visible={showSocialEdit}
                onMaskClick={() => setShowSocialEdit(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '80vh' }}
                destroyOnClose
            >
                <div className="px-4 pt-4 pb-6 space-y-4">
                    <div className="flex justify-center"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
                    <h2 className="text-lg font-semibold">{t('socialMedia')}</h2>
                    <div className="space-y-3">
                        {SOCIAL_PLATFORMS.map((p) => (
                            <div key={p.key} className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">{p.label}</label>
                                <Input
                                    value={socialMedia[p.key] || ''}
                                    onChange={(v) => setSocialMedia({ ...socialMedia, [p.key]: v })}
                                    placeholder={p.placeholder}
                                    style={{ '--font-size': '15px' } as React.CSSProperties}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button block fill="outline" size="large" onClick={() => setShowSocialEdit(false)} style={{ minHeight: '44px' }}>{t('cancel')}</Button>
                        <Button block color="primary" fill="solid" size="large" onClick={handleSaveSocialMedia} loading={isSaving} style={{ minHeight: '44px' }}>{t('save')}</Button>
                    </div>
                </div>
            </Popup>
        </div>
    );
}
