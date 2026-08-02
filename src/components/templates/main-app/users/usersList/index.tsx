'use client'

import ContextualStateIllustration from "@atoms/contextualStateIllustration";
import TextElement from "@antdComponent/textElement";
import { fetchStaffUsers, forceSignOutStaffUser, removeStaffFromStore, requestStaffPasswordReset } from "@lib/staffManagement/client";
import { getBoundedStaffStringContext, logStaffClientFailure } from "@lib/staffManagement/diagnostics";
import { canManageStaffTarget } from "@lib/staffManagement/scopeBoundary";
import type { StaffFormUser, StaffMutationResponse, StaffStoreOption, StaffUserSummary } from "@lib/staffManagement/types";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { showErrorToast, showSuccessToast } from "@reduxSlices/toast";
import { Alert, Button, Card, Flex, Input, Modal, Space, Spin, theme } from "antd";
import { useContext, useEffect, useRef, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useAppDispatch } from "src/hooks/useAppDispatch";
import StaffLoginDetailsContent from "../StaffLoginDetailsContent";
import UserDetailsModal from "./userDetailsModal";
import UserAddUpdateForm from "./userForm";
import UsersListTable from "./usersListTable";
const { Search } = Input;

type StaffClientLogContext = Record<string, boolean | number | string | undefined>;
type StaffModalState = { active: boolean; data: StaffUserSummary | null };

const getSafeUsersList = (usersList: StaffUserSummary[] | null | undefined): StaffUserSummary[] => (
    Array.isArray(usersList) ? usersList : []
);
const getStaffTargetFailureCopy = (error: unknown, fallback: string) => (
    error && typeof error === 'object' && 'code' in error
        && (error as { code?: unknown }).code === 'OWNER_MANAGEMENT_FORBIDDEN'
        ? 'Only an Owner can change an Owner account'
        : fallback
);

const userMatchesSearch = (user: StaffUserSummary, query: string) => {
    const searchableText = [
        user?.name,
        user?.displayEmail,
        user?.email,
        user?.staffLoginId,
        user?.loginUsername,
        user?.phoneNumber,
        user?.role,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return searchableText.includes(query);
}

const userHasCurrentStore = (user: StaffUserSummary | undefined, storeId: number | undefined) => (
    Boolean(storeId)
    && (
        user?.storeIds.some((id) => id === storeId)
        || user?.stores.some((store) => store.storeId === storeId)
    )
);

const getDesktopStaffLogContext = (
    storeDetails: PlatformGlobalDataProviderType['storeDetails'],
    user?: StaffUserSummary,
) => ({
    ...getBoundedStaffStringContext('storeId', storeDetails?.storeId),
    ...getBoundedStaffStringContext('tenantId', storeDetails?.tenantId),
    ...getBoundedStaffStringContext('userId', user?.id),
});

function UsersListPage() {

    const [searchQuery, setSearchQuery] = useState('')
    const [filteredUsersList, setFilterdUsersList] = useState<StaffUserSummary[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [pendingStaffUserId, setPendingStaffUserId] = useState<string | null>(null);
    const pendingStaffActionRef = useRef<string | null>(null);
    const [staffStores, setStaffStores] = useState<StaffStoreOption[]>([]);
    const [userDetailsModal, setUserDetailsModal] = useState<StaffModalState>({ active: false, data: null });
    const [userFormModal, setUserFormModal] = useState<StaffModalState>({ active: false, data: null });
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const { storeDetails, userPermissions, usersList, setUsersList } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const canManageUsers = userPermissions?.canManageUsers === true;
    const canAssignRoles = userPermissions?.canAssignRoles === true;
    const canManageTarget = (user: unknown) => canManageStaffTarget({
        canAssignRoles,
        canManageUsers,
        target: user,
    });
    const buildDesktopUsersLogContext = (flow: string, user?: StaffUserSummary, metadata: StaffClientLogContext = {}): StaffClientLogContext => ({
        surface: 'desktop_users',
        flow,
        canAssignRoles,
        canManageUsers,
        userCount: getSafeUsersList(usersList).length,
        ...getDesktopStaffLogContext(storeDetails, user),
        ...metadata,
    });

    useEffect(() => {
        if (storeDetails?.storeId) {
            setFilterdUsersList([...getSafeUsersList(usersList)])
        }
    }, [storeDetails?.storeId, usersList])

    useEffect(() => {
        setUserDetailsModal({ active: false, data: null });
        setUserFormModal({ active: false, data: null });
    }, [storeDetails?.storeId, storeDetails?.tenantId]);

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
            .catch((error) => {
                if (cancelled) return;
                logStaffClientFailure('desktop_staff_users_load_failed', error, getDesktopStaffLogContext(storeDetails));
                dispatch(showErrorToast("Could not load staff members"));
                setUsersList([]);
                setFilterdUsersList([]);
                setStaffStores([]);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingUsers(false);
            });

        return () => {
            cancelled = true;
        };
    }, [canManageUsers, dispatch, setUsersList, storeDetails?.storeId, storeDetails?.tenantId])

    const onChangeSearchQuery = (query: string) => {
        query = query ? query.toLowerCase() : '';
        setSearchQuery(query);
        const searchListCopy = [...getSafeUsersList(usersList)];
        const searchedUsers = searchListCopy.filter((user) => userMatchesSearch(user, query));
        setFilterdUsersList(!query ? searchListCopy : searchedUsers)
    }

    const showStaffPasscode = (data: StaffMutationResponse) => {
        if (!data?.temporaryPasscode || !data?.staffLoginId) return;
        Modal.info({
            okText: "Done",
            title: "Staff login details",
            content: (
                <StaffLoginDetailsContent
                    countryCode={data.user?.countryCode}
                    diagnosticContext={buildDesktopUsersLogContext('login_details_share', data.user)}
                    dialCode={data.user?.dialCode}
                    phoneNumber={data.user?.phoneNumber}
                    staffLoginId={data.staffLoginId}
                    temporaryPasscode={data.temporaryPasscode}
                />
            ),
        });
    }

    const resetFilters = (updatedUsersList: StaffUserSummary[]) => {
        const safeUpdatedUsersList = getSafeUsersList(updatedUsersList);
        setSearchQuery('');
        setUsersList(safeUpdatedUsersList);
        setFilterdUsersList(safeUpdatedUsersList);
    }

    const onCloseFormModal = (updatedUser: StaffFormUser | StaffUserSummary | null = null) => {
        if (updatedUser?.id) {
            const normalizedUpdatedUser: StaffUserSummary = { ...updatedUser, id: updatedUser.id };
            const usersListCopy = [...getSafeUsersList(usersList)];
            const index = usersListCopy.findIndex((user) => user.id === normalizedUpdatedUser.id);
            if (index !== -1) {
                usersListCopy[index] = normalizedUpdatedUser
            } else {
                usersListCopy.push(normalizedUpdatedUser)
            }
            resetFilters(usersListCopy)
            if (userDetailsModal.active) {
                setUserDetailsModal({ ...userDetailsModal, data: normalizedUpdatedUser })
            }
        }
        setUserFormModal({ data: null, active: false })
    }

    const onCloseDetailsModal = () => {
        setUserDetailsModal({ active: false, data: null })
    }

    const onDeleteUser = async (user: StaffUserSummary) => {
        if (pendingStaffActionRef.current || !canManageTarget(user) || !user.id || !storeDetails?.tenantId || !storeDetails?.storeId) return;
        pendingStaffActionRef.current = `remove:${user.id}`;
        setPendingStaffUserId(user.id);
        try {
            const response = await removeStaffFromStore({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                userId: user.id,
            });
            const usersListCopy = [...getSafeUsersList(usersList)];
            const nextUsers = response.user?.deleted
                || !userHasCurrentStore(response.user, storeDetails.storeId)
                ? usersListCopy.filter((item) => item.id !== user.id)
                : usersListCopy.map((item) => item.id === user.id ? response.user : item);
            resetFilters(nextUsers);
            if (userDetailsModal.active && userDetailsModal.data?.id === user.id) {
                setUserDetailsModal({ active: false, data: null });
            }
        } catch (err) {
            logStaffClientFailure('desktop_staff_remove_failed', err, getDesktopStaffLogContext(storeDetails, user));
            dispatch(showErrorToast(getStaffTargetFailureCopy(err, "Could not remove staff member")));
        } finally {
            pendingStaffActionRef.current = null;
            setPendingStaffUserId(null);
        }
    }

    const onResetPassword = async (user: StaffUserSummary) => {
        if (pendingStaffActionRef.current || !canManageTarget(user) || !user.id || !storeDetails?.tenantId || !storeDetails?.storeId) return;
        pendingStaffActionRef.current = `reset:${user.id}`;
        setPendingStaffUserId(user.id);
        try {
            const data = await requestStaffPasswordReset({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                userId: user.id,
            });
            if (data.user) {
                const nextUsers = getSafeUsersList(usersList).map((item) => item.id === user.id ? data.user! : item);
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
        } catch (err) {
            logStaffClientFailure('desktop_staff_password_reset_failed', err, getDesktopStaffLogContext(storeDetails, user));
            dispatch(showErrorToast(getStaffTargetFailureCopy(err, "Could not reset staff access")));
        } finally {
            pendingStaffActionRef.current = null;
            setPendingStaffUserId(null);
        }
    }

    const onForceSignOut = async (user: StaffUserSummary) => {
        if (pendingStaffActionRef.current || !canManageTarget(user) || !user.id || !storeDetails?.tenantId || !storeDetails?.storeId) return;
        pendingStaffActionRef.current = `signout:${user.id}`;
        setPendingStaffUserId(user.id);
        try {
            const data = await forceSignOutStaffUser({
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                userId: user.id,
            });
            if (data.user) {
                const nextUsers = getSafeUsersList(usersList).map((item) => item.id === user.id ? data.user! : item);
                resetFilters(nextUsers);
                if (userDetailsModal.active && userDetailsModal.data?.id === user.id) {
                    setUserDetailsModal({ ...userDetailsModal, data: data.user });
                }
            }
            dispatch(showSuccessToast("Staff member signed out"));
        } catch (err) {
            logStaffClientFailure('desktop_staff_force_signout_failed', err, getDesktopStaffLogContext(storeDetails, user));
            dispatch(showErrorToast(getStaffTargetFailureCopy(err, "Could not sign out staff member")));
        } finally {
            pendingStaffActionRef.current = null;
            setPendingStaffUserId(null);
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
                            canManageTarget={canManageTarget}
                            canManageUsers={canManageUsers}
                            emptyText={!canManageUsers
                                ? 'Staff list is not available for your role.'
                                : searchQuery
                                    ? 'No staff matched your search.'
                                    : (
                                        <Flex align="center" gap={10} vertical>
                                            <ContextualStateIllustration
                                                color={token.colorPrimary}
                                                size={112}
                                                treatment="softHalo"
                                                variant="teamContext"
                                            />
                                            <TextElement text="No staff members yet" />
                                        </Flex>
                                    )}
                            onClickUserDetails={(data) => setUserDetailsModal({ active: true, data })}
                            onDeleteUser={onDeleteUser}
                            onEditUser={(user) => setUserFormModal({ active: true, data: user })}
                            onForceSignOut={onForceSignOut}
                            onResetPassword={onResetPassword}
                            pendingStaffUserId={pendingStaffUserId}
                            staffStores={staffStores}
                            usersList={filteredUsersList}
                        />
                    </Spin>
                </Space>
            </Card>

            <UserDetailsModal
                canEdit={canManageTarget(userDetailsModal.data)}
                modalData={userDetailsModal}
                onCloseModal={onCloseDetailsModal}
                onClickEdit={(user) => {
                    if (!canManageTarget(user)) return;
                    setUserDetailsModal({ active: false, data: null });
                    setUserFormModal({ active: true, data: user });
                }}
            />
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
