'use client';

import {
    CANONICA_PERMISSION_CATEGORIES,
    CANONICA_PERMISSION_DESCRIPTIONS,
    CANONICA_PERMISSION_KEYS,
    CANONICA_PERMISSION_LABELS,
    CanonicaPermissionKey,
    CanonicaRoleDefinition,
    DEFAULT_CANONICA_ROLE_IDS,
    normalizeCanonicaRolePermissions,
} from '@constant/canonica/permissions';
import { useCanonicaAccess } from '@providers/canonicaAccessProvider';
import {
    CanonicaStaffUserSummary,
    createCanonicaStaffUser,
    deleteCanonicaRoleDefinition,
    fetchCanonicaStaffUsers,
    forceSignOutCanonicaStaffUser,
    removeCanonicaStaffUser,
    requestCanonicaStaffPasswordReset,
    saveCanonicaRoleDefinition,
    updateCanonicaStaffUser,
} from '@lib/canonica/staffAccessClient';
import { getCanonicaUiErrorMessage } from '@lib/canonica/uiErrors';
import PhoneNumberInput from '@atoms/phoneNumberInput';
import StaffLoginDetailsContent from '@template/main-app/users/StaffLoginDetailsContent';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    List,
    Modal,
    Select,
    Skeleton,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuKeyRound,
    LuLogOut,
    LuPencil,
    LuPlus,
    LuRefreshCw,
    LuShield,
    LuTrash2,
    LuUserCheck,
    LuUserX,
    LuUsers,
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

type StaffFormValues = {
    countryCode?: string;
    dialCode?: string;
    email?: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
};

type RoleFormValues = {
    active?: boolean;
    description?: string;
    name?: string;
};

const getRoleOptions = (roles: CanonicaRoleDefinition[], canAssignRoles: boolean) => (
    roles
        .filter((role) => role.active !== false)
        .filter((role) => canAssignRoles || role.id === DEFAULT_CANONICA_ROLE_IDS.STAFF)
        .map((role) => ({
            label: role.name,
            value: role.id,
        }))
);

export default function CanonicaTeamAccess() {
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const { access, refresh: refreshAccess } = useCanonicaAccess();
    const [staffForm] = Form.useForm<StaffFormValues>();
    const [roleForm] = Form.useForm<RoleFormValues>();
    const [loading, setLoading] = useState(true);
    const [savingStaff, setSavingStaff] = useState(false);
    const [savingRole, setSavingRole] = useState(false);
    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<CanonicaStaffUserSummary | null>(null);
    const [editingRole, setEditingRole] = useState<CanonicaRoleDefinition | null>(null);
    const [roles, setRoles] = useState<CanonicaRoleDefinition[]>([]);
    const [users, setUsers] = useState<CanonicaStaffUserSummary[]>([]);
    const [storeName, setStoreName] = useState('');
    const [loginDetails, setLoginDetails] = useState<{
        countryCode?: string;
        dialCode?: string;
        phoneNumber?: string;
        staffLoginId?: string;
        temporaryPasscode?: string;
        message?: string;
    } | null>(null);

    const canManageTeam = access?.isPlatformAdmin || access?.permissions?.[CANONICA_PERMISSION_KEYS.MANAGE_TEAM] === true;
    const canAssignRoles = access?.isPlatformAdmin || access?.permissions?.[CANONICA_PERMISSION_KEYS.ASSIGN_ROLES] === true;
    const roleOptions = useMemo(() => getRoleOptions(roles, Boolean(canAssignRoles)), [canAssignRoles, roles]);
    const staffCountryCode = Form.useWatch('countryCode', staffForm) || '';
    const staffDialCode = Form.useWatch('dialCode', staffForm) || '';
    const staffPhoneNumber = Form.useWatch('phoneNumber', staffForm) || '';

    const loadTeam = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchCanonicaStaffUsers();
            setUsers(data.users || []);
            setRoles(data.roles || []);
            setStoreName(data.store?.name || '');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not load team access'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTeam();
    }, [loadTeam]);

    const openCreateStaff = () => {
        setEditingStaff(null);
        staffForm.resetFields();
        staffForm.setFieldsValue({
            countryCode: '',
            dialCode: '',
            phoneNumber: '',
            roleId: DEFAULT_CANONICA_ROLE_IDS.STAFF,
        });
        setStaffModalOpen(true);
    };

    const openEditStaff = (user: CanonicaStaffUserSummary) => {
        setEditingStaff(user);
        staffForm.setFieldsValue({
            countryCode: user.countryCode || '',
            dialCode: user.dialCode || '',
            email: user.displayEmail || user.email,
            name: user.name,
            phoneNumber: user.phoneNumber || '',
            roleId: user.roleId,
        });
        setStaffModalOpen(true);
    };

    const handleSaveStaff = async () => {
        setSavingStaff(true);
        try {
            const values = await staffForm.validateFields();
            const result = editingStaff
                ? await updateCanonicaStaffUser({
                    userId: editingStaff.id,
                    countryCode: values.countryCode,
                    dialCode: values.dialCode,
                    name: values.name,
                    phoneNumber: values.phoneNumber,
                    roleId: values.roleId,
                })
                : await createCanonicaStaffUser(values);
            if (result.user) {
                setUsers((current) => {
                    const exists = current.some((user) => user.id === result.user?.id);
                    return exists
                        ? current.map((user) => user.id === result.user?.id ? result.user! : user)
                        : [...current, result.user!].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
                });
            }
            if (result.temporaryPasscode || result.staffLoginId) {
                setLoginDetails({
                    countryCode: result.user?.countryCode || values.countryCode,
                    dialCode: result.user?.dialCode || values.dialCode,
                    phoneNumber: result.user?.phoneNumber || values.phoneNumber,
                    staffLoginId: result.staffLoginId,
                    temporaryPasscode: result.temporaryPasscode,
                    message: result.message,
                });
            } else if (result.passwordResetEmailSent) {
                message.success('Password setup email sent');
            } else {
                message.success(editingStaff ? 'Team member updated' : 'Team member added');
            }
            setStaffModalOpen(false);
            setEditingStaff(null);
            staffForm.resetFields();
            await refreshAccess();
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not save team member'));
        } finally {
            setSavingStaff(false);
        }
    };

    const handleToggleActive = async (user: CanonicaStaffUserSummary, active: boolean) => {
        try {
            const result = await updateCanonicaStaffUser({ userId: user.id, active });
            if (result.user) {
                setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
            }
            message.success(active ? 'Team member activated' : 'Team member deactivated');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not update access'));
        }
    };

    const handleResetLogin = async (user: CanonicaStaffUserSummary) => {
        try {
            const result = await requestCanonicaStaffPasswordReset(user.id);
            if (result.temporaryPasscode || result.staffLoginId) {
                setLoginDetails({
                    countryCode: result.user?.countryCode || user.countryCode,
                    dialCode: result.user?.dialCode || user.dialCode,
                    phoneNumber: result.user?.phoneNumber || user.phoneNumber,
                    staffLoginId: result.staffLoginId,
                    temporaryPasscode: result.temporaryPasscode,
                    message: result.message,
                });
                return;
            }
            message.success(result.message || 'Password setup email sent');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not reset login details'));
        }
    };

    const handleForceSignOut = async (user: CanonicaStaffUserSummary) => {
        try {
            const result = await forceSignOutCanonicaStaffUser(user.id);
            if (result.user) {
                setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
            }
            message.success('Team member signed out');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not sign out team member'));
        }
    };

    const handleRemoveStaff = async (user: CanonicaStaffUserSummary) => {
        Modal.confirm({
            title: 'Remove team member?',
            content: `${user.name || user.displayEmail || 'This team member'} will lose access to this Canonica workspace.`,
            okText: 'Remove',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const result = await removeCanonicaStaffUser(user.id);
                    if (result.user?.deleted || result.user?.active === false) {
                        setUsers((current) => current.filter((item) => item.id !== user.id));
                    } else if (result.user) {
                        setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
                    }
                    message.success('Team member removed');
                } catch (error) {
                    message.error(getCanonicaUiErrorMessage(error, 'Could not remove team member'));
                }
            },
        });
    };

    const openCreateRole = () => {
        setEditingRole({
            id: '',
            name: '',
            description: '',
            active: true,
            permissions: {},
            pId: 'CN',
            tId: access?.scope.tenantId || 0,
            sId: access?.scope.storeId || 0,
            createdBy: access?.user.email || 'system',
            createdOn: new Date().toISOString(),
        });
        roleForm.resetFields();
        roleForm.setFieldsValue({ active: true });
        setRoleModalOpen(true);
    };

    const openEditRole = (role: CanonicaRoleDefinition) => {
        setEditingRole({ ...role, permissions: { ...role.permissions } });
        roleForm.setFieldsValue({
            active: role.active !== false,
            description: role.description,
            name: role.name,
        });
        setRoleModalOpen(true);
    };

    const togglePermission = (permission: CanonicaPermissionKey, value: boolean) => {
        if (!editingRole || editingRole.id === DEFAULT_CANONICA_ROLE_IDS.OWNER) return;
        setEditingRole({
            ...editingRole,
            permissions: {
                ...editingRole.permissions,
                [permission]: value,
            },
        });
    };

    const toggleCategory = (permissions: CanonicaPermissionKey[], value: boolean) => {
        if (!editingRole || editingRole.id === DEFAULT_CANONICA_ROLE_IDS.OWNER) return;
        const nextPermissions = { ...editingRole.permissions };
        permissions.forEach((permission) => {
            nextPermissions[permission] = value;
        });
        setEditingRole({ ...editingRole, permissions: nextPermissions });
    };

    const handleSaveRole = async () => {
        if (!editingRole) return;
        setSavingRole(true);
        try {
            const values = await roleForm.validateFields();
            const result = await saveCanonicaRoleDefinition({
                role: {
                    id: editingRole.id || undefined,
                    active: values.active !== false,
                    description: values.description || '',
                    name: values.name || editingRole.name,
                    permissions: normalizeCanonicaRolePermissions(editingRole.permissions),
                },
            });
            setRoles(result.roles || roles);
            setRoleModalOpen(false);
            setEditingRole(null);
            roleForm.resetFields();
            message.success('Role saved');
            await refreshAccess();
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not save role'));
        } finally {
            setSavingRole(false);
        }
    };

    const handleDeleteRole = async (role: CanonicaRoleDefinition) => {
        Modal.confirm({
            title: 'Turn off role?',
            content: `${role.name} will be hidden after you reassign any active team members using it.`,
            okText: 'Turn off',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const result = await deleteCanonicaRoleDefinition(role.id);
                    setRoles(result.roles || roles);
                    message.success('Role turned off');
                    await refreshAccess();
                } catch (error) {
                    message.error(getCanonicaUiErrorMessage(error, 'Could not turn off role'));
                }
            },
        });
    };

    const renderUserActions = (user: CanonicaStaffUserSummary) => (
        <Space wrap>
            <Button icon={<LuPencil />} onClick={() => openEditStaff(user)} size="small">
                Edit
            </Button>
            <Button icon={<LuKeyRound />} onClick={() => handleResetLogin(user)} size="small">
                Login
            </Button>
            <Button disabled={user.active === false} icon={<LuLogOut />} onClick={() => handleForceSignOut(user)} size="small">
                Sign out
            </Button>
            <Button
                icon={user.active === false ? <LuUserCheck /> : <LuUserX />}
                onClick={() => handleToggleActive(user, user.active === false)}
                size="small"
            >
                {user.active === false ? 'Activate' : 'Deactivate'}
            </Button>
            <Button danger icon={<LuTrash2 />} onClick={() => handleRemoveStaff(user)} size="small">
                Remove
            </Button>
        </Space>
    );

    const columns = useMemo<ColumnsType<CanonicaStaffUserSummary>>(() => [
        {
            title: 'Member',
            dataIndex: 'name',
            key: 'name',
            render: (_, user) => (
                <Flex vertical gap={2}>
                    <Text strong>{user.name || 'Unnamed member'}</Text>
                    <Text type="secondary">{user.displayEmail || user.staffLoginId || 'Owner passcode login'}</Text>
                </Flex>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'roleName',
            key: 'roleName',
            render: (_, user) => <Tag>{user.roleName || user.roleId}</Tag>,
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (_, user) => (
                <Tag color={user.active === false ? 'default' : 'green'}>
                    {user.active === false ? 'Inactive' : 'Active'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, user) => renderUserActions(user),
        },
    ], []);

    const staffList = isMobile ? (
        <List
            dataSource={users}
            locale={{ emptyText: <Empty description="No team members yet" /> }}
            renderItem={(user) => (
                <List.Item>
                    <Card size="small" style={{ width: '100%' }}>
                        <Flex gap={12} vertical>
                            <Flex align="flex-start" justify="space-between" gap={8}>
                                <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                    <Text strong>{user.name || 'Unnamed member'}</Text>
                                    <Text type="secondary">{user.displayEmail || user.staffLoginId || 'Owner passcode login'}</Text>
                                </Flex>
                                <Tag color={user.active === false ? 'default' : 'green'}>
                                    {user.active === false ? 'Inactive' : 'Active'}
                                </Tag>
                            </Flex>
                            <Tag style={{ width: 'fit-content' }}>{user.roleName || user.roleId}</Tag>
                            {renderUserActions(user)}
                        </Flex>
                    </Card>
                </List.Item>
            )}
        />
    ) : (
        <Table
            columns={columns}
            dataSource={users}
            pagination={false}
            rowKey="id"
            scroll={{ x: 820 }}
        />
    );

    const roleList = (
        <Flex vertical gap={12}>
            {roles.length ? roles.map((role) => {
                const enabledCount = Object.values(normalizeCanonicaRolePermissions(role.permissions)).filter(Boolean).length;
                const isLocked = role.id === DEFAULT_CANONICA_ROLE_IDS.OWNER;
                return (
                    <Card key={role.id}>
                        <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                            <Flex vertical gap={4} style={{ minWidth: 0 }}>
                                <Space wrap>
                                    <Text strong>{role.name}</Text>
                                    <Tag color={role.active === false ? 'default' : 'blue'}>
                                        {role.active === false ? 'Inactive' : 'Active'}
                                    </Tag>
                                    {isLocked ? <Tag color="gold">Locked</Tag> : null}
                                </Space>
                                <Text type="secondary">{role.description || 'No description'}</Text>
                                <Text type="secondary">{enabledCount} permissions enabled</Text>
                            </Flex>
                            <Space wrap>
                                <Button disabled={!canAssignRoles || isLocked} icon={<LuPencil />} onClick={() => openEditRole(role)}>
                                    Edit
                                </Button>
                                <Button danger disabled={!canAssignRoles || isLocked} icon={<LuTrash2 />} onClick={() => handleDeleteRole(role)}>
                                    Turn off
                                </Button>
                            </Space>
                        </Flex>
                    </Card>
                );
            }) : <Empty description="No roles found" />}
        </Flex>
    );

    if (loading) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    if (!canManageTeam) {
        return (
            <Alert
                showIcon
                type="warning"
                message="You do not have access to team management."
            />
        );
    }

    return (
        <Flex vertical gap={isMobile ? 14 : 20}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Team Access</Title>
                    <Text type="secondary">
                        Members, roles, and Canonica permissions for {storeName || 'this workspace'}.
                    </Text>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} onClick={loadTeam}>
                        Refresh
                    </Button>
                    <Button disabled={!canAssignRoles} icon={<LuShield />} onClick={openCreateRole}>
                        New Role
                    </Button>
                    <Button type="primary" icon={<LuPlus />} onClick={openCreateStaff}>
                        Add Member
                    </Button>
                </Space>
            </Flex>

            <Alert
                showIcon
                type="info"
                message="Canonica access is separate from MenuList."
                description="Changing a Canonica role only affects this support knowledge workspace."
            />

            <Tabs
                items={[
                    {
                        key: 'members',
                        label: 'Members',
                        children: (
                            <Card title={<Flex align="center" gap={8}><LuUsers size={16} /> Members</Flex>}>
                                {staffList}
                            </Card>
                        ),
                    },
                    {
                        key: 'roles',
                        label: 'Roles',
                        children: (
                            <Card title={<Flex align="center" gap={8}><LuShield size={16} /> Roles and Permissions</Flex>}>
                                {roleList}
                            </Card>
                        ),
                    },
                ]}
            />

            <Modal
                destroyOnClose
                okButtonProps={{ loading: savingStaff }}
                okText={editingStaff ? 'Save Member' : 'Add Member'}
                onCancel={() => setStaffModalOpen(false)}
                onOk={handleSaveStaff}
                open={staffModalOpen}
                title={editingStaff ? 'Edit Team Member' : 'Add Team Member'}
                width={520}
            >
                <Form form={staffForm} layout="vertical">
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input placeholder="Support lead" />
                    </Form.Item>
                    <Form.Item name="email" label="Email">
                        <Input disabled={Boolean(editingStaff)} placeholder="name@example.com" />
                    </Form.Item>
                    <Form.Item hidden name="countryCode">
                        <Input />
                    </Form.Item>
                    <Form.Item hidden name="dialCode">
                        <Input />
                    </Form.Item>
                    <Form.Item hidden name="phoneNumber">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Phone">
                        <PhoneNumberInput
                            countryCode={staffCountryCode}
                            dialCode={staffDialCode}
                            phoneNumber={staffPhoneNumber}
                            onChange={(value) => staffForm.setFieldsValue(value)}
                        />
                    </Form.Item>
                    <Form.Item name="roleId" label="Role" initialValue={DEFAULT_CANONICA_ROLE_IDS.STAFF}>
                        <Select options={roleOptions} />
                    </Form.Item>
                    {!canAssignRoles ? (
                        <Alert
                            showIcon
                            type="info"
                            message="You can add members with the Support Staff role."
                        />
                    ) : null}
                </Form>
            </Modal>

            <Modal
                destroyOnClose
                okButtonProps={{ loading: savingRole, disabled: editingRole?.id === DEFAULT_CANONICA_ROLE_IDS.OWNER }}
                okText="Save Role"
                onCancel={() => setRoleModalOpen(false)}
                onOk={handleSaveRole}
                open={roleModalOpen}
                title={editingRole?.id ? 'Edit Role' : 'New Role'}
                width={720}
            >
                {editingRole ? (
                    <Flex vertical gap={16}>
                        <Form form={roleForm} layout="vertical">
                            <Form.Item name="name" label="Role name" rules={[{ required: true, message: 'Role name is required' }]}>
                                <Input disabled={editingRole.id === DEFAULT_CANONICA_ROLE_IDS.OWNER} placeholder="Support lead" />
                            </Form.Item>
                            <Form.Item name="description" label="Description">
                                <Input.TextArea disabled={editingRole.id === DEFAULT_CANONICA_ROLE_IDS.OWNER} rows={2} />
                            </Form.Item>
                            <Form.Item name="active" label="Active" valuePropName="checked">
                                <Switch disabled={editingRole.id === DEFAULT_CANONICA_ROLE_IDS.OWNER} />
                            </Form.Item>
                        </Form>

                        <Flex vertical gap={12}>
                            {CANONICA_PERMISSION_CATEGORIES.map((category) => {
                                const normalized = normalizeCanonicaRolePermissions(editingRole.permissions);
                                const allEnabled = category.permissions.every((permission) => normalized[permission]);
                                return (
                                    <Card
                                        key={category.key}
                                        size="small"
                                        title={(
                                            <Flex align="center" justify="space-between" gap={12}>
                                                <Text strong>{category.label}</Text>
                                                <Checkbox
                                                    checked={allEnabled}
                                                    disabled={editingRole.id === DEFAULT_CANONICA_ROLE_IDS.OWNER}
                                                    onChange={(event) => toggleCategory(category.permissions, event.target.checked)}
                                                >
                                                    All
                                                </Checkbox>
                                            </Flex>
                                        )}
                                    >
                                        <Flex vertical gap={10}>
                                            {category.permissions.map((permission) => (
                                                <Flex
                                                    align="center"
                                                    gap={12}
                                                    justify="space-between"
                                                    key={permission}
                                                    style={{
                                                        borderBottom: `1px solid ${token.colorSplit}`,
                                                        paddingBottom: 10,
                                                    }}
                                                >
                                                    <Flex vertical style={{ minWidth: 0 }}>
                                                        <Text>{CANONICA_PERMISSION_LABELS[permission as CanonicaPermissionKey]}</Text>
                                                        <Text type="secondary">{CANONICA_PERMISSION_DESCRIPTIONS[permission as CanonicaPermissionKey]}</Text>
                                                    </Flex>
                                                    <Switch
                                                        checked={normalized[permission]}
                                                        disabled={editingRole.id === DEFAULT_CANONICA_ROLE_IDS.OWNER}
                                                        onChange={(checked) => togglePermission(permission, checked)}
                                                    />
                                                </Flex>
                                            ))}
                                        </Flex>
                                    </Card>
                                );
                            })}
                        </Flex>
                    </Flex>
                ) : null}
            </Modal>

            <Modal
                okText="Done"
                onCancel={() => setLoginDetails(null)}
                onOk={() => setLoginDetails(null)}
                open={Boolean(loginDetails)}
                title="Login Details"
            >
                {loginDetails?.staffLoginId && loginDetails?.temporaryPasscode ? (
                    <StaffLoginDetailsContent
                        countryCode={loginDetails.countryCode}
                        dialCode={loginDetails.dialCode}
                        phoneNumber={loginDetails.phoneNumber}
                        productName="Canonica"
                        staffLoginId={loginDetails.staffLoginId}
                        temporaryPasscode={loginDetails.temporaryPasscode}
                    />
                ) : (
                    <Paragraph>{loginDetails?.message || 'Login details were updated.'}</Paragraph>
                )}
            </Modal>
        </Flex>
    );
}
