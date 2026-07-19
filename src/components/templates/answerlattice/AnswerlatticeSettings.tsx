'use client';

/**
 * Answerlattice Dashboard — Settings Template
 *
 * General workspace settings entry point. Widget installation/configuration
 * lives in /answerlattice/widget to keep a single save path and runtime contract.
 */

import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import TIMEZONES_LIST from '@data/timeZones';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import {
    AnswerlatticeWorkspaceProfileResponseSchema,
    type AnswerlatticeWorkspaceProfile as WorkspaceProfile,
    type AnswerlatticeWorkspaceProfileResponse as WorkspaceProfileResponse,
    isSafeAnswerlatticeProductUrl,
} from '@lib/answerlattice/workspaceProfileContracts';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { Alert, Button, Card, Descriptions, Flex, Form, Grid, Input, Select, Skeleton, Space, Tag, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LuCode, LuSave, LuSettings } from 'react-icons/lu';
import AnswerlatticeSupportTruthExport from './settings/AnswerlatticeSupportTruthExport';

const { Title, Text } = Typography;
const ANSWERLATTICE_PROFILE_LOAD_FAILED = 'Could not load product details';
const ANSWERLATTICE_PROFILE_SAVE_FAILED = 'Could not save product details';
const ANSWERLATTICE_SETTINGS_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_SETTINGS_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type AnswerlatticeSettingsResponseKind =
    | 'profile_load'
    | 'profile_save';

const SURFACE_OPTIONS = [
    { label: 'Billing', value: 'billing' },
    { label: 'Onboarding', value: 'onboarding' },
    { label: 'Settings', value: 'settings' },
    { label: 'Team', value: 'team' },
    { label: 'Integrations', value: 'integrations' },
    { label: 'Release notes', value: 'release_notes' },
];

const TIMEZONE_OPTIONS = (TIMEZONES_LIST as Array<{ label: string; tzCode: string }>).map((zone) => ({
    label: zone.label,
    value: zone.tzCode,
}));

const isWorkspaceProfileResponse = (value: unknown): value is WorkspaceProfileResponse => {
    return AnswerlatticeWorkspaceProfileResponseSchema.safeParse(value).success;
};

const getSettingsResponseLogContext = (kind: AnswerlatticeSettingsResponseKind, response: Response) => ({
    ...getBoundedAnswerlatticeStringContext('responseKind', kind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readAnswerlatticeSettingsResponse = async <T,>(
    response: Response,
    kind: AnswerlatticeSettingsResponseKind,
    isValid: (value: unknown) => value is T,
    fallbackMessage: string,
): Promise<T> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, ANSWERLATTICE_SETTINGS_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_settings_response_parse_failed',
            error,
            getSettingsResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_settings_response_rejected',
            undefined,
            getSettingsResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    if (!isValid(payload)) {
        logAnswerlatticeFailure(
            'answerlattice_settings_response_invalid',
            undefined,
            getSettingsResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    return payload;
};

export default function AnswerlatticeSettings() {
    const session = useClientAuthSession();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const [form] = Form.useForm<WorkspaceProfile>();
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [workspaceProfileRevision, setWorkspaceProfileRevision] = useState<number | null>(null);

    const loadProfile = useCallback(async () => {
        setLoadingProfile(true);
        try {
            const response = await fetch('/api/answerlattice/workspace-profile', {
                ...ANSWERLATTICE_SETTINGS_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readAnswerlatticeSettingsResponse(
                response,
                'profile_load',
                isWorkspaceProfileResponse,
                ANSWERLATTICE_PROFILE_LOAD_FAILED,
            );
            form.setFieldsValue(data.profile);
            setWorkspaceProfileRevision(data.revision);
        } catch {
            setWorkspaceProfileRevision(null);
            message.error(ANSWERLATTICE_PROFILE_LOAD_FAILED);
        } finally {
            setLoadingProfile(false);
        }
    }, [form]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleSaveProfile = useCallback(async () => {
        setSavingProfile(true);
        try {
            if (workspaceProfileRevision === null) {
                throw new Error(ANSWERLATTICE_PROFILE_SAVE_FAILED);
            }
            const values = await form.validateFields();
            const response = await fetch('/api/answerlattice/workspace-profile', {
                ...ANSWERLATTICE_SETTINGS_REQUEST_POLICY,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    expectedRevision: workspaceProfileRevision,
                }),
            });
            if (response.status === 409) {
                message.warning('Product details changed in another session. The latest values have been reloaded.');
                await loadProfile();
                return;
            }
            const data = await readAnswerlatticeSettingsResponse(
                response,
                'profile_save',
                isWorkspaceProfileResponse,
                ANSWERLATTICE_PROFILE_SAVE_FAILED,
            );
            form.setFieldsValue(data.profile);
            setWorkspaceProfileRevision(data.revision);
            message.success('Product details saved');
        } catch {
            message.error(ANSWERLATTICE_PROFILE_SAVE_FAILED);
        } finally {
            setSavingProfile(false);
        }
    }, [form, loadProfile, workspaceProfileRevision]);

    return (
        <Flex vertical gap={isMobile ? 14 : 20}>
            <div>
                <Title level={4} style={{ margin: 0 }}>Product Details</Title>
                <Text type="secondary">Workspace profile and management shortcuts</Text>
            </div>

            <Card
                title={<Flex align="center" gap={8}><LuSettings size={16} /> Workspace Profile</Flex>}
                extra={!isMobile && (
                    <Button
                        type="primary"
                        icon={<LuSave size={14} />}
                        loading={savingProfile}
                        disabled={workspaceProfileRevision === null}
                        onClick={handleSaveProfile}
                    >
                        Save
                    </Button>
                )}
            >
                {loadingProfile ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                ) : (
                    <Flex vertical gap={16}>
                        <Alert
                            type="info"
                            showIcon
                            message="These details power setup, widget verification, and support routing."
                            description="Use Product Surfaces for detailed page mapping after saving the main profile."
                        />
                        <Form form={form} layout="vertical">
                            <Form.Item
                                name="productName"
                                label="Product name"
                                rules={[
                                    { required: true, message: 'Product name is required' },
                                    { max: 120, message: 'Product name must be 120 characters or fewer' },
                                ]}
                            >
                                <Input placeholder="Acme CRM" maxLength={120} />
                            </Form.Item>
                            <Form.Item
                                name="productUrl"
                                label="Product URL"
                                rules={[
                                    {
                                        validator: async (_, value) => {
                                            const candidate = String(value || '').trim();
                                            if (!candidate || isSafeAnswerlatticeProductUrl(candidate)) return;
                                            throw new Error('Use an HTTP or HTTPS URL without embedded credentials');
                                        },
                                    },
                                ]}
                            >
                                <Input placeholder="https://app.example.com" maxLength={300} />
                            </Form.Item>
                            <Form.Item
                                name="supportEmail"
                                label="Support email"
                                rules={[
                                    { type: 'email', message: 'Enter a valid support email' },
                                    { max: 160, message: 'Support email must be 160 characters or fewer' },
                                ]}
                            >
                                <Input placeholder="support@example.com" maxLength={160} />
                            </Form.Item>
                            <Form.Item name="billingModel" label="Billing model" initialValue="subscription">
                                <Select
                                    options={[
                                        { value: 'subscription', label: 'Subscription' },
                                        { value: 'usage', label: 'Usage based' },
                                        { value: 'one_time', label: 'One-time payment' },
                                        { value: 'not_sure', label: 'Not sure yet' },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item
                                name="primarySurfaces"
                                label="Main product pages"
                                initialValue={['billing', 'onboarding', 'settings']}
                                rules={[
                                    {
                                        validator: async (_, value) => {
                                            if (!Array.isArray(value) || value.length <= 8) return;
                                            throw new Error('Choose no more than 8 main product pages');
                                        },
                                    },
                                ]}
                            >
                                <Select mode="multiple" options={SURFACE_OPTIONS} placeholder="Select the pages users ask about most" />
                            </Form.Item>
                            <Form.Item name="timeZone" label="Workspace timezone" initialValue="UTC">
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    options={TIMEZONE_OPTIONS}
                                    placeholder="UTC"
                                />
                            </Form.Item>
                            <Form.Item name="businessDayEndTime" label="Support day ends" initialValue="00:00">
                                <Input type="time" />
                            </Form.Item>
                        </Form>
                        {isMobile && (
                            <Button
                                type="primary"
                                block
                                icon={<LuSave size={14} />}
                                loading={savingProfile}
                                disabled={workspaceProfileRevision === null}
                                onClick={handleSaveProfile}
                            >
                                Save Product Details
                            </Button>
                        )}
                    </Flex>
                )}
            </Card>

            <Card title="Account Reference">
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Signed in as">{session?.user?.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Account reference">{session?.tId || session?.user?.tenantId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Workspace reference">{session?.sId || session?.user?.storeId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Product"><Tag color="blue">Answerlattice</Tag></Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title={<Flex align="center" gap={8}><LuCode size={16} /> Widget Management</Flex>}>
                <Flex vertical gap={12}>
                    <Flex vertical={isMobile} align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12}>
                        <Text type="secondary">
                            Configure the embeddable widget, create keys, copy install code, set origins, blocked routes, and preview desktop/mobile behavior.
                        </Text>
                        <Button type="primary" onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.WIDGET, currentHostname))}>
                            Open Widget Management
                        </Button>
                    </Flex>
                    <Space wrap>
                        <Button onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.PRODUCT_SURFACES, currentHostname))}>
                            Map Product Surfaces
                        </Button>
                    </Space>
                </Flex>
            </Card>

            <AnswerlatticeSupportTruthExport />

        </Flex>
    );
}
