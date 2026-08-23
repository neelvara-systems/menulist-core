'use client';

import { FEATURE_FLAGS } from '@config/features';
import { saveNotificationOsPreferences } from '@lib/notification-os/client';
import { modeNeedsWhatsApp, normalizeOwnerNotificationSettings, type NotificationOsOwnerMode } from '@lib/notification-os/preferences';
import { canSaveNotificationOsMode, resolveNotificationOsContactReadiness } from '@lib/notification-os/readiness';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LuBell, LuMail, LuMessageCircle } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Select, Switch, Tag, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

type Props = { onBack: () => void };

const MODE_OPTIONS: Array<{ label: string; value: NotificationOsOwnerMode }> = FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS
    ? [
        { label: 'Email only', value: 'email_only' },
        { label: 'WhatsApp only', value: 'whatsapp_only' },
        { label: 'Email and WhatsApp', value: 'email_and_whatsapp' },
        { label: 'Preferred available channel', value: 'preferred_available' },
    ]
    : [{ label: 'Email only', value: 'email_only' }];

const resolveAvailableMode = (mode: NotificationOsOwnerMode | undefined): NotificationOsOwnerMode => (
    FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS ? mode || 'email_and_whatsapp' : 'email_only'
);

export default function MobileNotificationSettingsScreen({ onBack }: Props) {
    const { data: session } = useSession();
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const normalized = normalizeOwnerNotificationSettings(storeDetails?.notificationSettings);
    const [mode, setMode] = useState<NotificationOsOwnerMode>(resolveAvailableMode(normalized.channelMode));
    const [preferredChannel, setPreferredChannel] = useState<'email' | 'whatsapp'>(normalized.preferredChannels?.[0] || 'email');
    const [whatsappConsent, setWhatsappConsent] = useState(normalized.whatsappConsent === true);
    const [persistedConsent, setPersistedConsent] = useState(normalized.whatsappConsent === true);
    const [persistedMode, setPersistedMode] = useState<NotificationOsOwnerMode>(resolveAvailableMode(normalized.channelMode));
    const [persistedPreferredChannel, setPersistedPreferredChannel] = useState<'email' | 'whatsapp'>(normalized.preferredChannels?.[0] || 'email');
    const [saving, setSaving] = useState(false);
    const readiness = resolveNotificationOsContactReadiness(normalized, session?.user || {});
    const revokingConsent = persistedConsent && !whatsappConsent;
    const hasChanges = mode !== persistedMode
        || (mode === 'preferred_available' && preferredChannel !== persistedPreferredChannel)
        || whatsappConsent !== persistedConsent;
    const selectionReady = canSaveNotificationOsMode({
        emailReady: readiness.emailReady,
        mode,
        revokingConsent,
        whatsappConsent,
        whatsappReady: readiness.whatsappReady,
    });

    useEffect(() => {
        const next = normalizeOwnerNotificationSettings(storeDetails?.notificationSettings);
        setMode(resolveAvailableMode(next.channelMode));
        setPreferredChannel(next.preferredChannels?.[0] || 'email');
        setWhatsappConsent(next.whatsappConsent === true);
        setPersistedConsent(next.whatsappConsent === true);
        setPersistedMode(resolveAvailableMode(next.channelMode));
        setPersistedPreferredChannel(next.preferredChannels?.[0] || 'email');
    }, [storeDetails?.notificationSettings]);

    if (!storeDetails) {
        return <Flex align="center" justify="center" style={{ minHeight: '100%' }}><DotLoading color="primary" /></Flex>;
    }

    const save = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const settings = await saveNotificationOsPreferences({
                expectedStoreId: String(storeDetails.storeId),
                expectedTenantId: String(storeDetails.tenantId),
                mode,
                ...(mode === 'preferred_available' ? { preferredChannel } : {}),
                whatsappConsent: whatsappConsent === persistedConsent ? 'unchanged' : whatsappConsent ? 'grant' : 'revoke',
            });
            setPersistedConsent(settings.whatsappConsent === true);
            setPersistedMode(resolveAvailableMode(settings.channelMode));
            setPersistedPreferredChannel(settings.preferredChannels?.[0] || 'email');
            setStoreDetails((current) => current ? { ...current, notificationSettings: settings } : current);
            Toast.show({ content: 'Notification settings saved', duration: 1500 });
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : 'Could not save notification settings.', duration: 2200 });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Choose email, WhatsApp, or both for supported account and business updates."
                onBack={onBack}
                title="Notifications"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={10} vertical>
                        <Flex align="center" gap={8}><LuBell size={18} /><Text strong>Delivery channel</Text></Flex>
                        <Text type="secondary">Each update follows its channel policy. Both channels reuse one event and one account lookup.</Text>
                        <Select aria-label="Notification delivery channel" options={MODE_OPTIONS.map((option) => ({
                            ...option,
                            disabled: option.value === 'email_only'
                                ? !readiness.emailReady
                                : option.value === 'whatsapp_only'
                                    ? !readiness.whatsappReady
                                    : option.value === 'email_and_whatsapp'
                                        ? !readiness.emailReady || !readiness.whatsappReady
                                        : !readiness.emailReady && !readiness.whatsappReady,
                        }))} value={mode} onChange={(value) => setMode(value as NotificationOsOwnerMode)} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Text strong>Delivery readiness</Text>
                        <Flex align="center" justify="space-between" gap={10}>
                            <Flex align="center" gap={8}><LuMail aria-hidden size={18} /><Text>{readiness.emailDisplay}</Text></Flex>
                            <Tag color={readiness.emailReady ? 'success' : 'default'}>{readiness.emailReady ? 'Verified' : 'Unavailable'}</Tag>
                        </Flex>
                        <Flex align="center" justify="space-between" gap={10}>
                            <Flex align="center" gap={8}><LuMessageCircle aria-hidden size={18} /><Text>{readiness.whatsappDisplay}</Text></Flex>
                            <Tag color={readiness.whatsappReady ? 'success' : 'default'}>{readiness.whatsappReady ? 'Verified' : 'Unavailable'}</Tag>
                        </Flex>
                        <Text type="secondary">Only verified sign-in contacts can receive notifications. Public business contact edits do not verify them.</Text>
                    </Flex>
                </Card>

                {mode === 'preferred_available' ? (
                    <Card>
                        <Flex gap={10} vertical>
                            <Text strong>Try this channel first</Text>
                            <Select
                                aria-label="Preferred notification channel"
                                options={[{ label: 'Email first', value: 'email' }, { label: 'WhatsApp first', value: 'whatsapp' }]}
                                value={preferredChannel}
                                onChange={(value) => setPreferredChannel(value as 'email' | 'whatsapp')}
                            />
                        </Flex>
                    </Card>
                ) : null}

                <Card>
                    <Flex align="center" gap={12} justify="space-between">
                        <Flex gap={8} vertical>
                            <Flex align="center" gap={8}><LuMessageCircle size={18} /><Text strong>WhatsApp permission</Text></Flex>
                            <Text type="secondary">Separate from WhatsApp OTP sign-in. You can withdraw permission at any time.</Text>
                        </Flex>
                        <Switch aria-label="WhatsApp notification permission" checked={whatsappConsent} disabled={(!FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS || !readiness.whatsappReady) && !persistedConsent} onChange={setWhatsappConsent} />
                    </Flex>
                    {modeNeedsWhatsApp(mode) && !whatsappConsent ? (
                        <Text style={{ color: token.colorWarning }}>Allow WhatsApp notifications before saving a WhatsApp-only or combined selection.</Text>
                    ) : null}
                    {!FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS ? (
                        <Text type="secondary">WhatsApp account notifications will be enabled after provider certification.</Text>
                    ) : null}
                </Card>

                {!selectionReady && !revokingConsent ? <Text style={{ color: token.colorWarning }}>Choose a channel with a verified contact. WhatsApp selections also require permission.</Text> : null}

                <Button block disabled={!hasChanges || !selectionReady} loading={saving} onClick={() => void save()} size="large">
                    Save notification settings
                </Button>
            </Flex>
        </Flex>
    );
}
