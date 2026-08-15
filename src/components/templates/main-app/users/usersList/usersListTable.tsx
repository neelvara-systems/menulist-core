import type { StaffStoreOption, StaffUserSummary } from "@lib/staffManagement/types";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { Button, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { memo, useContext, type ReactNode } from "react";
import { LuEye, LuKeyRound, LuLogOut, LuPen, LuTrash2, LuUser } from "react-icons/lu";
const { Text } = Typography;

type UsersListTableProps = {
    canManageTarget: (user: StaffUserSummary) => boolean;
    canManageUsers: boolean;
    emptyText: ReactNode;
    onClickUserDetails: (user: StaffUserSummary) => void;
    onDeleteUser: (user: StaffUserSummary) => void | Promise<void>;
    onEditUser: (user: StaffUserSummary) => void;
    onForceSignOut: (user: StaffUserSummary) => void | Promise<void>;
    onResetPassword: (user: StaffUserSummary) => void | Promise<void>;
    pendingStaffUserId: string | null;
    staffStores?: StaffStoreOption[];
    usersList: StaffUserSummary[];
};

function UsersListTable({ canManageTarget, canManageUsers, emptyText, onClickUserDetails, onDeleteUser, onEditUser, onForceSignOut, onResetPassword, pendingStaffUserId, staffStores = [], usersList }: UsersListTableProps) {

    const { storeDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const safeUsersList = Array.isArray(usersList) ? usersList : [];
    const getRolesForStore = (storeId: number) => (
        staffStores.find((store) => store.storeId === storeId)?.roles
        || tenantDetails?.storesList.find((store) => store.storeId === storeId)?.storeDetails?.roles
        || []
    );
    const getLoginLabel = (record: StaffUserSummary) => (
        record?.staffAuthMode === 'owner_passcode'
            ? record?.staffLoginId || record?.loginUsername || 'Staff ID pending'
            : record?.displayEmail || record?.phoneNumber || record?.email || 'No email'
    );

    const columns: ColumnsType<StaffUserSummary> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (_, record) => {
                const image = record.profileImage
                return <>
                    <Flex align='center' justify='flex-start' gap={10}>
                        {Boolean(image) ? <img alt="" src={image} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <LuUser />}
                        <Text>{record.name}</Text>
                    </Flex>
                </>
            },
        },
        {
            title: 'Login',
            dataIndex: 'email',
            key: 'email',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text>{getLoginLabel(record)}</Text>
                    {record?.staffLoginId || record?.loginUsername ? <Tag>Staff ID: {record.staffLoginId || record.loginUsername}</Tag> : null}
                </Space>
            ),
        },
        {
            title: 'Number',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (_, record) => {
                const currentStoreMapping = (Array.isArray(record.stores) ? record.stores : [])
                    .find((store) => store.storeId == storeDetails?.storeId);
                if (!currentStoreMapping?.role) {
                    return <Tag color="warning">No role</Tag>;
                }

                const roleData = getRolesForStore(currentStoreMapping.storeId)
                    .find((role) => role.id === currentStoreMapping.role);
                return <Tag>{roleData?.name || currentStoreMapping.role}</Tag>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (_, record) => (
                <>
                    {!record.active ? <Tag color='error'>Deactivated</Tag> : <>
                        <Tag color='green'>Active</Tag>
                    </>}
                </>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => {
                const targetCanBeManaged = canManageUsers && canManageTarget(record);
                const mutationPending = pendingStaffUserId === record.id;
                const staffName = record.name || getLoginLabel(record);
                return (
                    <Space>
                    <Button aria-label={`Edit ${staffName}`} disabled={!targetCanBeManaged || mutationPending} onClick={(event) => {
                        event.stopPropagation();
                        onEditUser(record);
                    }} shape="circle" icon={<LuPen />} />
                    <Button aria-label={`View ${staffName} details`} onClick={(event) => {
                        event.stopPropagation();
                        onClickUserDetails(record);
                    }} shape="circle" icon={<LuEye />} />
                    <Popconfirm
                        cancelText="Cancel"
                        okText="Create passcode"
                        onConfirm={(event) => {
                            event?.stopPropagation?.();
                            onResetPassword(record);
                        }}
                        title="Create a new temporary passcode for this staff member?"
                    >
                        <Button
                            aria-label={`Create temporary passcode for ${staffName}`}
                            disabled={!targetCanBeManaged || mutationPending}
                            onClick={(event) => event.stopPropagation()}
                            shape="circle"
                            icon={<LuKeyRound />}
                        />
                    </Popconfirm>
                    <Popconfirm
                        cancelText="Cancel"
                        okText="Sign out"
                        onConfirm={(event) => {
                            event?.stopPropagation?.();
                            onForceSignOut(record);
                        }}
                        title="Sign this staff member out on their devices?"
                    >
                        <Tooltip title="Sign out staff">
                            <Button
                                aria-label={`Sign out ${staffName}`}
                                disabled={!targetCanBeManaged || mutationPending || record.active === false}
                                onClick={(event) => event.stopPropagation()}
                                shape="circle"
                                icon={<LuLogOut />}
                            />
                        </Tooltip>
                    </Popconfirm>
                    <Popconfirm
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        okText="Remove"
                        onConfirm={(event) => {
                            event?.stopPropagation?.();
                            onDeleteUser(record);
                        }}
                        title="Remove this staff member from this store?"
                    >
                        <Button
                            aria-label={`Remove ${staffName}`}
                            danger
                            disabled={!targetCanBeManaged || mutationPending}
                            onClick={(event) => event.stopPropagation()}
                            shape="circle"
                            icon={<LuTrash2 />}
                        />
                    </Popconfirm>
                    </Space>
                );
            },
        }
    ];

    return (
        <>
            <Table
                pagination={false}
                dataSource={safeUsersList}
                columns={columns}
                locale={{ emptyText }}
                rowKey={(record) => record.id || record.email}
                onRow={(record) => ({
                    onClick: () => onClickUserDetails(record), // Handle row click
                })} />
        </>
    )
}

export default memo(UsersListTable)
