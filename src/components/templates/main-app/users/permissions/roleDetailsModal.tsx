import DrawerElement from "@antdComponent/drawerElement";
import { useAppDispatch } from "@hook/useAppDispatch";
import { saveRoleDefinition } from "@lib/staffManagement/client";
import { getBoundedStaffStringContext, logStaffClientFailure } from "@lib/staffManagement/diagnostics";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { showErrorToast, showSuccessToast, showWarningToast } from "@reduxSlices/toast";
import RolesPermissionForm from "@template/platform/stores/rolesPermissionForm";
import { StoreRoleDataType } from "@type/platform/roles";
import { objectNullCheck, removeObjRef } from "@util/utils";
import { Button, Flex, Input, Switch, Typography, theme } from "antd";
import { useContext, useEffect, useState } from "react";
const { Text, Title } = Typography;

const getDesktopRoleDetailsLogContext = (storeDetails: any, roleData?: StoreRoleDataType) => ({
    ...getBoundedStaffStringContext('storeId', storeDetails?.storeId),
    ...getBoundedStaffStringContext('tenantId', storeDetails?.tenantId),
    ...getBoundedStaffStringContext('roleId', roleData?.id),
    ...getBoundedStaffStringContext('roleName', roleData?.name),
});

function RoleDetailsModal({ storeDetails, modalData, onClose }) {

    const [roleData, setRoleData] = useState<StoreRoleDataType>(modalData?.data);
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
                } as StoreRoleDataType)
        } else {
            setRoleData(null)
        }
    }, [modalData])

    const onCancel = (data) => {
        onClose(data)
    }

    const addUpdateDetails = async () => {
        if (!roleData?.name?.trim()) {
            dispatch(showWarningToast("Role name is required"))
            return
        }

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
            onCancel({ ...storeDetails, roles: response.roles })
            setStoreDetails({ ...storeDetails, roles: response.roles })
            dispatch(showSuccessToast(objectNullCheck(modalData, 'data') ? "Role updated" : "Role added"))
        } catch (err) {
            logStaffClientFailure('desktop_staff_role_save_failed', err, getDesktopRoleDetailsLogContext(storeDetails, roleData));
            dispatch(showErrorToast("Could not save role"))
        }
    }

    const onChangeValue = (key, value) => {
        let dataCopy = removeObjRef(roleData)
        if (!dataCopy) dataCopy = {}
        dataCopy[key] = value
        setRoleData(dataCopy)
    }

    return (
        <DrawerElement
            title={objectNullCheck(modalData.data) ? `Edit ${modalData?.data?.name} Role` : 'Add Custom Role'}
            open={objectNullCheck(modalData, 'active')}
            onClose={() => onCancel(null)}
            width="min(760px, calc(100vw - 32px))"
            footerActions={[
                <Button size="large" key="Cancel" type="default" onClick={() => onCancel(null)}>Cancel</Button>,
                <Button size="large" key="Ok" type="primary" onClick={addUpdateDetails}>{objectNullCheck(modalData, 'data') ? 'Update Role' : 'Add Role'}</Button>
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
