import TagElement from '@antdComponent/tagElement'
import { PermissionKey } from '@constant/permissions'
import { PERMISSION_CATEGORIES_CONFIG, PERMISSION_LABELS } from '@data/rolesPermissionsInitialData'
import { getPermissionsForRole } from '@lib/permissions/hasPermission'
import type { StaffStoreOption } from '@lib/staffManagement/types'
import EditorWrapper from '@organisms/editor/editorWrapper'
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider'
import { RolePermissions } from '@type/platform/roles'
import { StoreDataType } from '@type/platform/store'
import { UserDataType } from '@type/platform/user'
import { Divider, Empty, Flex, Select, Tag, Typography } from 'antd'
import { Fragment, useContext, useEffect, useState } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'
const { Text } = Typography;

function AccessPermissions({ staffStores = [], userDetails }: { staffStores?: StaffStoreOption[], userDetails: UserDataType }) {

    const { storeDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [permissions, setPermissions] = useState<RolePermissions>({})
    const [activeStore, setActiveStore] = useState(null)
    const [userRoleName, setUserRoleName] = useState<string>('')

    useEffect(() => {
        setPermissions({})
        setUserRoleName('')

        if ((Boolean(storeDetails) && Boolean(userDetails?.stores?.length) && 'storeId' in userDetails)) {
            const selectedStoreId = activeStore || userDetails.storeId;
            const store: StoreDataType = staffStores.find((s) => s.storeId === selectedStoreId) as any
                || tenantDetails?.storesList?.find((s: any) => s.storeId === selectedStoreId)?.storeDetails
                || tenantDetails?.storesList?.find((s: any) => s.storeId === selectedStoreId)
                || (storeDetails?.storeId === selectedStoreId ? storeDetails : null);
            if (!store) return

            // Single role per store (not array)
            const userStoreMapping = userDetails.stores?.find((s: any) => s.storeId === selectedStoreId);
            const userRoleId = userStoreMapping?.role;  // Single role string

            if (!userRoleId) return

            // Get permissions directly from user's single role
            const finalPermissions = getPermissionsForRole(userRoleId, store.roles || []);

            // Get role name for display
            const roleData = store.roles?.find((r: any) => r.id === userRoleId);
            setUserRoleName(roleData?.name || userRoleId);

            if (activeStore == null) setActiveStore(userDetails.storeId);
            setPermissions(finalPermissions)
        }
    }, [userDetails, activeStore, staffStores, storeDetails, tenantDetails?.storesList])

    return (
        <EditorWrapper>
            {Boolean(userDetails?.stores?.length) && Object.keys(permissions).length > 0 ? <>
                <Flex vertical gap={20}>

                    {userDetails?.stores?.length > 1 && <Flex>
                        <Text style={{ minWidth: 100 }}>Select Store</Text>
                        <Select
                            defaultValue={activeStore}
                            value={activeStore}
                            style={{ width: "100%" }}
                            placeholder="Select Store"
                            onChange={(storeId) => setActiveStore(storeId)}
                            options={userDetails.stores?.map((s) => ({ label: `${s.storeId}-${s.name}`, value: s.storeId }))}
                        />
                    </Flex>}

                    {userRoleName && (
                        <Flex align="center" gap={8}>
                            <Text strong>Current Role:</Text>
                            <Tag color="blue">{userRoleName}</Tag>
                        </Flex>
                    )}

                    {/* Display permissions by category - feature flag style */}
                    {PERMISSION_CATEGORIES_CONFIG.map((category, catIndex) => (
                        <Fragment key={catIndex}>
                            <Flex vertical gap={8}>
                                <Text type="secondary">{category.icon} {category.label}</Text>
                                <Flex gap={8} wrap="wrap" style={{ paddingLeft: 8 }}>
                                    {category.permissions.map((permKey, permIndex) => {
                                        const isEnabled = Boolean(permissions[permKey as PermissionKey]);
                                        return (
                                            <Tag
                                                key={permIndex}
                                                color={isEnabled ? 'green' : 'default'}
                                                icon={isEnabled ? <LuCheck /> : <LuX />}
                                                style={{ padding: '4px 8px' }}
                                            >
                                                {PERMISSION_LABELS[permKey as PermissionKey] || permKey}
                                            </Tag>
                                        );
                                    })}
                                </Flex>
                            </Flex>
                            {catIndex < PERMISSION_CATEGORIES_CONFIG.length - 1 && <Divider style={{ margin: '8px 0' }} />}
                        </Fragment>
                    ))}

                    <TagElement type='default' content="To change permissions, update the user's role assignment" />
                </Flex>
            </> : <>
                <Empty description="No stores mapped" />
                <TagElement type="warning" content="To view permissions, map at least one store" />
            </>}
        </EditorWrapper>
    )
}

export default AccessPermissions
