'use client'
import DrawerElement from '@antdComponent/drawerElement';
import Saperator from '@atoms/Saperator';
import { CRAFT_BUILDER_MAINTAINER_USER_ROLE, MENULIST_PLATFORM_SUPPORT_USER_ROLE, MENULIST_PLATFORM_USER_ROLE } from '@constant/user';
import { getAllStoresByTenantId } from '@database/stores';
import { getAllTenants } from '@database/tenants';
import { assertUserUpdateSucceeded, getUserByTenantId, updatePlatformUser, type PlatformUserRecord } from '@database/users';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    STAFF_CLIENT_REQUEST_POLICY,
    isCreateStaffCompatibilityVerificationResponse,
    readCreateStaffCompatibilityResponse,
} from '@lib/staffManagement/client';
import { getStoreDeepDifference } from '@lib/store/storeNestedUpdateProjection';
import { showErrorToast, showSuccessToast, showWarningToast } from '@reduxSlices/toast';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { removeObjRef } from '@util/utils';
import { Button, Card, Flex, Select, Switch, Table, Tag, Typography } from 'antd'; // Import Ant Design components
import type { TableColumnsType } from 'antd';
import { Fragment, useEffect, useRef, useState } from 'react';
import { LuTrash, LuUser } from 'react-icons/lu';
const { Text, Title } = Typography

function PlatformUsers() {

    const [usersList, setUsersList] = useState<PlatformUserRecord[]>([]);
    const [userModal, setUserModal] = useState<PlatformUserRecord | null>(null)
    const [tenantsList, setTenantsList] = useState<TenantDataType[]>([]);
    const dispatch = useAppDispatch()
    // Filter states
    const [filterTenant, setFilterTenant] = useState<number | null>(null);
    const [filterStore, setFilterStore] = useState<number | null>(null);
    const [allTenantUsers, setAllTenantUsers] = useState<PlatformUserRecord[]>([]);
    const [filterStoresList, setFilterStoresList] = useState<StoreDataType[]>([]);
    const [tenantScopeLoading, setTenantScopeLoading] = useState(false);
    const [mutationInFlight, setMutationInFlight] = useState(false);
    const tenantRequestEpochRef = useRef(0);
    const mutationInFlightRef = useRef(false);

    useEffect(() => {
        void getAllTenants().then((tenants) => {
            setTenantsList(tenants)
        }).catch((error) => {
            logRuntimeFailure('platform_users_tenants_load_failed', error);
        })
    }, [])

    // Effect to load stores when filter tenant changes
    useEffect(() => {
        const requestEpoch = tenantRequestEpochRef.current + 1;
        tenantRequestEpochRef.current = requestEpoch;
        setFilterStoresList([]);
        setFilterStore(null);
        if (filterTenant === null) {
            setTenantScopeLoading(false);
            setAllTenantUsers([]);
            setFilterStoresList([])
            setUsersList([])
            return;
        }
        setTenantScopeLoading(true);
        void Promise.all([
            getAllStoresByTenantId(filterTenant),
            getUserByTenantId(filterTenant),
        ]).then(([stores, users]) => {
            if (tenantRequestEpochRef.current !== requestEpoch) return;
            setFilterStoresList(stores);
            setAllTenantUsers(users);
            setUsersList(users);
        }).catch((error) => {
            if (tenantRequestEpochRef.current !== requestEpoch) return;
            setAllTenantUsers([]);
            setUsersList([]);
            logRuntimeFailure('platform_users_scope_load_failed', error, {
                ...getBoundedRuntimeStringContext('tenantId', filterTenant),
            });
        }).finally(() => {
            if (tenantRequestEpochRef.current === requestEpoch) setTenantScopeLoading(false);
        });
        return () => {
            if (tenantRequestEpochRef.current === requestEpoch) tenantRequestEpochRef.current += 1;
        };
    }, [filterTenant])

    // Dead code removed: previously read firebaseAuth.currentUser but never used the result

    const columns: TableColumnsType<PlatformUserRecord> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (_: unknown, record: PlatformUserRecord) => (
                <Flex align='center' justify='flex-start' gap={10}>
                    {record.profileImage ? <img alt={`${record.name || 'User'} profile`} src={record.profileImage} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <LuUser />}
                    <Text>{record.name}</Text>
                </Flex>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Status',
            dataIndex: 'isVerified',
            key: 'status',
            render: (_: unknown, record: PlatformUserRecord) => (
                <>
                    {record.blocked ? <Tag color='error'>Blocked</Tag> : !record.active ? <Tag color='error'>Deactivated</Tag> : <>
                        {record.isVerified ? <Tag color='green'>Verified</Tag> : <Tag color='warning'>Non Verified</Tag>}
                    </>}
                </>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: PlatformUserRecord) => (
                <Button
                    aria-label={`Edit user ${record.name || record.email}`}
                    onClick={() => onClickUser(record)}
                    type="primary"
                >
                    Edit
                </Button>
            ),
        },
    ];

    const updateUser = async (updated: PlatformUserRecord) => {
        if (mutationInFlightRef.current) return;
        if (
            filterTenant === null
            || updated.tenantId !== filterTenant
            || updated.stores.some((mapping) => !filterStoresList.some((store) => store.storeId === mapping.storeId))
            || (updated.storeId !== undefined && !updated.storeIds.includes(updated.storeId))
        ) {
            logRuntimeFailure('platform_user_update_scope_mismatch', new Error('platform_user_update_scope_mismatch'), {
                ...getBoundedRuntimeStringContext('tenantId', updated.tenantId),
                ...getBoundedRuntimeStringContext('filterTenantId', filterTenant),
            });
            dispatch(showErrorToast("Could not update user. Refresh the tenant and try again."));
            return;
        }
        const originalUser = usersList.find((u) => u.id === updated.id)
        if (!originalUser) {
            logRuntimeFailure('platform_user_update_failed', new Error('platform_user_not_found'), {
                ...getBoundedRuntimeStringContext('tenantId', updated?.tenantId),
                ...getBoundedRuntimeStringContext('storeId', updated?.storeId),
            });
            dispatch(showErrorToast("Could not update user. Please try again."));
            return;
        }
        const updatedChanges = getStoreDeepDifference(
            updated as unknown as Record<string, unknown>,
            originalUser as unknown as Record<string, unknown>,
        ) as Partial<PlatformUserRecord> & { id?: string };

        // we need to check if the user has multiple store permission or not
        // if the user has multiple store permission then we should update the storeId and stores array
        // else we should remove the storeId and stores array from the updatedChanges object

        const ifUserHasMultipleStorePermission = true;
        if (!Boolean(updated?.stores?.length) && (tenantsList.find((t) => t.tenantId == userModal?.tenantId)?.storesList?.length == 1 || !ifUserHasMultipleStorePermission)) {
            const tenantStores = tenantsList.find((t) => t.tenantId == userModal?.tenantId)?.storesList || [];
            if (tenantStores.length === 1) {
                updatedChanges.storeIds = [tenantStores[0].storeId];
                updatedChanges.stores = [{ storeId: tenantStores[0].storeId, name: tenantStores[0].name, role: '' }];
                updatedChanges.storeId = tenantStores[0].storeId;
            }
        }

        if (Object.keys(updatedChanges).length > 0) {
            updatedChanges.id = originalUser.id;
            mutationInFlightRef.current = true;
            setMutationInFlight(true);
            try {
                const writeResult = await updatePlatformUser({
                    ...updatedChanges,
                    id: originalUser.id,
                });
                assertUserUpdateSucceeded(
                    writeResult,
                    updatedChanges.id,
                    'platform_user_update_rejected',
                );
                const usersCopy = removeObjRef(usersList)
                let index = usersCopy.findIndex((u) => u.id == updatedChanges.id)
                usersCopy[index] = { ...originalUser, ...updatedChanges }
                setUsersList(usersCopy)
                setAllTenantUsers((current) => current.map((user) => (
                    user.id === originalUser.id ? { ...originalUser, ...updatedChanges } : user
                )));
                setUserModal(null)
                dispatch(showSuccessToast("User updated successfully"))
            } catch (error) {
                logRuntimeFailure('platform_user_update_failed', error, {
                    ...getBoundedRuntimeStringContext('userId', updatedChanges.id),
                    ...getBoundedRuntimeStringContext('tenantId', updatedChanges.tenantId || originalUser?.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', updatedChanges.storeId || originalUser?.storeId),
                    changedFieldCount: Object.keys(updatedChanges).length,
                    hasVerifiedChange: Object.prototype.hasOwnProperty.call(updatedChanges, 'isVerified'),
                });
                dispatch(showErrorToast("Could not update user. Please try again."));
            } finally {
                mutationInFlightRef.current = false;
                setMutationInFlight(false);
            }
        } else {
            dispatch(showWarningToast("No changes found"))
        }
    }

    const onVerify = async () => {
        if (!userModal || mutationInFlightRef.current || userModal.tenantId !== filterTenant) return;
        mutationInFlightRef.current = true;
        setMutationInFlight(true);
        try {
            const res = await fetch('/api/auth/create-staff', {
                ...STAFF_CLIENT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userModal.email,
                    name: userModal.name || userModal.email.split('@')[0],
                    role: userModal.stores?.find(({ storeId }) => storeId === userModal.storeId)?.role || userModal.role || undefined,
                    tenantId: userModal.tenantId,
                    storeId: userModal.storeId,
                }),
            });
            const data = await readCreateStaffCompatibilityResponse(res);
            const responseCode = data && 'code' in data ? data.code : undefined;
            const responseError = data && 'error' in data ? data.error : undefined;
            const accepted = res.ok && isCreateStaffCompatibilityVerificationResponse(
                data,
                userModal.id,
                userModal.email,
            );

            if (accepted) {
                const updatedUser = { ...userModal, isVerified: true };
                setUsersList((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
                setAllTenantUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
                setUserModal(null);
                dispatch(showSuccessToast("User verified successfully"));
            } else {
                logRuntimeDiagnostic('platform_user_verify_request_rejected', {
                    ...getBoundedRuntimeStringContext('tenantId', userModal.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', userModal.storeId),
                    statusCode: res.status,
                    hasResponseCode: Boolean(responseCode),
                    hasResponseError: Boolean(responseError),
                });
                dispatch(showErrorToast("Could not verify this user. Review the email and account state, then try again."));
            }
        } catch (err) {
            logRuntimeFailure('platform_user_verify_request_failed', err, {
                ...getBoundedRuntimeStringContext('tenantId', userModal.tenantId),
                ...getBoundedRuntimeStringContext('storeId', userModal.storeId),
            });
            dispatch(showErrorToast("Could not verify this user. Please try again."));
        } finally {
            mutationInFlightRef.current = false;
            setMutationInFlight(false);
        }
    }

    const onChangeValue = <Key extends keyof PlatformUserRecord>(from: Key, value: PlatformUserRecord[Key]) => {
        if (!userModal) return;
        const userCopy: PlatformUserRecord = removeObjRef(userModal);
        userCopy[from] = value;
        if (from == "tenantId") {
            if (typeof value !== 'number') return;
            setFilterTenant(value);
            userCopy.stores = [];
            userCopy.storeIds = [];
            userCopy.storeId = undefined;
        }
        setUserModal(userCopy)
    }

    const onChangeStoreValue = (index: number, from: 'role' | 'storeId', value: number | string) => {
        if (!userModal || index < 0 || index >= userModal.stores.length) return;
        const userCopy: PlatformUserRecord = removeObjRef(userModal);
        if (from == "storeId") {
            if (typeof value !== 'number') return;
            const storeDetails = tenantsList.find((t) => t.tenantId == userCopy?.tenantId)?.storesList.find((s) => s.storeId == value);
            if (!storeDetails || userCopy.stores.some((mapping, mappingIndex) => mappingIndex !== index && mapping.storeId === value)) return;
            userCopy.stores[index].storeId = value;
            userCopy.stores[index].role = '';
            userCopy.stores[index].name = storeDetails?.name;
            userCopy.storeIds = Boolean(userCopy.stores?.length) ? userCopy.stores.map((s) => s.storeId) : [];
            if (!userCopy.storeIds.includes(userCopy.storeId ?? -1)) userCopy.storeId = value;
        } else {
            if (typeof value !== 'string') return;
            userCopy.stores[index].role = value;
        }
        setUserModal(userCopy)
    }

    const onClickAddStore = () => {
        if (!userModal) return;
        const userCopy: PlatformUserRecord = removeObjRef(userModal);
        const availableStore = filterStoresList.find((store) => !userCopy.storeIds.includes(store.storeId));
        if (!availableStore) return;
        userCopy.stores.push({ storeId: availableStore.storeId, name: availableStore.name, role: '' });
        userCopy.storeIds = userCopy.stores.map((store) => store.storeId);
        userCopy.storeId ??= availableStore.storeId;
        setUserModal(userCopy)
    }

    const onClickDeleteStore = (index: number) => {
        if (!userModal || index < 0 || index >= userModal.stores.length) return;
        const userCopy: PlatformUserRecord = removeObjRef(userModal);
        userCopy.stores.splice(index, 1);
        userCopy.storeIds = Boolean(userCopy.stores?.length) ? userCopy.stores.map((s) => s.storeId) : [];
        if (!userCopy.storeIds.includes(userCopy.storeId ?? -1)) userCopy.storeId = userCopy.storeIds[0];
        setUserModal(userCopy)
    }

    const onClickUser = (record: PlatformUserRecord) => {
        setFilterTenant(record.tenantId ?? null)
        setUserModal(removeObjRef(record))
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
                        aria-label="Filter users by tenant"
                        style={{ flex: '1 1 220px', minWidth: 0 }}
                        placeholder="Select Tenant"
                        value={filterTenant}
                        onChange={(value?: number) => {
                            setFilterTenant(value ?? null)
                            if (value === undefined) {
                                setAllTenantUsers([])
                                setUsersList([])
                            }
                        }}
                        options={tenantsList.map((t) => ({ label: t.name, value: t.tenantId }))}
                        allowClear
                    />
                    <Select
                        aria-label="Filter users by store"
                        style={{ flex: '1 1 220px', minWidth: 0 }}
                        placeholder="Select Store"
                        value={filterStore}
                        onChange={(value?: number) => {
                            setFilterStore(value ?? null)
                            if (value !== undefined) {
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
                        disabled={tenantScopeLoading || !filterStoresList?.length}
                        allowClear
                    />
                </Flex>
            </Card>
            <Flex style={{ overflowX: 'auto' }}>
                <Table
                    rowKey={(record: PlatformUserRecord) => record.id}
                    pagination={false}
                    dataSource={usersList}
                    columns={columns}
                />
            </Flex>
            <DrawerElement
                title="Update user"
                open={Boolean(userModal)}
                onClose={() => setUserModal(null)}
                footerActions={[
                    <Button disabled={mutationInFlight} type="default" onClick={() => setUserModal(null)} key="Cancel">Cancel</Button>,
                    <>
                        {userModal?.isVerified ?
                            <Button disabled={mutationInFlight || tenantScopeLoading} type="primary" onClick={() => updateUser(userModal)}>Update</Button> :
                            <Button disabled={mutationInFlight || tenantScopeLoading} type="primary" onClick={onVerify}>Verify</Button>}
                    </>
                ]}
                width={450}
            >
                <Flex vertical gap={20}>
                    <Flex align='center' justify='flex-start' gap={10}>
                        {userModal?.profileImage ? <img alt={`${userModal?.name || 'User'} profile`} src={userModal?.profileImage} style={{ width: 50, height: 50, borderRadius: 25 }} /> : <LuUser />}
                        <Flex vertical gap={0}>
                            <Text>{userModal?.name}</Text>
                            <Text>{userModal?.email}</Text>
                        </Flex>
                    </Flex>
                    <Saperator />

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Active</Text>
                        <Switch
                            aria-label="User active"
                            defaultChecked={userModal?.active || false}
                            value={userModal?.active || false}
                            onChange={() => onChangeValue('active', !Boolean(userModal?.active))}
                        />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Platform Role</Text>
                        <Select
                            aria-label="Platform role"
                            defaultValue={userModal?.platformRole || ""}
                            value={userModal?.platformRole || ""}
                            style={{ width: "100%" }}
                            placeholder="Select Role"
                            onChange={(value) => onChangeValue('platformRole', value)}
                            options={[
                                { label: MENULIST_PLATFORM_USER_ROLE, value: MENULIST_PLATFORM_USER_ROLE },
                                { label: MENULIST_PLATFORM_SUPPORT_USER_ROLE, value: MENULIST_PLATFORM_SUPPORT_USER_ROLE },
                                { label: CRAFT_BUILDER_MAINTAINER_USER_ROLE, value: CRAFT_BUILDER_MAINTAINER_USER_ROLE },
                            ]}
                        />
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Tenant</Text>
                        <Select
                            aria-label="User tenant"
                            value={userModal?.tenantId}
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
                            return <Fragment key={mappedStore.storeId}>
                                <Card>
                                    <Flex vertical gap={10} key={index}>
                                        <Flex>
                                            <Text style={{ minWidth: 100 }}>Store</Text>
                                            <Select
                                                aria-label={`Store mapping ${index + 1}`}
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
                                                aria-label={`Store role ${index + 1}`}
                                                allowClear
                                                style={{ width: '100%' }}
                                                placeholder="Please select role"
                                                defaultValue={mappedStore?.role || ''}
                                                value={mappedStore?.role || ''}
                                                onChange={(value?: string) => {
                                                    if (value !== undefined) onChangeStoreValue(index, 'role', value);
                                                }}
                                                options={filterStoresList?.find((s) => s.storeId == mappedStore?.storeId)?.roles?.map((role) => ({ label: role.name, value: role.id }))}
                                            />
                                        </Flex>

                                        <Flex justify='flex-end'>
                                            <Button
                                                aria-label={`Delete store mapping ${mappedStore.name || mappedStore.storeId}`}
                                                danger
                                                type='text'
                                                icon={<LuTrash />}
                                                onClick={() => onClickDeleteStore(index)}
                                            >
                                                Delete Store Mapping
                                            </Button>
                                        </Flex>
                                    </Flex>
                                </Card>
                            </Fragment>
                        })}
                    </Flex>

                    <Flex justify='flex-end'>
                        {!tenantScopeLoading && (filterStoresList.length != userModal?.stores?.length) && <Button type="primary" ghost onClick={onClickAddStore}>Add Store</Button>}
                    </Flex>

                    <Flex>
                        <Text style={{ minWidth: 150 }}>Default Store</Text>
                        <Select
                            aria-label="Default store"
                            defaultValue={userModal?.storeId}
                            value={userModal?.storeId}
                            style={{ width: "100%" }}
                            placeholder="Select Default Store"
                            onChange={(storeId) => onChangeValue('storeId', storeId)}
                            options={userModal?.stores?.map((s) => ({ label: s.name, value: s.storeId }))}
                        />
                    </Flex>
                    <Tag color='yellow'>The user lands in this store after signing in.</Tag>
                </Flex>
            </DrawerElement>
        </Flex>
    );
}

export default PlatformUsers;
