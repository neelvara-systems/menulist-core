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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--adm-color-background, #f5f5f5)' }}>
            <NavBar onBack={onBack} style={{ borderBottom: '1px solid var(--adm-color-border, #eee)' }}>
                {t('title')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
                {/* SECTION: Contact Person */}
                <div style={{ padding: '16px 16px 4px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--adm-color-weak, #999)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('contactPerson')}</p>
                </div>
                <div style={{ margin: '0 16px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--adm-color-background, #fff)' }}>
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        <List.Item
                            prefix={<LuUser size={18} color="var(--adm-color-primary, #1677ff)" />}
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
                            <span style={{ fontSize: '15px' }}>{t('name')}</span>
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
                            <span style={{ fontSize: '15px' }}>{t('email')}</span>
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
                            <span style={{ fontSize: '15px' }}>{t('phone')}</span>
                        </List.Item>
                    </List>
                </div>

                {/* SECTION: Social Media */}
                <div style={{ padding: '24px 16px 4px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--adm-color-weak, #999)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('socialMedia')}</p>
                </div>
                <div style={{ margin: '0 16px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--adm-color-background, #fff)' }}>
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        <List.Item
                            prefix={<LuShare2 size={18} color="var(--adm-color-weak, #999)" />}
                            onClick={() => setShowSocialEdit(true)}
                            arrow
                            description={filledSocialCount > 0 ? t('platformsLinked', { count: filledSocialCount }) : t('notSet')}
                        >
                            <span style={{ fontSize: '15px' }}>{t('socialProfiles')}</span>
                        </List.Item>
                    </List>
                </div>

                {/* SECTION: Guest Feedback */}
                <div style={{ padding: '24px 16px 4px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--adm-color-weak, #999)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('guestFeedback')}</p>
                </div>
                <div style={{ margin: '0 16px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--adm-color-background, #fff)' }}>
                    <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                        <List.Item
                            prefix={<LuMessageSquare size={18} color="var(--adm-color-success, #52c41a)" />}
                            extra={
                                <Switch
                                    checked={feedbackEnabled}
                                    onChange={handleToggleFeedback}
                                    style={{ '--height': '22px', '--width': '38px' } as React.CSSProperties}
                                />
                            }
                        >
                            <span style={{ fontSize: '15px' }}>{t('enableFeedback')}</span>
                        </List.Item>
                    </List>
                </div>

                {feedbackEnabled && (
                    <>
                        <div style={{ padding: '16px 16px 4px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--adm-color-weak, #999)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('feedbackFormFields')}</p>
                            <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)', marginTop: '2px' }}>{t('feedbackFormFieldsDesc')}</p>
                        </div>
                        <div style={{ margin: '0 16px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--adm-color-background, #fff)' }}>
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
                                    <span style={{ fontSize: '15px' }}>{t('askForName')}</span>
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
                                    <span style={{ fontSize: '15px' }}>{t('askForPhone')}</span>
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
                                    <span style={{ fontSize: '15px' }}>{t('askForEmail')}</span>
                                </List.Item>
                            </List>
                        </div>

                        <div style={{ padding: '16px 16px 4px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--adm-color-weak, #999)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('googleReview')}</p>
                            <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)', marginTop: '2px' }}>{t('googleReviewDesc')}</p>
                        </div>
                        <div style={{ margin: '0 16px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--adm-color-background, #fff)' }}>
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

                <p style={{ fontSize: '12px', textAlign: 'center', color: 'var(--adm-color-weak, #999)', padding: '24px 16px 0' }}>
                    {t('desktopOnlyNote')}
                </p>
            </div>

            {/* Social Media Edit Sheet */}
            <Popup
                visible={showSocialEdit}
                onMaskClick={() => setShowSocialEdit(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '80vh' }}
            >
                <div style={{ padding: '16px 16px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--adm-color-border, #eee)', borderRadius: '999px' }} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{t('socialMedia')}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {SOCIAL_PLATFORMS.map((p) => (
                            <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--adm-color-weak, #999)' }}>{p.label}</label>
                                <Input
                                    value={socialMedia[p.key] || ''}
                                    onChange={(v) => setSocialMedia({ ...socialMedia, [p.key]: v })}
                                    placeholder={p.placeholder}
                                    style={{ '--font-size': '15px' } as React.CSSProperties}
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
                        <Button block fill="outline" size="large" onClick={() => setShowSocialEdit(false)} style={{ minHeight: '44px' }}>{t('cancel')}</Button>
                        <Button block color="primary" fill="solid" size="large" onClick={handleSaveSocialMedia} loading={isSaving} style={{ minHeight: '44px' }}>{t('save')}</Button>
                    </div>
                </div>
            </Popup>
        </div>
    );
}
