'use client'

import { updatePlatformUser } from '@database/users';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { UserDataType } from '@type/platform/user';
import { Button, Card, DotLoading, Input, List, NavBar, Popup, Tag, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuMail, LuPhone, LuPlus, LuUser, LuUserCheck, LuUserX } from 'react-icons/lu';

interface MobileUsersScreenProps {
    onBack: () => void;
}

/**
 * Mobile Users Screen — zero desktop dependency
 * 
 * View staff list, add new staff, assign role per store.
 * Essential staff management from phone.
 * Uses same DAL: addPlatformUser, updatePlatformUser
 * Full HR details (commissions, employment, etc.) show "switch to desktop" hint.
 */
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
            // Call create-staff API — handles Firebase Auth + Firestore doc + email uniqueness
            // @see __docs__/auth/ADR-email-uniqueness-strategy.md
            const res = await fetch('/api/auth/create-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newUserEmail.trim().toLowerCase(),
                    name: newUserName.trim() || undefined,
                    tenantId: storeDetails?.tenantId,
                    storeId: storeDetails?.storeId,
                    storeName: storeDetails?.name,
                    role: newUserRole || undefined,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                const errorMessages: Record<string, string> = {
                    EMAIL_EXISTS: 'Email already used',
                    INVALID_EMAIL: 'Invalid email address',
                    EMAIL_OTHER_TENANT: 'This email belongs to another business',
                    ALREADY_ASSIGNED: 'User already assigned to this store',
                };
                Toast.show({ content: errorMessages[data.code] || data.error || t('failedToAdd'), duration: 2000 });
                return;
            }

            const savedUser: any = {
                id: data.userId,
                email: data.email,
                name: newUserName.trim() || data.email?.split('@')[0],
                active: true,
                stores: [{ storeId: storeDetails?.storeId, name: storeDetails?.name, role: newUserRole || '' }],
                storeIds: [storeDetails?.storeId],
                storeId: storeDetails?.storeId,
                tenantId: storeDetails?.tenantId,
            };

            const updatedList = [...users, savedUser];
            setUsersList(updatedList);

            const msg = data.mode === 'existing_user_added_to_store'
                ? 'Existing staff added to store'
                : 'Staff member created';
            Toast.show({ content: msg, duration: 1500 });

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
            const updated: any = { id: user.id, active: !user.active };
            await updatePlatformUser(updated);
            const updatedList = users.map((u: any) => u.id === user.id ? { ...u, active: !u.active } : u);
            setUsersList(updatedList);
            Toast.show({ content: user.active ? t('userDeactivated') : t('userActivated'), duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const getUserRoleName = (user: UserDataType) => {
        const storeMapping = (user as any)?.stores?.find((s: any) => s.storeId === storeDetails?.storeId);
        if (!storeMapping?.role) return t('noRole');
        const role = roles.find((r: any) => r.id === storeMapping.role);
        return role?.name || storeMapping.role;
    };

    if (!storeDetails) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div className="flex-1 flex items-center justify-center"><DotLoading color="primary" /></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                <p className="text-sm text-gray-500">
                    {t('staffMembers', { count: users.length })}
                </p>

                {/* Users List */}
                {users.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 pt-12 text-center">
                        <LuUser size={40} className="text-gray-300" />
                        <p className="text-sm text-gray-500">{t('noStaffYet')}</p>
                        <Button color="primary" onClick={() => setShowAddUser(true)} style={{ minHeight: '44px' }}>
                            <LuPlus size={16} className="inline mr-1" /> {t('addStaff')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <Card style={{ padding: 0 }} className="rounded-xl">
                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                {users.map((user: any) => (
                                    <List.Item
                                        key={user.id}
                                        prefix={
                                            user.profileImage
                                                ? <img src={user.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                                : <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <LuUser size={14} className="text-blue-500" />
                                                </div>
                                        }
                                        description={
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-500">{user.email}</span>
                                                {!user.active && <Tag color="default" fill="outline" style={{ fontSize: 10 }}>Inactive</Tag>}
                                            </span>
                                        }
                                        extra={
                                            <Tag color="primary" fill="outline" style={{ fontSize: 11 }}>
                                                {getUserRoleName(user)}
                                            </Tag>
                                        }
                                        onClick={() => setSelectedUser(user)}
                                        arrow
                                        style={{ minHeight: '48px' }}
                                    >
                                        <span className="text-[15px] font-medium">{user.name || t('unnamed')}</span>
                                    </List.Item>
                                ))}
                            </List>
                        </Card>

                        <Button
                            block
                            color="primary"
                            fill="outline"
                            size="large"
                            onClick={() => setShowAddUser(true)}
                            style={{ minHeight: '44px' }}
                        >
                            <LuPlus size={16} className="inline mr-1" /> {t('addStaffMember')}
                        </Button>
                    </>
                )}

                <p className="text-xs text-center text-gray-400 pt-2">
                    {t('desktopNote')}
                </p>
            </div>

            {/* User Detail Sheet */}
            <Popup
                visible={!!selectedUser}
                onMaskClick={() => setSelectedUser(null)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '70vh' }}
                destroyOnClose
            >
                {selectedUser && (
                    <div className="px-4 pt-4 pb-6 space-y-4">
                        <div className="flex justify-center"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>

                        <div className="flex items-center gap-3">
                            {(selectedUser as any).profileImage
                                ? <img src={(selectedUser as any).profileImage} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <LuUser size={20} className="text-blue-500" />
                                </div>
                            }
                            <div>
                                <p className="text-lg font-semibold">{(selectedUser as any).name || t('unnamed')}</p>
                                <p className="text-sm text-gray-500">{(selectedUser as any).email}</p>
                            </div>
                        </div>

                        <Card style={{ padding: 0 }} className="rounded-xl">
                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                <List.Item prefix={<LuMail size={16} className="text-gray-400" />} style={{ minHeight: '40px' }}>
                                    <span className="text-sm">{(selectedUser as any).email || 'No email'}</span>
                                </List.Item>
                                <List.Item prefix={<LuPhone size={16} className="text-gray-400" />} style={{ minHeight: '40px' }}>
                                    <span className="text-sm">{(selectedUser as any).phoneNumber ? `${(selectedUser as any).dialCode || ''} ${(selectedUser as any).phoneNumber}` : 'No phone'}</span>
                                </List.Item>
                                <List.Item
                                    prefix={(selectedUser as any).active ? <LuUserCheck size={16} className="text-green-500" /> : <LuUserX size={16} className="text-red-400" />}
                                    style={{ minHeight: '40px' }}
                                >
                                    <span className="text-sm">{(selectedUser as any).active ? t('active') : t('deactivated')}</span>
                                </List.Item>
                            </List>
                        </Card>

                        <div className="flex gap-3">
                            <Button
                                block
                                fill="outline"
                                color={(selectedUser as any).active ? 'danger' : 'primary'}
                                size="large"
                                onClick={() => {
                                    handleToggleActive(selectedUser);
                                    setSelectedUser(null);
                                }}
                                style={{ minHeight: '44px' }}
                            >
                                {(selectedUser as any).active ? t('deactivate') : t('activate')}
                            </Button>
                        </div>
                    </div>
                )}
            </Popup>

            {/* Add User Sheet */}
            <Popup
                visible={showAddUser}
                onMaskClick={isAdding ? undefined : () => setShowAddUser(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '80vh' }}
                destroyOnClose
            >
                <div className="px-4 pt-4 pb-6 space-y-4">
                    <div className="flex justify-center"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
                    <h2 className="text-lg font-semibold">{t('addStaffMember')}</h2>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">{t('name')}</label>
                            <Input value={newUserName} onChange={setNewUserName} placeholder={t('staffName')} style={{ '--font-size': '15px' } as React.CSSProperties} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">{t('emailLabel')}</label>
                            <Input value={newUserEmail} onChange={setNewUserEmail} placeholder={t('emailPlaceholder')} type="email" style={{ '--font-size': '15px' } as React.CSSProperties} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">{t('phone')}</label>
                            <Input value={newUserPhone} onChange={setNewUserPhone} placeholder={t('phonePlaceholder')} type="tel" style={{ '--font-size': '15px' } as React.CSSProperties} />
                        </div>
                        {roles.length > 0 && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">{t('role')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map((role: any) => (
                                        <button
                                            key={role.id}
                                            onClick={() => setNewUserRole(role.id)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium min-h-[36px] ${newUserRole === role.id
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button block fill="outline" size="large" onClick={() => setShowAddUser(false)} style={{ minHeight: '44px' }}>{t('cancel')}</Button>
                        <Button block color="primary" fill="solid" size="large" loading={isAdding} disabled={!newUserEmail.trim()} onClick={handleAddUser} style={{ minHeight: '44px' }}>{t('add')}</Button>
                    </div>
                </div>
            </Popup>
        </div>
    );
}
