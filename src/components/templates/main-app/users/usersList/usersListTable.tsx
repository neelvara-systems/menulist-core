import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { Button, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from "antd";
import { Fragment, memo, useContext } from "react";
import { LuEye, LuKeyRound, LuLogOut, LuPen, LuTrash2, LuUser } from "react-icons/lu";
const { Text } = Typography;

function UsersListTable({ canManageUsers, onClickUserDetails, onDeleteUser, onEditUser, onForceSignOut, onResetPassword, staffStores = [], usersList }) {

    const { storeDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const safeUsersList = Array.isArray(usersList) ? usersList : [];
    const roleStores = staffStores.length
        ? staffStores.map((store) => ({ storeDetails: store, storeId: store.storeId }))
        : (tenantDetails?.storesList || []);
    const getLoginLabel = (record: any) => (
        record?.staffAuthMode === 'owner_passcode'
            ? record?.staffLoginId || record?.loginUsername || 'Staff ID pending'
            : record?.displayEmail || record?.phone || record?.phoneNumber || record?.email || 'No email'
    );

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (_, record) => {
                const image = record.profileImage || record.image
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
            render: (_, record) => (
                <>
                    {(Array.isArray(record.stores) ? record.stores : []).map((store, i) => {
                        if (store.storeId != storeDetails?.storeId) return null;
                        const roleData = roleStores.find((s) => s.storeId == store.storeId)?.storeDetails?.roles?.find((r) => r.id == store.role);
                        return <Fragment key={i}>
                            <Tag>{roleData?.name || store.role}</Tag>
                        </Fragment>
                    })}
                </>
            ),
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
            render: (_, record) => (
                <Space>
                    <Button disabled={!canManageUsers} onClick={(event) => {
                        event.stopPropagation();
                        onEditUser(record);
                    }} shape="circle" icon={<LuPen />} />
                    <Button onClick={(event) => {
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
                            disabled={!canManageUsers}
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
                                disabled={!canManageUsers || record?.active === false}
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
                            danger
                            disabled={!canManageUsers}
                            onClick={(event) => event.stopPropagation()}
                            shape="circle"
                            icon={<LuTrash2 />}
                        />
                    </Popconfirm>
                </Space>
            ),
        }
    ];

    return (
        <>
            <Table
                pagination={false}
                dataSource={safeUsersList}
                columns={columns}
                rowKey={(record) => record.id || record.email}
                onRow={(record) => ({
                    onClick: () => onClickUserDetails(record), // Handle row click
                })} />
        </>
    )
}

export default memo(UsersListTable)
