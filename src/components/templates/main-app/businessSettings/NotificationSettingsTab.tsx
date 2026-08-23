'use client';

import { FEATURE_FLAGS } from '@config/features';
import { modeNeedsWhatsApp, normalizeOwnerNotificationSettings, type NotificationOsOwnerMode } from '@lib/notification-os/preferences';
import { saveNotificationOsPreferences } from '@lib/notification-os/client';
import { canSaveNotificationOsMode, resolveNotificationOsContactReadiness } from '@lib/notification-os/readiness';
import type { StoreDataType } from '@type/platform/store';
import { Alert, Button, Card, Flex, Radio, Switch, Tag, Typography, message } from 'antd';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { LuMail, LuMessageCircle } from 'react-icons/lu';

type Props = {
    onSaved: (settings: NonNullable<StoreDataType['notificationSettings']>) => void;
    storeDetails: StoreDataType;
};

const MODE_OPTIONS: Array<{ label: string; value: NotificationOsOwnerMode }> = FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS
    ? [
        { label: 'Email only', value: 'email_only' },
        { label: 'WhatsApp only', value: 'whatsapp_only' },
        { label: 'Email and WhatsApp', value: 'email_and_whatsapp' },
        { label: 'Use my preferred available channel', value: 'preferred_available' },
    ]
    : [{ label: 'Email only', value: 'email_only' }];

const resolveAvailableMode = (mode: NotificationOsOwnerMode | undefined): NotificationOsOwnerMode => (
    FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS ? mode || 'email_and_whatsapp' : 'email_only'
);

export default function NotificationSettingsTab({ onSaved, storeDetails }: Props) {
    const { data: session } = useSession();
    const initial = normalizeOwnerNotificationSettings(storeDetails.notificationSettings);
    const [mode, setMode] = useState<NotificationOsOwnerMode>(resolveAvailableMode(initial.channelMode));
    const [preferredChannel, setPreferredChannel] = useState<'email' | 'whatsapp'>(initial.preferredChannels?.[0] || 'email');
    const [whatsappConsent, setWhatsappConsent] = useState(initial.whatsappConsent === true);
    const [persistedConsent, setPersistedConsent] = useState(initial.whatsappConsent === true);
    const [persistedMode, setPersistedMode] = useState<NotificationOsOwnerMode>(resolveAvailableMode(initial.channelMode));
    const [persistedPreferredChannel, setPersistedPreferredChannel] = useState<'email' | 'whatsapp'>(initial.preferredChannels?.[0] || 'email');
    const [saving, setSaving] = useState(false);

    const readiness = useMemo(() => resolveNotificationOsContactReadiness(initial, session?.user || {}), [initial, session?.user]);
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
        const next = normalizeOwnerNotificationSettings(storeDetails.notificationSettings);
        setMode(resolveAvailableMode(next.channelMode));
        setPreferredChannel(next.preferredChannels?.[0] || 'email');
        setWhatsappConsent(next.whatsappConsent === true);
        setPersistedConsent(next.whatsappConsent === true);
        setPersistedMode(resolveAvailableMode(next.channelMode));
        setPersistedPreferredChannel(next.preferredChannels?.[0] || 'email');
    }, [storeDetails.notificationSettings]);

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
            onSaved(settings as NonNullable<StoreDataType['notificationSettings']>);
            message.success('Notification settings saved');
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save notification settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Flex vertical gap={16}>
            <Card size="small">
                <Typography.Title level={5} style={{ marginTop: 0 }}>Notifications</Typography.Title>
                <Typography.Paragraph type="secondary">
                    Choose where MenuList sends supported account and business updates. Each update still follows its channel policy; email and WhatsApp reuse one event and one account lookup.
                </Typography.Paragraph>
                <Radio.Group
                    aria-label="Notification delivery channel"
                    options={MODE_OPTIONS.map((option) => ({
                        ...option,
                        disabled: option.value === 'email_only'
                            ? !readiness.emailReady
                            : option.value === 'whatsapp_only'
                                ? !readiness.whatsappReady
                                : option.value === 'email_and_whatsapp'
                                    ? !readiness.emailReady || !readiness.whatsappReady
                                    : !readiness.emailReady && !readiness.whatsappReady,
                    }))}
                    optionType="button"
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                />
            </Card>

            <Card size="small" title="Delivery readiness">
                <Flex vertical gap={12}>
                    <Flex align="center" justify="space-between" gap={16}>
                        <Flex align="center" gap={8}><LuMail aria-hidden size={18} /><Typography.Text>{readiness.emailDisplay}</Typography.Text></Flex>
                        <Tag color={readiness.emailReady ? 'green' : 'default'}>{readiness.emailReady ? 'Verified' : 'Unavailable'}</Tag>
                    </Flex>
                    <Flex align="center" justify="space-between" gap={16}>
                        <Flex align="center" gap={8}><LuMessageCircle aria-hidden size={18} /><Typography.Text>{readiness.whatsappDisplay}</Typography.Text></Flex>
                        <Tag color={readiness.whatsappReady ? 'green' : 'default'}>{readiness.whatsappReady ? 'Verified' : 'Unavailable'}</Tag>
                    </Flex>
                    <Typography.Text type="secondary">Only verified sign-in contacts can receive notifications. Editing a public business email or phone does not verify it.</Typography.Text>
                </Flex>
            </Card>

            {mode === 'preferred_available' ? (
                <Card size="small" title="Preferred channel">
                    <Radio.Group aria-label="Preferred notification channel" value={preferredChannel} onChange={(event) => setPreferredChannel(event.target.value)}>
                        <Radio value="email">Email first</Radio>
                        <Radio value="whatsapp">WhatsApp first</Radio>
                    </Radio.Group>
                </Card>
            ) : null}

            <Card size="small" title="WhatsApp permission">
                <Flex align="center" justify="space-between" gap={16}>
                    <div>
                        <Typography.Text strong>Receive notifications on WhatsApp</Typography.Text>
                        <br />
                        <Typography.Text type="secondary">
                            This is separate from using WhatsApp OTP to sign in. You can withdraw permission here at any time.
                        </Typography.Text>
                    </div>
                    <Switch aria-label="WhatsApp notification permission" checked={whatsappConsent} disabled={(!FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS || !readiness.whatsappReady) && !persistedConsent} onChange={setWhatsappConsent} />
                </Flex>
                {modeNeedsWhatsApp(mode) && !whatsappConsent ? (
                    <Alert message="Allow WhatsApp notifications before saving a WhatsApp-only or combined selection." type="warning" showIcon style={{ marginTop: 16 }} />
                ) : null}
                {!FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS ? (
                    <Alert message="WhatsApp account notifications will become available after provider certification." type="info" showIcon style={{ marginTop: 16 }} />
                ) : null}
            </Card>

            {!selectionReady && !revokingConsent ? <Alert message="Choose a channel with a verified contact. WhatsApp selections also require permission." type="warning" showIcon /> : null}

            <Button disabled={!hasChanges || !selectionReady} type="primary" loading={saving} onClick={() => void save()}>
                Save notification settings
            </Button>
        </Flex>
    );
}
