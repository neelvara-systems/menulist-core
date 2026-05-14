'use client';

import { RESELLER_CAPS } from "@config/resellerPricing";
import { ECOMSAI_PLATFORM_PASSWORD } from "@constant/user";
import { ResellerProfile } from "@type/reseller";
import {
    Badge, Button, Card, Col, Descriptions, Drawer, Empty, Flex, Form, Input, InputNumber,
    message,
    Row, Space, Spin, Statistic, Switch, Table,
    Typography
} from "antd";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useCallback, useState } from "react";
import {
    LuCheck, LuLock, LuPencil,
    LuPhone, LuPlus, LuRefreshCw, LuShield, LuUser, LuUsers
} from "react-icons/lu";

const { Title, Text, Paragraph } = Typography;

/**
 * Reseller Management — Platform Admin Only
 * 
 * This screen is ONLY accessible to PLATFORM role users (founder).
 * Resellers themselves CANNOT access this screen.
 * Protected by an additional platform password gate.
 * 
 * Features:
 * - List all reseller profiles with stats
 * - Create new reseller profile
 * - Edit existing reseller profile
 * - View reseller stats (stores onboarded, revenue, etc.)
 */
function ResellerManagement() {
    const { data: session } = useSession();
    const [authenticated, setAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [profiles, setProfiles] = useState<ResellerProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ResellerProfile | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    // Gate: PLATFORM role only
    const platformRole = (session as any)?.platformRole;
    if (session && platformRole !== 'PLATFORM') {
        redirect('/dashboard');
    }

    // Platform password gate
    const handlePasswordSubmit = () => {
        if (passwordInput === ECOMSAI_PLATFORM_PASSWORD) {
            setAuthenticated(true);
            loadProfiles();
        } else {
            message.error('Invalid password');
        }
    };

    const loadProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reseller/manage');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setProfiles(data.profiles || []);
        } catch (error) {
            message.error('Failed to load reseller profiles');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCreateOrUpdate = async (values: any) => {
        setSaving(true);
        try {
            const payload = editingProfile
                ? { ...values, profileId: editingProfile.id }
                : values;

            const res = await fetch('/api/reseller/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }

            const result = await res.json();
            message.success(`Reseller ${result.action} successfully`);
            setDrawerOpen(false);
            setEditingProfile(null);
            form.resetFields();
            loadProfiles();
        } catch (error: any) {
            message.error(error.message || 'Failed to save reseller');
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

    const openEditDrawer = (profile: ResellerProfile) => {
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

    // Password gate screen
    if (!authenticated) {
        return (
            <Flex vertical align="center" justify="center" style={{ minHeight: '60vh', padding: 24 }}>
                <Card style={{ maxWidth: 400, width: '100%' }}>
                    <Flex vertical align="center" gap={16}>
                        <LuShield style={{ fontSize: 48, color: '#722ED1' }} />
                        <Title level={3} style={{ margin: 0 }}>Reseller Management</Title>
                        <Text type="secondary">Platform admin access required</Text>
                        <Form onFinish={handlePasswordSubmit} style={{ width: '100%' }}>
                            <Form.Item>
                                <Input.Password
                                    size="large"
                                    placeholder="Enter platform password"
                                    prefix={<LuLock />}
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    onPressEnter={handlePasswordSubmit}
                                />
                            </Form.Item>
                            <Button type="primary" block size="large" htmlType="submit" icon={<LuCheck />}>
                                Authenticate
                            </Button>
                        </Form>
                    </Flex>
                </Card>
            </Flex>
        );
    }

    // Columns for the resellers table
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: ResellerProfile) => (
                <Flex vertical>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>@{record.username}</Text>
                </Flex>
            ),
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_: any, record: ResellerProfile) => (
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
            render: (total: number, record: ResellerProfile) => (
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
            render: (_: any, record: ResellerProfile) => (
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
                <Text strong>₹{((paise || 0) / 100).toLocaleString()}</Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: ResellerProfile) => (
                <Button size="small" icon={<LuPencil />} onClick={() => openEditDrawer(record)}>
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
                    <Button icon={<LuRefreshCw />} onClick={loadProfiles} loading={loading}>Refresh</Button>
                    <Button type="primary" icon={<LuPlus />} onClick={openCreateDrawer}>
                        Add Reseller
                    </Button>
                </Space>
            </Flex>

            {/* Summary Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title="Total Resellers" value={profiles.length} prefix={<LuUsers />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic title="Active" value={profiles.filter(p => p.active).length} valueStyle={{ color: '#52c41a' }} />
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
                            value={profiles.reduce((sum, p) => sum + (p.totalRevenueCollectedPaise || 0), 0) / 100}
                            prefix="₹"
                            precision={0}
                        />
                    </Card>
                </Col>
            </Row>

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

                    <Form.Item name="name" label="Full Name" rules={[{ required: true, min: 2 }]}>
                        <Input prefix={<LuUser />} placeholder="e.g., Rahul Sharma" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="phone" label="Phone" rules={[{ required: true, min: 10 }]}>
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
                            <Form.Item name="username" label="Username" rules={[{ required: true, min: 3 }]}>
                                <Input placeholder="reseller_rahul" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="password" label="Password" rules={[{ required: !editingProfile, min: 6 }]}>
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
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
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
                                <Descriptions.Item label="Revenue">₹{((editingProfile.totalRevenueCollectedPaise || 0) / 100).toLocaleString()}</Descriptions.Item>
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
