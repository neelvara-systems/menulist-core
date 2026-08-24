'use client';

import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { useAnswerlatticeCacheScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import {
    AnswerlatticeWorkflowIntegrationTestResponseSchema,
    AnswerlatticeWorkflowIntegrationsResponseSchema,
    type AnswerlatticeWorkflowIntegrationEventType,
    type AnswerlatticeWorkflowIntegrationsResponse,
} from '@lib/answerlattice/workflowIntegrationContracts';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Divider,
    Flex,
    Form,
    Grid,
    Input,
    Select,
    Skeleton,
    Space,
    Switch,
    Tag,
    Typography,
    message,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuBell, LuSave, LuSend } from 'react-icons/lu';

const { Title, Text } = Typography;
const ANSWERLATTICE_INTEGRATIONS_LOAD_FAILED = 'Could not load workflow notifications';
const ANSWERLATTICE_INTEGRATIONS_SAVE_FAILED = 'Could not save workflow notifications';
const ANSWERLATTICE_INTEGRATIONS_TEST_FAILED = 'Could not send test notification';
const ANSWERLATTICE_LAST_DELIVERY_NEEDS_REVIEW = 'Last delivery needs review';
const ANSWERLATTICE_INTEGRATIONS_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_INTEGRATIONS_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_LABELS: Record<AnswerlatticeWorkflowIntegrationEventType, string> = {
    coverage_drop: 'Coverage drop',
    ai_failure_recurring: 'Repeated AI workflow failure',
    nightly_summary: 'Nightly governance summary',
};

type WorkflowIntegrationsForm = {
    slack: {
        enabled: boolean;
        webhookUrl?: string;
        clearWebhook?: boolean;
        channel?: string;
        eventFilters: AnswerlatticeWorkflowIntegrationEventType[];
    };
    email: {
        enabled: boolean;
        recipients: string[];
        eventFilters: AnswerlatticeWorkflowIntegrationEventType[];
    };
};

type IntegrationsResponseKind = 'integrations_load' | 'integrations_save' | 'integrations_test';

const getResponseLogContext = (kind: IntegrationsResponseKind, response: Response) => ({
    ...getBoundedAnswerlatticeStringContext('responseKind', kind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readWorkflowIntegrationResponse = async <T,>(
    response: Response,
    kind: IntegrationsResponseKind,
    parse: (value: unknown) => { success: boolean; data?: T },
    fallbackMessage: string,
): Promise<T> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_INTEGRATIONS_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_workflow_integrations_response_parse_failed',
            error,
            getResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_workflow_integrations_response_rejected',
            undefined,
            getResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    const parsed = parse(payload);
    if (!parsed.success || !parsed.data) {
        logAnswerlatticeFailure(
            'answerlattice_workflow_integrations_response_invalid',
            undefined,
            getResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    return parsed.data;
};

export default function AnswerlatticeWorkflowNotifications() {
    const cacheScopeKey = useAnswerlatticeCacheScope();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const refreshTimerRef = useRef<number | null>(null);
    const currentScopeKeyRef = useRef(cacheScopeKey);
    const loadRequestRef = useRef(0);
    const [form] = Form.useForm<WorkflowIntegrationsForm>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [eventTypes, setEventTypes] = useState<AnswerlatticeWorkflowIntegrationEventType[]>([]);
    const [health, setHealth] = useState<AnswerlatticeWorkflowIntegrationsResponse['health'] | null>(null);
    const [slackWebhookConfigured, setSlackWebhookConfigured] = useState(false);
    const [hasSavedAdapter, setHasSavedAdapter] = useState(false);
    const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
    currentScopeKeyRef.current = cacheScopeKey;
    const scopeIsCurrent = Boolean(cacheScopeKey && loadedScopeKey === cacheScopeKey);

    const applyResponse = useCallback(
        (data: AnswerlatticeWorkflowIntegrationsResponse, options: { preserveHealth?: boolean } = {}) => {
            const defaults = data.defaultEventFilters;
            setEventTypes(data.eventTypes);
            if (!options.preserveHealth) setHealth(data.health);
            setSlackWebhookConfigured(data.slack.webhookConfigured);
            setHasSavedAdapter(data.slack.enabled || data.email.enabled);
            form.setFieldsValue({
                slack: {
                    enabled: data.slack.enabled,
                    webhookUrl: '',
                    clearWebhook: false,
                    channel: data.slack.channel,
                    eventFilters: data.slack.eventFilters.length ? data.slack.eventFilters : defaults,
                },
                email: {
                    enabled: data.email.enabled,
                    recipients: data.email.recipients,
                    eventFilters: data.email.eventFilters.length ? data.email.eventFilters : defaults,
                },
            });
        },
        [form],
    );

    const loadIntegrations = useCallback(async () => {
        const requestScopeKey = cacheScopeKey;
        const requestId = loadRequestRef.current + 1;
        loadRequestRef.current = requestId;
        if (!requestScopeKey) {
            form.resetFields();
            setEventTypes([]);
            setHealth(null);
            setSlackWebhookConfigured(false);
            setHasSavedAdapter(false);
            setLoadedScopeKey(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setSaving(false);
        setTesting(false);
        try {
            const response = await fetch('/api/answerlattice/integrations', {
                ...ANSWERLATTICE_INTEGRATIONS_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readWorkflowIntegrationResponse(
                response,
                'integrations_load',
                (value) => AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse(value),
                ANSWERLATTICE_INTEGRATIONS_LOAD_FAILED,
            );
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            applyResponse(data);
            setLoadedScopeKey(requestScopeKey);
        } catch {
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            form.resetFields();
            setEventTypes([]);
            setHealth(null);
            setSlackWebhookConfigured(false);
            setHasSavedAdapter(false);
            setLoadedScopeKey(requestScopeKey);
            message.error(ANSWERLATTICE_INTEGRATIONS_LOAD_FAILED);
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey && loadRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [applyResponse, cacheScopeKey, form]);

    useEffect(() => {
        loadIntegrations();
        return () => {
            if (refreshTimerRef.current !== null) {
                window.clearTimeout(refreshTimerRef.current);
            }
        };
    }, [loadIntegrations]);

    const handleSave = useCallback(async () => {
        const requestScopeKey = cacheScopeKey;
        if (!requestScopeKey || !scopeIsCurrent) return;
        setSaving(true);
        try {
            const values = await form.validateFields();
            if (currentScopeKeyRef.current !== requestScopeKey) return;
            const response = await fetch('/api/answerlattice/integrations', {
                ...ANSWERLATTICE_INTEGRATIONS_REQUEST_POLICY,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await readWorkflowIntegrationResponse(
                response,
                'integrations_save',
                (value) => AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse(value),
                ANSWERLATTICE_INTEGRATIONS_SAVE_FAILED,
            );
            if (currentScopeKeyRef.current !== requestScopeKey) return;
            applyResponse(data, { preserveHealth: true });
            message.success('Workflow notifications saved');
        } catch {
            if (currentScopeKeyRef.current === requestScopeKey) {
                message.error(ANSWERLATTICE_INTEGRATIONS_SAVE_FAILED);
            }
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey) setSaving(false);
        }
    }, [applyResponse, cacheScopeKey, form, scopeIsCurrent]);

    const handleTest = useCallback(async () => {
        const requestScopeKey = cacheScopeKey;
        if (!requestScopeKey || !scopeIsCurrent) return;
        setTesting(true);
        try {
            const response = await fetch('/api/answerlattice/integrations/test', {
                ...ANSWERLATTICE_INTEGRATIONS_REQUEST_POLICY,
                method: 'POST',
            });
            const data = await readWorkflowIntegrationResponse(
                response,
                'integrations_test',
                (value) => AnswerlatticeWorkflowIntegrationTestResponseSchema.safeParse(value),
                ANSWERLATTICE_INTEGRATIONS_TEST_FAILED,
            );
            if (currentScopeKeyRef.current !== requestScopeKey) return;
            message.success(data.message);
            if (refreshTimerRef.current !== null) {
                window.clearTimeout(refreshTimerRef.current);
            }
            refreshTimerRef.current = window.setTimeout(() => {
                refreshTimerRef.current = null;
                loadIntegrations();
            }, 2500);
        } catch {
            if (currentScopeKeyRef.current === requestScopeKey) {
                message.error(ANSWERLATTICE_INTEGRATIONS_TEST_FAILED);
            }
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey) setTesting(false);
        }
    }, [cacheScopeKey, loadIntegrations, scopeIsCurrent]);

    const eventTypeOptions = eventTypes.map((value) => ({
        value,
        label: EVENT_LABELS[value],
    }));

    const renderHealthStatus = (adapter: 'slack' | 'email') => {
        const status = health?.[adapter];
        if (!status?.lastAttemptAt) return <Text type="secondary">No delivery attempt yet.</Text>;
        const color = status.lastStatus === 'success' ? 'green' : status.lastStatus === 'rate_limited' ? 'gold' : 'red';
        return (
            <Flex vertical gap={4}>
                <Space wrap>
                    <Tag color={color}>{status.lastStatus || 'unknown'}</Tag>
                    <Text type="secondary">{new Date(status.lastAttemptAt).toLocaleString()}</Text>
                </Space>
                {status.lastError ? <Text type="secondary">{ANSWERLATTICE_LAST_DELIVERY_NEEDS_REVIEW}</Text> : null}
            </Flex>
        );
    };

    return (
        <Flex vertical gap={isMobile ? 14 : 20}>
            <div>
                <Title level={4} style={{ margin: 0 }}>
                    Workflow Notifications
                </Title>
                <Text type="secondary">Send bounded support-review events to saved Slack or email destinations.</Text>
            </div>

            <Card
                title={
                    <Flex align="center" gap={8}>
                        <LuBell size={16} /> Delivery Settings
                    </Flex>
                }
                extra={
                    !isMobile ? (
                        <Space>
                            <Button
                                icon={<LuSend size={14} />}
                                loading={testing}
                                disabled={!scopeIsCurrent || !hasSavedAdapter || loading}
                                onClick={handleTest}
                            >
                                Send Test
                            </Button>
                            <Button
                                type="primary"
                                icon={<LuSave size={14} />}
                                loading={saving}
                                disabled={!scopeIsCurrent || loading}
                                onClick={handleSave}
                            >
                                Save
                            </Button>
                        </Space>
                    ) : null
                }
            >
                <Form form={form} layout="vertical" component={false}>
                    {loading || !scopeIsCurrent ? (
                        <Skeleton active paragraph={{ rows: 5 }} />
                    ) : (
                        <Flex vertical gap={16}>
                            <Alert
                                type="info"
                                showIcon
                                message="Send review alerts to Slack or email."
                                description="Choose from the three active notification sources: nightly governance summaries, coverage drops, and repeated AI workflow failures. Save changes before testing. Slack webhook secrets remain server-side and are not returned after save."
                            />

                            <Card size="small" title="Slack">
                                <Flex vertical gap={12}>
                                    <Form.Item
                                        name={['slack', 'enabled']}
                                        valuePropName="checked"
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Switch checkedChildren="On" unCheckedChildren="Off" />
                                    </Form.Item>
                                    <Form.Item
                                        name={['slack', 'webhookUrl']}
                                        label={
                                            slackWebhookConfigured
                                                ? 'Slack webhook URL (already configured)'
                                                : 'Slack webhook URL'
                                        }
                                        dependencies={[
                                            ['slack', 'enabled'],
                                            ['slack', 'clearWebhook'],
                                        ]}
                                        extra={
                                            slackWebhookConfigured
                                                ? 'Leave blank to keep the saved webhook.'
                                                : 'Use a Slack incoming webhook URL from hooks.slack.com.'
                                        }
                                        rules={[
                                            ({ getFieldValue }) => ({
                                                validator: async (_, value) => {
                                                    const enabled = getFieldValue(['slack', 'enabled']) === true;
                                                    const clearWebhook =
                                                        getFieldValue(['slack', 'clearWebhook']) === true;
                                                    const candidate = String(value || '').trim();
                                                    if (enabled && clearWebhook) {
                                                        throw new Error(
                                                            'Turn Slack off before removing the saved webhook',
                                                        );
                                                    }
                                                    if (enabled && !slackWebhookConfigured && !candidate) {
                                                        throw new Error('Add a Slack webhook before enabling Slack');
                                                    }
                                                    if (candidate) {
                                                        try {
                                                            const url = new URL(candidate);
                                                            if (
                                                                url.protocol !== 'https:' ||
                                                                url.hostname !== 'hooks.slack.com' ||
                                                                !url.pathname.startsWith('/services/') ||
                                                                url.search ||
                                                                url.hash
                                                            ) {
                                                                throw new Error();
                                                            }
                                                        } catch {
                                                            throw new Error(
                                                                'Use a hooks.slack.com incoming webhook URL',
                                                            );
                                                        }
                                                    }
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password
                                            placeholder={
                                                slackWebhookConfigured
                                                    ? 'Saved webhook remains if blank'
                                                    : 'https://hooks.slack.com/services/...'
                                            }
                                            autoComplete="off"
                                            maxLength={500}
                                        />
                                    </Form.Item>
                                    {slackWebhookConfigured ? (
                                        <Form.Item
                                            name={['slack', 'clearWebhook']}
                                            valuePropName="checked"
                                            style={{ marginBottom: 0 }}
                                        >
                                            <Checkbox>Remove saved Slack webhook</Checkbox>
                                        </Form.Item>
                                    ) : null}
                                    <Form.Item name={['slack', 'channel']} label="Channel label">
                                        <Input placeholder="#support-review" maxLength={80} />
                                    </Form.Item>
                                    <Form.Item name={['slack', 'eventFilters']} label="Events">
                                        <Select
                                            mode="multiple"
                                            options={eventTypeOptions}
                                            placeholder="Choose events"
                                        />
                                    </Form.Item>
                                    <div>
                                        <Text strong>Delivery health</Text>
                                        <div style={{ marginTop: 6 }}>{renderHealthStatus('slack')}</div>
                                    </div>
                                </Flex>
                            </Card>

                            <Divider style={{ margin: '16px 0' }} />

                            <Card size="small" title="Email">
                                <Flex vertical gap={12}>
                                    <Form.Item
                                        name={['email', 'enabled']}
                                        valuePropName="checked"
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Switch checkedChildren="On" unCheckedChildren="Off" />
                                    </Form.Item>
                                    <Form.Item
                                        name={['email', 'recipients']}
                                        label="Recipients"
                                        dependencies={[['email', 'enabled']]}
                                        extra="Maximum 5 recipients. Delivery also requires Answerlattice SMTP configuration."
                                        rules={[
                                            ({ getFieldValue }) => ({
                                                validator: async (_, value) => {
                                                    const recipients = Array.isArray(value)
                                                        ? value.map((item) => String(item || '').trim()).filter(Boolean)
                                                        : [];
                                                    if (
                                                        getFieldValue(['email', 'enabled']) === true &&
                                                        recipients.length === 0
                                                    ) {
                                                        throw new Error(
                                                            'Add at least one recipient before enabling email',
                                                        );
                                                    }
                                                    if (recipients.length > 5) {
                                                        throw new Error('Use no more than 5 recipients');
                                                    }
                                                    if (
                                                        recipients.some(
                                                            (item) => item.length > 160 || !EMAIL_PATTERN.test(item),
                                                        )
                                                    ) {
                                                        throw new Error('Enter valid email addresses');
                                                    }
                                                },
                                            }),
                                        ]}
                                    >
                                        <Select
                                            mode="tags"
                                            tokenSeparators={[',', ' ']}
                                            placeholder="owner@example.com"
                                            maxTagCount="responsive"
                                        />
                                    </Form.Item>
                                    <Form.Item name={['email', 'eventFilters']} label="Events">
                                        <Select
                                            mode="multiple"
                                            options={eventTypeOptions}
                                            placeholder="Choose events"
                                        />
                                    </Form.Item>
                                    <div>
                                        <Text strong>Delivery health</Text>
                                        <div style={{ marginTop: 6 }}>{renderHealthStatus('email')}</div>
                                    </div>
                                </Flex>
                            </Card>
                            {isMobile ? (
                                <Flex vertical gap={8}>
                                    <Button
                                        block
                                        icon={<LuSend size={14} />}
                                        loading={testing}
                                        disabled={!scopeIsCurrent || !hasSavedAdapter}
                                        onClick={handleTest}
                                    >
                                        Send Test Notification
                                    </Button>
                                    <Button
                                        type="primary"
                                        block
                                        icon={<LuSave size={14} />}
                                        loading={saving}
                                        disabled={!scopeIsCurrent}
                                        onClick={handleSave}
                                    >
                                        Save Workflow Notifications
                                    </Button>
                                </Flex>
                            ) : null}
                        </Flex>
                    )}
                </Form>
            </Card>
        </Flex>
    );
}
