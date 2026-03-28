import DrawerElement from "@antdComponent/drawerElement";
import RolesPermissionInitialData from "@data/rolesPermissionsInitialData";
import { updateStore } from "@database/stores";
import { useAppDispatch } from "@hook/useAppDispatch";
import { requestBodyComposer } from "@lib/apiHelper";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { showWarningToast } from "@reduxSlices/toast";
import RolesPermissionForm from "@template/platform/stores/rolesPermissionForm";
import { StoreRoleDataType } from "@type/platform/roles";
import { getObjectDifferance } from "@util/deepMerge";
import { objectNullCheck, removeObjRef } from "@util/utils";
import { Button, Flex, Input, Switch, Typography } from "antd";
import { useContext, useEffect, useState } from "react";
const { Text, Title } = Typography;

function RoleDetailsModal({ storeDetails, modalData, onClose }) {

    const [roleData, setRoleData] = useState<StoreRoleDataType>(modalData?.data);
    const { setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (modalData.active) {
            setRoleData(removeObjRef(modalData.data))
        } else {
            setRoleData(null)
        }
    }, [modalData])

    const onCancel = (data) => {
        onClose(data)
    }

    const addUpdateDetails = async () => {
        let dataCopy: StoreRoleDataType[] = removeObjRef(storeDetails.roles || [])
        if (!dataCopy) dataCopy = []
        let index = dataCopy.findIndex((u) => u.id == roleData.id)

        if (index == -1) {
            const newRole: StoreRoleDataType = await requestBodyComposer({
                ...roleData,
                id: `custom-${storeDetails.storeId}-${new Date().getTime()}`
            })
            newRole.createdOn = newRole.modifiedOn;
            newRole.createdBy = newRole.modifiedBy;
            dataCopy.push(newRole)
        } else {
            dataCopy[index] = await requestBodyComposer(roleData)
        }

        const updatedChanges = modalData.data ? getObjectDifferance(roleData, modalData.data) : roleData;
        if (Object.keys(updatedChanges).length > 0) {
            console.log("Changes detected:", updatedChanges);
            updateStore({ roles: dataCopy, storeId: storeDetails.storeId }).then((saved) => {
                onCancel({ ...storeDetails, roles: dataCopy })
                setStoreDetails({ ...storeDetails, roles: dataCopy })
            })
        } else {
            dispatch(showWarningToast("No changes detected."))
            console.log("No changes detected.");
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
            style={{ maxWidth: "80vw", minWidth: 600 }}
            footerActions={[
                <Button size="large" key="Cancel" type="default" onClick={() => onCancel(null)}>Cancel</Button>,
                <Button size="large" key="Ok" type="primary" onClick={addUpdateDetails}>{objectNullCheck(modalData, 'data') ? 'Update' : 'Add'}</Button>
            ]}
        >
            <Flex vertical gap={16}>
                <Flex gap={8} align="center">
                    <Text style={{ minWidth: 100 }}>Name</Text>
                    <Input placeholder="Role name" value={roleData?.name || ""} onChange={(e) => onChangeValue('name', e.target.value)} />
                </Flex>

                <Flex gap={8} align="flex-start">
                    <Text style={{ minWidth: 100 }}>Description</Text>
                    <Input.TextArea placeholder="Role description" value={roleData?.description || ""} onChange={(e) => onChangeValue('description', e.target.value)} />
                </Flex>

                <Flex gap={8} align="center">
                    <Text style={{ minWidth: 100 }}>Active</Text>
                    <Switch
                        checked={roleData?.active || false}
                        onChange={() => onChangeValue('active', !Boolean(roleData?.active))}
                    />
                </Flex>

                <Title level={5} style={{ marginTop: 8 }}>Permissions</Title>
                <RolesPermissionForm
                    userPermissions={roleData?.permissions || RolesPermissionInitialData}
                    updatePermissions={(permissions) => onChangeValue('permissions', permissions)}
                />
            </Flex>
        </DrawerElement>
    )
}

export default RoleDetailsModal