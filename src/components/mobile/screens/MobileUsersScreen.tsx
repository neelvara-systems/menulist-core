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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DotLoading color="primary" /></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    {t('staffMembers', { count: users.length })}
                </p>

                {/* Users List */}
                {users.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '48px', textAlign: 'center' }}>
                        <LuUser size={40} color="#d1d5db" />
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>{t('noStaffYet')}</p>
                        <Button color="primary" onClick={() => setShowAddUser(true)} style={{ minHeight: '44px' }}>
                            <LuPlus size={16} style={{ display: 'inline', marginRight: '4px' }} /> {t('addStaff')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <Card style={{ padding: 0, borderRadius: '12px' }}>
                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                {users.map((user: any) => (
                                    <List.Item
                                        key={user.id}
                                        prefix={
                                            user.profileImage
                                                ? <img src={user.profileImage} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                                : <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <LuUser size={14} color="#3b82f6" />
                                                </div>
                                        }
                                        description={
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</span>
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
                                        <span style={{ fontSize: '15px', fontWeight: 500 }}>{user.name || t('unnamed')}</span>
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
                            <LuPlus size={16} style={{ display: 'inline', marginRight: '4px' }} /> {t('addStaffMember')}
                        </Button>
                    </>
                )}

                <p style={{ fontSize: '12px', textAlign: 'center', color: '#9ca3af', paddingTop: '8px' }}>
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
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '40px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '999px' }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {(selectedUser as any).profileImage
                                ? <img src={(selectedUser as any).profileImage} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                : <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <LuUser size={20} color="#3b82f6" />
                                </div>
                            }
                            <div>
                                <p style={{ fontSize: '18px', fontWeight: 600 }}>{(selectedUser as any).name || t('unnamed')}</p>
                                <p style={{ fontSize: '14px', color: '#6b7280' }}>{(selectedUser as any).email}</p>
                            </div>
                        </div>

                        <Card style={{ padding: 0, borderRadius: '12px' }}>
                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                <List.Item prefix={<LuMail size={16} color="#9ca3af" />} style={{ minHeight: '40px' }}>
                                    <span style={{ fontSize: '14px' }}>{(selectedUser as any).email || 'No email'}</span>
                                </List.Item>
                                <List.Item prefix={<LuPhone size={16} color="#9ca3af" />} style={{ minHeight: '40px' }}>
                                    <span style={{ fontSize: '14px' }}>{(selectedUser as any).phoneNumber ? `${(selectedUser as any).dialCode || ''} ${(selectedUser as any).phoneNumber}` : 'No phone'}</span>
                                </List.Item>
                                <List.Item
                                    prefix={(selectedUser as any).active ? <LuUserCheck size={16} color="#22c55e" /> : <LuUserX size={16} color="#f87171" />}
                                    style={{ minHeight: '40px' }}
                                >
                                    <span style={{ fontSize: '14px' }}>{(selectedUser as any).active ? t('active') : t('deactivated')}</span>
                                </List.Item>
                            </List>
                        </Card>

                        <div style={{ display: 'flex', gap: '12px' }}>
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
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '40px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '999px' }} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('addStaffMember')}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>{t('name')}</label>
                            <Input value={newUserName} onChange={setNewUserName} placeholder={t('staffName')} style={{ '--font-size': '15px' } as React.CSSProperties} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>{t('emailLabel')}</label>
                            <Input value={newUserEmail} onChange={setNewUserEmail} placeholder={t('emailPlaceholder')} type="email" style={{ '--font-size': '15px' } as React.CSSProperties} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>{t('phone')}</label>
                            <Input value={newUserPhone} onChange={setNewUserPhone} placeholder={t('phonePlaceholder')} type="tel" style={{ '--font-size': '15px' } as React.CSSProperties} />
                        </div>
                        {roles.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>{t('role')}</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {roles.map((role: any) => (
                                        <button
                                            key={role.id}
                                            onClick={() => setNewUserRole(role.id)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '9999px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                minHeight: '36px',
                                                border: 'none',
                                                backgroundColor: newUserRole === role.id ? '#3b82f6' : '#f3f4f6',
                                                color: newUserRole === role.id ? '#fff' : '#374151'
                                            }}
                                        >
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                        <Button block fill="outline" size="large" onClick={() => setShowAddUser(false)} style={{ minHeight: '44px' }}>{t('cancel')}</Button>
                        <Button block color="primary" fill="solid" size="large" loading={isAdding} disabled={!newUserEmail.trim()} onClick={handleAddUser} style={{ minHeight: '44px' }}>{t('add')}</Button>
                    </div>
                </div>
            </Popup>
        </div>
    );
}
