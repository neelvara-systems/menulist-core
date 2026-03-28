'use client'

import { PermissionKey } from '@constant/permissions';
import RolesPermissionInitialData, { PERMISSION_CATEGORIES_CONFIG, PERMISSION_LABELS } from '@data/rolesPermissionsInitialData';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { StoreRoleDataType } from '@type/platform/roles';
import { Button, Card, Checkbox, Dialog, Input, List, NavBar, Popup, Switch, Tag, TextArea, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuCheck, LuPencil, LuPlus, LuShield, LuTrash2, LuX } from 'react-icons/lu';

interface MobileRolesScreenProps {
    onBack: () => void;
}

/**
 * Mobile Roles & Permissions Screen
 * 
 * Allows PWA-only owners to manage staff roles from their phone.
 * Uses same DAL as desktop: updateStore({ roles: [...] })
 * Same data model: storeDetails.roles (array of StoreRoleDataType)
 */
export default function MobileRolesScreen({ onBack }: MobileRolesScreenProps) {
    const t = useTranslations('MobileRoles');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [selectedRole, setSelectedRole] = useState<StoreRoleDataType | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<StoreRoleDataType | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const roles = storeDetails?.roles || [];

    const handleEditRole = (role: StoreRoleDataType) => {
        setEditingRole(JSON.parse(JSON.stringify(role)));
        setIsEditSheetOpen(true);
    };

    const handleAddRole = () => {
        const newRole: any = {
            id: `custom-${storeDetails?.storeId}-${Date.now()}`,
            name: '',
            description: '',
            active: true,
            permissions: { ...RolesPermissionInitialData },
        };
        setEditingRole(newRole);
        setIsEditSheetOpen(true);
    };

    const handleSaveRole = async () => {
        if (!editingRole?.name?.trim()) {
            Toast.show({ content: t('roleNameRequired'), duration: 1500 });
            return;
        }

        setIsSaving(true);
        try {
            const rolesCopy = JSON.parse(JSON.stringify(roles));
            const index = rolesCopy.findIndex((r: any) => r.id === editingRole.id);

            if (index === -1) {
                rolesCopy.push(editingRole);
            } else {
                rolesCopy[index] = editingRole;
            }

            await updateStore({ roles: rolesCopy, storeId: storeDetails?.storeId });
            setStoreDetails({ ...storeDetails, roles: rolesCopy });
            setIsEditSheetOpen(false);
            setEditingRole(null);
            // Update selected role if it was the one being edited
            if (selectedRole?.id === editingRole.id) {
                setSelectedRole(editingRole);
            }
            Toast.show({ content: t('roleSaved'), duration: 1000 });
        } catch (err) {
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRole = (role: StoreRoleDataType) => {
        Dialog.confirm({
            title: t('deleteRole'),
            content: t('deleteRoleConfirm', { name: role.name }),
            confirmText: t('delete'),
            cancelText: t('cancel'),
            onConfirm: async () => {
                try {
                    const rolesCopy = roles.filter((r: any) => r.id !== role.id);
                    await updateStore({ roles: rolesCopy, storeId: storeDetails?.storeId });
                    setStoreDetails({ ...storeDetails, roles: rolesCopy });
                    if (selectedRole?.id === role.id) setSelectedRole(null);
                    Toast.show({ content: t('roleDeleted'), duration: 1000 });
                } catch {
                    Toast.show({ content: t('failedToDelete'), duration: 2000 });
                }
            },
        });
    };

    const togglePermission = (permKey: string) => {
        if (!editingRole) return;
        const updated = { ...editingRole };
        updated.permissions = { ...updated.permissions };
        (updated.permissions as any)[permKey] = !Boolean((updated.permissions as any)[permKey]);
        setEditingRole(updated);
    };

    const toggleCategoryAll = (permKeys: readonly string[], value: boolean) => {
        if (!editingRole) return;
        const updated = { ...editingRole };
        updated.permissions = { ...updated.permissions };
        permKeys.forEach((k) => { (updated.permissions as any)[k] = value; });
        setEditingRole(updated);
    };

    // Role detail view
    if (selectedRole) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={() => setSelectedRole(null)} style={{ '--height': '48px' } as React.CSSProperties}>
                    {selectedRole.name}
                </NavBar>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedRole.description || t('noDescription')}</p>
                            <Tag color={selectedRole.active ? 'success' : 'default'} fill="outline" style={{ marginTop: 4 }}>
                                {selectedRole.active ? t('active') : t('inactive')}
                            </Tag>
                        </div>
                        <Button
                            size="small"
                            fill="outline"
                            onClick={() => handleEditRole(selectedRole)}
                            style={{ minHeight: '36px' }}
                        >
                            <LuPencil size={14} className="inline mr-1" />
                            {t('edit')}
                        </Button>
                    </div>

                    {PERMISSION_CATEGORIES_CONFIG.map((category, catIdx) => (
                        <div key={catIdx} className="mb-4">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                {category.icon} {category.label}
                            </h4>
                            <Card style={{ padding: 0 }}>
                                <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                    {category.permissions.map((permKey) => {
                                        const isEnabled = Boolean((selectedRole.permissions as any)?.[permKey]);
                                        return (
                                            <List.Item
                                                key={permKey}
                                                prefix={isEnabled
                                                    ? <LuCheck size={16} className="text-green-500" />
                                                    : <LuX size={16} className="text-gray-300" />
                                                }
                                                style={{ minHeight: '40px' }}
                                            >
                                                <span className={`text-sm ${isEnabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                                    {PERMISSION_LABELS[permKey as PermissionKey] || permKey}
                                                </span>
                                            </List.Item>
                                        );
                                    })}
                                </List>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Roles list (main view)
    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {t('subtitle')}
                </p>

                {roles.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 pt-12 text-center">
                        <LuShield size={40} className="text-gray-300" />
                        <p className="text-sm text-gray-500">{t('noRolesYet')}</p>
                        <Button color="primary" onClick={handleAddRole} style={{ minHeight: '44px' }}>
                            <LuPlus size={16} className="inline mr-1" /> {t('createRole')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <Card style={{ padding: 0 }} className="rounded-xl mb-4">
                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                {roles.map((role: StoreRoleDataType) => (
                                    <List.Item
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        prefix={<LuShield size={20} className={role.active ? 'text-blue-500' : 'text-gray-300'} />}
                                        description={role.description || t('noDescription')}
                                        extra={
                                            <div className="flex items-center gap-2">
                                                {!role.active && (
                                                    <Tag color="warning" fill="outline" style={{ fontSize: 11 }}>Off</Tag>
                                                )}
                                            </div>
                                        }
                                        arrow
                                        style={{ minHeight: '48px' }}
                                    >
                                        <span className="text-[15px] font-medium">{role.name}</span>
                                    </List.Item>
                                ))}
                            </List>
                        </Card>

                        <Button
                            block
                            color="primary"
                            fill="outline"
                            size="large"
                            onClick={handleAddRole}
                            style={{ minHeight: '44px' }}
                        >
                            <LuPlus size={16} className="inline mr-1" /> {t('addCustomRole')}
                        </Button>
                    </>
                )}
            </div>

            {/* Edit/Add Role Bottom Sheet */}
            <Popup
                visible={isEditSheetOpen}
                onMaskClick={isSaving ? undefined : () => setIsEditSheetOpen(false)}
                position="bottom"
                bodyStyle={{
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                    maxHeight: '92vh',
                }}
                destroyOnClose
            >
                {editingRole && (
                    <div className="flex flex-col h-full" style={{ maxHeight: '92vh' }}>
                        {/* Header */}
                        <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {roles.some((r: any) => r.id === editingRole.id) ? t('editRole') : t('newRole')}
                            </h2>
                            <Button
                                color="primary"
                                fill="solid"
                                size="small"
                                loading={isSaving}
                                onClick={handleSaveRole}
                                style={{ minHeight: '36px' }}
                            >
                                {t('save')}
                            </Button>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-4 pb-6">
                            {/* Role basics */}
                            <div className="space-y-3 py-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">{t('roleName')}</label>
                                    <Input
                                        value={editingRole.name || ''}
                                        onChange={(val) => setEditingRole({ ...editingRole, name: val })}
                                        placeholder={t('roleNamePlaceholder')}
                                        style={{ '--font-size': '15px' } as React.CSSProperties}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">{t('description')}</label>
                                    <TextArea
                                        value={editingRole.description || ''}
                                        onChange={(val) => setEditingRole({ ...editingRole, description: val })}
                                        placeholder={t('descriptionPlaceholder')}
                                        rows={2}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{t('active')}</span>
                                    <Switch
                                        checked={editingRole.active || false}
                                        onChange={(val) => setEditingRole({ ...editingRole, active: val })}
                                    />
                                </div>
                            </div>

                            {/* Permissions by category */}
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-2">{t('permissions')}</h3>

                            {PERMISSION_CATEGORIES_CONFIG.map((category, catIdx) => {
                                const allEnabled = category.permissions.every(
                                    (k) => Boolean((editingRole.permissions as any)?.[k])
                                );

                                return (
                                    <div key={catIdx} className="mb-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                {category.icon} {category.label}
                                            </span>
                                            <Checkbox
                                                checked={allEnabled}
                                                onChange={(val) => toggleCategoryAll(category.permissions, val)}
                                                style={{ '--icon-size': '18px', '--font-size': '12px' } as React.CSSProperties}
                                            >
                                                {t('all')}
                                            </Checkbox>
                                        </div>
                                        <Card style={{ padding: 0 }}>
                                            <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                                {category.permissions.map((permKey) => {
                                                    const isEnabled = Boolean((editingRole.permissions as any)?.[permKey]);
                                                    return (
                                                        <List.Item
                                                            key={permKey}
                                                            onClick={() => togglePermission(permKey)}
                                                            extra={
                                                                <Switch
                                                                    checked={isEnabled}
                                                                    onChange={() => togglePermission(permKey)}
                                                                    style={{ '--height': '22px', '--width': '38px' } as React.CSSProperties}
                                                                />
                                                            }
                                                            style={{ minHeight: '44px' }}
                                                        >
                                                            <span className="text-sm text-gray-900 dark:text-gray-100">
                                                                {PERMISSION_LABELS[permKey as PermissionKey] || permKey}
                                                            </span>
                                                        </List.Item>
                                                    );
                                                })}
                                            </List>
                                        </Card>
                                    </div>
                                );
                            })}

                            {/* Delete button for existing roles */}
                            {roles.some((r: any) => r.id === editingRole.id) && (
                                <button
                                    onClick={() => {
                                        setIsEditSheetOpen(false);
                                        setTimeout(() => handleDeleteRole(editingRole), 300);
                                    }}
                                    className="w-full text-center text-red-500 text-sm font-medium py-3 active:bg-red-50 dark:active:bg-red-900/20 rounded-lg min-h-[44px] mt-2"
                                >
                                    <LuTrash2 size={14} className="inline mr-1" />
                                    {t('deleteThisRole')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Popup>
        </div>
    );
}
