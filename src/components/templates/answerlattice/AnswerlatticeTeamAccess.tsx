'use client';

import {
    ANSWERLATTICE_PERMISSION_CATEGORIES,
    ANSWERLATTICE_PERMISSION_DESCRIPTIONS,
    ANSWERLATTICE_PERMISSION_KEYS,
    ANSWERLATTICE_PERMISSION_LABELS,
    AnswerlatticePermissionKey,
    AnswerlatticeRoleDefinition,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    isDefaultAnswerlatticeRoleId,
    normalizeAnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_DEFAULT_TEAM_TAB,
    ANSWERLATTICE_ROUTES,
    ANSWERLATTICE_TEAM_TABS,
    getAnswerlatticeTeamRoute,
    getAnswerlatticeTeamTabFromPathname,
    isAnswerlatticeTeamTab,
    normalizeAnswerlatticeRoutePathname,
    toAnswerlatticeDashboardRoute,
} from '@constant/answerlattice/navigations';
import { PRODUCT_IDS } from '@constant/product';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import {
    AnswerlatticeStaffUserSummary,
    createAnswerlatticeStaffUser,
    deleteAnswerlatticeRoleDefinition,
    fetchAnswerlatticeStaffUsers,
    forceSignOutAnswerlatticeStaffUser,
    removeAnswerlatticeStaffUser,
    requestAnswerlatticeStaffPasswordReset,
    saveAnswerlatticeRoleDefinition,
    updateAnswerlatticeStaffUser,
} from '@lib/answerlattice/staffAccessClient';
import PhoneNumberInput from '@atoms/phoneNumberInput';
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
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
    Tooltip,
    Typography,
    message,
    theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type AnswerlatticeTeamAccessProps = {
    initialTab?: string;
};

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

const getRoleOptions = (roles: AnswerlatticeRoleDefinition[], canAssignRoles: boolean) => (
    roles
        .filter((role) => role.active !== false)
        .filter((role) => canAssignRoles || role.id === DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF)
        .map((role) => ({
            label: role.name,
            value: role.id,
        }))
);

const ANSWERLATTICE_TEAM_ACCESS_LOAD_FAILED = 'Could not load team access';
const ANSWERLATTICE_TEAM_MEMBER_SAVE_FAILED = 'Could not save team member';
const ANSWERLATTICE_TEAM_MEMBER_ACCESS_UPDATE_FAILED = 'Could not update access';
const ANSWERLATTICE_TEAM_MEMBER_LOGIN_RESET_FAILED = 'Could not reset login details';
const ANSWERLATTICE_TEAM_MEMBER_SIGN_OUT_FAILED = 'Could not sign out team member';
const ANSWERLATTICE_TEAM_MEMBER_REMOVE_FAILED = 'Could not remove team member';
const ANSWERLATTICE_TEAM_ROLE_SAVE_FAILED = 'Could not save role';
const ANSWERLATTICE_TEAM_ROLE_DISABLE_FAILED = 'Could not turn off role';

export default function AnswerlatticeTeamAccess({ initialTab }: AnswerlatticeTeamAccessProps) {
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isMobile = screens.md !== true;
    const { access, refresh: refreshAccess } = useAnswerlatticeAccess();
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeAnswerlatticeRoutePathname(pathname ?? '');
    const legacyRequestedTab = searchParams?.get('tab');
    const requestedTab = (
        isAnswerlatticeTeamTab(initialTab)
            ? initialTab
            : (isAnswerlatticeTeamTab(legacyRequestedTab) ? legacyRequestedTab : ANSWERLATTICE_DEFAULT_TEAM_TAB)
    );
    const [staffForm] = Form.useForm<StaffFormValues>();
    const [roleForm] = Form.useForm<RoleFormValues>();
    const [loading, setLoading] = useState(true);
    const [savingStaff, setSavingStaff] = useState(false);
    const [savingRole, setSavingRole] = useState(false);
    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<AnswerlatticeStaffUserSummary | null>(null);
    const [editingRole, setEditingRole] = useState<AnswerlatticeRoleDefinition | null>(null);
    const [roles, setRoles] = useState<AnswerlatticeRoleDefinition[]>([]);
    const [users, setUsers] = useState<AnswerlatticeStaffUserSummary[]>([]);
    const [storeName, setStoreName] = useState('');
    const [loginDetails, setLoginDetails] = useState<{
        countryCode?: string;
        dialCode?: string;
        phoneNumber?: string;
        staffLoginId?: string;
        temporaryPasscode?: string;
        message?: string;
    } | null>(null);
    const [activeTab, setActiveTab] = useState<string>(requestedTab);
    const createStaffRequestIdRef = useRef('');
    const createRoleRequestIdRef = useRef('');

    const canManageTeam = access?.isPlatformAdmin || access?.permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM] === true;
    const canAssignRoles = access?.isPlatformAdmin || access?.permissions?.[ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES] === true;
    const canManageOwners = access?.isPlatformAdmin || access?.currentRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER;
    const roleOptions = useMemo(() => getRoleOptions(roles, Boolean(canAssignRoles)), [canAssignRoles, roles]);
    const mobileActionStyle = isMobile ? { minHeight: 44 } : undefined;
    const memberActionSize = isMobile ? 'middle' as const : 'small' as const;
    const staffCountryCode = Form.useWatch('countryCode', staffForm) || '';
    const staffDialCode = Form.useWatch('dialCode', staffForm) || '';
    const staffPhoneNumber = Form.useWatch('phoneNumber', staffForm) || '';

    const loadTeam = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAnswerlatticeStaffUsers();
            setUsers(data.users || []);
            setRoles(data.roles || []);
            setStoreName(data.store?.name || '');
        } catch {
            message.error(ANSWERLATTICE_TEAM_ACCESS_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTeam();
    }, [loadTeam]);

    useEffect(() => {
        const nextTab = isAnswerlatticeTeamTab(requestedTab) ? requestedTab : ANSWERLATTICE_DEFAULT_TEAM_TAB;
        setActiveTab(nextTab);

        const activePathTab = getAnswerlatticeTeamTabFromPathname(normalizedPathname);
        const shouldNormalizeRoute = (
            normalizedPathname === ANSWERLATTICE_ROUTES.TEAM ||
            Boolean(legacyRequestedTab) ||
            activePathTab !== nextTab
        );

        if (shouldNormalizeRoute) {
            router.replace(
                toAnswerlatticeDashboardRoute(getAnswerlatticeTeamRoute(nextTab), currentHostname),
                { scroll: false },
            );
        }
    }, [currentHostname, legacyRequestedTab, normalizedPathname, requestedTab, router]);

    const handleTabChange = useCallback((key: string) => {
        setActiveTab(key);
        router.replace(
            toAnswerlatticeDashboardRoute(getAnswerlatticeTeamRoute(key), currentHostname),
            { scroll: false },
        );
    }, [currentHostname, router]);

    const openCreateStaff = () => {
        setEditingStaff(null);
        createStaffRequestIdRef.current = globalThis.crypto.randomUUID();
        staffForm.resetFields();
        staffForm.setFieldsValue({
            countryCode: '',
            dialCode: '',
            phoneNumber: '',
            roleId: DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF,
        });
        setStaffModalOpen(true);
    };

    const openEditStaff = (user: AnswerlatticeStaffUserSummary) => {
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
                ? await updateAnswerlatticeStaffUser({
                    userId: editingStaff.id,
                    countryCode: values.countryCode,
                    dialCode: values.dialCode,
                    name: values.name,
                    phoneNumber: values.phoneNumber,
                    roleId: values.roleId,
                })
                : await createAnswerlatticeStaffUser({
                    ...values,
                    requestId: createStaffRequestIdRef.current || globalThis.crypto.randomUUID(),
                });
            if (result.user) {
                setUsers((current) => {
                    const exists = current.some((user) => user.id === result.user?.id);
                    return exists
                        ? current.map((user) => user.id === result.user?.id ? result.user! : user)
                        : [...current, result.user!].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
                });
            }
            if (
                result.staffAuthMode === 'owner_passcode'
                && (result.temporaryPasscode || result.staffLoginId)
            ) {
                setLoginDetails({
                    countryCode: result.user?.countryCode || values.countryCode,
                    dialCode: result.user?.dialCode || values.dialCode,
                    phoneNumber: result.user?.phoneNumber || values.phoneNumber,
                    staffLoginId: result.staffLoginId,
                    temporaryPasscode: result.temporaryPasscode,
                    message: result.message,
                });
            } else if (result.passwordResetEmailError) {
                message.warning('Team member added, but the setup email was not sent. Use Reset login to create new login details.');
            } else if (result.passwordResetEmailSent) {
                message.success('Password setup email sent');
            } else {
                message.success(result.message || (editingStaff ? 'Team member updated' : 'Team member added'));
            }
            setStaffModalOpen(false);
            setEditingStaff(null);
            createStaffRequestIdRef.current = '';
            staffForm.resetFields();
            await refreshAccess();
        } catch {
            message.error(ANSWERLATTICE_TEAM_MEMBER_SAVE_FAILED);
        } finally {
            setSavingStaff(false);
        }
    };

    const handleToggleActive = async (user: AnswerlatticeStaffUserSummary, active: boolean) => {
        try {
            const result = await updateAnswerlatticeStaffUser({ userId: user.id, active });
            if (result.user) {
                setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
            }
            message.success(active ? 'Team member activated' : 'Team member deactivated');
        } catch {
            message.error(ANSWERLATTICE_TEAM_MEMBER_ACCESS_UPDATE_FAILED);
        }
    };

    const handleResetLogin = async (user: AnswerlatticeStaffUserSummary) => {
        try {
            const result = await requestAnswerlatticeStaffPasswordReset(user.id);
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
        } catch {
            message.error(ANSWERLATTICE_TEAM_MEMBER_LOGIN_RESET_FAILED);
        }
    };

    const handleForceSignOut = async (user: AnswerlatticeStaffUserSummary) => {
        try {
            const result = await forceSignOutAnswerlatticeStaffUser(user.id);
            if (result.user) {
                setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
            }
            message.success('Team member signed out');
        } catch {
            message.error(ANSWERLATTICE_TEAM_MEMBER_SIGN_OUT_FAILED);
        }
    };

    const handleRemoveStaff = async (user: AnswerlatticeStaffUserSummary) => {
        Modal.confirm({
            title: 'Remove team member?',
            content: `${user.name || user.displayEmail || 'This team member'} will lose access to this Answerlattice workspace.`,
            okText: 'Remove',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const result = await removeAnswerlatticeStaffUser(user.id);
                    if (result.removed || result.user?.deleted || result.user?.active === false) {
                        setUsers((current) => current.filter((item) => item.id !== user.id));
                    } else if (result.user) {
                        setUsers((current) => current.map((item) => item.id === user.id ? result.user! : item));
                    }
                    message.success('Team member removed');
                } catch {
                    message.error(ANSWERLATTICE_TEAM_MEMBER_REMOVE_FAILED);
                }
            },
        });
    };

    const openCreateRole = () => {
        createRoleRequestIdRef.current = globalThis.crypto.randomUUID();
        setEditingRole({
            id: '',
            name: '',
            description: '',
            active: true,
            permissions: {},
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: access?.scope.tenantId || 0,
            sId: access?.scope.storeId || 0,
            createdBy: access?.user.email || 'system',
            createdOn: new Date().toISOString(),
        });
        roleForm.resetFields();
        roleForm.setFieldsValue({ active: true });
        setRoleModalOpen(true);
    };

    const openEditRole = (role: AnswerlatticeRoleDefinition) => {
        setEditingRole({ ...role, permissions: { ...role.permissions } });
        roleForm.setFieldsValue({
            active: role.active !== false,
            description: role.description,
            name: role.name,
        });
        setRoleModalOpen(true);
    };

    const togglePermission = (permission: AnswerlatticePermissionKey, value: boolean) => {
        if (!editingRole || isDefaultAnswerlatticeRoleId(editingRole.id)) return;
        const nextPermissions = {
            ...editingRole.permissions,
            [permission]: value,
        };
        if (permission === ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES && value) {
            nextPermissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM] = true;
        }
        if (permission === ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM && !value) {
            nextPermissions[ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES] = false;
        }
        setEditingRole({
            ...editingRole,
            permissions: nextPermissions,
        });
    };

    const toggleCategory = (permissions: AnswerlatticePermissionKey[], value: boolean) => {
        if (!editingRole || isDefaultAnswerlatticeRoleId(editingRole.id)) return;
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
            const result = await saveAnswerlatticeRoleDefinition({
                requestId: editingRole.id ? undefined : createRoleRequestIdRef.current || globalThis.crypto.randomUUID(),
                role: {
                    id: editingRole.id || undefined,
                    active: values.active !== false,
                    description: values.description || '',
                    name: values.name || editingRole.name,
                    permissions: normalizeAnswerlatticeRolePermissions(editingRole.permissions),
                },
            });
            setRoles(result.roles || roles);
            setRoleModalOpen(false);
            setEditingRole(null);
            createRoleRequestIdRef.current = '';
            roleForm.resetFields();
            message.success('Role saved');
            await refreshAccess();
        } catch {
            message.error(ANSWERLATTICE_TEAM_ROLE_SAVE_FAILED);
        } finally {
            setSavingRole(false);
        }
    };

    const handleDeleteRole = async (role: AnswerlatticeRoleDefinition) => {
        Modal.confirm({
            title: 'Turn off role?',
            content: `${role.name} can be turned off after you reassign every team member using it, including inactive members.`,
            okText: 'Turn off',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const result = await deleteAnswerlatticeRoleDefinition(role.id);
                    setRoles(result.roles || roles);
                    message.success('Role turned off');
                    await refreshAccess();
                } catch {
                    message.error(ANSWERLATTICE_TEAM_ROLE_DISABLE_FAILED);
                }
            },
        });
    };

    const renderUserActions = (user: AnswerlatticeStaffUserSummary) => {
        const isCurrentUser = user.id === access?.user.id;
        const ownerActionBlocked = user.roleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER && !canManageOwners;
        const authActionBlocked = ownerActionBlocked || (user.storeIds.length > 1 && !access?.isPlatformAdmin);
        const authActionTooltip = authActionBlocked
            ? ownerActionBlocked
                ? 'Only an Owner can manage another Owner account.'
                : 'Login details and sign-out affect every workspace. Ask a platform administrator.'
            : undefined;
        return (
        <Space wrap>
            <Tooltip title={ownerActionBlocked ? 'Only an Owner can change Owner access.' : undefined}>
                <span>
                    <Button disabled={ownerActionBlocked} icon={<LuPencil />} onClick={() => openEditStaff(user)} size={memberActionSize} style={mobileActionStyle}>
                        Edit
                    </Button>
                </span>
            </Tooltip>
            <Tooltip title={authActionTooltip}>
                <span>
                    <Button disabled={authActionBlocked} icon={<LuKeyRound />} onClick={() => handleResetLogin(user)} size={memberActionSize} style={mobileActionStyle}>
                        Reset login
                    </Button>
                </span>
            </Tooltip>
            {!isCurrentUser ? (
                <>
                    <Tooltip title={authActionTooltip}>
                        <span>
                            <Button disabled={authActionBlocked || user.active === false} icon={<LuLogOut />} onClick={() => handleForceSignOut(user)} size={memberActionSize} style={mobileActionStyle}>
                                Sign out
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={ownerActionBlocked
                        ? 'Only an Owner can change Owner access.'
                        : user.storeIds.length > 1 && !access?.isPlatformAdmin
                            ? 'Remove access from this workspace instead.'
                            : undefined}
                    >
                        <span>
                            <Button
                                disabled={ownerActionBlocked || (user.storeIds.length > 1 && !access?.isPlatformAdmin)}
                                icon={user.active === false ? <LuUserCheck /> : <LuUserX />}
                                onClick={() => handleToggleActive(user, user.active === false)}
                                size={memberActionSize}
                                style={mobileActionStyle}
                            >
                                {user.active === false ? 'Activate' : 'Deactivate'}
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={ownerActionBlocked ? 'Only an Owner can remove Owner access.' : undefined}>
                        <span>
                            <Button danger disabled={ownerActionBlocked} icon={<LuTrash2 />} onClick={() => handleRemoveStaff(user)} size={memberActionSize} style={mobileActionStyle}>
                                Remove
                            </Button>
                        </span>
                    </Tooltip>
                </>
            ) : <Tag color="blue">You</Tag>}
        </Space>
        );
    };

    const columns: ColumnsType<AnswerlatticeStaffUserSummary> = [
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
    ];

    const teamEmptyState = (
        <Empty
            description="No team members yet"
            image={(
                <ContextualStateIllustration
                    color={token.colorPrimary}
                    size={isMobile ? 88 : 104}
                    treatment="softHalo"
                    variant="teamContext"
                />
            )}
            imageStyle={{ height: isMobile ? 88 : 104 }}
        />
    );
    const roleEmptyState = (
        <Empty
            description="No roles found"
            image={(
                <ContextualStateIllustration
                    color={token.colorPrimary}
                    size={isMobile ? 88 : 104}
                    treatment="softHalo"
                    variant="roleStructureContext"
                />
            )}
            imageStyle={{ height: isMobile ? 88 : 104 }}
        />
    );

    const staffList = isMobile ? (
        <List
            dataSource={users}
            locale={{ emptyText: teamEmptyState }}
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
            locale={{ emptyText: teamEmptyState }}
        />
    );

    const roleList = (
        <Flex vertical gap={12}>
            {roles.length ? roles.map((role) => {
                const enabledCount = Object.values(normalizeAnswerlatticeRolePermissions(role.permissions)).filter(Boolean).length;
                const isLocked = isDefaultAnswerlatticeRoleId(role.id);
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
                                <Text type="secondary">{enabledCount} {enabledCount === 1 ? 'permission' : 'permissions'} enabled</Text>
                            </Flex>
                            <Space wrap>
                                <Button disabled={!canAssignRoles || isLocked} icon={<LuPencil />} onClick={() => openEditRole(role)} style={mobileActionStyle}>
                                    Edit
                                </Button>
                                <Button danger disabled={!canAssignRoles || isLocked || role.active === false} icon={<LuTrash2 />} onClick={() => handleDeleteRole(role)} style={mobileActionStyle}>
                                    Turn off
                                </Button>
                            </Space>
                        </Flex>
                    </Card>
                );
            }) : roleEmptyState}
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
                        Members, roles, and Answerlattice permissions for {storeName || 'this workspace'}.
                    </Text>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} onClick={loadTeam} style={mobileActionStyle}>
                        Refresh
                    </Button>
                    <Button disabled={!canAssignRoles} icon={<LuShield />} onClick={openCreateRole} style={mobileActionStyle}>
                        New Role
                    </Button>
                    <Button type="primary" icon={<LuPlus />} onClick={openCreateStaff} style={mobileActionStyle}>
                        Add Member
                    </Button>
                </Space>
            </Flex>

            <Alert
                showIcon
                type="info"
                message="Answerlattice access is separate from MenuList."
                description="Changing an Answerlattice role only affects this support knowledge workspace."
            />

            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                items={[
                    {
                        key: ANSWERLATTICE_TEAM_TABS.MEMBERS,
                        label: 'Members',
                        children: (
                            <Card title={<Flex align="center" gap={8}><LuUsers size={16} /> Members</Flex>}>
                                {staffList}
                            </Card>
                        ),
                    },
                    {
                        key: ANSWERLATTICE_TEAM_TABS.ROLES,
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
                onCancel={() => {
                    createStaffRequestIdRef.current = '';
                    setStaffModalOpen(false);
                }}
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
                    <Form.Item name="roleId" label="Role" initialValue={DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF}>
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
                okButtonProps={{ loading: savingRole, disabled: isDefaultAnswerlatticeRoleId(editingRole?.id) }}
                okText="Save Role"
                onCancel={() => {
                    createRoleRequestIdRef.current = '';
                    setRoleModalOpen(false);
                }}
                onOk={handleSaveRole}
                open={roleModalOpen}
                title={editingRole?.id ? 'Edit Role' : 'New Role'}
                width={720}
            >
                {editingRole ? (
                    <Flex vertical gap={16}>
                        <Form form={roleForm} layout="vertical">
                            <Form.Item name="name" label="Role name" rules={[{ required: true, message: 'Role name is required' }]}>
                                <Input disabled={isDefaultAnswerlatticeRoleId(editingRole.id)} placeholder="Support lead" />
                            </Form.Item>
                            <Form.Item name="description" label="Description">
                                <Input.TextArea disabled={isDefaultAnswerlatticeRoleId(editingRole.id)} rows={2} />
                            </Form.Item>
                            <Form.Item name="active" label="Active" valuePropName="checked">
                                <Switch disabled={isDefaultAnswerlatticeRoleId(editingRole.id)} />
                            </Form.Item>
                        </Form>

                        <Flex vertical gap={12}>
                            {ANSWERLATTICE_PERMISSION_CATEGORIES.map((category) => {
                                const normalized = normalizeAnswerlatticeRolePermissions(editingRole.permissions);
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
                                                    disabled={isDefaultAnswerlatticeRoleId(editingRole.id)}
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
                                                        <Text>{ANSWERLATTICE_PERMISSION_LABELS[permission as AnswerlatticePermissionKey]}</Text>
                                                        <Text type="secondary">{ANSWERLATTICE_PERMISSION_DESCRIPTIONS[permission as AnswerlatticePermissionKey]}</Text>
                                                    </Flex>
                                                    <Switch
                                                        checked={normalized[permission]}
                                                        disabled={isDefaultAnswerlatticeRoleId(editingRole.id)}
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
                        productName="Answerlattice"
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
