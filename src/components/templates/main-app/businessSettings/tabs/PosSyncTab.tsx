/**
 * POS Sync Tab — Business Settings
 *
 * Store-level POS webhook configuration.
 * Sections: Status Header, Config, Test Connection, Delivery Status, Recent Deliveries.
 * Silent when healthy. Visible only when broken.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_spec.md (UI Design)
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §5
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    Alert,
    Badge,
    Button,
    Card,
    Divider,
    Flex,
    Input,
    Modal,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
} from "antd";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from "react";
import {
    LuCheck,
    LuCopy,
    LuDownload,
    LuRefreshCw,
    LuSend,
    LuShield,
    LuWifi,
    LuWifiOff,
    LuX,
} from "react-icons/lu";

const { Title, Text } = Typography;
const REGENERATE_SECRET_CONFIRMATION = 'REGENERATE';

interface PosSyncTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
    onStoreUpdate?: (updates: Record<string, any>) => void;
}

interface DeliveryLogEntry {
    deliveryId: string;
    menuVersion: number;
    status: 'success' | 'failed' | 'timeout';
    responseCode: number | null;
    attempt: number;
    sentAt: string | null;
    duration: number;
    error: string | null;
}

const PosSyncTab: React.FC<PosSyncTabProps> = ({
    scrollRef,
    storeDetails,
    onStoreUpdate,
}) => {
    const t = useTranslations('PosSync');
    const posSync = storeDetails?.posSync;
    const storeId = storeDetails?.storeId;
    const tenantId = storeDetails?.tenantId;

    const [enabled, setEnabled] = useState(posSync?.enabled ?? false);
    const [webhookUrl, setWebhookUrl] = useState(posSync?.webhookUrl ?? '');
    const [webhookSecret, setWebhookSecret] = useState(posSync?.webhookSecret ?? '');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [deliveryEntries, setDeliveryEntries] = useState<DeliveryLogEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [secretVisible, setSecretVisible] = useState(false);
    const [regenerateSecretModalOpen, setRegenerateSecretModalOpen] = useState(false);
    const [regenerateSecretConfirmationText, setRegenerateSecretConfirmationText] = useState('');
    const [providerEmail, setProviderEmail] = useState('');
    const [sendingInstructions, setSendingInstructions] = useState(false);

    const status = posSync?.status || 'disabled';
    const lastSentAt = posSync?.lastSentAt;
    const menuVersion = posSync?.menuVersion || 0;

    const fetchDeliveryHistory = useCallback(async () => {
        if (!storeId) return;
        setLoadingEntries(true);
        try {
            const logsRef = collection(
                firebaseClient,
                DB_COLLECTIONS.STORES,
                String(storeId),
                DB_COLLECTIONS.POS_DELIVERY_LOGS,
            );
            const q = query(logsRef, orderBy('sentAt', 'desc'), limit(20));
            const snapshot = await getDocs(q);
            const entries = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    deliveryId: data.deliveryId || doc.id,
                    menuVersion: data.menuVersion || 0,
                    status: data.status || 'failed',
                    responseCode: data.responseCode ?? null,
                    attempt: data.attempt || 1,
                    sentAt: data.sentAt?.toDate?.()?.toISOString() || null,
                    duration: data.duration || 0,
                    error: data.error || null,
                } as DeliveryLogEntry;
            });
            setDeliveryEntries(entries);
        } catch {
            // Silent failure
        } finally {
            setLoadingEntries(false);
        }
    }, [storeId]);

    useEffect(() => {
        if (enabled && storeId) {
            fetchDeliveryHistory();
        }
    }, [enabled, storeId, fetchDeliveryHistory]);

    const handleToggle = useCallback((checked: boolean) => {
        setEnabled(checked);

        const updates: Record<string, any> = {
            'posSync.enabled': checked,
            'posSync.status': checked ? 'healthy' : 'disabled',
        };

        if (checked && !webhookSecret) {
            const bytes = new Uint8Array(32);
            crypto.getRandomValues(bytes);
            const newSecret = 'whsec_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            setWebhookSecret(newSecret);
            updates['posSync.webhookSecret'] = newSecret;
            updates['posSync.menuVersion'] = 0;
            updates['posSync.lastStatus'] = 'never_sent';
            updates['posSync.lastError'] = '';
            updates['posSync.instructionsSentCount'] = 0;
            updates['posSync.instructionsSentDate'] = '';
        }

        onStoreUpdate?.(updates);
    }, [webhookSecret, onStoreUpdate]);

    const handleSaveUrl = useCallback(() => {
        if (!webhookUrl.trim()) return;
        try {
            new URL(webhookUrl);
        } catch {
            message.error('Please enter a valid URL');
            return;
        }
        onStoreUpdate?.({ 'posSync.webhookUrl': webhookUrl.trim() });
        message.success('Webhook URL saved');
    }, [webhookUrl, onStoreUpdate]);

    const handleTest = useCallback(async () => {
        if (!storeId || !tenantId) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/pos-sync/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, tenantId }),
            });
            const data = await res.json();
            if (data.success) {
                setTestResult({
                    success: true,
                    message: `Webhook reachable (${data.responseTime}ms, HTTP ${data.statusCode})`,
                });
                fetchDeliveryHistory();
            } else {
                setTestResult({
                    success: false,
                    message: data.error || 'Could not reach webhook',
                });
            }
        } catch {
            setTestResult({ success: false, message: 'Network error' });
        } finally {
            setIsTesting(false);
        }
    }, [storeId, tenantId, fetchDeliveryHistory]);

    const handleRegenerateSecret = useCallback(() => {
        setRegenerateSecretConfirmationText('');
        setRegenerateSecretModalOpen(true);
    }, []);

    const confirmSecretRegeneration = useCallback(() => {
        if (regenerateSecretConfirmationText.trim() !== REGENERATE_SECRET_CONFIRMATION) {
            message.error(`Type ${REGENERATE_SECRET_CONFIRMATION} to continue.`);
            return;
        }

        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        const newSecret = 'whsec_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        setWebhookSecret(newSecret);
        setSecretVisible(true);
        onStoreUpdate?.({ 'posSync.webhookSecret': newSecret });
        setRegenerateSecretModalOpen(false);
        setRegenerateSecretConfirmationText('');
        message.success('New secret generated. Share it with your POS provider.');
    }, [onStoreUpdate, regenerateSecretConfirmationText]);

    const handleCopySecret = useCallback(() => {
        navigator.clipboard.writeText(webhookSecret);
        message.success('Secret copied to clipboard');
    }, [webhookSecret]);

    const handleSendInstructions = useCallback(async () => {
        if (!providerEmail.trim()) return;
        setSendingInstructions(true);
        try {
            const MAX_SENDS_PER_DAY = 3;
            const today = new Date().toISOString().split('T')[0];
            const sentDate = posSync?.instructionsSentDate || '';
            const sentCount = sentDate === today ? (posSync?.instructionsSentCount || 0) : 0;

            if (sentCount >= MAX_SENDS_PER_DAY) {
                message.error(`Maximum ${MAX_SENDS_PER_DAY} instruction emails per day. Try again tomorrow.`);
                return;
            }

            onStoreUpdate?.({
                'posSync.instructionsSentCount': sentCount + 1,
                'posSync.instructionsSentDate': today,
            });

            message.success(`Instructions prepared (${MAX_SENDS_PER_DAY - sentCount - 1} sends remaining today)`);
            setProviderEmail('');
        } catch {
            message.error('Failed to prepare instructions');
        } finally {
            setSendingInstructions(false);
        }
    }, [providerEmail, posSync, onStoreUpdate]);

    const handleCopyTechnicalSummary = useCallback(() => {
        const summary = [
            'MenuList POS Sync — Setup Info',
            '',
            'Webhook URL: Your POS endpoint that accepts POST requests',
            'Payload: Full menu snapshot (JSON)',
            'Security: HMAC-SHA256 signed (header: X-MenuList-Signature)',
            'Documentation: https://menulist.ai/pos-sync',
            '',
            'Headers sent with every delivery:',
            '- X-MenuList-Signature: HMAC-SHA256 signature',
            '- X-MenuList-Event: menu.full.sync',
            '- X-MenuList-Version: Menu version number',
            '- X-MenuList-Timestamp: Unix timestamp',
            '- X-MenuList-Delivery-Id: Unique delivery ID',
            '',
            'Your POS must respond with HTTP 200 within 5 seconds.',
        ].join('\n');
        navigator.clipboard.writeText(summary);
        message.success('Technical summary copied');
    }, []);

    const handleDownloadSample = useCallback(() => {
        const sample = {
            event: 'menu.full.sync',
            version: 1,
            timestamp: new Date().toISOString(),
            tenantId: 0,
            projectId: 'sample',
            storeId: 0,
            currency: 'INR',
            languages: [{ code: 'en', name: 'English', isPrimary: true }],
            menu: {
                categories: [
                    { id: 'cat_1', active: true, name: { en: 'Starters' }, orderIndex: 0 },
                ],
                items: [
                    {
                        id: 'item_1',
                        category: 'cat_1',
                        active: true,
                        available: true,
                        name: { en: 'Paneer Tikka' },
                        description: { en: 'Cottage cheese marinated in spices' },
                        price: '280',
                        tags: ['Vegetarian'],
                        isBestSeller: true,
                        duration: 15,
                        attributes: [
                            { id: 'item_1a1', name: { en: 'Half' }, price: '180', active: true },
                            { id: 'item_1a2', name: { en: 'Full' }, price: '280', active: true },
                        ],
                        orderIndex: 0,
                    },
                ],
            },
        };

        const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menulist-pos-sync-sample.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    const getStatusBadge = () => {
        switch (status) {
            case 'healthy':
                return <Badge status="success" text="Connected" />;
            case 'retrying':
                return <Badge status="processing" text="Retrying" />;
            case 'connection_issue':
                return <Badge status="error" text="Connection issue" />;
            default:
                return <Badge status="default" text="Disabled" />;
        }
    };

    const deliveryColumns = [
        {
            title: 'Time',
            dataIndex: 'sentAt',
            key: 'sentAt',
            width: 160,
            render: (val: string) => val ? new Date(val).toLocaleString() : '—',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (val: string) => {
                const color = val === 'success' ? 'green' : val === 'timeout' ? 'orange' : 'red';
                return <Tag color={color}>{val}</Tag>;
            },
        },
        {
            title: 'Code',
            dataIndex: 'responseCode',
            key: 'responseCode',
            width: 70,
            render: (val: number | null) => val ?? '—',
        },
        {
            title: 'Version',
            dataIndex: 'menuVersion',
            key: 'menuVersion',
            width: 80,
        },
        {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
            width: 90,
            render: (val: number) => `${val}ms`,
        },
    ];

    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) {
        return null;
    }

    return (
        <Card size="small" ref={scrollRef}>
            <Flex align="center" gap={8}>
                <LuShield size={20} style={{ color: '#1677ff' }} />
                <Title level={5} style={{ margin: 'unset' }}>
                    {t('title')}
                </Title>
            </Flex>
            <Divider />

            {/* Section 1: Status Header */}
            {enabled && (
                <Flex vertical gap={8} style={{ marginBottom: 16 }}>
                    {status === 'connection_issue' && (
                        <Alert
                            type="warning"
                            showIcon
                            icon={<LuWifiOff />}
                            message={t('connectionIssue')}
                            description={t('connectionIssueDesc')}
                        />
                    )}
                    {status === 'healthy' && (
                        <Flex align="center" gap={8}>
                            <Badge status="success" />
                            <Text type="secondary">
                                {t('connectedStatus')}
                                {lastSentAt && ` — ${t('version', { version: menuVersion })}`}
                            </Text>
                        </Flex>
                    )}
                </Flex>
            )}

            {/* Section 2: Enable & Config */}
            <Flex vertical gap={16}>
                <Flex justify="space-between" align="center">
                    <Flex vertical>
                        <Text strong>{t('enablePosSync')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('enablePosSyncDesc')}
                        </Text>
                    </Flex>
                    <Switch checked={enabled} onChange={handleToggle} />
                </Flex>

                {enabled && (
                    <>
                        <Flex vertical gap={8}>
                            <Text strong>{t('webhookUrl')}</Text>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input
                                    value={webhookUrl}
                                    onChange={e => setWebhookUrl(e.target.value)}
                                    placeholder={t('webhookUrlPlaceholder')}
                                />
                                <Button onClick={handleSaveUrl} type="primary">
                                    {t('save' as any)}
                                </Button>
                            </Space.Compact>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('webhookUrlHelp')}
                            </Text>
                        </Flex>

                        <Flex vertical gap={8}>
                            <Flex justify="space-between" align="center">
                                <Text strong>{t('signingSecret')}</Text>
                                <Space>
                                    <Tooltip title={t('copySecret')}>
                                        <Button
                                            size="small"
                                            icon={<LuCopy size={14} />}
                                            onClick={handleCopySecret}
                                        />
                                    </Tooltip>
                                    <Tooltip title={t('regenerateSecret')}>
                                        <Button
                                            size="small"
                                            icon={<LuRefreshCw size={14} />}
                                            onClick={handleRegenerateSecret}
                                        />
                                    </Tooltip>
                                </Space>
                            </Flex>
                            <Input.Password
                                value={webhookSecret}
                                readOnly
                                visibilityToggle={{
                                    visible: secretVisible,
                                    onVisibleChange: setSecretVisible,
                                }}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('signingSecretHelp')}
                            </Text>
                        </Flex>

                        <Divider style={{ margin: '8px 0' }} />

                        {/* Section 3: Test Connection */}
                        <Flex vertical gap={8}>
                            <Flex align="center" gap={8}>
                                <Button
                                    icon={<LuWifi size={14} />}
                                    onClick={handleTest}
                                    loading={isTesting}
                                    disabled={!webhookUrl}
                                >
                                    {t('sendTest')}
                                </Button>
                                {getStatusBadge()}
                            </Flex>
                            {testResult && (
                                <Alert
                                    type={testResult.success ? 'success' : 'error'}
                                    showIcon
                                    icon={testResult.success ? <LuCheck size={14} /> : <LuX size={14} />}
                                    message={testResult.message}
                                    style={{ marginTop: 4 }}
                                />
                            )}
                        </Flex>

                        <Divider style={{ margin: '8px 0' }} />

                        {/* Section 4: Delivery Status */}
                        {menuVersion > 0 && (
                            <Flex vertical gap={4} style={{ marginBottom: 8 }}>
                                <Text strong>{t('deliveryStatus')}</Text>
                                <Flex gap={16}>
                                    <Text type="secondary">
                                        {t('menuVersion')}: <Text strong>{menuVersion}</Text>
                                    </Text>
                                    <Text type="secondary">
                                        {t('lastStatus')}: <Text strong>{posSync?.lastStatus || t('neverSent')}</Text>
                                    </Text>
                                </Flex>
                            </Flex>
                        )}

                        {/* Section 5: Recent Deliveries */}
                        <Flex vertical gap={8}>
                            <Flex justify="space-between" align="center">
                                <Text strong>{t('recentDeliveries')}</Text>
                                <Button
                                    size="small"
                                    icon={<LuRefreshCw size={12} />}
                                    onClick={fetchDeliveryHistory}
                                    loading={loadingEntries}
                                >
                                    {t('refresh' as any)}
                                </Button>
                            </Flex>
                            <Table
                                dataSource={deliveryEntries}
                                columns={deliveryColumns}
                                rowKey="deliveryId"
                                size="small"
                                pagination={false}
                                loading={loadingEntries}
                                locale={{ emptyText: t('noDeliveries') }}
                                scroll={{ x: 500 }}
                            />
                        </Flex>

                        <Divider style={{ margin: '8px 0' }} />

                        {/* Activation Helpers */}
                        <Flex vertical gap={12}>
                            <Text strong>{t('setupTools')}</Text>

                            <Flex vertical gap={8}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('sendInstructions')}
                                </Text>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        value={providerEmail}
                                        onChange={e => setProviderEmail(e.target.value)}
                                        placeholder="pos-provider@example.com"
                                        type="email"
                                    />
                                    <Button
                                        icon={<LuSend size={14} />}
                                        onClick={handleSendInstructions}
                                        loading={sendingInstructions}
                                        disabled={!providerEmail.trim()}
                                    >
                                        {t('send' as any)}
                                    </Button>
                                </Space.Compact>
                            </Flex>

                            <Flex gap={8} wrap="wrap">
                                <Button
                                    size="small"
                                    icon={<LuDownload size={12} />}
                                    onClick={handleDownloadSample}
                                >
                                    {t('downloadSamplePayload')}
                                </Button>
                                <Button
                                    size="small"
                                    icon={<LuCopy size={12} />}
                                    onClick={handleCopyTechnicalSummary}
                                >
                                    {t('copyTechnicalSummary')}
                                </Button>
                            </Flex>
                        </Flex>
                    </>
                )}
            </Flex>

            <Modal
                title="Regenerate Signing Secret"
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
            >
                <Flex vertical gap={12}>
                    <Text>
                        The current secret will stop working immediately. Share the new secret with your POS provider or their existing webhook configuration will fail.
                    </Text>
                    <Text type="secondary">
                        Type {REGENERATE_SECRET_CONFIRMATION} to confirm.
                    </Text>
                    <Input
                        value={regenerateSecretConfirmationText}
                        onChange={(event) => setRegenerateSecretConfirmationText(event.target.value)}
                        placeholder={`Type ${REGENERATE_SECRET_CONFIRMATION}`}
                    />
                </Flex>
            </Modal>
        </Card>
    );
};

export default PosSyncTab;
