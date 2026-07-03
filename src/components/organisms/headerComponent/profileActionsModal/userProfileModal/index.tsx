'use client'

import PhoneNumberInput from '@atoms/phoneNumberInput';
import {
    AUTH_ACCOUNT_REQUEST_POLICY,
    type AuthProfileUpdateResponse,
    readAuthAccountResponse,
} from '@lib/auth/accountClientResponses';
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { useAppDispatch } from '@hook/useAppDispatch';
import { showErrorToast, showSuccessToast, showWarningToast } from '@reduxSlices/toast';
import { Alert, Avatar, Button, Divider, Empty, Flex, Form, Input, Modal, Space, Tag, Typography, theme } from 'antd';
import { useSession } from 'next-auth/react';
import { ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { LuBuilding2, LuKeyRound, LuLock, LuMail, LuPen, LuPhoneCall, LuSave, LuShieldCheck, LuStore, LuUser, LuUserCheck, LuUserX, LuX } from 'react-icons/lu';
import styles from './userProfileModal.module.scss';

const { Text, Title } = Typography;

type UserProfileModalProps = {
    open: boolean;
    onClose: () => void;
};

type ProfileSection = 'overview' | 'edit' | 'security' | 'access';

type PhoneValue = {
    countryCode: string;
    dialCode: string;
    phoneNumber: string;
};

const ROLE_LABELS: Record<string, string> = {
    manager: 'Manager',
    owner: 'Owner',
    staff: 'Staff',
};

const formatRoleLabel = (role?: string) => {
    if (!role) return 'No role set';
    return ROLE_LABELS[role] || role.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatPermissionLabel = (permission: string) => {
    const withoutPrefix = permission.replace(/^can/, '');
    const withSpaces = withoutPrefix.replace(/([A-Z])/g, ' $1').trim();
    return withSpaces || permission;
};

const getInitial = (name?: string, fallback?: string) => {
    const source = name || fallback || 'U';
    return source.charAt(0).toUpperCase();
};

const buildPhoneLabel = (data: any) => {
    const phoneNumber = data?.phoneNumber || data?.phone || '';
    if (!phoneNumber) return '';
    return `${data?.dialCode || ''} ${phoneNumber}`.trim();
};

const getDesktopProfileLogContext = (session: any, storeDetails: any) => ({
    ...getBoundedAuthStringContext('userId', session?.uId ?? session?.user?.id),
    ...getBoundedAuthStringContext('tenantId', session?.tId ?? session?.user?.tenantId),
    ...getBoundedAuthStringContext('storeId', session?.sId ?? session?.user?.storeId ?? storeDetails?.storeId),
});

const throwDesktopAccountRejectedResponse = async (
    response: Response,
    kind: 'profile_update' | 'password_change',
    code: 'desktop_account_profile_update_rejected' | 'desktop_account_password_change_rejected',
) => {
    try {
        await readAuthAccountResponse(response, kind);
    } catch {
        // The shared parser already logs malformed rejection bodies; the UI keeps a local status-only code.
    }

    const error = new Error(code) as Error & { status?: number };
    error.status = response.status;
    throw error;
};

function UserProfileModal({ open, onClose }: UserProfileModalProps) {
    const { data: session, update: updateSession } = useSession();
    const { tenantDetails, storeDetails, userPermissions } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
    const [phoneValue, setPhoneValue] = useState<PhoneValue>({
        countryCode: '',
        dialCode: '',
        phoneNumber: '',
    });
    const [localProfilePatch, setLocalProfilePatch] = useState<Record<string, any>>({});

    const sessionUser = session?.user as any;
    const userData = useMemo(() => ({
        ...(sessionUser || {}),
        ...localProfilePatch,
    }), [sessionUser, localProfilePatch]);

    const stores = Array.isArray(userData?.stores) ? userData.stores : [];
    const currentStoreMapping = stores.find((store: any) => Number(store?.storeId) === Number(userData?.storeId)) || stores[0];
    const currentRole = currentStoreMapping?.role || userData?.role;
    const isOwnerLikeAccess = currentRole === 'owner' || userData?.platformRole === 'OWNER' || userData?.platformRole === 'PLATFORM';
    const isPasscodeLogin = userData?.staffAuthMode === 'owner_passcode' || Boolean(userData?.staffLoginId || userData?.loginUsername);
    const isOAuthProfile = Boolean(userData?.image) && !isPasscodeLogin;
    const currentPasswordLabel = isPasscodeLogin ? 'Current Password or Passcode' : 'Current Password';
    const newPasswordLabel = isPasscodeLogin ? 'New Password or Passcode' : 'New Password';
    const confirmPasswordLabel = isPasscodeLogin ? 'Confirm New Password or Passcode' : 'Confirm New Password';
    const changePasswordLabel = isPasscodeLogin ? 'Change Password or Passcode' : 'Change Password';
    const userLoginLabel = isPasscodeLogin
        ? `Staff ID: ${userData?.staffLoginId || userData?.loginUsername || ''}`
        : userData?.displayEmail || userData?.phone || userData?.phoneUsername || userData?.email || '';
    const profilePhoneLabel = buildPhoneLabel(userData);
    const activeTag = userData?.active !== false
        ? <Tag color="green" icon={<LuUserCheck />}>Active</Tag>
        : <Tag color="error" icon={<LuUserX />}>Deactivated</Tag>;
    const platformRoleTag = userData?.platformRole
        ? <Tag color={userData.platformRole === 'PLATFORM' ? 'purple' : userData.platformRole === 'OWNER' ? 'blue' : 'default'}>{userData.platformRole}</Tag>
        : null;

    useEffect(() => {
        if (!open) return;

        setLocalProfilePatch({});
        setActiveSection('overview');
        profileForm.setFieldsValue({
            name: sessionUser?.name || '',
        });
        setPhoneValue({
            countryCode: sessionUser?.countryCode || '',
            dialCode: sessionUser?.dialCode || '',
            phoneNumber: sessionUser?.phoneNumber || sessionUser?.phone || '',
        });
        passwordForm.resetFields();
    }, [open, sessionUser?.id, profileForm, passwordForm]);

    const getStoreRecord = (storeId: number) => {
        const tenantStore = tenantDetails?.storesList?.find((store: any) => Number(store?.storeId) === Number(storeId));
        return tenantStore?.storeDetails || tenantStore || (Number(storeDetails?.storeId) === Number(storeId) ? storeDetails : null);
    };

    const resolveStoreName = (store: any) => {
        const storeRecord = getStoreRecord(Number(store?.storeId));
        return getStoreContextName(storeRecord || store, `Store ${store?.storeId ?? ''}`);
    };

    const resolveRoleName = (store: any) => {
        const storeRecord = getStoreRecord(Number(store?.storeId));
        const roleId = store?.role;
        const roleName = (storeRecord as any)?.roles?.find((role: any) => role.id === roleId)?.name;
        return roleName || formatRoleLabel(roleId);
    };

    const enabledPermissions = useMemo(() => (
        Object.entries(userPermissions || {})
            .filter(([, value]) => value === true)
            .map(([key]) => key)
            .slice(0, 10)
    ), [userPermissions]);

    const handleProfileUpdate = async (values: any) => {
        const name = String(values?.name || '').trim();
        if (!name) {
            dispatch(showWarningToast('Display name is required'));
            return;
        }

        setProfileLoading(true);
        try {
            const res = await fetch('/api/auth/update-profile', {
                ...AUTH_ACCOUNT_REQUEST_POLICY,
                body: JSON.stringify({
                    countryCode: phoneValue.countryCode,
                    dialCode: phoneValue.dialCode,
                    name,
                    phoneNumber: phoneValue.phoneNumber,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            if (!res.ok) {
                await throwDesktopAccountRejectedResponse(res, 'profile_update', 'desktop_account_profile_update_rejected');
            }
            const data = await readAuthAccountResponse<AuthProfileUpdateResponse>(res, 'profile_update');
            const nextProfilePatch = {
                ...data.updates,
                name,
            };
            setLocalProfilePatch(nextProfilePatch);
            profileForm.setFieldsValue({ name });
            dispatch(showSuccessToast('Profile updated'));
            await updateSession();
            setActiveSection('overview');
        } catch (err) {
            logAuthFailure('desktop_account_profile_update_failed', err, {
                ...getDesktopProfileLogContext(session, storeDetails),
                ...getBoundedAuthStringContext('name', name),
                ...getBoundedAuthStringContext('phoneNumber', phoneValue.phoneNumber),
                ...getBoundedAuthStringContext('countryCode', phoneValue.countryCode),
            });
            dispatch(showErrorToast('Failed to update profile'));
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (values: any) => {
        setPasswordLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                ...AUTH_ACCOUNT_REQUEST_POLICY,
                body: JSON.stringify({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            if (!res.ok) {
                await throwDesktopAccountRejectedResponse(res, 'password_change', 'desktop_account_password_change_rejected');
            }
            await readAuthAccountResponse(res, 'password_change');
            dispatch(showSuccessToast('Password changed successfully'));
            passwordForm.resetFields();
            setActiveSection('overview');
        } catch (err) {
            logAuthFailure('desktop_account_password_change_failed', err, {
                ...getDesktopProfileLogContext(session, storeDetails),
                hasCurrentPassword: Boolean(values?.currentPassword),
                hasNewPassword: Boolean(values?.newPassword),
            });
            dispatch(showErrorToast('Failed to change password'));
        } finally {
            setPasswordLoading(false);
        }
    };

    const renderInfoRow = (icon: ReactNode, label: string, value?: ReactNode, action?: ReactNode) => (
        <div className={styles.infoRow}>
            <span className={styles.infoIcon}>{icon}</span>
            <div className={styles.infoContent}>
                <Text type="secondary">{label}</Text>
                <Text className={styles.infoValue}>{value || '-'}</Text>
            </div>
            {action ? <div className={styles.infoAction}>{action}</div> : null}
        </div>
    );

    const renderOverview = () => (
        <div className={styles.sectionPanel}>
            <div className={styles.sectionHeader}>
                <div>
                    <Text strong>Account details</Text>
                    <Text type="secondary">Your personal identity and login details.</Text>
                </div>
                <Button icon={<LuPen />} onClick={() => setActiveSection('edit')} type="primary">
                    Edit Profile
                </Button>
            </div>
            <div className={styles.infoGrid}>
                {renderInfoRow(<LuUser />, 'Display name', userData?.name || 'User')}
                {renderInfoRow(<LuMail />, isPasscodeLogin ? 'Login' : 'Email', userLoginLabel || userData?.email)}
                {isPasscodeLogin ? renderInfoRow(<LuKeyRound />, 'Staff ID', userData?.staffLoginId || userData?.loginUsername) : null}
                {renderInfoRow(<LuPhoneCall />, 'Phone', profilePhoneLabel)}
                {renderInfoRow(<LuShieldCheck />, 'Current role', formatRoleLabel(currentRole))}
                {renderInfoRow(<LuStore />, 'Default store', currentStoreMapping ? resolveStoreName(currentStoreMapping) : '-')}
            </div>
        </div>
    );

    const renderEditProfile = () => (
        <div className={styles.sectionPanel}>
            <div className={styles.sectionHeader}>
                <div>
                    <Text strong>Edit profile</Text>
                    <Text type="secondary">Update your name and phone number. Login email, role, and store access stay managed from Users.</Text>
                </div>
            </div>
            <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleProfileUpdate}
                requiredMark={false}
            >
                <Form.Item
                    label="Display Name"
                    name="name"
                    rules={[
                        { required: true, message: 'Name is required' },
                        { max: 100, message: 'Name is too long' },
                    ]}
                >
                    <Input autoComplete="name" prefix={<LuUser />} placeholder="Your name" size="large" />
                </Form.Item>
                <Form.Item label="Phone Number">
                    <PhoneNumberInput
                        countryCode={phoneValue.countryCode}
                        dialCode={phoneValue.dialCode}
                        phoneNumber={phoneValue.phoneNumber}
                        onChange={setPhoneValue}
                    />
                </Form.Item>
                <div className={styles.formActions}>
                    <Button onClick={() => setActiveSection('overview')}>Cancel</Button>
                    <Button
                        htmlType="submit"
                        icon={<LuSave size={14} />}
                        loading={profileLoading}
                        type="primary"
                    >
                        Save Changes
                    </Button>
                </div>
            </Form>
        </div>
    );

    const renderSecurity = () => (
        <div className={styles.sectionPanel}>
            <div className={styles.sectionHeader}>
                <div>
                    <Text strong>Security</Text>
                    <Text type="secondary">Manage sign-in details supported by your account type.</Text>
                </div>
            </div>

            {isPasscodeLogin ? (
                <Alert
                    message="Staff ID sign-in uses a passcode"
                    description="You can change your current passcode here. If you cannot sign in, an owner can create a new temporary passcode from Users."
                    showIcon
                    style={{ marginBottom: 16 }}
                    type="info"
                />
            ) : null}
            {isOAuthProfile ? (
                <Alert
                    message="Google passwords are managed by Google"
                    description="Use this form only if this account also has an email password in MenuList."
                    showIcon
                    style={{ marginBottom: 16 }}
                    type="info"
                />
            ) : null}
            <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handlePasswordChange}
                requiredMark={false}
            >
                <Form.Item
                    label={currentPasswordLabel}
                    name="currentPassword"
                    rules={[{ required: true, message: 'Current password or passcode is required' }]}
                >
                    <Input.Password autoComplete="current-password" prefix={<LuLock />} placeholder={currentPasswordLabel} size="large" />
                </Form.Item>
                <Form.Item
                    label={newPasswordLabel}
                    name="newPassword"
                    rules={[
                        { required: true, message: 'New password or passcode is required' },
                        { min: 6, message: 'Password or passcode must be at least 6 characters' },
                    ]}
                >
                    <Input.Password autoComplete="new-password" prefix={<LuLock />} placeholder={newPasswordLabel} size="large" />
                </Form.Item>
                <Form.Item
                    dependencies={['newPassword']}
                    label={confirmPasswordLabel}
                    name="confirmNewPassword"
                    rules={[
                        { required: true, message: 'Please confirm your new password or passcode' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                return Promise.reject(new Error('Passwords do not match'));
                            },
                        }),
                    ]}
                >
                    <Input.Password autoComplete="new-password" prefix={<LuLock />} placeholder={confirmPasswordLabel} size="large" />
                </Form.Item>
                <div className={styles.formActions}>
                    <Button onClick={() => setActiveSection('overview')}>Cancel</Button>
                    <Button
                        htmlType="submit"
                        icon={<LuLock size={14} />}
                        loading={passwordLoading}
                        type="primary"
                    >
                        {changePasswordLabel}
                    </Button>
                </div>
            </Form>
        </div>
    );

    const renderAccess = () => (
        <div className={styles.sectionPanel}>
            <div className={styles.sectionHeader}>
                <div>
                    <Text strong>Access</Text>
                    <Text type="secondary">Store access, roles, and permissions are shown here for reference.</Text>
                </div>
            </div>
            <Alert
                message={isOwnerLikeAccess ? 'Access stays read-only in My Profile' : 'Ask an owner or manager for access changes'}
                description={isOwnerLikeAccess
                    ? 'Use the Users screen for team management. Your own role and store access are not editable here to avoid accidental lockout.'
                    : 'This modal is for your own profile details. Role, store, activation, and reset controls remain in the Users screen for authorized managers.'}
                showIcon
                style={{ marginBottom: 16 }}
                type="info"
            />
            {stores.length ? (
                <Flex vertical gap={10}>
                    {stores.map((store: any) => (
                        <div className={styles.storeAccessRow} key={`${store.storeId}-${store.role || 'role'}`}>
                            <Flex align="center" gap={10}>
                                <span className={styles.storeIcon}><LuStore /></span>
                                <Flex vertical gap={2}>
                                    <Text>{resolveStoreName(store)}</Text>
                                    <Text type="secondary">Store ID {store.storeId}</Text>
                                </Flex>
                            </Flex>
                            <Flex gap={6} justify="flex-end" wrap="wrap">
                                {Number(store.storeId) === Number(userData?.storeId)
                                    ? <Tag color="blue" icon={<LuBuilding2 />}>Default</Tag>
                                    : null}
                                <Tag icon={<LuShieldCheck />}>{resolveRoleName(store)}</Tag>
                            </Flex>
                        </div>
                    ))}
                </Flex>
            ) : (
                <Empty description="No store access assigned" style={{ padding: '12px 0' }} />
            )}
            <Divider />
            <Flex vertical gap={8}>
                <Text strong>Permissions</Text>
                {enabledPermissions.length ? (
                    <Flex gap={6} wrap="wrap">
                        {enabledPermissions.map((permission) => (
                            <Tag key={permission}>{formatPermissionLabel(permission)}</Tag>
                        ))}
                    </Flex>
                ) : (
                    <Text type="secondary">No permissions are available for this store context.</Text>
                )}
            </Flex>
        </div>
    );

    const sectionContent: Record<ProfileSection, ReactNode> = {
        access: renderAccess(),
        edit: renderEditProfile(),
        overview: renderOverview(),
        security: renderSecurity(),
    };

    const navItems: Array<{ key: ProfileSection; label: string; icon: ReactNode }> = [
        { key: 'overview', label: 'Overview', icon: <LuUser /> },
        { key: 'edit', label: 'Edit profile', icon: <LuPen /> },
        { key: 'security', label: 'Security', icon: <LuLock /> },
        { key: 'access', label: 'Access', icon: <LuShieldCheck /> },
    ];

    return (
        <Modal
            centered
            className={styles.userProfileModal}
            closable={false}
            destroyOnHidden
            footer={null}
            onCancel={onClose}
            open={open}
            width={760}
        >
            <div className={styles.modalHeader}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>My Profile</Title>
                    <Text type="secondary">View and manage your account profile.</Text>
                </div>
                <Button aria-label="Close profile" icon={<LuX />} onClick={onClose} shape="circle" type="text" />
            </div>

            <div className={styles.identityPanel} style={{ background: token.colorBgLayout, borderColor: token.colorBorderSecondary }}>
                <Space align="start" size={14}>
                    <Avatar
                        size={56}
                        src={userData?.image || userData?.profileImage || undefined}
                        style={{ background: token.colorPrimary, flexShrink: 0 }}
                    >
                        {getInitial(userData?.name, userData?.email)}
                    </Avatar>
                    <Space direction="vertical" size={4}>
                        <Text strong style={{ fontSize: 17 }}>{userData?.name || 'User'}</Text>
                        <Space size={6} wrap>
                            <LuMail size={13} style={{ color: token.colorTextSecondary }} />
                            <Text type="secondary">{userLoginLabel}</Text>
                        </Space>
                        <Flex gap={6} wrap="wrap">
                            {activeTag}
                            {platformRoleTag}
                            {currentRole ? <Tag>{formatRoleLabel(currentRole)}</Tag> : null}
                            <Tag color={isPasscodeLogin ? 'blue' : 'default'}>{isPasscodeLogin ? 'Staff ID login' : 'Email login'}</Tag>
                        </Flex>
                    </Space>
                </Space>
            </div>

            <div className={styles.contentLayout}>
                <div className={styles.sectionNav}>
                    {navItems.map((item) => (
                        <Button
                            block
                            className={styles.navButton}
                            ghost={activeSection === item.key}
                            icon={item.icon}
                            key={item.key}
                            onClick={() => setActiveSection(item.key)}
                            type={activeSection === item.key ? 'primary' : 'text'}
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>
                <div className={styles.sectionContent}>
                    {sectionContent[activeSection]}
                </div>
            </div>
        </Modal>
    );
}

export default UserProfileModal;
