'use client'

import { updatePlatformUser } from '@database/users';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { UserDataType } from '@type/platform/user';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuMail, LuPhone, LuPlus, LuUser, LuUserCheck, LuUserX, LuX } from 'react-icons/lu';
import { Avatar, Button, Card, Dialog, DotLoading, Flex, Input, List, NavBar, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileUsersScreenProps {
    onBack: () => void;
}

export default function MobileUsersScreen({ onBack }: MobileUsersScreenProps) {
    const t = useTranslations('MobileUsers');
    const { usersList, setUsersList, storeDetails } = useContext(PlatformGlobalDataContext);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');
    const [newUserRole, setNewUserRole] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDataType | null>(null);

    const users: UserDataType[] = usersList || [];
    const roles = storeDetails?.roles || [];

    const handleAddUser = async () => {
        if (!newUserEmail.trim()) {
            Toast.show({ content: t('emailRequired'), duration: 1500 });
            return;
        }

        setIsAdding(true);
        try {
            const res = await fetch('/api/auth/create-staff', {
                body: JSON.stringify({
                    email: newUserEmail.trim().toLowerCase(),
                    name: newUserName.trim() || undefined,
                    role: newUserRole || undefined,
                    storeId: storeDetails?.storeId,
                    storeName: storeDetails?.name,
                    tenantId: storeDetails?.tenantId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await res.json();

            if (!res.ok) {
                const errorMessages: Record<string, string> = {
                    ALREADY_ASSIGNED: 'User already assigned to this store',
                    EMAIL_EXISTS: 'Email already used',
                    EMAIL_OTHER_TENANT: 'This email belongs to another business',
                    INVALID_EMAIL: 'Invalid email address',
                };
                Toast.show({ content: errorMessages[data.code] || data.error || t('failedToAdd'), duration: 2000 });
                return;
            }

            const savedUser: any = {
                active: true,
                email: data.email,
                id: data.userId,
                name: newUserName.trim() || data.email?.split('@')[0],
                storeId: storeDetails?.storeId,
                storeIds: [storeDetails?.storeId],
                stores: [{ name: storeDetails?.name, role: newUserRole || '', storeId: storeDetails?.storeId }],
                tenantId: storeDetails?.tenantId,
            };

            setUsersList([...users, savedUser]);
            Toast.show({ content: data.mode === 'existing_user_added_to_store' ? 'Existing staff added to store' : 'Staff member created', duration: 1500 });
            setShowAddUser(false);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPhone('');
            setNewUserRole('');
        } catch (err: any) {
            Toast.show({ content: err?.message || 'Failed to add user', duration: 2000 });
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggleActive = async (user: UserDataType) => {
        try {
            await updatePlatformUser({ active: !user.active, id: user.id } as any);
            setUsersList(users.map((item: any) => item.id === user.id ? { ...item, active: !item.active } : item));
            Toast.show({ content: user.active ? t('userDeactivated') : t('userActivated'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const getUserRoleName = (user: UserDataType) => {
        const storeMapping = (user as any)?.stores?.find((store: any) => store.storeId === storeDetails?.storeId);
        if (!storeMapping?.role) return t('noRole');
        const role = roles.find((item: any) => item.id === storeMapping.role);
        return role?.name || storeMapping.role;
    };

    if (!storeDetails) {
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
                                        description={<Flex align="center" gap={6}><Text type="secondary">{user.email}</Text>{!user.active ? <Tag color="default">Inactive</Tag> : null}</Flex>}
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
                                    <Text type="secondary">{(selectedUser as any).email}</Text>
                                </Flex>
                            </Flex>

                            <Card>
                                <List>
                                    <List.Item prefix={<LuMail color="#9ca3af" size={16} />} title={<Text>{(selectedUser as any).email || 'No email'}</Text>} />
                                    <List.Item prefix={<LuPhone color="#9ca3af" size={16} />} title={<Text>{(selectedUser as any).phoneNumber ? `${(selectedUser as any).dialCode || ''} ${(selectedUser as any).phoneNumber}` : 'No phone'}</Text>} />
                                    <List.Item prefix={(selectedUser as any).active ? <LuUserCheck color="#22c55e" size={16} /> : <LuUserX color="#f87171" size={16} />} title={<Text>{(selectedUser as any).active ? t('active') : t('deactivated')}</Text>} />
                                </List>
                            </Card>

                            <Button
                                block
                                fill="outline"
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
                                <Text type="secondary">Use the email they will sign in with. It should be active and accessible by that person.</Text>
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
                            <Button block disabled={!newUserEmail.trim()} loading={isAdding} onClick={() => void handleAddUser()} size="large">{t('add')}</Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
