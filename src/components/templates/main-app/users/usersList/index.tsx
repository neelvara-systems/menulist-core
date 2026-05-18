'use client'

import TextElement from "@antdComponent/textElement";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { removeObjRef } from "@util/utils";
import { Button, Card, Flex, Input, Space } from "antd";
import { useContext, useEffect, useState } from "react";
import { LuListFilter, LuPlus, LuSettings } from "react-icons/lu";
import UserDetailsModal from "./userDetailsModal";
import UserAddUpdateForm from "./userForm";
import UsersListTable from "./usersListTable";
const { Search } = Input;

const getSafeUsersList = (usersList: unknown) => Array.isArray(usersList) ? usersList : [];

const userMatchesSearch = (user: any, query: string) => {
    const searchableText = [
        user?.name,
        user?.email,
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
    const [userDetailsModal, setUserDetailsModal] = useState({ active: false, data: null });
    const [userFormModal, setUserFormModal] = useState({ active: false, data: null });
    const { storeDetails, usersList, setUsersList } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)

    useEffect(() => {
        if (storeDetails?.storeId) {
            setFilterdUsersList(removeObjRef(getSafeUsersList(usersList)))
        }
    }, [storeDetails?.storeId, usersList])

    const onChangeSearchQuery = (query: string) => {
        query = query ? query.toLowerCase() : '';
        setSearchQuery(query);
        const searchListCopy = removeObjRef(getSafeUsersList(usersList));
        const searchedUsers = searchListCopy.filter((user: any) => userMatchesSearch(user, query));
        setFilterdUsersList(!query ? searchListCopy : searchedUsers)
    }

    const onClickSearch = () => undefined

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

    return (
        <Flex vertical gap={30}>

            <Space direction="vertical" size={2}>
                <TextElement size='heading' text="Users List" type='primary' />
                <TextElement text="View, add, edit and deactivate your users details" />
            </Space>

            <Card styles={{ body: { padding: 15 } }}>
                <Space direction="vertical" style={{ width: "100%" }}>
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
                            <Button icon={<LuPlus />} onClick={() => setUserFormModal({ active: true, data: null })}>Add User</Button>
                            <Button icon={<LuListFilter />}>Filters</Button>
                            <Button icon={<LuSettings />} />
                        </Flex>

                    </Flex>
                    <UsersListTable usersList={filteredUsersList} onClickUserDetails={(data) => setUserDetailsModal({ active: true, data })} onEditUser={(user) => setUserFormModal({ active: true, data: user })} />
                </Space>
            </Card>

            <UserDetailsModal modalData={userDetailsModal} onCloseModal={onCloseDetailsModal} onClickEdit={(user) => setUserFormModal({ active: true, data: user })} />
            <UserAddUpdateForm modalData={userFormModal} onCloseModal={onCloseFormModal} />
        </Flex>
    )
}

export default UsersListPage
