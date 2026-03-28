'use client'

import TextElement from "@antdComponent/textElement";
import { PermissionKey } from "@constant/permissions";
import { PERMISSION_CATEGORIES_CONFIG, PERMISSION_LABELS } from "@data/rolesPermissionsInitialData";
import { useAppDispatch } from "@hook/useAppDispatch";
import EditorWrapper from "@organisms/editor/editorWrapper";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { StoreRoleDataType } from "@type/platform/roles";
import { arrayNullCheck, objectNullCheck } from "@util/utils";
import { Button, Card, Divider, Flex, Space, Tag, theme } from "antd";
import { Fragment, useContext, useState } from "react";
import { LuCheck, LuPen, LuPlus, LuX } from "react-icons/lu";
import RoleDetailsModal from "./roleDetailsModal";
const { Meta } = Card

function UserPermissionsPage() {
    const [activeRole, setActiveRole] = useState<StoreRoleDataType>(null);
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [showDetailsModal, setShowDetailsModal] = useState({ active: false, data: null })
    const dispatch = useAppDispatch()
    const { token } = theme.useToken();

    const onCloseRoleModal = (storeData) => {
        if (storeData?.roles && activeRole?.id) {
            let ind = storeData.roles.findIndex((u) => u.id == activeRole.id)
            if (ind != -1) setActiveRole(storeData.roles[ind])
        }
        setShowDetailsModal({ active: false, data: null })
    }

    // NOTE: Permission strategies removed - single role per store makes it unnecessary

    return (
        <Flex vertical gap={30}>
            <Space direction="vertical" size={2}>
                <TextElement size='heading' text="Roles & Permissions" type='primary' />
                <TextElement text="Manage roles and their permissions. Each permission is a simple on/off toggle." />
            </Space>

            <Card>
                <EditorWrapper gap={30}>
                    <Flex vertical gap={10}>
                        <TextElement size={"medium"} text={"Available Roles"} />
                        {arrayNullCheck(storeDetails?.roles) && <TextElement size={"small"} text={`Select a role to view its permissions`} />}
                        <Flex wrap="wrap" gap={10}>
                            {storeDetails?.roles?.map((role, index) => (
                                <Card
                                    key={index}
                                    hoverable
                                    style={{ width: 280, outline: activeRole?.id == role?.id ? `2px solid ${token.colorPrimary}` : "unset" }}
                                    onClick={() => setActiveRole(role)}
                                >
                                    <Meta
                                        title={<>{role.name} {!role.active && <Tag color="warning">Inactive</Tag>}</>}
                                        description={role.description}
                                    />
                                </Card>
                            ))}

                            <Divider type="vertical" style={{ height: "auto" }} />

                            <Card
                                hoverable
                                style={{ width: 180, display: "flex", justifyContent: "center", alignItems: "center" }}
                                onClick={() => {
                                    setActiveRole(null);
                                    setShowDetailsModal({ active: true, data: null })
                                }}
                            >
                                <Meta title="Add Custom Role" avatar={<LuPlus />} />
                            </Card>
                        </Flex>
                    </Flex>

                    {objectNullCheck(activeRole) && (
                        <Flex vertical gap={10}>
                            <Card
                                style={{ width: "100%" }}
                                title={`${activeRole.name} Role Permissions`}
                                extra={<Button type="primary" icon={<LuPen />} onClick={() => setShowDetailsModal({ active: true, data: activeRole })}>Edit Role</Button>}
                            >
                                <Flex vertical gap={16}>
                                    <Meta title={activeRole.description} description={`Last Updated: ${activeRole.modifiedBy || activeRole.createdBy}`} />

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