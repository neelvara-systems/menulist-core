'use client'

import { FEATURE_FLAGS } from '@config/features';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Modal, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuCopy, LuRefreshCw, LuSend, LuShield, LuWifi, LuWifiOff } from 'react-icons/lu';
import { Button, Card, Flex, Input, NavBar, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobilePosSyncScreenProps {
    onBack: () => void;
}

const REGENERATE_SECRET_CONFIRMATION = 'REGENERATE';

export default function MobilePosSyncScreen({ onBack }: MobilePosSyncScreenProps) {
    const t = useTranslations('PosSync');
    const tMobile = useTranslations('MobileSettings');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [regenerateSecretModalOpen, setRegenerateSecretModalOpen] = useState(false);
    const [regenerateSecretConfirmationText, setRegenerateSecretConfirmationText] = useState('');

    const currentPosSync = useMemo(() => ({
        enabled: storeDetails?.posSync?.enabled ?? false,
        instructionsSentCount: storeDetails?.posSync?.instructionsSentCount ?? 0,
        instructionsSentDate: storeDetails?.posSync?.instructionsSentDate ?? '',
        lastError: storeDetails?.posSync?.lastError ?? '',
        lastSentAt: storeDetails?.posSync?.lastSentAt ?? null,
        lastStatus: storeDetails?.posSync?.lastStatus ?? 'never_sent',
        menuVersion: storeDetails?.posSync?.menuVersion ?? 0,
        status: storeDetails?.posSync?.status ?? 'disabled',
        webhookSecret: storeDetails?.posSync?.webhookSecret ?? '',
        webhookUrl: storeDetails?.posSync?.webhookUrl ?? '',
    }), [storeDetails?.posSync]);

    const [enabled, setEnabled] = useState(currentPosSync.enabled);
    const [webhookUrl, setWebhookUrl] = useState(currentPosSync.webhookUrl);
    const [webhookSecret, setWebhookSecret] = useState(currentPosSync.webhookSecret);
    const [originalDraft, setOriginalDraft] = useState(() => ({
        enabled: currentPosSync.enabled,
        webhookSecret: currentPosSync.webhookSecret,
        webhookUrl: currentPosSync.webhookUrl,
    }));

    useEffect(() => {
        const nextDraft = {
            enabled: currentPosSync.enabled,
            webhookSecret: currentPosSync.webhookSecret,
            webhookUrl: currentPosSync.webhookUrl,
        };
        setEnabled(nextDraft.enabled);
        setWebhookUrl(nextDraft.webhookUrl);
        setWebhookSecret(nextDraft.webhookSecret);
        setOriginalDraft(nextDraft);
    }, [currentPosSync.enabled, currentPosSync.webhookSecret, currentPosSync.webhookUrl]);

    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return null;
    }

    const persistPosSync = async (nextPosSync: Record<string, any>) => {
        if (!storeDetails?.storeId) return false;

        setIsSaving(true);
        try {
            await updateStore({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                posSync: nextPosSync,
            });
            setStoreDetails({
                ...storeDetails,
                posSync: nextPosSync,
            });
            return true;
        } catch {
            Toast.show({ content: 'Failed to save POS sync settings.', duration: 1500 });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const generateSecret = () => {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return `whsec_${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    };

    const handleToggle = (checked: boolean) => {
        const nextSecret = checked && !webhookSecret ? generateSecret() : webhookSecret;

        setEnabled(checked);
        setWebhookSecret(nextSecret);
    };

    const isDirty = JSON.stringify({
        enabled,
        webhookSecret,
        webhookUrl: webhookUrl.trim(),
    }) !== JSON.stringify({
        enabled: originalDraft.enabled,
        webhookSecret: originalDraft.webhookSecret,
        webhookUrl: originalDraft.webhookUrl.trim(),
    });

    const handleSave = async () => {
        const trimmedWebhookUrl = webhookUrl.trim();
        if (enabled && trimmedWebhookUrl) {
            try {
                new URL(trimmedWebhookUrl);
            } catch {
                Toast.show({ content: 'Enter a valid webhook URL.', duration: 1500 });
                return;
            }
        }

        const nextPosSync = {
            ...currentPosSync,
            enabled,
            webhookSecret,
            lastError: enabled ? currentPosSync.lastError : '',
            menuVersion: enabled ? currentPosSync.menuVersion : 0,
            status: enabled ? (currentPosSync.status === 'disabled' ? 'healthy' : currentPosSync.status) : 'disabled',
            webhookUrl: trimmedWebhookUrl,
        };

        const saved = await persistPosSync(nextPosSync);

        if (saved) {
            setOriginalDraft({
                enabled,
                webhookSecret,
                webhookUrl: trimmedWebhookUrl,
            });
            Toast.show({ content: 'POS sync settings saved.', duration: 1000 });
        }
    };

    const handleRegenerateSecret = () => {
        setRegenerateSecretConfirmationText('');
        setRegenerateSecretModalOpen(true);
    };

    const confirmSecretRegeneration = () => {
        if (regenerateSecretConfirmationText.trim() !== REGENERATE_SECRET_CONFIRMATION) {
            Toast.show({ content: `Type ${REGENERATE_SECRET_CONFIRMATION} to continue.`, duration: 1500 });
            return;
        }

        const nextSecret = generateSecret();
        setWebhookSecret(nextSecret);
        setRegenerateSecretModalOpen(false);
        setRegenerateSecretConfirmationText('');
        Toast.show({ content: 'New secret generated. Share it with your POS provider.', duration: 1500 });
    };

    const handleReset = () => {
        setEnabled(originalDraft.enabled);
        setWebhookUrl(originalDraft.webhookUrl);
        setWebhookSecret(originalDraft.webhookSecret);
        setTestResult(null);
    };

    const handleCopySecret = async () => {
        if (!webhookSecret) return;
        try {
            await navigator.clipboard.writeText(webhookSecret);
            Toast.show({ content: t('copySecret'), duration: 1000 });
        } catch {
            Toast.show({ content: 'Unable to copy secret.', duration: 1500 });
        }
    };

    const handleTest = async () => {
        if (!storeDetails?.storeId || !storeDetails?.tenantId) return;

        setIsTesting(true);
        setTestResult(null);
        try {
            const response = await fetch('/api/pos-sync/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: storeDetails.storeId,
                    tenantId: storeDetails.tenantId,
                }),
            });
            const data = await response.json();
            if (data.success) {
                setTestResult({
                    success: true,
                    message: `Webhook reachable (${data.responseTime}ms, HTTP ${data.statusCode})`,
                });
            } else {
                setTestResult({
                    success: false,
                    message: data.error || 'Could not reach webhook',
                });
            }
        } catch {
            setTestResult({
                success: false,
                message: 'Network error',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const statusColor = currentPosSync.status === 'healthy' ? 'success' : currentPosSync.status === 'disabled' ? 'default' : 'warning';
    const statusLabel = currentPosSync.status === 'healthy'
        ? t('connectedStatus')
        : currentPosSync.status === 'disabled'
            ? 'POS sync is off.'
            : t('connectionIssue');

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                right={isSaving ? <Tag color="processing">Saving</Tag> : null}
                title={t('title')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={10}>
                            <Flex align="center" justify="center" style={{ background: '#eff6ff', borderRadius: 12, height: 40, width: 40 }}>
                                {currentPosSync.status === 'healthy' ? <LuWifi color="#2563eb" size={20} /> : <LuWifiOff color="#f59e0b" size={20} />}
                            </Flex>
                            <Flex gap={2} vertical>
                                <Text strong>{statusLabel}</Text>
                                <Text type="secondary">{t('version', { version: currentPosSync.menuVersion })}</Text>
                            </Flex>
                        </Flex>
                        <Tag color={statusColor}>{currentPosSync.status}</Tag>
                    </Flex>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex gap={2} vertical>
                            <Text strong>{t('enablePosSync')}</Text>
                            <Text type="secondary">{t('enablePosSyncDesc')}</Text>
                        </Flex>
                        <Switch checked={enabled} onChange={(checked) => void handleToggle(checked)} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Text strong>{t('webhookUrl')}</Text>
                        <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onChange={setWebhookUrl}
                            placeholder={t('webhookUrlPlaceholder')}
                            value={webhookUrl}
                        />
                        <Text type="secondary">{t('webhookUrlHelp')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={8}>
                                <LuShield color="#475569" size={18} />
                                <Text strong>{t('signingSecret')}</Text>
                            </Flex>
                            <Tag>{webhookSecret ? 'Ready' : 'Missing'}</Tag>
                        </Flex>
                        <Text style={{ wordBreak: 'break-all' }}>{webhookSecret || 'Generate a secret after enabling POS sync.'}</Text>
                        <Text type="secondary">{t('signingSecretHelp')}</Text>
                        <Flex gap={8}>
                            <Button block disabled={!webhookSecret} fill="outline" onClick={() => void handleCopySecret()}>
                                <Flex align="center" gap={6}>
                                    <LuCopy size={16} />
                                    <Text>{t('copySecret')}</Text>
                                </Flex>
                            </Button>
                            <Button block fill="outline" onClick={() => void handleRegenerateSecret()}>
                                <Flex align="center" gap={6}>
                                    <LuRefreshCw size={16} />
                                    <Text>{t('regenerateSecret')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={10} vertical>
                        <Button block disabled={!enabled || !webhookUrl.trim()} fill="outline" loading={isTesting} onClick={() => void handleTest()}>
                            <Flex align="center" gap={6}>
                                <LuSend size={16} />
                                <Text>{t('sendTest')}</Text>
                            </Flex>
                        </Button>
                        {testResult ? (
                            <Tag color={testResult.success ? 'success' : 'danger'}>
                                {testResult.message}
                            </Tag>
                        ) : null}
                        {currentPosSync.lastError ? (
                            <Text type="secondary">{currentPosSync.lastError}</Text>
                        ) : null}
                    </Flex>
                </Card>

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        bottom: 0,
                        marginInline: -16,
                        padding: '12px 16px',
                        position: 'sticky',
                        zIndex: 20,
                    }}
                >
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large">
                        {tMobile('reset')}
                    </Button>
                    <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={() => void handleSave()} size="large">
                        {tMobile('saveChanges')}
                    </Button>
                </Flex>
            </Flex>
            <Modal
                title="Regenerate signing secret"
                open={regenerateSecretModalOpen}
                onOk={confirmSecretRegeneration}
                onCancel={() => {
                    setRegenerateSecretModalOpen(false);
                    setRegenerateSecretConfirmationText('');
                }}
                okText="Regenerate"
                okButtonProps={{
                    danger: true,
                    disabled: regenerateSecretConfirmationText.trim() !== REGENERATE_SECRET_CONFIRMATION,
                }}
                cancelText="Keep current secret"
            >
                <Flex gap={12} vertical>
                    <Text>
                        Your current secret will stop working immediately. Share the new secret with your POS provider or their existing webhook configuration will fail.
                    </Text>
                    <Text type="secondary">
                        Type {REGENERATE_SECRET_CONFIRMATION} to confirm.
                    </Text>
                    <Input
                        autoCapitalize="characters"
                        onChange={setRegenerateSecretConfirmationText}
                        placeholder={`Type ${REGENERATE_SECRET_CONFIRMATION}`}
                        value={regenerateSecretConfirmationText}
                    />
                </Flex>
            </Modal>
        </Flex>
    );
}
