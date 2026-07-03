'use client'

import TextElement from "@antdComponent/textElement";
import { PermissionKey } from "@constant/permissions";
import { DEFAULT_ROLE_IDS } from "@data/defaultRoles";
import { PERMISSION_CATEGORIES_CONFIG, PERMISSION_LABELS } from "@data/rolesPermissionsInitialData";
import { useAppDispatch } from "@hook/useAppDispatch";
import { deleteRoleDefinition } from "@lib/staffManagement/client";
import { getBoundedStaffStringContext, logStaffClientFailure } from "@lib/staffManagement/diagnostics";
import EditorWrapper from "@organisms/editor/editorWrapper";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { showErrorToast, showSuccessToast } from "@reduxSlices/toast";
import { StoreRoleDataType } from "@type/platform/roles";
import { arrayNullCheck, objectNullCheck } from "@util/utils";
import { Alert, Button, Card, Divider, Empty, Flex, Popconfirm, Space, Tag, theme } from "antd";
import { Fragment, useContext, useState } from "react";
import { LuCheck, LuPen, LuPlus, LuShieldCheck, LuTrash2, LuX } from "react-icons/lu";
import RoleDetailsModal from "./roleDetailsModal";
const { Meta } = Card

const getDesktopRoleLogContext = (storeDetails: any, role?: StoreRoleDataType) => ({
    ...getBoundedStaffStringContext('storeId', storeDetails?.storeId),
    ...getBoundedStaffStringContext('tenantId', storeDetails?.tenantId),
    ...getBoundedStaffStringContext('roleId', role?.id),
    ...getBoundedStaffStringContext('roleName', role?.name),
});

function UserPermissionsPage() {
    const [activeRole, setActiveRole] = useState<StoreRoleDataType>(null);
    const { setStoreDetails, storeDetails, userPermissions } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [showDetailsModal, setShowDetailsModal] = useState({ active: false, data: null })
    const { token } = theme.useToken();
    const dispatch = useAppDispatch();
    const canAssignRoles = userPermissions?.canAssignRoles === true;

    const onCloseRoleModal = (storeData) => {
        if (storeData?.roles && activeRole?.id) {
            let ind = storeData.roles.findIndex((u) => u.id == activeRole.id)
            if (ind != -1) setActiveRole(storeData.roles[ind])
        }
        setShowDetailsModal({ active: false, data: null })
    }

    const onDeactivateRole = async (role: StoreRoleDataType) => {
        if (!role?.id || role.id === DEFAULT_ROLE_IDS.OWNER || !storeDetails?.tenantId || !storeDetails?.storeId) return;

        try {
            const response = await deleteRoleDefinition({
                roleId: role.id,
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
            });
            const nextStoreDetails = { ...storeDetails, roles: response.roles };
            setStoreDetails(nextStoreDetails);
            const nextActiveRole = response.roles.find((item) => item.id === role.id) || null;
            setActiveRole(nextActiveRole);
            dispatch(showSuccessToast("Role deactivated"));
        } catch (err) {
            logStaffClientFailure('desktop_staff_role_delete_failed', err, getDesktopRoleLogContext(storeDetails, role));
            dispatch(showErrorToast("Could not deactivate role"));
        }
    };

    // NOTE: Permission strategies removed - single role per store makes it unnecessary

    return (
        <Flex vertical gap={30}>
            <Space direction="vertical" size={2}>
                <TextElement size='heading' text="Roles & Permissions" type='primary' />
                <TextElement text="Manage roles and their permissions. Each permission is a simple on/off toggle." />
            </Space>

            <Card>
                <EditorWrapper gap={30}>
                    {!canAssignRoles && (
                        <Alert
                            message="Read-only access"
                            description="Your current role can view role permissions but cannot change them."
                            showIcon
                            type="info"
                        />
                    )}
                    <Flex vertical gap={10}>
                        <TextElement size={"medium"} text={"Available Roles"} />
                        {arrayNullCheck(storeDetails?.roles) && <TextElement size={"small"} text={`Select a role to view its permissions`} />}
                        <Flex wrap="wrap" gap={12}>
                            {storeDetails?.roles?.map((role, index) => (
                                <Card
                                    key={index}
                                    hoverable
                                    style={{
                                        background: activeRole?.id == role?.id ? token.colorPrimaryBg : token.colorBgContainer,
                                        borderColor: activeRole?.id == role?.id ? token.colorPrimaryBorder : token.colorBorderSecondary,
                                        width: 280,
                                    }}
                                    onClick={() => setActiveRole(role)}
                                >
                                    <Meta
                                        title={<Flex align="center" gap={6} wrap="wrap">{role.name} {!role.active && <Tag color="warning">Inactive</Tag>}</Flex>}
                                        description={role.description}
                                    />
                                </Card>
                            ))}

                            <Card
                                hoverable
                                aria-disabled={!canAssignRoles}
                                style={{
                                    background: token.colorFillQuaternary,
                                    borderColor: token.colorBorderSecondary,
                                    cursor: canAssignRoles ? "pointer" : "not-allowed",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    opacity: canAssignRoles ? 1 : 0.6,
                                    width: 180,
                                }}
                                onClick={() => {
                                    if (!canAssignRoles) return;
                                    setActiveRole(null);
                                    setShowDetailsModal({ active: true, data: null })
                                }}
                            >
                                <Meta title="Add Custom Role" avatar={<LuPlus />} />
                            </Card>
                        </Flex>
                    </Flex>

                    {!objectNullCheck(activeRole) && (
                        <Empty description="Select a role to view permissions" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}

                    {objectNullCheck(activeRole) && (
                        <Flex vertical gap={10}>
                            <Card
                                style={{ width: "100%" }}
                                title={`${activeRole.name} Role Permissions`}
                                extra={(
                                    <Flex gap={8} wrap="wrap">
                                        <Button
                                            disabled={!canAssignRoles || activeRole.id === DEFAULT_ROLE_IDS.OWNER || activeRole.active === false}
                                            type="primary"
                                            icon={<LuPen />}
                                            onClick={() => setShowDetailsModal({ active: true, data: activeRole })}
                                        >
                                            Edit Role
                                        </Button>
                                        <Popconfirm
                                            cancelText="Cancel"
                                            okButtonProps={{ danger: true }}
                                            okText="Deactivate"
                                            onConfirm={() => onDeactivateRole(activeRole)}
                                            title="Deactivate this role?"
                                        >
                                            <Button
                                                danger
                                                disabled={!canAssignRoles || activeRole.id === DEFAULT_ROLE_IDS.OWNER || activeRole.active === false}
                                                icon={<LuTrash2 />}
                                            >
                                                Deactivate
                                            </Button>
                                        </Popconfirm>
                                    </Flex>
                                )}
                            >
                                <Flex vertical gap={16}>
                                    <Meta
                                        avatar={<LuShieldCheck color={token.colorPrimary} />}
                                        title={activeRole.description || "No description"}
                                        description={`Last updated by ${activeRole.modifiedBy || activeRole.createdBy || "system"}`}
                                    />

                                    {objectNullCheck(activeRole, 'permissions') && PERMISSION_CATEGORIES_CONFIG.map((category, catIndex) => (
                                        <Fragment key={catIndex}>
                                            <Flex vertical gap={8}>
                                                <TextElement size="small" text={`${category.icon} ${category.label}`} type="secondary" />
                                                <Flex gap={8} wrap="wrap" style={{ paddingLeft: 8 }}>
                                                    {category.permissions.map((permKey, permIndex) => {
                                                        const isEnabled = Boolean(activeRole.permissions[permKey as PermissionKey]);
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
                                </Flex>
                            </Card>
                        </Flex>
                    )}
                </EditorWrapper>

                <RoleDetailsModal storeDetails={storeDetails} modalData={showDetailsModal} onClose={onCloseRoleModal} />
            </Card>
        </Flex>
    )
}

export default UserPermissionsPage
