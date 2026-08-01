import TagElement from '@antdComponent/tagElement';
import FormElementWrapper from '@atoms/formElementWrapper';
import { DEFAULT_ROLE_IDS } from '@data/shared/defaultRoles';
import { readStoreById } from '@database/stores';
import {
    applyStaffStoreRole,
    applyStaffStoreSelection,
    mergeLoadedStaffStoreForCurrentTenant,
    removeStaffStoreSelection,
} from '@lib/staffManagement/formMappingBoundary';
import { getBoundedStaffStringContext, logStaffClientFailure } from '@lib/staffManagement/diagnostics';
import type { StaffFormUser, StaffStoreOption } from '@lib/staffManagement/types';
import { PlatformGlobalDataContext, type PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Button, Card, Empty, Flex, Select, Tag, Typography, theme } from 'antd';
import { Fragment, useContext } from 'react';
import { LuTrash } from 'react-icons/lu';
import { hasOperationalOwnerAccess, OWNER_ACCESS_NOT_TRANSFER_COPY } from '@lib/staffManagement/ownershipTransferBoundary';
const { Text } = Typography;

type StaffStoreChoice = {
    name: string;
    roles: StaffStoreOption['roles'];
    storeId: number;
    storeDetailsLoaded: boolean;
};

type StoresMappingProps = {
    canAssignRoles?: boolean;
    onChangeValue: (from: string, value: unknown) => void;
    staffStores?: StaffStoreOption[];
    userDetails: StaffFormUser;
};

function StoresMapping({ canAssignRoles = true, staffStores = [], userDetails, onChangeValue }: StoresMappingProps) {
    const { tenantDetails, setTenantDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const { token } = theme.useToken();
    const storesList: StaffStoreChoice[] = staffStores.length
        ? staffStores.map((store) => ({
            name: store.name,
            roles: store.roles,
            storeDetailsLoaded: true,
            storeId: store.storeId,
        }))
        : (tenantDetails?.storesList || []).map((store) => ({
            name: store.name,
            roles: store.storeDetails?.roles || [],
            storeDetailsLoaded: Boolean(store.storeDetails),
            storeId: store.storeId,
        }));

    const onChangeStoreValue = (index: number, from: 'role' | 'storeId', value: string | number) => {
        if (from === 'role') {
            const nextUser = applyStaffStoreRole(userDetails, index, String(value || ''));
            if (nextUser) onChangeValue('user', nextUser);
            return;
        }

        const selectedStore = storesList.find((store) => store.storeId === Number(value));
        if (!selectedStore) return;
        const nextUser = applyStaffStoreSelection(userDetails, index, selectedStore);
        if (!nextUser) return;
        onChangeValue('user', nextUser);

        const expectedTenantId = tenantDetails?.tenantId;
        if (staffStores.length || selectedStore.storeDetailsLoaded || !expectedTenantId) return;
        void readStoreById(selectedStore.storeId)
            .then((loadedStore) => {
                if (!loadedStore) return;
                setTenantDetails((currentTenant) => mergeLoadedStaffStoreForCurrentTenant(
                    currentTenant,
                    expectedTenantId,
                    selectedStore.storeId,
                    loadedStore,
                ));
            })
            .catch((error: unknown) => {
                logStaffClientFailure('desktop_staff_store_roles_load_failed', error, {
                    ...getBoundedStaffStringContext('tenantId', expectedTenantId),
                    ...getBoundedStaffStringContext('storeId', selectedStore.storeId),
                });
            });
    }

    const onClickDeleteStore = (index: number) => {
        const nextUser = removeStaffStoreSelection(userDetails, index);
        if (nextUser) onChangeValue('user', nextUser);
    }

    const onClickAddStore = () => {
        const firstUnassignedStore = storesList.find((store) => (
            !userDetails.stores.some((mapping) => mapping.storeId === store.storeId)
        ));
        if (!firstUnassignedStore) return;
        onChangeValue('user', {
            ...userDetails,
            storeIds: [...userDetails.storeIds, firstUnassignedStore.storeId],
            stores: [
                ...userDetails.stores,
                { storeId: firstUnassignedStore.storeId, name: firstUnassignedStore.name, role: '' },
            ],
        } satisfies StaffFormUser);
    }


    return (
        <Flex vertical gap={10}>
            {hasOperationalOwnerAccess(userDetails?.stores) ? (
                <Alert message={OWNER_ACCESS_NOT_TRANSFER_COPY} showIcon type="warning" />
            ) : null}

            {userDetails?.stores?.length > 1 && <Text style={{ minWidth: 150 }}>Store access
                {Boolean(userDetails?.stores?.length) && <Tag color='blue'>{userDetails?.stores?.length}</Tag>}
            </Text>}

            {!Boolean(userDetails?.stores?.length) ? <>
                <Empty description="No store access assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </> : <>
                {userDetails?.stores?.map((mappedStore, index) => {
                    return <Fragment key={index}>
                        <Card
                            size='small'
                            styles={{ body: { background: token.colorFillQuaternary } }}
                        >
                            <Flex vertical gap={10} key={index}>
                                <Flex>
                                    <Text style={{ minWidth: 100 }}>Store {index + 1}</Text>
                                    <Select
                                        defaultValue={mappedStore?.storeId}
                                        value={mappedStore?.storeId}
                                        style={{ width: "100%" }}
                                        disabled={!canAssignRoles}
                                        placeholder="Select store"
                                        onChange={(storeId) => onChangeStoreValue(index, 'storeId', storeId)}
                                        options={storesList?.map((s) => ({ label: `${s.storeId}-${s.name}`, value: s.storeId }))}
                                    />
                                </Flex>

                                <FormElementWrapper label="Role">
                                    <Select
                                        allowClear
                                        style={{ width: '100%' }}
                                        placeholder="Select role"
                                        disabled={!canAssignRoles}
                                        defaultValue={mappedStore?.role || ''}
                                        value={mappedStore?.role || ''}
                                        onChange={(value) => onChangeStoreValue(index, 'role', value)}
                                        options={storesList.find((store) => store.storeId === mappedStore.storeId)
                                            ?.roles.filter((role) => role.active !== false)
                                            .map((role) => ({ label: role.name, value: role.id }))}
                                    />
                                </FormElementWrapper>

                                <Flex justify='flex-end'>
                                    <Button danger disabled={!canAssignRoles || mappedStore.role === DEFAULT_ROLE_IDS.OWNER} type='text' icon={<LuTrash />} onClick={() => onClickDeleteStore(index)}>Remove store access</Button>
                                </Flex>
                            </Flex>
                        </Card>
                    </Fragment>
                })}
            </>}
            <Flex justify={!Boolean(userDetails?.stores?.length) ? "center" : 'flex-end'}>
                {(canAssignRoles && storesList?.length > 1 && storesList.length != userDetails?.stores?.length) && <Button type="primary" ghost onClick={onClickAddStore}>Add store access</Button>}
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
                        <TagElement type='default' content="This is the store the staff member opens first after login." />
                    </Flex>
                </Card>
            </>}
        </Flex>
    )
}

export default StoresMapping
