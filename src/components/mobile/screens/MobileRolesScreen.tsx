'use client'

import { PermissionKey } from '@constant/permissions';
import RolesPermissionInitialData, { PERMISSION_CATEGORIES_CONFIG, PERMISSION_LABELS } from '@data/rolesPermissionsInitialData';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { StoreRoleDataType } from '@type/platform/roles';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuCheck, LuPencil, LuPlus, LuShield, LuTrash2, LuX } from 'react-icons/lu';
import { Button, Card, Checkbox, Dialog, Empty, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, TextArea, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileRolesScreenProps {
    onBack: () => void;
}

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
        const newRole: StoreRoleDataType = {
            id: `custom-${storeDetails?.storeId}-${Date.now()}`,
            name: '',
            description: '',
            active: true,
            permissions: { ...RolesPermissionInitialData },
        } as StoreRoleDataType;
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
            const index = rolesCopy.findIndex((role: StoreRoleDataType) => role.id === editingRole.id);

            if (index === -1) rolesCopy.push(editingRole);
            else rolesCopy[index] = editingRole;

            await updateStore({ roles: rolesCopy, storeId: storeDetails?.storeId });
            setStoreDetails({ ...storeDetails, roles: rolesCopy });
            setIsEditSheetOpen(false);
            setEditingRole(null);
            if (selectedRole?.id === editingRole.id) setSelectedRole(editingRole);
            Toast.show({ content: t('roleSaved'), duration: 1000 });
        } catch {
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
                    const rolesCopy = roles.filter((item: StoreRoleDataType) => item.id !== role.id);
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
        const updated = { ...editingRole, permissions: { ...editingRole.permissions } };
        (updated.permissions as any)[permKey] = !Boolean((updated.permissions as any)[permKey]);
        setEditingRole(updated);
    };

    const toggleCategoryAll = (permKeys: readonly string[], value: boolean) => {
        if (!editingRole) return;
        const updated = { ...editingRole, permissions: { ...editingRole.permissions } };
        permKeys.forEach((permKey) => {
            (updated.permissions as any)[permKey] = value;
        });
        setEditingRole(updated);
    };

    if (selectedRole) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={() => setSelectedRole(null)}>
                    {selectedRole.name}
                </NavBar>

                <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                    <Card>
                        <Flex align="center" justify="space-between">
                            <Flex gap={6} vertical>
                                <Text>{selectedRole.description || t('noDescription')}</Text>
                                <Tag color={selectedRole.active ? 'success' : 'default'}>
                                    {selectedRole.active ? t('active') : t('inactive')}
                                </Tag>
                            </Flex>
                            <Button fill="outline" onClick={() => handleEditRole(selectedRole)} size="small">
                                <Flex align="center" gap={6}>
                                    <LuPencil size={14} />
                                    <Text>{t('edit')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>

                    {PERMISSION_CATEGORIES_CONFIG.map((category, index) => (
                        <Card
                            key={`${category.label}-${index}`}
                            size="small"
                            title={<Text strong>{`${category.icon} ${category.label}`}</Text>}
                        >
                            <List>
                                {category.permissions.map((permKey) => {
                                    const isEnabled = Boolean((selectedRole.permissions as any)?.[permKey]);
                                    return (
                                        <List.Item
                                            key={permKey}
                                            prefix={isEnabled ? <LuCheck color="#16a34a" size={16} /> : <LuX color="#cbd5e1" size={16} />}
                                            title={<Text>{PERMISSION_LABELS[permKey as PermissionKey] || permKey}</Text>}
                                        />
                                    );
                                })}
                            </List>
                        </Card>
                    ))}
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack} />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />

                {roles.length === 0 ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuShield color="#cbd5e1" size={40} />
                            <Empty description={t('noRolesYet')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            <Button color="primary" onClick={handleAddRole} size="large">
                                <Flex align="center" gap={6}>
                                    <LuPlus size={16} />
                                    <Text>{t('createRole')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        <Card size="small">
                            <List>
                                {roles.map((role: StoreRoleDataType) => (
                                    <List.Item
                                        key={role.id}
                                        arrow
                                        description={<Text type="secondary">{role.description || t('noDescription')}</Text>}
                                        extra={!role.active ? <Tag color="warning">Off</Tag> : null}
                                        onClick={() => setSelectedRole(role)}
                                        prefix={<LuShield color={role.active ? '#1677ff' : '#cbd5e1'} size={20} />}
                                        title={<Text strong>{role.name}</Text>}
                                    />
                                ))}
                            </List>
                        </Card>

                        <Button block color="primary" fill="outline" onClick={handleAddRole} size="large">
                            <Flex align="center" gap={6} justify="center">
                                <LuPlus size={16} />
                                <Text>{t('addCustomRole')}</Text>
                            </Flex>
                        </Button>
                    </>
                )}
            </Flex>

            <Popup
                bodyStyle={{ maxHeight: '92vh', overflow: 'hidden', padding: 0 }}
                destroyOnClose
                onMaskClick={isSaving ? undefined : () => setIsEditSheetOpen(false)}
                position="bottom"
                visible={isEditSheetOpen}
            >
                {editingRole ? (
                    <Flex style={{ height: '100%' }} vertical>
                        <NavBar
                            backIcon={<LuX size={20} />}
                            onBack={() => setIsEditSheetOpen(false)}
                            right={(
                                <Button color="primary" loading={isSaving} onClick={handleSaveRole} size="small">
                                    {t('save')}
                                </Button>
                            )}
                        >
                            {roles.some((role: StoreRoleDataType) => role.id === editingRole.id) ? t('editRole') : t('newRole')}
                        </NavBar>

                        <Flex gap={16} style={{ overflowY: 'auto', padding: 12 }} vertical>
                            <Card>
                                <Flex gap={16} vertical>
                                    <Flex gap={6} vertical>
                                        <Text strong>{t('roleName')}</Text>
                                        <Text type="secondary">Use a clear staff-facing name like Cashier, Floor Manager, or Kitchen Lead.</Text>
                                        <Input
                                            onChange={(value) => setEditingRole({ ...editingRole, name: value })}
                                            placeholder={t('roleNamePlaceholder')}
                                            value={editingRole.name || ''}
                                        />
                                    </Flex>

                                    <Flex gap={6} vertical>
                                        <Text strong>{t('description')}</Text>
                                        <Text type="secondary">Write what this role is responsible for so owners know when to assign it.</Text>
                                        <TextArea
                                            onChange={(value) => setEditingRole({ ...editingRole, description: value })}
                                            placeholder={t('descriptionPlaceholder')}
                                            rows={2}
                                            value={editingRole.description || ''}
                                        />
                                    </Flex>

                                    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                                        <Flex align="center" justify="space-between">
                                            <Text strong>{t('active')}</Text>
                                            <Switch
                                                checked={editingRole.active || false}
                                                onChange={(value) => setEditingRole({ ...editingRole, active: value })}
                                            />
                                        </Flex>
                                    </Card>
                                </Flex>
                            </Card>

                            <Title level={5} style={{ margin: 0 }}>
                                {t('permissions')}
                            </Title>
                            <Text type="secondary">Turn on only the actions this role should be allowed to do inside the app.</Text>

                            {PERMISSION_CATEGORIES_CONFIG.map((category, index) => {
                                const allEnabled = category.permissions.every((permKey) => Boolean((editingRole.permissions as any)?.[permKey]));

                                return (
                                    <Card
                                        key={`${category.label}-${index}`}
                                        size="small"
                                        title={
                                            <Flex align="center" justify="space-between">
                                                <Text strong>{`${category.icon} ${category.label}`}</Text>
                                                <Checkbox checked={allEnabled} onChange={(value) => toggleCategoryAll(category.permissions, value)}>
                                                    <Text>{t('all')}</Text>
                                                </Checkbox>
                                            </Flex>
                                        }
                                    >
                                        <List>
                                            {category.permissions.map((permKey) => {
                                                const isEnabled = Boolean((editingRole.permissions as any)?.[permKey]);
                                                return (
                                                    <List.Item
                                                        key={permKey}
                                                        extra={<Switch checked={isEnabled} onChange={() => togglePermission(permKey)} />}
                                                        onClick={() => togglePermission(permKey)}
                                                        title={<Text>{PERMISSION_LABELS[permKey as PermissionKey] || permKey}</Text>}
                                                    />
                                                );
                                            })}
                                        </List>
                                    </Card>
                                );
                            })}

                            {roles.some((role: StoreRoleDataType) => role.id === editingRole.id) ? (
                                <Button
                                    block
                                    color="danger"
                                    fill="outline"
                                    onClick={() => {
                                        setIsEditSheetOpen(false);
                                        setTimeout(() => handleDeleteRole(editingRole), 300);
                                    }}
                                    size="large"
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuTrash2 size={14} />
                                        <Text>{t('deleteThisRole')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                        </Flex>
                    </Flex>
                ) : null}
            </Popup>
        </Flex>
    );
}
