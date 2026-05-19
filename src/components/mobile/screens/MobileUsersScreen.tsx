'use client'

import { createStaffUser, fetchStaffUsers, forceSignOutStaffUser, removeStaffFromStore, requestStaffPasswordReset, updateStaffUser } from '@lib/staffManagement/client';
import { buildStaffLoginDetailsText, copyTextToClipboard, openWhatsAppWebShare, shareStaffLoginDetails, type StaffLoginDetailsShareInput } from '@lib/staffManagement/shareLoginDetails';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { UserDataType } from '@type/platform/user';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { LuCopy, LuKeyRound, LuLogOut, LuMail, LuMessageCircle, LuPhone, LuPlus, LuShare2, LuTrash2, LuUser, LuUserCheck, LuUserX, LuX } from 'react-icons/lu';
import { Avatar, Button, Card, Dialog, DotLoading, Flex, Input, List, NavBar, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileUsersScreenProps {
    onBack: () => void;
}

type StaffLoginDetailsPopupState = StaffLoginDetailsShareInput & {
    title: string;
};

function StaffLoginCopyRow({
    label,
    onCopy,
    value,
}: {
    label: string;
    onCopy: () => void;
    value: string;
}) {
    return (
        <Flex align="center" justify="space-between" style={{ gap: 12, minHeight: 50 }}>
            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                <Text type="secondary">{label}</Text>
                <Text strong copyable={false} ellipsis style={{ fontSize: 17 }}>{value}</Text>
            </Flex>
            <Button
                fill="none"
                onClick={onCopy}
                style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
            >
                <LuCopy size={18} />
            </Button>
        </Flex>
    );
}

function StaffLoginDetailsPanel({
    countryCode,
    dialCode,
    phoneNumber,
    staffLoginId,
    temporaryPasscode,
}: {
    countryCode?: string;
    dialCode?: string;
    phoneNumber?: string;
    staffLoginId: string;
    temporaryPasscode: string;
}) {
    const details = { countryCode, dialCode, phoneNumber, staffLoginId, temporaryPasscode };
    const fullText = buildStaffLoginDetailsText(details);

    const copyValue = async (value: string, label: string) => {
        const copied = await copyTextToClipboard(value);
        Toast.show({ content: copied ? `${label} copied` : `Could not copy ${label.toLowerCase()}`, duration: 1500 });
    };

    const shareOnWhatsApp = async () => {
        const opened = openWhatsAppWebShare(details);
        const copied = await copyTextToClipboard(fullText);
        Toast.show({
            content: opened
                ? copied ? 'WhatsApp opened. Login details copied too.' : 'WhatsApp opened'
                : copied ? 'Login details copied. Paste them in WhatsApp.' : 'Could not open WhatsApp',
            duration: 1800,
        });
    };

    const shareFromDevice = async () => {
        const result = await shareStaffLoginDetails(details);
        if (result === 'cancelled') return;
        if (result !== 'shared') {
            const copied = await copyTextToClipboard(fullText);
            Toast.show({
                content: copied ? 'Login details copied' : 'Could not share login details',
                duration: 1500,
            });
            return;
        }
        Toast.show({
            content: 'Share sheet opened',
            duration: 1500,
        });
    };

    return (
        <Flex gap={14} vertical>
            <Text>Share these details with the staff member. This passcode is shown once.</Text>
            <Card>
                <Flex gap={6} vertical>
                    <StaffLoginCopyRow label="Staff ID" onCopy={() => void copyValue(staffLoginId, 'Staff ID')} value={staffLoginId} />
                    <div style={{ borderTop: '1px solid #f1f5f9' }} />
                    <StaffLoginCopyRow label="Passcode" onCopy={() => void copyValue(temporaryPasscode, 'Passcode')} value={temporaryPasscode} />
                </Flex>
            </Card>
            <Flex gap={8}>
                <Button block icon={<LuMessageCircle size={16} />} onClick={() => void shareOnWhatsApp()} size="large">
                    WhatsApp
                </Button>
                <Button block fill="outline" icon={<LuShare2 size={16} />} onClick={() => void shareFromDevice()} size="large">
                    Share
                </Button>
            </Flex>
        </Flex>
    );
}

export default function MobileUsersScreen({ onBack }: MobileUsersScreenProps) {
    const t = useTranslations('MobileUsers');
    const { usersList, setUsersList, storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');
    const [newUserRole, setNewUserRole] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDataType | null>(null);
    const [staffLoginDetails, setStaffLoginDetails] = useState<StaffLoginDetailsPopupState | null>(null);
    const [staffStores, setStaffStores] = useState<any[]>([]);

    const users: UserDataType[] = usersList || [];
    const roles = staffStores.find((store) => store.storeId === storeDetails?.storeId)?.roles || storeDetails?.roles || [];
    const canManageUsers = userPermissions?.canManageUsers === true;
    const canAssignRoles = userPermissions?.canAssignRoles === true;
    const defaultStaffCountryCode = (storeDetails as any)?.countryCode || '';
    const defaultStaffDialCode = (storeDetails as any)?.dialCode || '';

    useEffect(() => {
        let cancelled = false;

        if (!storeDetails?.tenantId || !storeDetails?.storeId || !canManageUsers) {
            setUsersList([]);
            setStaffStores([]);
            return;
        }

        setIsLoadingUsers(true);
        fetchStaffUsers(storeDetails.tenantId, storeDetails.storeId)
            .then((data) => {
                if (cancelled) return;
                setUsersList(data.users || []);
                setStaffStores(data.stores || []);
            })
            .catch((err: any) => {
                if (!cancelled) Toast.show({ content: err?.message || 'Failed to load staff', duration: 2000 });
            })
            .finally(() => {
                if (!cancelled) setIsLoadingUsers(false);
            });

        return () => {
            cancelled = true;
        };
    }, [canManageUsers, setUsersList, storeDetails?.storeId, storeDetails?.tenantId, t]);

    const handleAddUser = async () => {
        if (!newUserEmail.trim() && !newUserName.trim()) {
            Toast.show({ content: 'Enter a name or email', duration: 1500 });
            return;
        }

        setIsAdding(true);
        try {
            const data = await createStaffUser({
                countryCode: newUserPhone.trim() ? defaultStaffCountryCode : undefined,
                dialCode: newUserPhone.trim() ? defaultStaffDialCode : undefined,
                email: newUserEmail.trim().toLowerCase() || undefined,
                name: newUserName.trim() || undefined,
                phoneNumber: newUserPhone.trim() || undefined,
                role: newUserRole || undefined,
                storeId: storeDetails?.storeId,
                storeName: storeDetails?.name,
                tenantId: storeDetails?.tenantId,
            });

            setUsersList([...users, data.user]);
            if (data.temporaryPasscode && data.staffLoginId) {
                setStaffLoginDetails({
                    countryCode: (data.user as any)?.countryCode || defaultStaffCountryCode,
                    dialCode: (data.user as any)?.dialCode || defaultStaffDialCode,
                    phoneNumber: (data.user as any)?.phoneNumber || newUserPhone,
                    staffLoginId: data.staffLoginId,
                    temporaryPasscode: data.temporaryPasscode,
                    title: 'Staff login details',
                });
                Toast.show({ content: 'Staff ID and passcode created', duration: 1800 });
            } else {
                Toast.show({
                    content: data.mode === 'existing_user_added_to_store'
                        ? 'Existing staff added to store'
                        : data.passwordResetEmailSent === false
                            ? 'Staff created. Setup email was not sent.'
                            : 'Staff member created. Setup email sent.',
                    duration: 1800,
                });
            }
            setShowAddUser(false);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPhone('');
            setNewUserRole('');
        } catch (err: any) {
            const errorMessages: Record<string, string> = {
                ALREADY_ASSIGNED: 'User already assigned to this store',
                EMAIL_EXISTS: 'Email already used',
                EMAIL_OTHER_TENANT: 'This email belongs to another business',
                INVALID_EMAIL: 'Invalid email address',
                ROLE_ASSIGNMENT_FORBIDDEN: 'You cannot assign this role',
            };
            Toast.show({ content: errorMessages[err.code] || err?.message || 'Failed to add user', duration: 2000 });
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggleActive = async (user: UserDataType) => {
        setIsUpdatingUser(true);
        try {
            const response = await updateStaffUser({
                active: !user.active,
                tenantId: storeDetails?.tenantId,
                userId: user.id,
            });
            setUsersList(users.map((item: any) => item.id === user.id ? response.user : item));
            Toast.show({ content: user.active ? t('userDeactivated') : t('userActivated'), duration: 1500 });
        } catch (err: any) {
            Toast.show({ content: err?.message || t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleChangeRole = async (user: UserDataType, roleId: string) => {
        if (!canAssignRoles) return;
        setIsUpdatingUser(true);
        try {
            const nextStores = ((user as any).stores || []).map((store: any) => (
                store.storeId === storeDetails?.storeId ? { ...store, role: roleId } : store
            ));
            const response = await updateStaffUser({
                storeId: (user as any).storeId,
                stores: nextStores,
                tenantId: storeDetails?.tenantId,
                userId: user.id,
            });
            setUsersList(users.map((item: any) => item.id === user.id ? response.user : item));
            setSelectedUser(response.user as any);
            Toast.show({ content: 'Staff member updated', duration: 1200 });
        } catch (err: any) {
            Toast.show({ content: err?.message || t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleRemoveUser = async (user: UserDataType) => {
        setIsUpdatingUser(true);
        try {
            const response = await removeStaffFromStore({
                storeId: storeDetails?.storeId,
                tenantId: storeDetails?.tenantId,
                userId: user.id,
            });
            setUsersList(response.user?.deleted
                ? users.filter((item: any) => item.id !== user.id)
                : users.map((item: any) => item.id === user.id ? response.user : item));
            setSelectedUser(null);
            Toast.show({ content: 'Staff member removed', duration: 1500 });
        } catch (err: any) {
            Toast.show({ content: err?.message || t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleResetPassword = async (user: UserDataType) => {
        setIsUpdatingUser(true);
        try {
            const data = await requestStaffPasswordReset({
                storeId: storeDetails?.storeId,
                tenantId: storeDetails?.tenantId,
                userId: user.id,
            });
            if (data.user) {
                setUsersList(users.map((item: any) => item.id === user.id ? data.user : item));
                setSelectedUser(data.user as any);
            }
            if (data.temporaryPasscode && data.staffLoginId) {
                setStaffLoginDetails({
                    countryCode: (data.user as any)?.countryCode || (user as any)?.countryCode || defaultStaffCountryCode,
                    dialCode: (data.user as any)?.dialCode || (user as any)?.dialCode || defaultStaffDialCode,
                    phoneNumber: (data.user as any)?.phoneNumber || (user as any)?.phoneNumber,
                    staffLoginId: data.staffLoginId,
                    temporaryPasscode: data.temporaryPasscode,
                    title: 'New staff passcode',
                });
                Toast.show({ content: 'Temporary passcode created', duration: 1500 });
            } else {
                Toast.show({ content: 'Staff access reset', duration: 1500 });
            }
        } catch (err: any) {
            Toast.show({ content: err?.message || 'Could not reset staff access', duration: 2000 });
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleForceSignOut = async (user: UserDataType) => {
        setIsUpdatingUser(true);
        try {
            const data = await forceSignOutStaffUser({
                storeId: storeDetails?.storeId,
                tenantId: storeDetails?.tenantId,
                userId: user.id,
            });
            if (data.user) {
                setUsersList(users.map((item: any) => item.id === user.id ? data.user : item));
                setSelectedUser(data.user as any);
            }
            Toast.show({ content: 'Staff member signed out', duration: 1500 });
        } catch (err: any) {
            Toast.show({ content: err?.message || 'Could not sign out staff member', duration: 2000 });
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const getUserRoleName = (user: UserDataType) => {
        const storeMapping = (user as any)?.stores?.find((store: any) => store.storeId === storeDetails?.storeId);
        if (!storeMapping?.role) return t('noRole');
        const role = roles.find((item: any) => item.id === storeMapping.role);
        return role?.name || storeMapping.role;
    };

    if (!storeDetails || isLoadingUsers) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex align="center" flex={1} justify="center"><DotLoading color="primary" /></Flex>
            </Flex>
        );
    }

    if (!canManageUsers) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex align="center" flex={1} justify="center" style={{ padding: 16 }}>
                    <Text type="secondary">Your current role cannot manage staff for this store.</Text>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Text>{t('staffMembers', { count: users.length })}</Text>

                {users.length === 0 ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuUser color="#d1d5db" size={40} />
                            <Text type="secondary">{t('noStaffYet')}</Text>
                            <Button onClick={() => setShowAddUser(true)}><Flex align="center" gap={6}><LuPlus size={16} /><Text>{t('addStaff')}</Text></Flex></Button>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <List>
                                {users.map((user: any) => (
                                    <List.Item
                                        arrow
                                        description={<Flex align="center" gap={6}><Text type="secondary">{user.staffAuthMode === 'owner_passcode' ? user.staffLoginId || user.loginUsername : user.displayEmail || user.email}</Text>{!user.active ? <Tag color="default">Inactive</Tag> : null}</Flex>}
                                        extra={<Tag color="primary">{getUserRoleName(user)}</Tag>}
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        prefix={user.profileImage ? <Avatar src={user.profileImage} /> : <Avatar icon={<LuUser size={14} />} />}
                                        title={<Text strong>{user.name || t('unnamed')}</Text>}
                                    />
                                ))}
                            </List>
                        </Card>
                        <Button block fill="outline" onClick={() => setShowAddUser(true)} size="large">
                            <Flex align="center" gap={6}><LuPlus size={16} /><Text>{t('addStaffMember')}</Text></Flex>
                        </Button>
                    </>
                )}

                <Text type="secondary">{t('desktopNote')}</Text>
            </Flex>

            <Popup bodyStyle={{ maxHeight: '70vh', overflow: 'hidden', padding: 0 }} destroyOnClose onMaskClick={() => setSelectedUser(null)} visible={!!selectedUser}>
                {selectedUser ? (
                    <Flex style={{ height: '100%' }} vertical>
                        <NavBar backIcon={<LuX size={20} />} onBack={() => setSelectedUser(null)}>
                            {(selectedUser as any).name || t('unnamed')}
                        </NavBar>
                        <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                            <Flex align="center" gap={12}>
                                {(selectedUser as any).profileImage ? <Avatar size={48} src={(selectedUser as any).profileImage} /> : <Avatar icon={<LuUser size={20} />} size={48} />}
                                <Flex gap={2} vertical>
                                    <Title level={4} style={{ margin: 0 }}>{(selectedUser as any).name || t('unnamed')}</Title>
                                    <Text type="secondary">{(selectedUser as any).staffAuthMode === 'owner_passcode' ? (selectedUser as any).staffLoginId || (selectedUser as any).loginUsername : (selectedUser as any).displayEmail || (selectedUser as any).email}</Text>
                                </Flex>
                            </Flex>

                            <Card>
                                <List>
                                    <List.Item prefix={<LuMail color="#9ca3af" size={16} />} title={<Text>{(selectedUser as any).staffAuthMode === 'owner_passcode' ? `Staff ID: ${(selectedUser as any).staffLoginId || (selectedUser as any).loginUsername}` : (selectedUser as any).displayEmail || (selectedUser as any).email || 'No email'}</Text>} />
                                    {(selectedUser as any).staffAuthMode !== 'owner_passcode' && ((selectedUser as any).staffLoginId || (selectedUser as any).loginUsername) ? (
                                        <List.Item prefix={<LuKeyRound color="#9ca3af" size={16} />} title={<Text>Staff ID: {(selectedUser as any).staffLoginId || (selectedUser as any).loginUsername}</Text>} />
                                    ) : null}
                                    <List.Item prefix={<LuPhone color="#9ca3af" size={16} />} title={<Text>{(selectedUser as any).phoneNumber ? `${(selectedUser as any).dialCode || ''} ${(selectedUser as any).phoneNumber}` : 'No phone'}</Text>} />
                                    <List.Item prefix={(selectedUser as any).active ? <LuUserCheck color="#22c55e" size={16} /> : <LuUserX color="#f87171" size={16} />} title={<Text>{(selectedUser as any).active ? t('active') : t('deactivated')}</Text>} />
                                </List>
                            </Card>

                            <Card title={t('role')}>
                                <Flex gap={8} wrap>
                                    {roles.map((role: any) => (
                                        <Button
                                            disabled={!canAssignRoles || isUpdatingUser}
                                            fill={getUserRoleName(selectedUser as UserDataType) === role.name || (selectedUser as any)?.stores?.some((store: any) => store.storeId === storeDetails?.storeId && store.role === role.id) ? 'solid' : 'outline'}
                                            key={role.id}
                                            onClick={() => void handleChangeRole(selectedUser as UserDataType, role.id)}
                                            size="small"
                                        >
                                            {role.name}
                                        </Button>
                                    ))}
                                </Flex>
                            </Card>

                            <Button
                                block
                                fill="outline"
                                loading={isUpdatingUser}
                                onClick={() => {
                                    void Dialog.confirm({
                                        cancelText: t('cancel'),
                                        confirmText: 'Create passcode',
                                        content: 'A new temporary passcode will show once. Share it with the staff member.',
                                        onConfirm: async () => {
                                            await handleResetPassword(selectedUser);
                                        },
                                        title: 'Reset staff passcode?',
                                    });
                                }}
                                size="large"
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuKeyRound size={14} />
                                    <Text>Reset password</Text>
                                </Flex>
                            </Button>

                            <Button
                                block
                                disabled={(selectedUser as any).active === false}
                                fill="outline"
                                loading={isUpdatingUser}
                                onClick={() => {
                                    void Dialog.confirm({
                                        cancelText: t('cancel'),
                                        confirmText: 'Sign out',
                                        content: 'This signs the staff member out on their devices. They can sign in again with their current details.',
                                        onConfirm: async () => {
                                            await handleForceSignOut(selectedUser);
                                        },
                                        title: 'Sign out staff?',
                                    });
                                }}
                                size="large"
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuLogOut size={14} />
                                    <Text>Sign out staff</Text>
                                </Flex>
                            </Button>

                            <Button
                                block
                                fill="outline"
                                loading={isUpdatingUser}
                                onClick={() => {
                                    void Dialog.confirm({
                                        cancelText: t('cancel'),
                                        confirmText: (selectedUser as any).active ? t('deactivate') : t('activate'),
                                        content: (selectedUser as any).active
                                            ? t('deactivateUserConfirmDesc', { name: (selectedUser as any).name || (selectedUser as any).email || t('unnamed') })
                                            : t('activateUserConfirmDesc', { name: (selectedUser as any).name || (selectedUser as any).email || t('unnamed') }),
                                        onConfirm: async () => {
                                            await handleToggleActive(selectedUser);
                                            setSelectedUser(null);
                                        },
                                        title: (selectedUser as any).active ? t('deactivateUserConfirmTitle') : t('activateUserConfirmTitle'),
                                    });
                                }}
                                size="large"
                                style={(selectedUser as any).active ? { borderColor: '#dc2626', color: '#dc2626' } : undefined}
                            >
                                {(selectedUser as any).active ? t('deactivate') : t('activate')}
                            </Button>

                            <Button
                                block
                                fill="outline"
                                loading={isUpdatingUser}
                                onClick={() => {
                                    void Dialog.confirm({
                                        cancelText: t('cancel'),
                                        confirmText: 'Remove',
                                        content: 'This removes the staff member from this store. Their account is kept for audit history.',
                                        onConfirm: async () => {
                                            await handleRemoveUser(selectedUser);
                                        },
                                        title: 'Remove staff member?',
                                    });
                                }}
                                size="large"
                                style={{ borderColor: '#dc2626', color: '#dc2626' }}
                            >
                                <Flex align="center" gap={6} justify="center">
                                    <LuTrash2 size={14} />
                                    <Text>Remove from store</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>
                ) : null}
            </Popup>

            <Popup bodyStyle={{ maxHeight: '78vh', overflow: 'hidden', padding: 0 }} destroyOnClose onMaskClick={() => setStaffLoginDetails(null)} visible={!!staffLoginDetails} zIndex={2800}>
                {staffLoginDetails ? (
                    <Flex style={{ height: '100%' }} vertical>
                        <Flex
                            align="center"
                            justify="space-between"
                            style={{
                                borderBottom: '1px solid #f1f5f9',
                                padding: '14px 12px 10px 16px',
                            }}
                        >
                            <Title level={4} style={{ margin: 0 }}>{staffLoginDetails.title}</Title>
                            <Button
                                fill="none"
                                onClick={() => setStaffLoginDetails(null)}
                                style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                            >
                                <LuX size={20} />
                            </Button>
                        </Flex>
                        <Flex gap={12} style={{ overflowY: 'auto', padding: 16 }} vertical>
                            <StaffLoginDetailsPanel
                                countryCode={staffLoginDetails.countryCode}
                                dialCode={staffLoginDetails.dialCode}
                                phoneNumber={staffLoginDetails.phoneNumber}
                                staffLoginId={staffLoginDetails.staffLoginId}
                                temporaryPasscode={staffLoginDetails.temporaryPasscode}
                            />
                        </Flex>
                    </Flex>
                ) : null}
            </Popup>

            <Popup bodyStyle={{ maxHeight: '80vh', overflow: 'hidden', padding: 0 }} destroyOnClose onMaskClick={isAdding ? undefined : () => setShowAddUser(false)} visible={showAddUser}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowAddUser(false)}>
                        {t('addStaffMember')}
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('name')}</Text>
                                <Text type="secondary">Enter the staff member&apos;s real name so owners can identify the account later.</Text>
                                <Input onChange={setNewUserName} placeholder={t('staffName')} value={newUserName} />
                            </Flex>
                        </Card>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('emailLabel')}</Text>
                                <Text type="secondary">Leave blank to create a staff ID and passcode.</Text>
                                <Input onChange={setNewUserEmail} placeholder={t('emailPlaceholder')} type="email" value={newUserEmail} />
                            </Flex>
                        </Card>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('phone')}</Text>
                                <Text type="secondary">Optional, but useful for contact and account recovery context.</Text>
                                <Input onChange={setNewUserPhone} placeholder={t('phonePlaceholder')} type="tel" value={newUserPhone} />
                            </Flex>
                        </Card>
                        {roles.length > 0 ? (
                            <Card title={t('role')}>
                                <Text type="secondary">Choose the permission set this staff member should start with.</Text>
                                <Flex gap={8} wrap>
                                    {roles.map((role: any) => (
                                        <Button key={role.id} fill={newUserRole === role.id ? 'solid' : 'outline'} onClick={() => setNewUserRole(role.id)} size="small">
                                            {role.name}
                                        </Button>
                                    ))}
                                </Flex>
                            </Card>
                        ) : null}
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => setShowAddUser(false)} size="large">{t('cancel')}</Button>
                            <Button block disabled={!newUserEmail.trim() && !newUserName.trim()} loading={isAdding} onClick={() => void handleAddUser()} size="large">{t('add')}</Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
