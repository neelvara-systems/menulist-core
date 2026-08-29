import DrawerElement from "@antdComponent/drawerElement";
import { useAppDispatch } from "@hook/useAppDispatch";
import { saveRoleDefinition } from "@lib/staffManagement/client";
import { getBoundedStaffStringContext, logStaffClientFailure } from "@lib/staffManagement/diagnostics";
import { mergeStaffRolesForCurrentStore } from "@lib/staffManagement/formMappingBoundary";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { showErrorToast, showSuccessToast, showWarningToast } from "@reduxSlices/toast";
import RolesPermissionForm from "@template/platform/stores/rolesPermissionForm";
import { StoreRoleDataType } from "@type/platform/roles";
import type { StoreDataType } from "@type/platform/store";
import { objectNullCheck, removeObjRef } from "@util/utils";
import { Button, Flex, Input, Switch, Typography, theme } from "antd";
import { useContext, useEffect, useState } from "react";
const { Text, Title } = Typography;

type RoleDraft = Pick<StoreRoleDataType, 'active' | 'description' | 'name' | 'permissions'> & {
    id?: string;
};

type RoleDetailsModalProps = {
    modalData: { active: boolean; data: StoreRoleDataType | null };
    onClose: (store: StoreDataType | null) => void;
    storeDetails: StoreDataType | null;
};

const getDesktopRoleDetailsLogContext = (storeDetails: StoreDataType | null, roleData?: RoleDraft | null) => ({
    ...getBoundedStaffStringContext('storeId', storeDetails?.storeId),
    ...getBoundedStaffStringContext('tenantId', storeDetails?.tenantId),
    ...getBoundedStaffStringContext('roleId', roleData?.id),
    ...getBoundedStaffStringContext('roleName', roleData?.name),
});

function RoleDetailsModal({ storeDetails, modalData, onClose }: RoleDetailsModalProps) {

    const [roleData, setRoleData] = useState<RoleDraft | null>(modalData.data);
    const [isSaving, setIsSaving] = useState(false);
    const { setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const dispatch = useAppDispatch()
    const { token } = theme.useToken();

    useEffect(() => {
        if (modalData.active) {
            setRoleData(objectNullCheck(modalData, 'data')
                ? removeObjRef(modalData.data)
                : {
                    active: true,
                    description: "",
                    name: "",
                    permissions: {},
                })
        } else {
            setRoleData(null)
        }
    }, [modalData])

    const onCancel = (data: StoreDataType | null) => {
        onClose(data)
    }

    const addUpdateDetails = async () => {
        if (isSaving || !storeDetails?.storeId || !storeDetails.tenantId) return;
        if (!roleData?.name?.trim()) {
            dispatch(showWarningToast("Role name is required"))
            return
        }

        setIsSaving(true);
        const expectedTenantId = storeDetails.tenantId;
        const expectedStoreId = storeDetails.storeId;
        const sourceRoles = storeDetails.roles;
        try {
            const response = await saveRoleDefinition({
                role: {
                    active: roleData.active !== false,
                    description: roleData.description || "",
                    id: roleData.id,
                    name: roleData.name,
                    permissions: roleData.permissions || {},
                },
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
            })
            setStoreDetails((currentStore) => mergeStaffRolesForCurrentStore(
                currentStore,
                expectedTenantId,
                expectedStoreId,
                sourceRoles,
                response.roles,
            ))
            onCancel(null)
            dispatch(showSuccessToast(objectNullCheck(modalData, 'data') ? "Role updated" : "Role added"))
        } catch (err) {
            logStaffClientFailure('desktop_staff_role_save_failed', err, getDesktopRoleDetailsLogContext(storeDetails, roleData));
            dispatch(showErrorToast("Could not save role"))
        } finally {
            setIsSaving(false);
        }
    }

    const onChangeValue = <Key extends keyof RoleDraft>(key: Key, value: RoleDraft[Key]) => {
        if (!roleData) return
        setRoleData({ ...roleData, [key]: value })
    }

    return (
        <DrawerElement
            title={objectNullCheck(modalData.data) ? `Edit ${modalData?.data?.name} Role` : 'Add Custom Role'}
            open={objectNullCheck(modalData, 'active')}
            onClose={() => onCancel(null)}
            width="min(760px, calc(100vw - 32px))"
            footerActions={[
                <Button disabled={isSaving} size="large" key="Cancel" type="default" onClick={() => onCancel(null)}>Cancel</Button>,
                <Button loading={isSaving} size="large" key="Ok" type="primary" onClick={addUpdateDetails}>{objectNullCheck(modalData, 'data') ? 'Update Role' : 'Add Role'}</Button>
            ]}
            styles={{
                body: { overflow: 'auto' },
            }}
        >
            <Flex vertical gap={16}>
                <Flex gap={8} align="center" wrap="wrap">
                    <Text style={{ minWidth: 110 }}>Name</Text>
                    <Input
                        placeholder="Role name"
                        style={{ flex: 1, minWidth: 260 }}
                        value={roleData?.name || ""}
                        onChange={(e) => onChangeValue('name', e.target.value)}
                    />
                </Flex>

                <Flex gap={8} align="flex-start" wrap="wrap">
                    <Text style={{ minWidth: 110 }}>Description</Text>
                    <Input.TextArea
                        placeholder="Role description"
                        style={{ flex: 1, minWidth: 260 }}
                        value={roleData?.description || ""}
                        onChange={(e) => onChangeValue('description', e.target.value)}
                    />
                </Flex>

                <Flex gap={8} align="center">
                    <Text style={{ minWidth: 110 }}>Active</Text>
                    <Switch
                        aria-label="Active role"
                        checked={roleData?.active !== false}
                        onChange={(checked) => onChangeValue('active', checked)}
                    />
                </Flex>

                <Title level={5} style={{ color: token.colorText, marginTop: 8 }}>Permissions</Title>
                <RolesPermissionForm
                    userPermissions={roleData?.permissions || {}}
                    updatePermissions={(permissions) => onChangeValue('permissions', permissions)}
                />
            </Flex>
        </DrawerElement>
    )
}

export default RoleDetailsModal
