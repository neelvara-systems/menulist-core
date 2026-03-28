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

function UsersListPage() {

    const [searchQuery, setSearchQuery] = useState('')
    const [filteredUsersList, setFilterdUsersList] = useState([]);
    const [userDetailsModal, setUserDetailsModal] = useState({ active: false, data: null });
    const [userFormModal, setUserFormModal] = useState({ active: false, data: null });
    const { storeDetails, usersList, setUsersList } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)

    useEffect(() => {
        if (storeDetails?.storeKey) {
            setFilterdUsersList(removeObjRef(usersList))
        }
    }, [storeDetails])

    const onChangeSearchQuery = (query: string) => {
        query = query ? query.toLowerCase() : '';
        setSearchQuery(query);
        const searchedCategory = [];
        const searchListCopy = removeObjRef(usersList);
        searchListCopy.map((category) => {
            let queryIncludedItems = category.items.filter((i: any) => (i.label.toLowerCase()).includes(query) || (i.keywords ? (i.keywords?.toLowerCase())?.includes(query) : ""))
            if (queryIncludedItems.length !== 0) {
                const filteredCat = removeObjRef(category)
                filteredCat.items = queryIncludedItems;
                searchedCategory.push(filteredCat)
            }
        })
        setFilterdUsersList(!query ? usersList : searchedCategory)
    }

    const onClickSearch = () => {
        console.log("onclick search")
    }

    const resetFilters = (updatedUsersList) => {
        setSearchQuery('');
        setUsersList(updatedUsersList);
        setFilterdUsersList(updatedUsersList);
    }

    const onCloseFormModal = (updatedUser = null) => {
        if (updatedUser) {
            const usersListCopy = removeObjRef(usersList);
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