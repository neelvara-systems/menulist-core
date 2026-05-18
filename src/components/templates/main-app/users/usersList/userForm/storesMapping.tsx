import TagElement from '@antdComponent/tagElement';
import FormElementWrapper from '@atoms/formElementWrapper';
import { getStoreById } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { StoreDataType } from '@type/platform/store';
import { UserDataType } from '@type/platform/user';
import { removeObjRef } from '@util/utils';
import { Button, Card, Empty, Flex, Select, Tag, Typography } from 'antd';
import { Fragment, useContext } from 'react';
import { LuTrash } from 'react-icons/lu';
const { Text } = Typography;

function StoresMapping({ canAssignRoles = true, staffStores = [], userDetails, onChangeValue }) {

    const { tenantDetails, setTenantDetails } = useContext(PlatformGlobalDataContext)
    const storesList = staffStores.length
        ? staffStores.map((store) => ({ ...store, storeDetails: store }))
        : (tenantDetails?.storesList || []);

    const onChangeStoreValue = (index, from, value) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        userCopy.stores[index][from] = value;
        if (from == "storeId") {
            const storeIndex = storesList.findIndex((s) => s.storeId == value);
            const storeDetails = storesList[storeIndex];
            userCopy.stores[index].name = storeDetails?.name;
            userCopy.storeIds = Boolean(userCopy.stores?.length) ? userCopy.stores.map((s) => s.storeId) : [];

            if (!userCopy.storeId) {
                userCopy.storeId = value
            }
            if (!staffStores.length && !Boolean(storeDetails.storeDetails)) {//if storedetails is not fetched then fetch it on run time when user selected the store
                getStoreById(storeDetails.storeId).then((store: StoreDataType) => {
                    tenantDetails.storesList[storeIndex].storeDetails = store;
                    setTenantDetails(removeObjRef(tenantDetails))
                })
            }
        }
        onChangeValue('user', userCopy)
    }

    const onClickDeleteStore = (index) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        userCopy.stores.splice(index, 1);
        userCopy.storeIds = Boolean(userCopy.stores?.length) ? userCopy.stores.map((s) => s.storeId) : [];
        onChangeValue('user', userCopy)
    }

    const onClickAddStore = () => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        if (!userCopy.stores) userCopy.stores = [];
        userCopy.stores.push({ storeId: null, name: "", role: "" });  // Single role per store
        onChangeValue('user', userCopy)
    }


    return (
        <Flex vertical gap={10}>

            {userDetails?.stores?.length > 1 && <Text style={{ minWidth: 150 }}>Total stores Assigned to User
                {Boolean(userDetails?.stores?.length) && <Tag color='blue'>{userDetails?.stores?.length}</Tag>}
            </Text>}

            {!Boolean(userDetails?.stores?.length) ? <>
                <Empty description="No stores assigned to user" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </> : <>
                {userDetails?.stores?.map((mappedStore, index) => {
                    return <Fragment key={index}>
                        <Card size='small'>
                            <Flex vertical gap={10} key={index}>
                                <Flex>
                                    <Text style={{ minWidth: 100 }}>Store {index + 1}</Text>
                                    <Select
                                        defaultValue={mappedStore?.storeId}
                                        value={mappedStore?.storeId}
                                        style={{ width: "100%" }}
                                        disabled={!canAssignRoles}
                                        placeholder="Select Store"
                                        onChange={(storeId) => onChangeStoreValue(index, 'storeId', storeId)}
                                        options={storesList?.map((s) => ({ label: `${s.storeId}-${s.name}`, value: s.storeId }))}
                                    />
                                </Flex>

                                <FormElementWrapper label="Role">
                                    <Select
                                        allowClear
                                        style={{ width: '100%' }}
                                        placeholder="Please select role"
                                        disabled={!canAssignRoles}
                                        defaultValue={mappedStore?.role || ''}
                                        value={mappedStore?.role || ''}
                                        onChange={(value) => onChangeStoreValue(index, 'role', value)}
                                        options={(storesList.find(s => s.storeId == mappedStore?.storeId))?.storeDetails?.roles?.filter((role) => role.active !== false)?.map((role) => ({ label: role.name, value: role.id }))}
                                    />
                                </FormElementWrapper>

                                <Flex justify='flex-end'>
                                    <Button danger disabled={!canAssignRoles} type='text' icon={<LuTrash />} onClick={() => onClickDeleteStore(index)}>Delete Store Mapping</Button>
                                </Flex>
                            </Flex>
                        </Card>
                    </Fragment>
                })}
            </>}
            <Flex justify={!Boolean(userDetails?.stores?.length) ? "center" : 'flex-end'}>
                {(canAssignRoles && storesList?.length > 1 && storesList.length != userDetails?.stores?.length) && <Button type="primary" ghost onClick={onClickAddStore}>Add Store</Button>}
            </Flex>

            {Boolean(userDetails?.stores?.length) && userDetails?.stores?.length > 1 && <>
                <Card >
                    <Flex vertical gap={10}>
                        <Flex>
                            <Text style={{ minWidth: 150 }}>Default Store</Text>
                            <Select
                                defaultValue={userDetails?.storeId}
                                value={userDetails?.storeId}
                                style={{ width: "100%" }}
                                disabled={!canAssignRoles}
                                placeholder="Select Default Store"
                                onChange={(storeId) => onChangeValue('storeId', storeId)}
                                options={userDetails?.stores?.map((s) => ({ label: s.name, value: s.storeId }))}
                            />
                        </Flex>
                        <TagElement type='default' content="Default store used when user loggedin then user will be redirected to default store" />
                    </Flex>
                </Card>
            </>}
        </Flex>
    )
}

export default StoresMapping
