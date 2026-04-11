'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuMessageSquare, LuShare2, LuUser, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileAdvancedSettingsScreenProps {
    onBack: () => void;
    mode?: 'all' | 'contact' | 'social' | 'feedback';
}

export default function MobileAdvancedSettingsScreen({ onBack, mode = 'all' }: MobileAdvancedSettingsScreenProps) {
    const t = useTranslations('MobileAdvancedSettings');
    const tBusiness = useTranslations('BusinessSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);

    const [contactName, setContactName] = useState(storeDetails?.contactPersonName || '');
    const [contactEmail, setContactEmail] = useState(storeDetails?.contactPersonEmail || '');
    const [contactPhone, setContactPhone] = useState(storeDetails?.contactPersonNumber || '');

    const [socialMedia, setSocialMedia] = useState<Record<string, string>>(storeDetails?.socialMedia || {});

    const [feedbackEnabled, setFeedbackEnabled] = useState(storeDetails?.feedbackEnabled !== false);
    const [collectName, setCollectName] = useState(storeDetails?.feedbackDefaults?.collectName ?? false);
    const [collectPhone, setCollectPhone] = useState(storeDetails?.feedbackDefaults?.collectPhone ?? true);
    const [collectEmail, setCollectEmail] = useState(storeDetails?.feedbackDefaults?.collectEmail ?? true);
    const [reviewUrl, setReviewUrl] = useState(storeDetails?.reviewUrl || '');

    const [showSocialEdit, setShowSocialEdit] = useState(false);

    const showContact = mode === 'all' || mode === 'contact';
    const showSocial = mode === 'all' || mode === 'social';
    const showFeedback = mode === 'all' || mode === 'feedback';

    const pageTitle = mode === 'contact'
        ? tBusiness('contactPerson')
        : mode === 'social'
            ? tBusiness('socialMedia')
            : mode === 'feedback'
                ? tBusiness('feedback')
                : t('title');
    const pageSubtitle = mode === 'contact'
        ? 'Set the primary contact details your team and support flows rely on.'
        : mode === 'social'
            ? 'Keep your public social links accurate across your business presence.'
            : mode === 'feedback'
                ? 'Control guest feedback collection and where review requests should go.'
                : 'Manage contact details, social links, and guest feedback defaults in one place.';

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
        Object.entries(socialMedia).forEach(([key, value]) => {
            if (value.trim()) cleaned[key] = value.trim();
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

    const filledSocialCount = Object.values(socialMedia).filter((value) => value.trim()).length;

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar
                onBack={onBack}
                right={isSaving ? <Tag color="processing">Saving</Tag> : null}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={mode === 'all' ? t('subtitle') : pageSubtitle}
                    title={pageTitle}
                />

                {showContact ? (
                    <Flex gap={4} vertical>
                        <Card size="small" title={<Text strong>{t('contactPerson')}</Text>}>
                    <List>
                        <List.Item
                            prefix={<LuUser color="#1677ff" size={18} />}
                            extra={
                                <Input
                                    onBlur={handleSaveContactPerson}
                                    onChange={setContactName}
                                    placeholder={t('fullName')}
                                    value={contactName}
                                />
                            }
                            title={<Text>{t('name')}</Text>}
                        />
                        <List.Item
                            extra={
                                <Input
                                    onBlur={handleSaveContactPerson}
                                    onChange={setContactEmail}
                                    placeholder={t('email')}
                                    type="email"
                                    value={contactEmail}
                                />
                            }
                            title={<Text>{t('email')}</Text>}
                        />
                        <List.Item
                            extra={
                                <Input
                                    onBlur={handleSaveContactPerson}
                                    onChange={setContactPhone}
                                    placeholder={t('phone')}
                                    type="tel"
                                    value={contactPhone}
                                />
                            }
                            title={<Text>{t('phone')}</Text>}
                        />
                    </List>
                        </Card>
                    </Flex>
                ) : null}

                {showSocial ? (
                    <Card size="small" title={<Text strong>{t('socialMedia')}</Text>}>
                    <List>
                        <List.Item
                            arrow
                            description={filledSocialCount > 0 ? t('platformsLinked', { count: filledSocialCount }) : t('notSet')}
                            onClick={() => setShowSocialEdit(true)}
                            prefix={<LuShare2 color="#94a3b8" size={18} />}
                            title={<Text>{t('socialProfiles')}</Text>}
                        />
                    </List>
                    </Card>
                ) : null}

                {showFeedback ? (
                    <Card size="small" title={<Text strong>{t('guestFeedback')}</Text>}>
                    <List>
                        <List.Item
                            prefix={<LuMessageSquare color="#16a34a" size={18} />}
                            extra={<Switch checked={feedbackEnabled} onChange={handleToggleFeedback} />}
                            title={<Text>{t('enableFeedback')}</Text>}
                        />
                    </List>
                    </Card>
                ) : null}

                {showFeedback && feedbackEnabled ? (
                    <>
                        <Card
                            size="small"
                            title={<Text strong>{t('feedbackFormFields')}</Text>}
                        >
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('feedbackFormFieldsDesc')}</Text>
                                <List>
                                    <List.Item
                                        extra={<Switch checked={collectName} onChange={(value) => handleToggleCollectField('collectName', value)} />}
                                        title={<Text>{t('askForName')}</Text>}
                                    />
                                    <List.Item
                                        description={<Text type="secondary">{t('forWhatsAppFollowUp')}</Text>}
                                        extra={<Switch checked={collectPhone} onChange={(value) => handleToggleCollectField('collectPhone', value)} />}
                                        title={<Text>{t('askForPhone')}</Text>}
                                    />
                                    <List.Item
                                        extra={<Switch checked={collectEmail} onChange={(value) => handleToggleCollectField('collectEmail', value)} />}
                                        title={<Text>{t('askForEmail')}</Text>}
                                    />
                                </List>
                            </Flex>
                        </Card>

                        <Card size="small" title={<Text strong>{t('googleReview')}</Text>}>
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('googleReviewDesc')}</Text>
                                <Input
                                    onBlur={handleSaveReviewUrl}
                                    onChange={setReviewUrl}
                                    placeholder="https://g.page/r/your-id/review"
                                    value={reviewUrl}
                                />
                            </Flex>
                        </Card>
                    </>
                ) : null}

            </Flex>

            <Popup
                bodyStyle={{ maxHeight: '80vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setShowSocialEdit(false)}
                position="bottom"
                visible={showSocialEdit}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar
                        backIcon={<LuX size={20} />}
                        onBack={() => setShowSocialEdit(false)}
                        right={<Tag color="processing">{filledSocialCount}</Tag>}
                    >
                        {t('socialMedia')}
                    </NavBar>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Text type="secondary">Leave a field empty to hide that link.</Text>

                        <Flex gap={12} vertical>
                            {SOCIAL_PLATFORMS.map((platform) => (
                                <Card key={platform.key} size="small">
                                    <Flex gap={6} vertical>
                                        <Text strong>{platform.label}</Text>
                                        <Input
                                            onChange={(value) => setSocialMedia({ ...socialMedia, [platform.key]: value })}
                                            placeholder={platform.placeholder}
                                            value={socialMedia[platform.key] || ''}
                                        />
                                    </Flex>
                                </Card>
                            ))}
                        </Flex>

                        <Flex gap={12}>
                            <Button block fill="outline" onClick={() => setShowSocialEdit(false)} size="large">
                                {t('cancel')}
                            </Button>
                            <Button block color="primary" loading={isSaving} onClick={handleSaveSocialMedia} size="large">
                                {t('save')}
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
