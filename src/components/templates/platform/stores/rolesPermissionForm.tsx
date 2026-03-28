import Saperator from "@atoms/Saperator";
import { PermissionKey } from "@constant/permissions";
import { PERMISSION_CATEGORIES_CONFIG, PERMISSION_LABELS } from "@data/rolesPermissionsInitialData";
import { RolePermissions } from "@type/platform/roles";
import { removeObjRef } from "@util/utils";
import { Checkbox, Flex, Typography } from "antd";
import { Fragment } from "react";
const { Text, Title } = Typography;

interface RolesPermissionFormProps {
    userPermissions: RolePermissions;
    updatePermissions: (permissions: RolePermissions) => void;
}

function RolesPermissionForm({ userPermissions, updatePermissions }: RolesPermissionFormProps) {

    const onTogglePermission = (permissionKey: PermissionKey) => {
        const newPermissions = removeObjRef(userPermissions);
        newPermissions[permissionKey] = !Boolean(newPermissions[permissionKey]);
        updatePermissions(newPermissions);
    };

    const onToggleCategory = (categoryPermissions: readonly string[], value: boolean) => {
        const newPermissions = removeObjRef(userPermissions);
        categoryPermissions.forEach((pKey) => {
            newPermissions[pKey as PermissionKey] = value;
        });
        updatePermissions(newPermissions);
    };

    const onToggleAll = (value: boolean) => {
        const newPermissions = removeObjRef(userPermissions);
        Object.keys(newPermissions).forEach((pKey) => {
            newPermissions[pKey as PermissionKey] = value;
        });
        updatePermissions(newPermissions);
    };

    const isCategoryAllEnabled = (categoryPermissions: readonly string[]) => {
        return categoryPermissions.every((pKey) => Boolean(userPermissions[pKey as PermissionKey]));
    };

    const isAllEnabled = () => {
        return Object.values(userPermissions).every((v) => v === true);
    };

    return (
        <Flex vertical gap={20}>
            <Text type="secondary">Toggle permissions for this role. Each permission is a simple on/off switch.</Text>

            <Flex vertical gap={16}>
                <Flex justify="space-between" align="center" style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 8 }}>
                    <Text strong>Full Access (All Permissions)</Text>
                    <Checkbox
                        checked={isAllEnabled()}
                        onChange={(e) => onToggleAll(e.target.checked)}
                    >
                        Enable All
                    </Checkbox>
                </Flex>

                <Saperator margin="0" />

                {PERMISSION_CATEGORIES_CONFIG.map((category, categoryIndex) => (
                    <Fragment key={categoryIndex}>
                        <Flex vertical gap={8}>
                            <Flex justify="space-between" align="center">
                                <Text strong>{category.icon} {category.label}</Text>
                                <Checkbox
                                    checked={isCategoryAllEnabled(category.permissions)}
                                    onChange={(e) => onToggleCategory(category.permissions, e.target.checked)}
                                >
                                    All
                                </Checkbox>
                            </Flex>
                            <Flex gap={8} wrap="wrap" style={{ paddingLeft: 24 }}>
                                {category.permissions.map((permissionKey, permIndex) => (
                                    <Checkbox
                                        key={permIndex}
                                        checked={Boolean(userPermissions[permissionKey as PermissionKey])}
                                        onChange={() => onTogglePermission(permissionKey as PermissionKey)}
                                        style={{ minWidth: 200 }}
                                    >
                                        {PERMISSION_LABELS[permissionKey as PermissionKey] || permissionKey}
                                    </Checkbox>
                                ))}
                            </Flex>
                        </Flex>
                        {categoryIndex < PERMISSION_CATEGORIES_CONFIG.length - 1 && <Saperator margin="4px 0" />}
                    </Fragment>
                ))}
            </Flex>
        </Flex>
    );
}

export default RolesPermissionForm;