'use client'

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { PermissionKey } from '@constant/permissions';
import { DEFAULT_ROLE_IDS } from '@data/defaultRoles';
import RolesPermissionInitialData, { PERMISSION_CATEGORIES_CONFIG, PERMISSION_LABELS } from '@data/rolesPermissionsInitialData';
import { getBoundedStaffStringContext, logStaffClientFailure } from '@lib/staffManagement/diagnostics';
import { saveRoleDefinition } from '@lib/staffManagement/client';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { StoreRoleDataType } from '@type/platform/roles';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useRef, useState } from 'react';
import { LuCheck, LuPencil, LuPlus, LuShield, LuX } from 'react-icons/lu';
import { Button, Card, Checkbox, Empty, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, TextArea, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileRolesScreenProps {
    onBack: () => void;
}

function MobileRolesScreenContent({ onBack }: MobileRolesScreenProps) {
    const t = useTranslations('MobileRoles');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const [selectedRole, setSelectedRole] = useState<StoreRoleDataType | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<StoreRoleDataType | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const isMountedRef = useRef(true);
    const roleMutationInFlightRef = useRef(false);

    const roles = storeDetails?.roles || [];
    const canAssignRoles = userPermissions?.canAssignRoles === true;
    const buildMobileRoleLogContext = (flow: string, role?: StoreRoleDataType | null) => ({
        surface: 'mobile_roles',
        flow,
        canAssignRoles,
        roleCount: roles.length,
        ...getBoundedStaffStringContext('tenantId', storeDetails?.tenantId),
        ...getBoundedStaffStringContext('storeId', storeDetails?.storeId),
        ...getBoundedStaffStringContext('roleId', role?.id),
        ...getBoundedStaffStringContext('roleName', role?.name),
    });

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
        if (
            !canAssignRoles
            || !storeDetails?.tenantId
            || !storeDetails?.storeId
            || roleMutationInFlightRef.current
        ) {
            return;
        }

        const sourceStoreDetails = storeDetails;
        const sourceRoles = roles;
        const expectedTenantId = sourceStoreDetails.tenantId;
        const expectedStoreId = sourceStoreDetails.storeId;
        const submittedRole = editingRole;
        roleMutationInFlightRef.current = true;
        setIsSaving(true);
        try {
            const response = await saveRoleDefinition({
                role: {
                    active: submittedRole.active !== false,
                    description: submittedRole.description || '',
                    id: sourceRoles.some((role: StoreRoleDataType) => role.id === submittedRole.id) ? submittedRole.id : undefined,
                    name: submittedRole.name,
                    permissions: submittedRole.permissions || RolesPermissionInitialData,
                },
                storeId: expectedStoreId,
                tenantId: expectedTenantId,
            });
            if (!isMountedRef.current) return;
            setStoreDetails((currentStoreDetails) => (
                currentStoreDetails?.tenantId === expectedTenantId
                && currentStoreDetails?.storeId === expectedStoreId
                && currentStoreDetails?.roles === sourceStoreDetails.roles
                    ? { ...currentStoreDetails, roles: response.roles }
                    : currentStoreDetails
            ));
            setIsEditSheetOpen(false);
            setEditingRole(null);
            if (selectedRole?.id === submittedRole.id) setSelectedRole(response.role || submittedRole);
            Toast.show({ content: t('roleSaved'), duration: 1000 });
        } catch (err) {
            logStaffClientFailure('mobile_staff_role_save_failed', err, buildMobileRoleLogContext('save_role', submittedRole));
            if (isMountedRef.current) {
                Toast.show({ content: t('failedToSave'), duration: 2000 });
            }
        } finally {
            roleMutationInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

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

    const editRoleSheet = (
        <Popup
            aria-label={editingRole && roles.some((role: StoreRoleDataType) => role.id === editingRole.id) ? t('editRole') : t('newRole')}
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
                                        aria-label={t('roleName')}
                                        onChange={(value) => setEditingRole({ ...editingRole, name: value })}
                                        placeholder={t('roleNamePlaceholder')}
                                        value={editingRole.name || ''}
                                    />
                                </Flex>

                                <Flex gap={6} vertical>
                                    <Text strong>{t('description')}</Text>
                                    <Text type="secondary">Write what this role is responsible for so owners know when to assign it.</Text>
                                    <TextArea
                                        aria-label={t('description')}
                                        onChange={(value) => setEditingRole({ ...editingRole, description: value })}
                                        placeholder={t('descriptionPlaceholder')}
                                        rows={2}
                                        value={editingRole.description || ''}
                                    />
                                </Flex>

                                <Card size="small" style={{ backgroundColor: token.colorFillQuaternary }}>
                                    <Flex align="center" justify="space-between">
                                        <Text strong>{t('active')}</Text>
                                        <Switch
                                            aria-label={t('active')}
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
                        <Card size="small" style={{ backgroundColor: token.colorFillQuaternary }}>
                            <Flex gap={4} vertical>
                                <Text strong>Custom roles start with no access.</Text>
                                <Text type="secondary">Turn on only the actions this person should handle.</Text>
                            </Flex>
                        </Card>

                        {PERMISSION_CATEGORIES_CONFIG.map((category, index) => {
                            const allEnabled = category.permissions.every((permKey) => Boolean((editingRole.permissions as any)?.[permKey]));

                            return (
                                <Card
                                    key={`${category.label}-${index}`}
                                    size="small"
                                    title={
                                        <Flex align="center" justify="space-between">
                                            <Text strong>{`${category.icon} ${category.label}`}</Text>
                                            <Checkbox
                                                aria-label={`${category.label}: ${t('all')}`}
                                                checked={allEnabled}
                                                onChange={(value) => toggleCategoryAll(category.permissions, value)}
                                            >
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
                                                    extra={(
                                                        <span style={{ alignItems: 'center', display: 'inline-flex', minHeight: 44, minWidth: 44 }}>
                                                            <Switch aria-label={PERMISSION_LABELS[permKey as PermissionKey] || permKey} checked={isEnabled} onChange={() => togglePermission(permKey)} />
                                                        </span>
                                                    )}
                                                    title={<Text>{PERMISSION_LABELS[permKey as PermissionKey] || permKey}</Text>}
                                                />
                                            );
                                        })}
                                    </List>
                                </Card>
                            );
                        })}

                    </Flex>
                </Flex>
            ) : null}
        </Popup>
    );

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
                            <Button disabled={!canAssignRoles || selectedRole.id === DEFAULT_ROLE_IDS.OWNER} fill="outline" onClick={() => handleEditRole(selectedRole)} size="small">
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
                                            prefix={isEnabled ? <LuCheck color={token.colorSuccess} size={16} /> : <LuX color={token.colorTextTertiary} size={16} />}
                                            title={(
                                                <Text>
                                                    {PERMISSION_LABELS[permKey as PermissionKey] || permKey}
                                                    <span className="sr-only"> — {isEnabled ? t('active') : t('inactive')}</span>
                                                </Text>
                                            )}
                                        />
                                    );
                                })}
                            </List>
                        </Card>
                    ))}
                </Flex>
                {editRoleSheet}
            </Flex>
        );
    }

    return (
        <Flex style={{ height: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <Card>
                    <Flex gap={8} vertical>
                        <Text strong>Use the simple roles first</Text>
                        <Text type="secondary">Owner manages everything. Manager handles daily updates. Staff gets only the access you assign.</Text>
                    </Flex>
                </Card>

                {roles.length === 0 ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <Empty
                                description={t('noRolesYet')}
                                image={(
                                    <ContextualStateIllustration
                                        color={token.colorPrimary}
                                        size={88}
                                        treatment="softHalo"
                                        variant="roleStructureContext"
                                    />
                                )}
                                styles={{ image: { height: 88 } }}
                            />
                            <Button color="primary" disabled={!canAssignRoles} onClick={handleAddRole} size="large">
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
                                        prefix={<LuShield color={role.active ? token.colorPrimary : token.colorTextTertiary} size={20} />}
                                        title={<Text strong>{role.name}</Text>}
                                    />
                                ))}
                            </List>
                        </Card>

                        <Button block color="primary" disabled={!canAssignRoles} fill="outline" onClick={handleAddRole} size="large">
                            <Flex align="center" gap={6} justify="center">
                                <LuPlus size={16} />
                                <Text>{t('addCustomRole')}</Text>
                            </Flex>
                        </Button>
                    </>
                )}
            </Flex>

            {editRoleSheet}
        </Flex>
    );
}

export default function MobileRolesScreen(props: MobileRolesScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}`;

    return <MobileRolesScreenContent key={scopeKey} {...props} />;
}
