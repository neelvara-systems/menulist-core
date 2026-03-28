import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { Button, Flex, Space, Table, Tag, Typography } from "antd";
import { Fragment, memo, useContext } from "react";
import { LuEye, LuPen, LuUser } from "react-icons/lu";
const { Text } = Typography;

function UsersListTable({ onClickUserDetails, onEditUser, usersList }) {

    const { storeDetails, tenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    console.log("storeDetails", storeDetails)
    console.log("tenantDetails", tenantDetails)

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: Math.random(),
            render: (_, record) => {
                const image = record.profileImage || record.image
                return <>
                    <Flex align='center' justify='flex-start' gap={10}>
                        {Boolean(image) ? <img src={image} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <LuUser />}
                        <Text>{record.name}</Text>
                    </Flex>
                </>
            },
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: Math.random(),
        },
        {
            title: 'Number',
            dataIndex: 'phoneNumber',
            key: Math.random(),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: Math.random(),
            render: (_, record) => (
                <>
                    {record.stores.map((store, i) => {
                        if (store.storeId != storeDetails.storeId) return null;
                        const roleData = (tenantDetails.storesList.find((s) => s.storeId == store.storeId)?.storeDetails)?.roles?.find((r) => r.id == store.role);
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
            key: Math.random(),
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
            key: Math.random(),
            render: (_, record) => (
                <Space>
                    <Button onClick={() => onEditUser(record)} shape="circle" icon={<LuPen />} />
                    <Button onClick={() => onClickUserDetails(record)} shape="circle" icon={<LuEye />} />
                </Space>
            ),
        }
    ];

    console.log("usersList", usersList)
    return (
        <>
            <Table key={Math.random()}
                pagination={false}
                dataSource={usersList}
                columns={columns}
                onRow={(record) => ({
                    onClick: () => onClickUserDetails(record), // Handle row click
                })} />
        </>
    )
}

export default memo(UsersListTable)