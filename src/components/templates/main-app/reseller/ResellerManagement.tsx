'use client';

import { RESELLER_CAPS } from "@config/resellerPricing";
import { formatInrPaise } from "@util/formatters";
import {
    Alert, Badge, Button, Card, Col, Descriptions, Drawer, Empty, Flex, Form, Input, InputNumber,
    App,
    Row, Space, Spin, Statistic, Switch, Table,
    Typography,
    theme,
} from "antd";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    isResellerManagementDraftChanged,
    isResellerManagementProfilesResponse,
    type ResellerManagementProfile,
    type ResellerManagementProfilesResponse,
} from "@lib/reseller/resellerManagementProfile";
import {
    LuCheck, LuPencil,
    LuPhone, LuPlus, LuRefreshCw, LuUser, LuUsers
} from "react-icons/lu";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import {
    isResellerMonthlySummary,
    type ResellerMonthlySummary,
} from "@lib/reseller/resellerMonthlySummary";
import {
    RESELLER_REQUEST_POLICY,
    createResellerStatusError,
    getBoundedResellerStringContext,
    logResellerFailure,
} from "./resellerDiagnostics";

const { Title, Text, Paragraph } = Typography;
const RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024;

type ResellerManagementSaveResponse = {
    action: 'created' | 'updated';
    profileId: string;
    success: true;
};

type ResellerManagementResponseContext = {
    action: string;
    isEditing?: boolean;
};

type ResellerManagementFormValues = {
    active?: boolean;
    addressLine?: string;
    city?: string;
    country?: string;
    email?: string;
    maxOfflineActivations?: number;
    name?: string;
    notes?: string;
    password?: string;
    phone?: string;
    postalCode?: string;
    state?: string;
    username?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const isValidResellerManagementSaveResponse = (data: unknown): data is ResellerManagementSaveResponse => (
    isRecord(data)
    && data.success === true
    && isNonEmptyString(data.profileId)
    && (data.action === 'created' || data.action === 'updated')
);

const isExpectedResellerManagementSaveResponse = (
    data: unknown,
    expectedProfileId?: string,
): data is ResellerManagementSaveResponse => (
    isValidResellerManagementSaveResponse(data)
    && (
        data.action === 'created'
        || (isNonEmptyString(expectedProfileId) && data.profileId === expectedProfileId)
    )
);

const readResellerManagementResponse = async (
    response: Response,
    context: ResellerManagementResponseContext,
): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logResellerFailure('desktop_reseller_management_response_parse_failed', error, {
            ...context,
            maxBytes: RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        throw error;
    }
};

/**
 * Reseller Management — Platform Admin Only
 * 
 * This screen is ONLY accessible to PLATFORM role users (founder).
 * Resellers themselves CANNOT access this screen.
 * Protected by the page-level platform role check and platform-only API routes.
 * 
 * Features:
 * - List all reseller profiles with stats
 * - Create new reseller profile
 * - Edit existing reseller profile
 * - View reseller stats (stores onboarded, revenue, etc.)
 */
function ResellerManagement() {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const [profiles, setProfiles] = useState<ResellerManagementProfile[]>([]);
    const [profileEvidence, setProfileEvidence] = useState<Pick<ResellerManagementProfilesResponse, "invalidProfileCount" | "isCapped" | "isPartial"> | null>(null);
    const [monthlySummary, setMonthlySummary] = useState<ResellerMonthlySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [monthlyLoading, setMonthlyLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ResellerManagementProfile | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm<ResellerManagementFormValues>();

    // Gate: PLATFORM role only
    const platformRole = session?.platformRole || session?.user?.platformRole;
    if (session && platformRole !== 'PLATFORM') {
        redirect('/dashboard');
    }

    const loadProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY);
            if (!res.ok) throw createResellerStatusError('desktop_reseller_profiles_load_rejected', res.status);
            const data = await readResellerManagementResponse(res, { action: 'load_profiles' });
            if (!isResellerManagementProfilesResponse(data)) {
                const invalidResponseError = createResellerStatusError('desktop_reseller_management_profiles_response_invalid', res.status);
                logResellerFailure('desktop_reseller_management_profiles_response_invalid', invalidResponseError, {
                    action: 'load_profiles',
                    responseOk: res.ok,
                    responseStatus: res.status,
                });
                throw invalidResponseError;
            }
            setProfiles(data.profiles);
            setProfileEvidence({
                invalidProfileCount: data.invalidProfileCount,
                isCapped: data.isCapped,
                isPartial: data.isPartial,
            });
        } catch (error) {
            logResellerFailure('desktop_reseller_profiles_load_failed', error, {
                action: 'load_profiles',
            });
            messageApi.error('Failed to load reseller profiles');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMonthlySummary = useCallback(async () => {
        setMonthlyLoading(true);
        try {
            const res = await fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY);
            if (!res.ok) throw createResellerStatusError('desktop_reseller_monthly_summary_load_rejected', res.status);
            const data = await readResellerManagementResponse(res, { action: 'load_monthly_summary' });
            if (!isResellerMonthlySummary(data)) {
                const invalidResponseError = createResellerStatusError('desktop_reseller_management_monthly_summary_response_invalid', res.status);
                logResellerFailure('desktop_reseller_management_monthly_summary_response_invalid', invalidResponseError, {
                    action: 'load_monthly_summary',
                    responseOk: res.ok,
                    responseStatus: res.status,
                });
                throw invalidResponseError;
            }
            setMonthlySummary(data);
        } catch (error) {
            logResellerFailure('desktop_reseller_monthly_summary_load_failed', error, {
                action: 'load_monthly_summary',
            });
            messageApi.error('Failed to load monthly reseller summary');
        } finally {
            setMonthlyLoading(false);
        }
    }, []);

    useEffect(() => {
        if (platformRole === 'PLATFORM') {
            loadProfiles();
            loadMonthlySummary();
        }
    }, [loadMonthlySummary, loadProfiles, platformRole]);

    const handleCreateOrUpdate = async (values: ResellerManagementFormValues) => {
        if (editingProfile && !isResellerManagementDraftChanged(values, editingProfile)) {
            messageApi.info('No reseller changes to save');
            return;
        }
        setSaving(true);
        try {
            const normalizedPassword = values.password?.trim();
            const { password: _password, ...profileValues } = values;
            const payload = editingProfile
                ? {
                    ...profileValues,
                    ...(normalizedPassword ? { password: normalizedPassword } : {}),
                    profileId: editingProfile.id,
                }
                : {
                    ...profileValues,
                    password: normalizedPassword,
                };

            const res = await fetch('/api/reseller/manage', {
                ...RESELLER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw createResellerStatusError('desktop_reseller_save_rejected', res.status);
            }

            const result = await readResellerManagementResponse(res, {
                action: editingProfile ? 'update_profile' : 'create_profile',
                isEditing: Boolean(editingProfile),
            });
            if (!isExpectedResellerManagementSaveResponse(result, editingProfile?.id)) {
                const invalidResponseError = createResellerStatusError('desktop_reseller_management_save_response_invalid', res.status);
                logResellerFailure('desktop_reseller_management_save_response_invalid', invalidResponseError, {
                    action: editingProfile ? 'update_profile' : 'create_profile',
                    hasExpectedProfileId: isRecord(result) && result.profileId === editingProfile?.id,
                    isEditing: Boolean(editingProfile),
                    responseOk: res.ok,
                    responseStatus: res.status,
                });
                throw invalidResponseError;
            }
            messageApi.success(`Reseller ${result.action} successfully`);
            setDrawerOpen(false);
            setEditingProfile(null);
            form.resetFields();
            loadProfiles();
        } catch (error) {
            logResellerFailure('desktop_reseller_save_failed', error, {
                action: editingProfile ? 'update_profile' : 'create_profile',
                ...getBoundedResellerStringContext('profileId', editingProfile?.id),
                ...getBoundedResellerStringContext('email', values?.email),
                ...getBoundedResellerStringContext('username', values?.username),
            });
            messageApi.error('Failed to save reseller');
        } finally {
            setSaving(false);
        }
    };

    const openCreateDrawer = () => {
        setEditingProfile(null);
        form.resetFields();
        form.setFieldsValue({
            maxOfflineActivations: RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER,
            active: true,
        });
        setDrawerOpen(true);
    };

    const openEditDrawer = (profile: ResellerManagementProfile) => {
        setEditingProfile(profile);
        form.setFieldsValue({
            name: profile.name,
            phone: profile.phone,
            email: profile.email,
            username: profile.username,
            password: '',
            addressLine: profile.addressLine,
            city: profile.city,
            state: profile.state,
            postalCode: profile.postalCode,
            country: profile.country,
            notes: profile.notes,
            maxOfflineActivations: profile.maxOfflineActivations,
            active: profile.active,
        });
        setDrawerOpen(true);
    };

    // Columns for the resellers table
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: ResellerManagementProfile) => (
                <Flex vertical>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>@{record.username}</Text>
                </Flex>
            ),
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_: unknown, record: ResellerManagementProfile) => (
                <Flex vertical>
                    <Text>{record.phone}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                </Flex>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (active: boolean) => (
                <Badge status={active ? 'success' : 'error'} text={active ? 'Active' : 'Inactive'} />
            ),
        },
        {
            title: 'Stores',
            dataIndex: 'totalStoresOnboarded',
            key: 'stores',
            render: (total: number, record: ResellerManagementProfile) => (
                <Flex vertical>
                    <Text strong>{total || 0}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {record.totalOnlineStores || 0} online / {record.totalOfflineStores || 0} offline
                    </Text>
                </Flex>
            ),
        },
        {
            title: 'Offline Cap',
            key: 'cap',
            render: (_: unknown, record: ResellerManagementProfile) => (
                <Text>
                    {record.currentActiveOfflineStores || 0} / {record.maxOfflineActivations || 20}
                </Text>
            ),
        },
        {
            title: 'Revenue',
            dataIndex: 'totalRevenueCollectedPaise',
            key: 'revenue',
            render: (paise: number) => (
                <Text strong>{formatInrPaise(paise)}</Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: ResellerManagementProfile) => (
                <Button aria-label={`Edit reseller ${record.name}`} size="small" icon={<LuPencil />} onClick={() => openEditDrawer(record)}>
                    Edit
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Reseller Management</Title>
                    <Text type="secondary">Create and manage reseller profiles (Platform Admin Only)</Text>
                </div>
                <Space>
                    <Button icon={<LuRefreshCw />} onClick={() => { loadProfiles(); loadMonthlySummary(); }} loading={loading || monthlyLoading}>Refresh</Button>
                    <Button type="primary" icon={<LuPlus />} onClick={openCreateDrawer}>
                        Add Reseller
                    </Button>
                </Space>
            </Flex>

            {profileEvidence?.isPartial ? (
                <Alert
                    showIcon
                    style={{ marginBottom: 16 }}
                    type="warning"
                    message={profileEvidence.invalidProfileCount > 0
                        ? `${profileEvidence.invalidProfileCount} invalid reseller profile${profileEvidence.invalidProfileCount === 1 ? "" : "s"} excluded.`
                        : "Only the newest 50 reseller profiles are shown."}
                />
            ) : null}

            {/* Summary Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title="Total Resellers" value={profiles.length} prefix={<LuUsers />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title="Active" value={profiles.filter(p => p.active).length} valueStyle={{ color: token.colorSuccess }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Total Stores"
                            value={profiles.reduce((sum, p) => sum + (p.totalStoresOnboarded || 0), 0)}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="Total Revenue"
                            value={formatInrPaise(profiles.reduce((sum, p) => sum + (p.totalRevenueCollectedPaise || 0), 0))}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                loading={monthlyLoading}
                title={`This Month${monthlySummary?.month ? ` (${monthlySummary.month})` : ''}`}
                style={{ marginBottom: 24 }}
            >
                {monthlySummary?.isPartial ? (
                    <Text type="warning">
                        This report is incomplete{monthlySummary.invalidRowCount > 0
                            ? `; ${monthlySummary.invalidRowCount} invalid transaction ${monthlySummary.invalidRowCount === 1 ? 'row was' : 'rows were'} excluded`
                            : ' because the monthly limit was reached'}.
                    </Text>
                ) : null}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={12} md={6}>
                        <Statistic title="Clients" value={monthlySummary?.totals.clientCount || 0} />
                    </Col>
                    <Col xs={12} md={6}>
                        <Statistic title="Transactions" value={monthlySummary?.totals.transactionCount || 0} />
                    </Col>
                    <Col xs={12} md={6}>
                        <Statistic title="Offline Collected" value={formatInrPaise(monthlySummary?.totals.offlineCollectedPaise)} />
                    </Col>
                    <Col xs={12} md={6}>
                        <Statistic title="Online Pending" value={formatInrPaise(monthlySummary?.totals.onlinePendingPaise)} />
                    </Col>
                </Row>
                <Table
                    columns={[
                        {
                            title: 'Reseller',
                            dataIndex: 'resellerName',
                            key: 'resellerName',
                            render: (name: string, record: ResellerMonthlySummary['resellers'][number]) => (
                                <Flex vertical>
                                    <Text strong>{name}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{record.resellerEmail}</Text>
                                </Flex>
                            ),
                        },
                        { title: 'Clients', dataIndex: 'clientCount', key: 'clientCount' },
                        { title: 'Txns', dataIndex: 'transactionCount', key: 'transactionCount' },
                        {
                            title: 'Offline Collected',
                            dataIndex: 'offlineCollectedPaise',
                            key: 'offlineCollectedPaise',
                            render: (value: number) => <Text strong>{formatInrPaise(value)}</Text>,
                        },
                        {
                            title: 'Online Pending',
                            dataIndex: 'onlinePendingPaise',
                            key: 'onlinePendingPaise',
                            render: (value: number) => <Text>{formatInrPaise(value)}</Text>,
                        },
                        {
                            title: 'Total Expected',
                            dataIndex: 'totalExpectedPaise',
                            key: 'totalExpectedPaise',
                            render: (value: number) => <Text>{formatInrPaise(value)}</Text>,
                        },
                    ]}
                    dataSource={monthlySummary?.resellers || []}
                    locale={{ emptyText: 'No reseller transactions this month' }}
                    pagination={false}
                    rowKey="resellerId"
                    size="small"
                />
            </Card>

            {/* Resellers Table */}
            {loading ? (
                <Flex justify="center" style={{ padding: 48 }}><Spin size="large" /></Flex>
            ) : profiles.length === 0 ? (
                <Card>
                    <Empty description="No resellers yet">
                        <Button type="primary" icon={<LuPlus />} onClick={openCreateDrawer}>
                            Add Your First Reseller
                        </Button>
                    </Empty>
                </Card>
            ) : (
                <Card>
                    <Table
                        dataSource={profiles}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                    />
                </Card>
            )}

            {/* Create/Edit Drawer */}
            <Drawer
                aria-label={editingProfile ? `Edit reseller ${editingProfile.name}` : 'Add New Reseller'}
                title={editingProfile ? `Edit: ${editingProfile.name}` : 'Add New Reseller'}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setEditingProfile(null); }}
                width={480}
                extra={
                    <Button type="primary" onClick={() => form.submit()} loading={saving} icon={<LuCheck />}>
                        {editingProfile ? 'Update' : 'Create'}
                    </Button>
                }
            >
                <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
                    <Title level={5}>Personal Details</Title>

                    <Form.Item name="name" label="Full Name" rules={[{ required: true, whitespace: true, min: 2 }]}>
                        <Input prefix={<LuUser />} placeholder="e.g., Rahul Sharma" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="phone" label="Phone" rules={[{ required: true, whitespace: true, min: 10 }]}>
                                <Input prefix={<LuPhone />} placeholder="9876543210" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                                <Input placeholder="reseller@email.com" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="username" label="Username" rules={[{ required: true, whitespace: true, min: 3 }]}>
                                <Input placeholder="reseller_rahul" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="password" label="Password" rules={[{ required: !editingProfile, whitespace: true, min: 6 }]}>
                                <Input.Password placeholder="Min 6 characters" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Title level={5} style={{ marginTop: 16 }}>Address</Title>

                    <Form.Item name="addressLine" label="Address">
                        <Input placeholder="Street address" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="city" label="City">
                                <Input placeholder="Mumbai" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="state" label="State">
                                <Input placeholder="Maharashtra" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="postalCode" label="Postal Code">
                                <Input placeholder="400001" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="country" label="Country">
                                <Input placeholder="India" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Title level={5} style={{ marginTop: 16 }}>Settings</Title>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="maxOfflineActivations" label="Max Offline Activations">
                                <InputNumber min={1} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="active" label="Active" valuePropName="checked">
                                <Switch aria-label="Active reseller" checkedChildren="Active" unCheckedChildren="Inactive" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notes" label="Internal Notes">
                        <Input.TextArea rows={3} placeholder="Notes about this reseller (only visible to you)" />
                    </Form.Item>

                    {/* Stats (read-only, only in edit mode) */}
                    {editingProfile && (
                        <>
                            <Title level={5} style={{ marginTop: 16 }}>Stats (Read-Only)</Title>
                            <Descriptions column={2} size="small" bordered>
                                <Descriptions.Item label="Total Onboarded">{editingProfile.totalStoresOnboarded || 0}</Descriptions.Item>
                                <Descriptions.Item label="Online Stores">{editingProfile.totalOnlineStores || 0}</Descriptions.Item>
                                <Descriptions.Item label="Offline Stores">{editingProfile.totalOfflineStores || 0}</Descriptions.Item>
                                <Descriptions.Item label="Active Offline">{editingProfile.currentActiveOfflineStores || 0}</Descriptions.Item>
                                <Descriptions.Item label="Revenue">{formatInrPaise(editingProfile.totalRevenueCollectedPaise)}</Descriptions.Item>
                                <Descriptions.Item label="Transactions">{editingProfile.totalTransactions || 0}</Descriptions.Item>
                            </Descriptions>
                        </>
                    )}
                </Form>
            </Drawer>
        </div>
    );
}

export default ResellerManagement;
