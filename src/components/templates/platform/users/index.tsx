'use client'
import DrawerElement from '@antdComponent/drawerElement';
import Saperator from '@atoms/Saperator';
import { CRAFT_BUILDER_MAINTAINER_USER_ROLE, ECOMSAI_PLATFORM_SUPPORT_USER_ROLE, ECOMSAI_PLATFORM_TENANT_ID, ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { getAllStoresByTenantId } from '@database/stores';
import { getAllTenants } from '@database/tenants';
import { getUserByTenantId, updatePlatformUser } from '@database/users';
import { useAppDispatch } from '@hook/useAppDispatch';
import { showSuccessToast, showWarningToast } from '@reduxSlices/toast';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { UserDataType } from '@type/platform/user';
import { getObjectDifferance } from '@util/deepMerge';
import { removeObjRef } from '@util/utils';
import { Button, Card, Flex, Select, Switch, Table, Tag, Typography } from 'antd'; // Import Ant Design components
import { Fragment, useEffect, useState } from 'react';
import { LuTrash, LuUser } from 'react-icons/lu';
const { Text, Title } = Typography

function PlatformUsers() {

    const [usersList, setUsersList] = useState([]);
    const [userModal, setUserModal] = useState<UserDataType>(null)
    const [tenantsList, setTenantsList] = useState<TenantDataType[]>([]);
    const dispatch = useAppDispatch()
    // Filter states
    const [filterTenant, setFilterTenant] = useState<string | any>(null);
    const [filterStore, setFilterStore] = useState<string | any>(null);
    const [allTenantUsers, setAllTenantUsers] = useState<UserDataType[]>([]);
    const [filterStoresList, setFilterStoresList] = useState<StoreDataType[]>([]);

    useEffect(() => {
        getAllTenants().then((tenants) => {
            setTenantsList(tenants)
        })
    }, [])

    // Effect to load stores when filter tenant changes
    useEffect(() => {
        if (filterTenant || filterTenant == ECOMSAI_PLATFORM_TENANT_ID) {
            getAllStoresByTenantId(filterTenant).then((stores) => {
                // Reset store selection when tenant changes
                setFilterStore(null)

                // Update stores list with full details
                const storesWithDetails = stores.map(store => ({
                    ...store,
                    storeDetails: store // Store already contains full details
                })) as StoreDataType[]
                setFilterStoresList(storesWithDetails)
            })

            // Fetch users for the selected tenant
            getUserByTenantId(filterTenant).then((users) => {
                setAllTenantUsers(users)
                setUsersList(users)
            })
        } else {
            setFilterStoresList([])
            setFilterStore(null)
            setUsersList([])
        }
    }, [filterTenant])

    // Dead code removed: previously read firebaseAuth.currentUser but never used the result

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: Math.random(),
            render: (_, record) => (
                <Flex align='center' justify='flex-start' gap={10}>
                    {record?.image ? <img src={record?.image} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <LuUser />}
                    <Text>{record.name}</Text>
                </Flex>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: Math.random(),
        },
        {
            title: 'Status',
            dataIndex: 'isVerified',
            key: Math.random(),
            render: (_, record) => (
                <>
                    {record.blocked ? <Tag color='error'>Blocked</Tag> : !record.active ? <Tag color='error'>Deactivated</Tag> : <>
                        {record.isVerified ? <Tag color='green'>Verified</Tag> : <Tag color='warning'>Non Verified</Tag>}
                    </>}
                </>
            ),
        },
        {
            title: 'Action',
            key: Math.random(),
            render: (_, record) => (
                <Button type="primary">Edit</Button> // Edit button
            ),
        },
    ];

    const updateUser = (updated) => {
        const originalUser = usersList.find((u) => u.email == updated.email)
        const updatedChanges: any = getObjectDifferance(updated, originalUser);

        // we need to check if the user has multiple store permission or not
        // if the user has multiple store permission then we should update the storeId and stores array
        // else we should remove the storeId and stores array from the updatedChanges object

        const ifUserHasMultipleStorePermission = true;
        if (!Boolean(updated?.stores?.length) && (tenantsList.find((t) => t.tenantId == userModal?.tenantId)?.storesList?.length == 1 || !ifUserHasMultipleStorePermission)) {
            const storesList = tenantsList.find((t) => t.tenantId == userModal?.tenantId)?.storesList;
            updatedChanges.storeIds = [storesList[0].storeId];
            updatedChanges.stores = [{ storeId: storesList[0].storeId, name: storesList[0].name, role: '' }];
            updatedChanges.storeId = storesList[0].storeId;
        }

        if (Object.keys(updatedChanges).length > 0) {
            updatedChanges.id = originalUser.id;
            updatePlatformUser(updatedChanges).then(() => {
                const usersCopy = removeObjRef(usersList)
                let index = usersCopy.findIndex((u) => u.id == updatedChanges.id)
                usersCopy[index] = { ...originalUser, ...updatedChanges }
                setUsersList(usersCopy)
                setUserModal(null)
                dispatch(showSuccessToast("User updated successfully"))
            })
        } else {
            dispatch(showWarningToast("No changes found"))
        }
    }

    const onVerify = async () => {
        try {
            const res = await fetch('/api/auth/create-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userModal.email,
                    name: userModal.name || userModal.email.split('@')[0],
                    tenantId: userModal.tenantId,
                    storeId: userModal.storeId,
                }),
            });
            const data = await res.json();

            if (res.ok || data.code === 'EMAIL_EXISTS') {
                const updatedUser = { ...userModal, isVerified: true };
                updateUser(updatedUser);
            } else {
                console.error('Verify failed:', data.error);
            }
        } catch (err) {
            console.error('Verify error:', err);
        }
    }

    const onChangeValue = (from: string, value: any) => {
        const userCopy: UserDataType = removeObjRef(userModal);
        userCopy[from] = value;
        if (from == "tenantId") {
            userCopy.stores = [];
            const storesList = tenantsList.find((t) => t.tenantId == userCopy?.tenantId)?.storesList;
            userCopy.storeId = storesList[0].storeId;
            if (storesList.length == 1) {
                userCopy.storeIds = [storesList[0].storeId];
                userCopy.stores = [{ storeId: storesList[0].storeId, name: storesList[0].name, role: '' }];
            }
        }
        setUserModal(userCopy)
    }

    const onChangeStoreValue = (index: number, from: string, value: any) => {
        const userCopy: UserDataType = removeObjRef(userModal);
        userCopy.stores[index][from] = value;
        if (from == "storeId") {
            const storeDetails = tenantsList.find((t) => t.tenantId == userCopy?.tenantId)?.storesList.find((s) => s.storeId == value);
            userCopy.stores[index].name = storeDetails?.name;
            userCopy.storeIds = Boolean(userCopy.stores?.length) ? userCopy.stores.map((s) => s.storeId) : [];
        }
        setUserModal(userCopy)
    }

    const onClickAddStore = () => {
        const userCopy: UserDataType = removeObjRef(userModal);
        if (!userCopy.stores) userCopy.stores = [];
        userCopy.stores.push({ storeId: null, name: "", role: '' });  // Single role per store
        setUserModal(userCopy)
    }

    const onClickDeleteStore = (index: number) => {
        const userCopy: UserDataType = removeObjRef(userModal);
        userCopy.stores.splice(index, 1);
        userCopy.storeIds = Boolean(userCopy.stores?.length) ? userCopy.stores.map((s) => s.storeId) : [];
        setUserModal(userCopy)
    }

    const onClickUser = (record) => {
        setFilterTenant(record.tenantId)
        setUserModal(record)
    }

    return (
        <Flex vertical gap={20} style={{ padding: '20px' }}>
            <Flex vertical gap={4}>
                <Title level={3} style={{ margin: 0 }}>Platform Users</Title>
                <Text type="secondary">Manage tenant users, store access, verification, and platform roles.</Text>
            </Flex>
            <Card>
                <Flex gap={20} align="center" wrap="wrap">
                    <Select
                        style={{ flex: '1 1 220px', minWidth: 0 }}
                        placeholder="Select Tenant"
                        value={filterTenant}
                        onChange={(value) => {
                            setFilterTenant(value)
                            if (!value) {
                                setAllTenantUsers([])
                                setUsersList([])
                            }
                        }}
                        options={tenantsList.map((t) => ({ label: t.name, value: t.tenantId }))}
                        allowClear
                    />
                    <Select
                        style={{ flex: '1 1 220px', minWidth: 0 }}
                        placeholder="Select Store"
                        value={filterStore}
                        onChange={(value) => {
                            setFilterStore(value)
                            if (value) {
                                // Filter users by selected store
                                const storeUsers = allTenantUsers.filter(user =>
                                    user.storeIds?.includes(value)
                                )
                                setUsersList(storeUsers)
                            } else {
                                // Show all users for the tenant when no store is selected
                                setUsersList(allTenantUsers)
                            }
                        }}
                        options={filterStoresList.map((s) => ({ label: s.name, value: s.storeId }))}
                        disabled={!filterStoresList?.length}
                        allowClear
                    />
                </Flex>
            </Card>
            <Flex style={{ overflowX: 'auto' }}>
                <Table key={Math.random()}
                    pagination={false}
                    dataSource={usersList}
                    columns={columns}
                    onRow={(record) => ({
                        onClick: () => onClickUser(record), // Handle row click
                    })} />
            </Flex>
            <DrawerElement
                title="Update user"
                open={Boolean(userModal)}
                onClose={() => setUserModal(null)}
                footerActions={[
                    <Button type="default" onClick={() => setUserModal(null)} key="Cancel">Cancel</Button>,
                    <>
                        {userModal?.isVerified ?
                            <Button type="primary" onClick={() => updateUser(userModal)}>Update</Button> :
                            <Button type="primary" onClick={onVerify}>Verify</Button>}
                    </>
                ]}
                width={450}
            >
                <Flex vertical gap={20}>
                    <Flex align='center' justify='flex-start' gap={10}>
                        {userModal?.profileImage ? <img src={userModal?.profileImage} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <LuUser />}
                        <Flex vertical gap={0}>
                            <Text>{userModal?.name}</Text>
                            <Text>{userModal?.email}</Text>
                        </Flex>
                    </Flex>
                    <Saperator />

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Active</Text>
                        <Switch
                            defaultChecked={userModal?.active || false}
                            value={userModal?.active || false}
                            onChange={() => onChangeValue('active', !Boolean(userModal?.active))}
                        />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Platofrm Role</Text>
                        <Select
                            defaultValue={userModal?.platformRole || ""}
                            value={userModal?.platformRole || ""}
                            style={{ width: "100%" }}
                            placeholder="Select Role"
                            onChange={(value) => onChangeValue('platformRole', value)}
                            options={[
                                { label: ECOMSAI_PLATFORM_USER_ROLE, value: ECOMSAI_PLATFORM_USER_ROLE },
                                { label: ECOMSAI_PLATFORM_SUPPORT_USER_ROLE, value: ECOMSAI_PLATFORM_SUPPORT_USER_ROLE },
                                { label: CRAFT_BUILDER_MAINTAINER_USER_ROLE, value: CRAFT_BUILDER_MAINTAINER_USER_ROLE },
                            ]}
                        />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Tenant</Text>
                        <Select
                            defaultValue={tenantsList.find((t) => t.tenantId == userModal?.tenantId)?.name || ""}
                            value={tenantsList.find((t) => t.tenantId == userModal?.tenantId)?.name || ""}
                            style={{ width: "100%" }}
                            placeholder="Search and select tenant"
                            onChange={(tenantId) => onChangeValue('tenantId', tenantId)}
                            options={tenantsList.map((t) => ({ label: t.name, value: t.tenantId }))}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Flex>

                    <Flex vertical gap={10}>
                        <Saperator />
                        <Text style={{ minWidth: 150 }}>Stores Assigned to User <Tag color='blue'>{userModal?.stores?.length}</Tag></Text>

                        {userModal?.stores?.map((mappedStore, index) => {
                            return <Fragment key={index}>
                                <Card>
                                    <Flex vertical gap={10} key={index}>
                                        <Flex>
                                            <Text style={{ minWidth: 100 }}>Store</Text>
                                            <Select
                                                defaultValue={mappedStore?.storeId}
                                                value={mappedStore?.storeId}
                                                style={{ width: "100%" }}
                                                placeholder="Search and select store"
                                                onChange={(storeId) => onChangeStoreValue(index, 'storeId', storeId)}
                                                options={filterStoresList?.map((s) => ({ label: `${s.storeId}-${s.name}`, value: s.storeId }))}
                                                showSearch
                                                filterOption={(input, option) =>
                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                            />
                                        </Flex>

                                        <Flex>
                                            <Text style={{ minWidth: 100 }}>Role</Text>
                                            <Select
                                                allowClear
                                                style={{ width: '100%' }}
                                                placeholder="Please select role"
                                                defaultValue={mappedStore?.role || ''}
                                                value={mappedStore?.role || ''}
                                                onChange={(value) => onChangeStoreValue(index, 'role', value)}
                                                options={filterStoresList?.find((s) => s.storeId == mappedStore?.storeId)?.roles?.map((role) => ({ label: role.name, value: role.id }))}
                                            />
                                        </Flex>

                                        <Flex justify='flex-end'>
                                            <Button danger type='text' icon={<LuTrash />} onClick={() => onClickDeleteStore(index)}>Delete Store Mapping</Button>
                                        </Flex>
                                    </Flex>
                                </Card>
                            </Fragment>
                        })}
                    </Flex>

                    <Flex justify='flex-end'>
                        {(filterStoresList.length != userModal?.stores?.length) && <Button type="primary" ghost onClick={onClickAddStore}>Add Store</Button>}
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Default Store</Text>
                        <Select
                            defaultValue={userModal?.storeId}
                            value={userModal?.storeId}
                            style={{ width: "100%" }}
                            placeholder="Select Default Store"
                            onChange={(storeId) => onChangeValue('storeId', storeId)}
                            options={userModal?.stores?.map((s) => ({ label: s.name, value: s.storeId }))}
                        />
                    </Flex>
                    <Tag color='yellow'>Default store used when user loggedin then landing page is of this store</Tag>
                </Flex>
            </DrawerElement>
        </Flex>
    );
}

export default PlatformUsers;
