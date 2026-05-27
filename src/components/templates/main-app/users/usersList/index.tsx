'use client'

import TextElement from "@antdComponent/textElement";
import { fetchStaffUsers, forceSignOutStaffUser, removeStaffFromStore, requestStaffPasswordReset } from "@lib/staffManagement/client";
import type { StaffStoreOption } from "@lib/staffManagement/types";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { showErrorToast, showSuccessToast } from "@reduxSlices/toast";
import { removeObjRef } from "@util/utils";
import { Alert, Button, Card, Flex, Input, Modal, Space, Spin } from "antd";
import { useContext, useEffect, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useAppDispatch } from "src/hooks/useAppDispatch";
import StaffLoginDetailsContent from "../StaffLoginDetailsContent";
import UserDetailsModal from "./userDetailsModal";
import UserAddUpdateForm from "./userForm";
import UsersListTable from "./usersListTable";
const { Search } = Input;

const getSafeUsersList = (usersList: unknown) => Array.isArray(usersList) ? usersList : [];

const userMatchesSearch = (user: any, query: string) => {
    const searchableText = [
        user?.name,
        user?.displayEmail,
        user?.email,
        user?.staffLoginId,
        user?.loginUsername,
        user?.phoneNumber,
        user?.phone,
        user?.role,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return searchableText.includes(query);
}

function UsersListPage() {

    const [searchQuery, setSearchQuery] = useState('')
    const [filteredUsersList, setFilterdUsersList] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [staffStores, setStaffStores] = useState<StaffStoreOption[]>([]);
    const [userDetailsModal, setUserDetailsModal] = useState({ active: false, data: null });
    const [userFormModal, setUserFormModal] = useState({ active: false, data: null });
    const dispatch = useAppDispatch();
    const { storeDetails, userPermissions, usersList, setUsersList } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const canManageUsers = userPermissions?.canManageUsers === true;
    const canAssignRoles = userPermissions?.canAssignRoles === true;

    useEffect(() => {
        if (storeDetails?.storeId) {
            setFilterdUsersList(removeObjRef(getSafeUsersList(usersList)))
        }
    }, [storeDetails?.storeId, usersList])

    useEffect(() => {
        let cancelled = false;

        if (!storeDetails?.tenantId || !storeDetails?.storeId || !canManageUsers) {
            setUsersList([]);
            setStaffStores([]);
            return;
        }

        setIsLoadingUsers(true);
        fetchStaffUsers(storeDetails.tenantId, storeDetails.storeId)
            .then((data) => {
                if (cancelled) return;
                setUsersList(data.users || []);
                setFilterdUsersList(data.users || []);
                setStaffStores(data.stores || []);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingUsers(false);
            });

        return () => {
            cancelled = true;
        };
    }, [canManageUsers, setUsersList, storeDetails?.storeId, storeDetails?.tenantId])

    const onChangeSearchQuery = (query: string) => {
        query = query ? query.toLowerCase() : '';
        setSearchQuery(query);
        const searchListCopy = removeObjRef(getSafeUsersList(usersList));
        const searchedUsers = searchListCopy.filter((user: any) => userMatchesSearch(user, query));
        setFilterdUsersList(!query ? searchListCopy : searchedUsers)
    }

    const onClickSearch = () => undefined

    const showStaffPasscode = (data: any) => {
        if (!data?.temporaryPasscode || !data?.staffLoginId) return;
        Modal.info({
            okText: "Done",
            title: "Staff login details",
            content: (
                <StaffLoginDetailsContent
                    countryCode={data.user?.countryCode}
                    dialCode={data.user?.dialCode}
                    phoneNumber={data.user?.phoneNumber}
                    staffLoginId={data.staffLoginId}
                    temporaryPasscode={data.temporaryPasscode}
                />
            ),
        });
    }

    const resetFilters = (updatedUsersList) => {
        const safeUpdatedUsersList = getSafeUsersList(updatedUsersList);
        setSearchQuery('');
        setUsersList(safeUpdatedUsersList);
        setFilterdUsersList(safeUpdatedUsersList);
    }

    const onCloseFormModal = (updatedUser = null) => {
        if (updatedUser) {
            const usersListCopy = removeObjRef(getSafeUsersList(usersList));
            const index = usersListCopy.findIndex((u) => u.id == updatedUser.id);
            if (index !== -1) {
                usersListCopy[index] = updatedUser
            } else {
                usersListCopy.push(updatedUser)
            }
            resetFilters(usersListCopy)
        }
        setUserFormModal({ data: null, active: false })

        if (userDetailsModal.active && updatedUser) {
            setUserDetailsModal({ ...userDetailsModal, data: updatedUser })
        }
    }

    const onCloseDetailsModal = () => {
        setUserDetailsModal({ active: false, data: null })
    }

    const onDeleteUser = async (user) => {
        if (!user?.id || !storeDetails?.tenantId || !storeDetails?.storeId) return;
        const response = await removeStaffFromStore({
            storeId: storeDetails.storeId,
            tenantId: storeDetails.tenantId,
            userId: user.id,
        });
        const usersListCopy = removeObjRef(getSafeUsersList(usersList));
        const nextUsers = response.user?.deleted
            ? usersListCopy.filter((item) => item.id !== user.id)
            : usersListCopy.map((item) => item.id === user.id ? response.user : item);
        resetFilters(nextUsers);
        if (userDetailsModal.active && userDetailsModal.data?.id === user.id) {
            setUserDetailsModal({ active: false, data: null });
        }
    }

    const onResetPassword = async (user) => {
        if (!user?.id || !storeDetails?.tenantId || !storeDetails?.storeId) return;
        try {
            const data = await requestStaffPasswordReset({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                userId: user.id,
            });
            if (data.user) {
                const nextUsers = getSafeUsersList(usersList).map((item: any) => item.id === user.id ? data.user : item);
                resetFilters(nextUsers);
                if (userDetailsModal.active && userDetailsModal.data?.id === user.id) {
                    setUserDetailsModal({ ...userDetailsModal, data: data.user });
                }
            }
            if (data.temporaryPasscode) {
                showStaffPasscode(data);
                dispatch(showSuccessToast("Temporary staff passcode created"));
            } else {
                dispatch(showSuccessToast("Staff access reset"));
            }
        } catch (err: any) {
            dispatch(showErrorToast(err?.message || "Could not reset staff access"));
        }
    }

    const onForceSignOut = async (user) => {
        if (!user?.id || !storeDetails?.tenantId || !storeDetails?.storeId) return;
        try {
            const data = await forceSignOutStaffUser({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                userId: user.id,
            });
            if (data.user) {
                const nextUsers = getSafeUsersList(usersList).map((item: any) => item.id === user.id ? data.user : item);
                resetFilters(nextUsers);
                if (userDetailsModal.active && userDetailsModal.data?.id === user.id) {
                    setUserDetailsModal({ ...userDetailsModal, data: data.user });
                }
            }
            dispatch(showSuccessToast("Staff member signed out"));
        } catch (err: any) {
            dispatch(showErrorToast(err?.message || "Could not sign out staff member"));
        }
    }

    return (
        <Flex vertical gap={30}>

            <Space direction="vertical" size={2}>
                <TextElement size='heading' text="Users List" type='primary' />
                <TextElement text="View, add, edit and deactivate your users details" />
            </Space>

            <Card styles={{ body: { padding: 15 } }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                    {!canManageUsers && (
                        <Alert
                            message="No access"
                            description="Your current role cannot manage staff for this store."
                            type="warning"
                            showIcon
                        />
                    )}
                    <Flex justify="space-between" align="center">

                        <Search
                            value={searchQuery}
                            onChange={(e) => onChangeSearchQuery(e.target.value)}
                            onSearch={onClickSearch}
                            placeholder="Search user by name, number, email"
                            enterButton={false}
                            allowClear
                            style={{ width: 500 }}
                        />

                        <Flex gap={10}>
                            <Button disabled={!canManageUsers} icon={<LuPlus />} onClick={() => setUserFormModal({ active: true, data: null })}>Add User</Button>
                        </Flex>

                    </Flex>
                    <Spin spinning={isLoadingUsers}>
                        <UsersListTable
                            canManageUsers={canManageUsers}
                            onClickUserDetails={(data) => setUserDetailsModal({ active: true, data })}
                            onDeleteUser={onDeleteUser}
                            onEditUser={(user) => setUserFormModal({ active: true, data: user })}
                            onForceSignOut={onForceSignOut}
                            onResetPassword={onResetPassword}
                            staffStores={staffStores}
                            usersList={filteredUsersList}
                        />
                    </Spin>
                </Space>
            </Card>

            <UserDetailsModal modalData={userDetailsModal} onCloseModal={onCloseDetailsModal} onClickEdit={(user) => setUserFormModal({ active: true, data: user })} />
            <UserAddUpdateForm
                canAssignRoles={canAssignRoles}
                modalData={userFormModal}
                onCloseModal={onCloseFormModal}
                staffStores={staffStores}
            />
        </Flex>
    )
}

export default UsersListPage
