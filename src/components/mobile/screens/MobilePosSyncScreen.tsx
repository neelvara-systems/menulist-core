'use client'

import { FEATURE_FLAGS } from '@config/features';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { logPosSyncSecretRotationAudit } from '@lib/posSync/secretAudit';
import { formatWebhookSecretPreview } from '@lib/posSync/secretDisplay';
import {
    isPosSyncTestResponse,
    isSuccessfulPosSyncTestResponse,
    POS_SYNC_TEST_REQUEST_POLICY,
    POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
    type PosSyncTestResponse,
} from '@lib/posSync/testResponse';
import { validatePosSyncWebhookUrl } from '@lib/posSync/webhookUrl';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Modal, theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowRight, LuCheck, LuCopy, LuEye, LuEyeOff, LuRefreshCw, LuSend, LuShield, LuWifi, LuWifiOff } from 'react-icons/lu';
import { Button, Card, Collapse, Flex, Input, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobilePosSyncScreenProps {
    onBack: () => void;
}

const REGENERATE_SECRET_CONFIRMATION = 'REGENERATE';
const POS_SYNC_CONNECTION_ISSUE_MESSAGE = 'Could not reach connected system';
const MOBILE_POS_SYNC_COPY_UNAVAILABLE = 'mobile_pos_sync_copy_unavailable';
const MOBILE_POS_SYNC_COPY_FALLBACK_FAILED = 'mobile_pos_sync_copy_fallback_failed';

interface SecretRotationAuditDraft {
    secretRotatedAt: string;
    secretRotatedByEmail: string;
    secretRotatedByUserId: string;
}

const hasMobilePosSyncClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobilePosSyncCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobilePosSyncText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobilePosSyncClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobilePosSyncCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_POS_SYNC_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(MOBILE_POS_SYNC_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

async function readMobilePosSyncTestResponse(
    response: Response,
    storeId?: unknown,
    tenantId?: unknown,
): Promise<PosSyncTestResponse | null> {
    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logMobileOwnerFailure('mobile_pos_sync_test_response_parse_failed', error, {
            ...getMobileOwnerStoreLogContext(storeId, tenantId),
            maxBytes: POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }

    if (!isPosSyncTestResponse(payload)) {
        const invalidResponseError = new Error('mobile_pos_sync_test_response_invalid') as Error & { status?: number };
        invalidResponseError.status = response.status;
        logMobileOwnerFailure('mobile_pos_sync_test_response_invalid', invalidResponseError, {
            ...getMobileOwnerStoreLogContext(storeId, tenantId),
            maxBytes: POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }

    return payload;
}

export default function MobilePosSyncScreen({ onBack }: MobilePosSyncScreenProps) {
    const t = useTranslations('PosSync');
    const tMobile = useTranslations('MobileSettings');
    const { data: session } = useSession();
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [secretVisible, setSecretVisible] = useState(false);
    const [regenerateSecretModalOpen, setRegenerateSecretModalOpen] = useState(false);
    const [regenerateSecretConfirmationText, setRegenerateSecretConfirmationText] = useState('');
    const [pendingSecretRotationAudit, setPendingSecretRotationAudit] = useState<SecretRotationAuditDraft | null>(null);

    const currentPosSync = useMemo(() => ({
        enabled: storeDetails?.posSync?.enabled ?? false,
        instructionsSentCount: storeDetails?.posSync?.instructionsSentCount ?? 0,
        instructionsSentDate: storeDetails?.posSync?.instructionsSentDate ?? '',
        lastError: storeDetails?.posSync?.lastError ?? '',
        lastSentAt: storeDetails?.posSync?.lastSentAt ?? null,
        lastStatus: storeDetails?.posSync?.lastStatus ?? 'never_sent',
        menuVersion: storeDetails?.posSync?.menuVersion ?? 0,
        consecutiveFailures: storeDetails?.posSync?.consecutiveFailures ?? 0,
        secretRotatedAt: storeDetails?.posSync?.secretRotatedAt ?? '',
        secretRotatedByEmail: storeDetails?.posSync?.secretRotatedByEmail ?? '',
        secretRotatedByUserId: storeDetails?.posSync?.secretRotatedByUserId ?? '',
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
        setPendingSecretRotationAudit(null);
        setSecretVisible(false);
    }, [currentPosSync.enabled, currentPosSync.webhookSecret, currentPosSync.webhookUrl]);

    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return null;
    }

    const persistPosSync = async (nextPosSync: Record<string, any>) => {
        if (!storeDetails?.storeId) return false;

        setIsSaving(true);
        try {
            const writeResult = await updateStore({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                posSync: nextPosSync,
            });
            assertStoreUpdateSucceeded(
                writeResult,
                storeDetails.storeId,
                'mobile_pos_sync_store_update_rejected',
            );
            setStoreDetails({
                ...storeDetails,
                posSync: nextPosSync,
            });
            return true;
        } catch (error) {
            logMobileOwnerFailure('mobile_pos_sync_settings_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails.storeId, storeDetails.tenantId),
                ...getBoundedMobileOwnerStringContext('status', nextPosSync.status),
                enabled: Boolean(nextPosSync.enabled),
                previousEnabled: Boolean(currentPosSync.enabled),
                hasWebhookUrl: Boolean(nextPosSync.webhookUrl),
                webhookUrlLength: String(nextPosSync.webhookUrl || '').length,
                hasWebhookSecret: Boolean(nextPosSync.webhookSecret),
                webhookSecretLength: String(nextPosSync.webhookSecret || '').length,
                pendingSecretRotation: Boolean(pendingSecretRotationAudit),
                webhookUrlChanged: String(nextPosSync.webhookUrl || '').trim() !== originalDraft.webhookUrl.trim(),
                secretChanged: nextPosSync.webhookSecret !== originalDraft.webhookSecret,
            });
            Toast.show({ content: 'Failed to save external sync settings.', duration: 1500 });
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
        setSecretVisible(false);
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
        let normalizedWebhookUrl = trimmedWebhookUrl;
        if (enabled && trimmedWebhookUrl) {
            const validation = validatePosSyncWebhookUrl(trimmedWebhookUrl);
            if (!validation.valid || !validation.normalizedUrl) {
                Toast.show({ content: validation.error || 'Enter a valid provider connection URL.', duration: 1500 });
                return;
            }
            normalizedWebhookUrl = validation.normalizedUrl;
        }

        const connectionChanged = enabled !== currentPosSync.enabled
            || normalizedWebhookUrl !== currentPosSync.webhookUrl
            || webhookSecret !== currentPosSync.webhookSecret
            || Boolean(pendingSecretRotationAudit);

        const nextPosSync = {
            ...currentPosSync,
            enabled,
            webhookSecret,
            consecutiveFailures: enabled && !connectionChanged ? currentPosSync.consecutiveFailures : 0,
            lastError: enabled && !connectionChanged && currentPosSync.lastError ? POS_SYNC_CONNECTION_ISSUE_MESSAGE : '',
            menuVersion: enabled ? currentPosSync.menuVersion : 0,
            ...(pendingSecretRotationAudit ?? {}),
            status: enabled ? (connectionChanged || currentPosSync.status === 'disabled' ? 'healthy' : currentPosSync.status) : 'disabled',
            webhookUrl: normalizedWebhookUrl,
        };

        const saved = await persistPosSync(nextPosSync);

        if (saved) {
            setOriginalDraft({
                enabled,
                webhookSecret,
                webhookUrl: normalizedWebhookUrl,
            });
            if (pendingSecretRotationAudit) {
                logPosSyncSecretRotationAudit({
                    actorEmail: pendingSecretRotationAudit.secretRotatedByEmail,
                    actorUserId: pendingSecretRotationAudit.secretRotatedByUserId,
                    rotatedAt: pendingSecretRotationAudit.secretRotatedAt,
                    storeId: storeDetails?.storeId,
                    tenantId: storeDetails?.tenantId,
                });
            }
            setPendingSecretRotationAudit(null);
            Toast.show({ content: 'External sync settings saved.', duration: 1000 });
        }
    };

    const handleRegenerateSecret = () => {
        setRegenerateSecretConfirmationText('');
        setRegenerateSecretModalOpen(true);
    };

    const buildSecretRotationAudit = () => {
        const sessionUser = (session?.user || {}) as any;

        return {
            secretRotatedAt: new Date().toISOString(),
            secretRotatedByEmail: sessionUser.email || '',
            secretRotatedByUserId: String((session as any)?.uId || sessionUser.uId || sessionUser.id || sessionUser.email || 'unknown'),
        };
    };

    const confirmSecretRegeneration = () => {
        if (regenerateSecretConfirmationText.trim() !== REGENERATE_SECRET_CONFIRMATION) {
            Toast.show({ content: `Type ${REGENERATE_SECRET_CONFIRMATION} to continue.`, duration: 1500 });
            return;
        }

        const nextSecret = generateSecret();
        setWebhookSecret(nextSecret);
        setSecretVisible(false);
        setPendingSecretRotationAudit(buildSecretRotationAudit());
        setRegenerateSecretModalOpen(false);
        setRegenerateSecretConfirmationText('');
        Toast.show({ content: 'New secret generated. Use Copy to share it with your provider.', duration: 1500 });
    };

    const handleReset = () => {
        setEnabled(originalDraft.enabled);
        setWebhookUrl(originalDraft.webhookUrl);
        setWebhookSecret(originalDraft.webhookSecret);
        setTestResult(null);
        setPendingSecretRotationAudit(null);
        setSecretVisible(false);
    };

    const handleCopySecret = async () => {
        if (!webhookSecret) return;
        try {
            await copyMobilePosSyncText(webhookSecret);
            Toast.show({ content: t('copySecret'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_pos_sync_secret_copy_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                hasWebhookSecret: Boolean(webhookSecret),
                webhookSecretLength: webhookSecret.length,
                secretVisible,
                pendingSecretRotation: Boolean(pendingSecretRotationAudit),
                hasClipboardWrite: hasMobilePosSyncClipboardWrite(),
                hasCopyFallback: hasMobilePosSyncCopyFallback(),
            });
            Toast.show({ content: 'Unable to copy secret.', duration: 1500 });
        }
    };

    const handleTest = async () => {
        if (!storeDetails?.storeId || !storeDetails?.tenantId) return;

        setIsTesting(true);
        setTestResult(null);
        try {
            const response = await fetch('/api/pos-sync/test', {
                ...POS_SYNC_TEST_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: storeDetails.storeId,
                    tenantId: storeDetails.tenantId,
                }),
            });
            const data = await readMobilePosSyncTestResponse(response, storeDetails.storeId, storeDetails.tenantId);
            if (response.ok && isSuccessfulPosSyncTestResponse(data)) {
                setTestResult({
                    success: true,
                    message: `Connection reachable (${data.responseTime}ms, HTTP ${data.statusCode})`,
                });
            } else if (data) {
                const testError = new Error('mobile_pos_sync_test_rejected') as Error & { status?: number };
                testError.status = response.status;
                logMobileOwnerFailure('mobile_pos_sync_test_failed', testError, {
                    ...getMobileOwnerStoreLogContext(storeDetails.storeId, storeDetails.tenantId),
                    responseOk: response.ok,
                    apiStatusCode: typeof data.statusCode === 'number' ? data.statusCode : undefined,
                });
                setTestResult({
                    success: false,
                    message: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
                });
            } else {
                setTestResult({
                    success: false,
                    message: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
                });
            }
        } catch (error) {
            logMobileOwnerFailure('mobile_pos_sync_test_failed', error, getMobileOwnerStoreLogContext(storeDetails.storeId, storeDetails.tenantId));
            setTestResult({
                success: false,
                message: POS_SYNC_CONNECTION_ISSUE_MESSAGE,
            });
        } finally {
            setIsTesting(false);
        }
    };

    const statusColor = currentPosSync.status === 'healthy' ? 'success' : currentPosSync.status === 'disabled' ? 'default' : 'warning';
    const syncDisabled = currentPosSync.status === 'disabled';
    const statusLabel = currentPosSync.status === 'healthy'
        ? t('connectedStatus')
        : syncDisabled
            ? t('disabledStatus')
            : t('connectionIssue');
    const statusDescription = syncDisabled
        ? t('disabledStatusDesc')
        : t('version', { version: currentPosSync.menuVersion });
    const truthTagStyle = {
        backgroundColor: token.colorPrimaryBg,
        borderColor: token.colorPrimaryBorder,
        color: token.colorPrimaryText,
    };
    const trustBullets = [
        t('trustBullet1'),
        t('trustBullet2'),
        t('trustBullet3'),
        t('trustBullet4'),
    ];
    const useCases = [
        t('whoUse1'),
        t('whoUse2'),
        t('whoUse3'),
    ];

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
                    <Flex gap={12} vertical>
                        <Flex gap={8} vertical>
                            <Tag style={{ ...truthTagStyle, alignSelf: 'flex-start' }}>{t('truthProtected')}</Tag>
                            <Text strong style={{ fontSize: 16 }}>{t('connectIntroTitle')}</Text>
                            <Text type="secondary">{t('connectIntroDesc')}</Text>
                        </Flex>

                        <Flex
                            align="center"
                            gap={8}
                            justify="space-between"
                            style={{
                                background: token.colorFillQuaternary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 8,
                                padding: 12,
                            }}
                        >
                            <Text strong style={{ flex: 1 }}>{t('diagramSource')}</Text>
                            <LuArrowRight color={token.colorPrimary} size={18} />
                            <Text strong style={{ flex: 1, textAlign: 'right' }}>{t('diagramDestination')}</Text>
                        </Flex>

                        <Flex gap={8} vertical>
                            {trustBullets.map((bullet) => (
                                <Flex align="flex-start" gap={8} key={bullet}>
                                    <LuCheck color={token.colorSuccess} size={16} style={{ flex: '0 0 auto', marginTop: 2 }} />
                                    <Text>{bullet}</Text>
                                </Flex>
                            ))}
                        </Flex>

                        <Collapse defaultActiveKey={['who']}>
                            <Collapse.Panel key="who" title={<Text strong>{t('whoUseTitle')}</Text>}>
                                <Flex gap={8} vertical>
                                    <Text>{t('whoUseIntro')}</Text>
                                    {useCases.map((useCase) => (
                                        <Flex align="flex-start" gap={8} key={useCase}>
                                            <LuCheck color={token.colorSuccess} size={16} style={{ flex: '0 0 auto', marginTop: 2 }} />
                                            <Text>{useCase}</Text>
                                        </Flex>
                                    ))}
                                    <Text type="secondary">{t('whoIgnore')}</Text>
                                </Flex>
                            </Collapse.Panel>
                        </Collapse>

                        <Text type="secondary">{t('truthProtectedDesc')}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={10}>
                            <Flex align="center" justify="center" style={{ background: token.colorPrimaryBg, borderRadius: 12, height: 40, width: 40 }}>
                                {currentPosSync.status === 'healthy' ? <LuWifi color={token.colorPrimary} size={20} /> : <LuWifiOff color={token.colorWarning} size={20} />}
                            </Flex>
                            <Flex gap={2} vertical>
                                <Text strong>{statusLabel}</Text>
                                <Text type="secondary">{statusDescription}</Text>
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
                                <LuShield color={token.colorTextSecondary} size={18} />
                                <Text strong>{t('signingSecret')}</Text>
                            </Flex>
                            <Tag>{webhookSecret ? 'Ready' : 'Missing'}</Tag>
                        </Flex>
                        <Text style={{ wordBreak: 'break-all' }}>{webhookSecret ? (secretVisible ? webhookSecret : formatWebhookSecretPreview(webhookSecret)) : 'Generate a secret after enabling external sync.'}</Text>
                        <Text type="secondary">{t('signingSecretHelp')}</Text>
                        <Flex gap={8} wrap="wrap">
                            <Button disabled={!webhookSecret} fill="outline" onClick={() => setSecretVisible((current) => !current)} style={{ flex: '1 1 112px' }}>
                                <Flex align="center" gap={6} justify="center">
                                    {secretVisible ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                                    <Text>{secretVisible ? 'Hide' : 'Reveal'}</Text>
                                </Flex>
                            </Button>
                            <Button disabled={!webhookSecret} fill="outline" onClick={() => void handleCopySecret()} style={{ flex: '1 1 112px' }}>
                                <Flex align="center" gap={6}>
                                    <LuCopy size={16} />
                                    <Text>{t('copySecret')}</Text>
                                </Flex>
                            </Button>
                            <Button fill="outline" onClick={() => void handleRegenerateSecret()} style={{ flex: '1 1 112px' }}>
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
                            <Tag color={testResult.success ? 'success' : 'error'}>
                                {testResult.message}
                            </Tag>
                        ) : null}
                        {currentPosSync.lastError ? (
                            <Text type="secondary">{POS_SYNC_CONNECTION_ISSUE_MESSAGE}</Text>
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
                title="Regenerate verification secret"
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
                        Your current secret will stop working immediately. Share the new secret with your provider or their existing connection will fail.
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
